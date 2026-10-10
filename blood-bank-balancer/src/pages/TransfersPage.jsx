/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { BloodGroupBadge, StatusBadge, PriorityBadge } from '../components/Badge';
import { 
  ArrowLeftRight, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Lock, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  X, 
  ShieldAlert,
  Zap
} from 'lucide-react';

export const TransfersPage = () => {
  const { user } = useAuth();
  const { latestEvent } = useWebSocket();
  const [transfers, setTransfers] = useState([]);
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming', 'outgoing', 'all'
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });

  // Auto-dismiss notifications after 10 seconds
  useEffect(() => {
    if (actionFeedback.message) {
      const timer = setTimeout(() => {
        setActionFeedback({ type: '', message: '' });
      }, 10000); // 10000ms = 10 seconds. Change to 15000 for 15 seconds.

      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);
  
  const fetchTransfers = async () => {
    setLoading(true);
    try {
      let params = {};
      if (activeTab === 'incoming') params.transfer_type = 'incoming';
      if (activeTab === 'outgoing') params.transfer_type = 'outgoing';
      if (activeTab === 'all' || user?.role === 'ADMIN') params.transfer_type = 'all';

      const data = await api.transfers.list(params);
      setTransfers(data);
    } catch (err) {
      console.error('Error fetching transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [activeTab, user, latestEvent]);

  const handleApprove = async (id) => {
    setActionLoadingId(id);
    setActionFeedback({ type: '', message: '' });
    try {
      await api.transfers.approve(id);
      setActionFeedback({
        type: 'success',
        message: `✅ Transfer #${id} approved atomically with SQL row-level lock (SELECT ... FOR UPDATE). Inventory reserved.`
      });
      fetchTransfers();
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `❌ Concurrency Conflict: ${err.message}`
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTransit = async (id) => {
    setActionLoadingId(id);
    try {
      await api.transfers.transit(id);
      setActionFeedback({
        type: 'success',
        message: `🚚 Transfer #${id} marked as IN_TRANSIT. Dispatch notifications broadcasted.`
      });
      fetchTransfers();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (id) => {
    setActionLoadingId(id);
    try {
      await api.transfers.complete(id);
      setActionFeedback({
        type: 'success',
        message: `📦 Transfer #${id} successfully marked as COMPLETED. Blood units delivered.`
      });
      fetchTransfers();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoadingId(id);
    try {
      await api.transfers.reject(id);
      setActionFeedback({
        type: 'info',
        message: `Transfer #${id} rejected.`
      });
      fetchTransfers();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mb-2">
            <Lock className="w-3.5 h-3.5" />
            Atomic State Transactions & Concurrency Control (Feature 3)
          </div> */}
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Inter-Clinic Transfer Tracking Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {/* Strict SQL database row-locking guarantees that two hospitals cannot accidentally claim the same blood units simultaneously. */}
          </p>
        </div>

        <button
          onClick={fetchTransfers}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Pipeline
        </button>
      </div>

      {/* Action feedback message */}
      {actionFeedback.message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : actionFeedback.type === 'error'
              ? 'bg-red-950/60 border-red-500/40 text-red-200'
              : 'bg-blue-950/60 border-blue-500/40 text-blue-200'
          }`}
        >
          <span>{actionFeedback.message}</span>
          <button
            onClick={() => setActionFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'incoming'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/60'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          📥 Incoming Requests (Supply from Us)
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'outgoing'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/60'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          📤 Outgoing Requests (Demanded by Us)
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/60'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          🌐 Regional Overview (All Facilities)
        </button>
      </div>

      {/* Transfers Table / Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading transfer pipeline...</div>
        ) : transfers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <ArrowLeftRight className="w-8 h-8 text-slate-600 mx-auto" />
            <div>No transfers found in this view.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Transfer ID</th>
                  <th className="py-3.5 px-4">Requesting Hospital</th>
                  <th className="py-3.5 px-4">Supplying Clinic</th>
                  <th className="py-3.5 px-4">Blood Required</th>
                  <th className="py-3.5 px-4">Distance</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transfers.map((t) => {
                  const isSupplyingFacility = user?.facility_id === t.supplying_facility_id || user?.role === 'ADMIN';
                  const isRequestingFacility = user?.facility_id === t.requesting_facility_id || user?.role === 'ADMIN';
                  const isActioning = actionLoadingId === t.request_id;

                  return (
                    <tr key={t.request_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        #{t.request_id}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {new Date(t.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {t.requesting_facility?.name || `Facility #${t.requesting_facility_id}`}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {t.supplying_facility?.name || `Facility #${t.supplying_facility_id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <BloodGroupBadge bloodGroup={t.blood_group} size="sm" />
                        <span className="ml-1.5 font-bold text-white">×{t.units_requested}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {t.distance_km} km
                      </td>
                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* PENDING ACTIONS (Supplying facility approves) */}
                          {t.status === 'PENDING' && isSupplyingFacility && (
                            <>
                              <button
                                onClick={() => handleApprove(t.request_id)}
                                disabled={isActioning}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Executes SELECT ... FOR UPDATE atomic lock"
                              >
                                <Lock className="w-3 h-3" />
                                {isActioning ? 'Locking...' : 'Approve & Lock'}
                              </button>
                              <button
                                onClick={() => handleReject(t.request_id)}
                                disabled={isActioning}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors cursor-pointer"
                                title="Reject Request"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* APPROVED ACTIONS (Dispatch transit) */}
                          {t.status === 'APPROVED' && isSupplyingFacility && (
                            <button
                              onClick={() => handleTransit(t.request_id)}
                              disabled={isActioning}
                              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Truck className="w-3 h-3" />
                              {isActioning ? 'Updating...' : 'Dispatch Transit'}
                            </button>
                          )}

                          {/* IN_TRANSIT ACTIONS (Requester confirms delivery) */}
                          {t.status === 'IN_TRANSIT' && isRequestingFacility && (
                            <button
                              onClick={() => handleComplete(t.request_id)}
                              disabled={isActioning}
                              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-950 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {isActioning ? 'Completing...' : 'Confirm Received'}
                            </button>
                          )}

                          {/* COMPLETED State indicator */}
                          {t.status === 'COMPLETED' && (
                            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Fulfilled
                            </span>
                          )}

                          {/* CANCELLED or REJECTED */}
                          {(t.status === 'REJECTED' || t.status === 'CANCELLED') && (
                            <span className="text-[11px] text-slate-500">Resolved</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Concurrency Rationale Explainer Card */}
      {/* <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-3">
        <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Technical Architecture: ACID Compliance & Concurrency Prevention</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          When a clinic approves a transfer, the engine initiates an explicit database transaction and locks the row matching the specific blood batch (using <code className="text-rose-300 font-mono">SELECT ... FOR UPDATE</code>). If multiple facilities simultaneously attempt to claim the last unit of a rare group (e.g. <code className="text-rose-300 font-mono">O-</code>), the first transaction commits atomically while the second receives an instant <code className="text-amber-300 font-mono">409 Conflict</code> error, eliminating duplicate allocations without data corruption.
        </p>
      </div> */}
    </div>
  );
};
