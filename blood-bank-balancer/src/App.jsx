import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AlertBanner } from './components/AlertBanner';

import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { TriagePage } from './pages/TriagePage';
import { InventoryPage } from './pages/InventoryPage';
import { TransfersPage } from './pages/TransfersPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { HisSyncPage } from './pages/HisSyncPage';
import { SettingsPage } from './pages/SettingsPage';

function UnauthFlow() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        path="/signup"
        element={<SignupPage onSwitchToLogin={() => navigate('/login')} />}
      />
      <Route
        path="/login"
        element={<LoginPage onSwitchToSignup={() => navigate('/signup')} />}
      />
      <Route
        path="*"
        element={<LoginPage onSwitchToSignup={() => navigate('/signup')} />}
      />
    </Routes>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-300">Initializing Blood Bank Balancer...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <UnauthFlow />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <AlertBanner />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/triage" element={<TriagePage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/facilities" element={<FacilitiesPage />} />
            <Route path="/his-sync" element={<HisSyncPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <WebSocketProvider>
          <AppLayout />
        </WebSocketProvider>
      </AuthProvider>
    </Router>
  );
}
