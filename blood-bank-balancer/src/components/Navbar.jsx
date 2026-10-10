/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  Activity, 
  Bell, 
  User, 
  LogOut, 
  ChevronDown, 
  Wifi, 
  WifiOff, 
  ShieldAlert, 
  Building2,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { user, logout, demoUsers, loginAsDemo } = useAuth();
  const { isConnected, liveAlerts, unreadCount, markAllRead } = useWebSocket();
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [showAlertMenu, setShowAlertMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-950">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-rose-400 via-red-300 to-amber-200 bg-clip-text text-transparent">
                BloodBank Balancer
              </span>
              {/* <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Geospatial Routing
              </span> */}
            </div>
          </Link>
        </div>

        {/* Right: Status, Role Switcher, Alerts & User Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* WebSocket Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                {/* <span className="text-emerald-400 font-medium">Live WS Stream</span> */}
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="text-slate-400">Connecting WS...</span>
              </>
            )}
          </div>

          {/* Quick Demo Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowDemoMenu(!showDemoMenu); setShowAlertMenu(false); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
              title="Quick Switch User Role for Evaluation"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Role Switcher:</span>
              <span className="text-rose-400 truncate max-w-[120px]">{user?.role?.replace('_', ' ')}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
                  Select Demo Role / Facility
                </div>
                <div className="py-1 space-y-1">
                  {demoUsers.map((demo, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        loginAsDemo(demo.email);
                        setShowDemoMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-start justify-between ${
                        user?.email === demo.email ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{demo.full_name.split(' (')[0]}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{demo.facility_name}</div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                        {demo.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Real-Time Alert Tray */}
          <div className="relative">
            <button
              onClick={() => {
                setShowAlertMenu(!showAlertMenu);
                setShowDemoMenu(false);
                if (unreadCount > 0) markAllRead();
              }}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-extrabold animate-emergency-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showAlertMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
                  <span className="text-xs font-bold text-slate-300 uppercase">Live WebSocket Feed</span>
                  <button onClick={markAllRead} className="text-[11px] text-rose-400 hover:underline">
                    Clear Badge
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {liveAlerts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No new alerts. Listening on active WebSocket channel.
                    </div>
                  ) : (
                    liveAlerts.map((alt, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs">
                        <div className="font-semibold text-rose-300">{alt.event?.replace(/_/g, ' ')}</div>
                        <div className="text-slate-300 text-[11px] mt-0.5">{alt.message}</div>
                        {alt.timestamp && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            {new Date(alt.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-bold text-slate-200">{user?.full_name}</div>
              <div className="text-[10px] text-rose-400 flex items-center justify-end gap-1">
                <Building2 className="w-3 h-3" />
                {user?.facility?.name || 'Regional Administrator'}
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800/60 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
