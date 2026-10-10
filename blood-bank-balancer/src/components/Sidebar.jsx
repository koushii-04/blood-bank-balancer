/* eslint-disable no-unused-vars */
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Navigation, 
  Droplets, 
  ArrowLeftRight, 
  Building2, 
  ServerCog,
  AlertCircle,
  Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { user } = useAuth();

  const navItems = [
    { to: '/', label: 'Overview Dashboard', icon: LayoutDashboard },
    { to: '/triage', label: 'Proximity Triage', icon: Navigation, highlight: true },
    { to: '/inventory', label: 'Blood Inventory', icon: Droplets },
    { to: '/transfers', label: 'Transfer Tracking', icon: ArrowLeftRight },
    { to: '/facilities', label: 'Facility Network', icon: Building2 },
    { to: '/his-sync', label: 'External HIS Sync', icon: ServerCog },
    { to: '/settings', label: 'System Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Scoped Facility Badge */}
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-slate-800/90 to-slate-800/40 border border-slate-700/70">
          {/* <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Tenant Context
          </div> */}
          <div className="text-sm font-extrabold text-slate-100 mt-1 truncate">
            {user?.facility?.name || 'Regional Oversight (All)'}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {user?.role?.replace('_', ' ')}
            </span>
            {/* <span className="text-[10px] text-slate-400">
              ID #{user?.facility_id || 'Global'}
            </span> */}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/60'
                      : item.highlight
                      ? 'text-rose-300 hover:bg-slate-800/80 hover:text-white border border-rose-500/20'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`
                }
              >
                <Icon className={`w-4 h-4 ${item.highlight ? 'text-rose-400' : ''}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      
    </aside>
  );
};
