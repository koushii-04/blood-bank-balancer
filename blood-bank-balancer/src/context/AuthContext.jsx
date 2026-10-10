import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState([]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    setToken(null);
    setUser(null);
  };

  // Fetch initial profile if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const profile = await api.auth.getMe();
          setUser(profile);
        } catch (error) {
          console.error("Token verification failed:", error);
          logout();
        }
      }
      try {
        const demos = await api.auth.getDemoUsers();
        setDemoUsers(demos);
      } catch (err) {
        console.warn("Could not load demo users:", err);
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const data = await api.auth.login(email, password);
    localStorage.setItem('access_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const data = await api.auth.register(userData);
    localStorage.setItem('access_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const loginAsDemo = async (demoEmail) => {
    return await login(demoEmail, 'password123');
  };

  const refreshUser = async () => {
    try {
      const profile = await api.auth.getMe();
      setUser(profile);
      return profile;
    } catch (error) {
      console.error("Failed to refresh user profile:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, refreshUser, token, loading, login, register, loginAsDemo, logout, demoUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
