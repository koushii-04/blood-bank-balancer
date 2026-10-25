import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestEvent, setLatestEvent] = useState(null);
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);

  useEffect(() => {
    if (!user) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
      return;
    }

    let isMounted = true; // 1. ADD THIS FLAG

    const channel = user.facility_id ? `facility_${user.facility_id}` : 'global';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${channel}`;

    const connectWs = () => {
      try {
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setIsConnected(true);
          console.log(`WebSocket connected to ${channel}`);
          pingIntervalRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send('ping');
            }
          }, 20000);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLatestEvent(data);
            setLiveAlerts((prev) => [data, ...prev].slice(0, 30));
            setUnreadCount((prev) => prev + 1);

            try {
              if (data.event === 'NEW_TRANSFER_REQUEST' || data.event === 'EXPIRY_WARNING') {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(data.event === 'NEW_TRANSFER_REQUEST' ? 880 : 587, ctx.currentTime);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
              }
            } catch (audioErr) {}
          } catch (err) {}
        };

        socket.onclose = () => {
          setIsConnected(false);
          clearInterval(pingIntervalRef.current);
          
          // 2. ONLY RECONNECT IF THE COMPONENT IS STILL MOUNTED
          if (isMounted) {
            console.log('WebSocket disconnected. Reconnecting in 3s...');
            setTimeout(connectWs, 3000);
          }
        };

        socket.onerror = (err) => {
          console.warn('WebSocket error:', err);
          socket.close();
        };

        wsRef.current = socket;
      } catch (e) {
        console.error('Failed to initialize WebSocket:', e);
      }
    };

    connectWs();

    return () => {
      isMounted = false; // 3. FLIP FLAG ON UNMOUNT SO ONCLOSE DOESN'T RECONNECT
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user]);

  const markAllRead = () => setUnreadCount(0);
  const dismissAlert = (index) => {
    setLiveAlerts((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        liveAlerts,
        unreadCount,
        latestEvent,
        markAllRead,
        dismissAlert
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};