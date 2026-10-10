import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Bell, AlertTriangle, CheckCircle, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AlertBanner = () => {
  const { liveAlerts, dismissAlert } = useWebSocket();

  if (liveAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col space-y-3 max-w-md w-full pointer-events-none">
      {liveAlerts.slice(0, 3).map((alert, idx) => {
        const isUrgent = alert.event === 'NEW_TRANSFER_REQUEST' || alert.event === 'EXPIRY_WARNING';
        return (
          <div
            key={idx}
            className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-top-4 ${
              isUrgent
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-950/50 animate-emergency-pulse'
                : 'bg-slate-800/90 border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isUrgent ? 'bg-rose-600/30 text-rose-400' : 'bg-blue-600/30 text-blue-400'}`}>
                  {isUrgent ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold tracking-tight">
                    {alert.event === 'NEW_TRANSFER_REQUEST' && '⚡ Urgent Blood Request Received'}
                    {alert.event === 'TRANSFER_APPROVED' && '✅ Transfer Approved by Supplier'}
                    {alert.event === 'TRANSFER_STATUS_CHANGED' && '📦 Transfer Status Updated'}
                    {alert.event === 'EXPIRY_WARNING' && '⏳ Automated Expiry Alert (<72h)'}
                    {alert.event === 'HIS_INVENTORY_SYNCED' && '🔄 External HIS Batch Synced'}
                    {!['NEW_TRANSFER_REQUEST', 'TRANSFER_APPROVED', 'TRANSFER_STATUS_CHANGED', 'EXPIRY_WARNING', 'HIS_INVENTORY_SYNCED'].includes(alert.event) && 'System Notification'}
                  </h4>
                  <p className="text-xs mt-1 text-slate-300 leading-relaxed">{alert.message}</p>
                </div>
              </div>
              <button
                onClick={() => dismissAlert(idx)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-700/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {alert.event === 'NEW_TRANSFER_REQUEST' && (
              <div className="mt-3 pt-2.5 border-t border-rose-800/40 flex justify-end">
                <Link
                  to="/transfers"
                  onClick={() => dismissAlert(idx)}
                  className="inline-flex items-center text-xs font-semibold text-rose-300 hover:text-white bg-rose-700/50 px-3 py-1 rounded-md border border-rose-500/40 transition-colors"
                >
                  Review & Lock Batch <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
