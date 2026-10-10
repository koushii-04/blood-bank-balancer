/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ServerCog, Send, CheckCircle2, AlertCircle, Code, ShieldCheck, RefreshCw } from 'lucide-react';

export const HisSyncPage = () => {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [targetFacilityId, setTargetFacilityId] = useState(2);
  const [apiKey, setApiKey] = useState('his_sec_token_9921_apollo');
  const [payloadJson, setPayloadJson] = useState('');
  const [responseLog, setResponseLog] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const facs = await api.facilities.list();
        setFacilities(facs);
        if (facs.length > 1) {
          setTargetFacilityId(facs[1].facility_id);
        }
      } catch (err) {
        console.error('Error fetching facilities:', err);
      }
    };
    loadFacilities();
  }, []);

  const generateDefaultPayload = (facId) => {
    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + 28);

    return JSON.stringify(
      {
        hospital_system_id: `HIS-NODE-SYS-${facId}`,
        facility_id: Number(facId),
        api_key: apiKey,
        sync_timestamp: new Date().toISOString(),
        batches: [
          {
            batch_code: `HIS-BATCH-AUTO-${Date.now().toString().slice(-4)}`,
            blood_group: 'O-',
            component_type: 'WHOLE_BLOOD',
            units_available: 5,
            collection_date: today.toISOString().split('T')[0],
            expiry_date: expiryDate.toISOString().split('T')[0]
          },
          {
            batch_code: `HIS-BATCH-AUTO-${(Date.now() + 1).toString().slice(-4)}`,
            blood_group: 'AB+',
            component_type: 'PLASMA',
            units_available: 8,
            collection_date: today.toISOString().split('T')[0],
            expiry_date: expiryDate.toISOString().split('T')[0]
          }
        ]
      },
      null,
      2
    );
  };

  useEffect(() => {
    if (targetFacilityId) {
      setPayloadJson(generateDefaultPayload(targetFacilityId));
    }
  }, [targetFacilityId]);

  const handleSyncSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResponseLog(null);
    try {
      const parsed = JSON.parse(payloadJson);
      const resp = await api.his.sync(parsed);
      setResponseLog({
        status: 'SUCCESS',
        code: 200,
        data: resp,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err) {
      setResponseLog({
        status: 'ERROR',
        code: err.status || 400,
        message: err.message || 'Webhook invocation error',
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mb-2">
            <ServerCog className="w-3.5 h-3.5" />
            External HIS API Webhook Integration (Feature 5)
          </div> */}
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Third-Party Hospital Information System Sync
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Push real-time batch records into the balancer.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Webhook Dispatcher / Simulator */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-rose-400" />
                Simulate Outbound HIS Webhook Dispatch
              </h2>
              <button
                onClick={() => setPayloadJson(generateDefaultPayload(targetFacilityId))}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reset Sample Payload
              </button>
            </div>

            <form onSubmit={handleSyncSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">
                    Target Hospital System (Facility)
                  </label>
                  <select
                    value={targetFacilityId}
                    onChange={(e) => setTargetFacilityId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  >
                    {facilities.map((f) => (
                      <option key={f.facility_id} value={f.facility_id}>
                        {f.name} (ID #{f.facility_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">
                    API Authorization Key
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1">
                  Webhook JSON Payload (<code className="text-rose-300">POST /api/his/sync-inventory</code>)
                </label>
                <textarea
                  rows={12}
                  value={payloadJson}
                  onChange={(e) => setPayloadJson(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-rose-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? 'Dispatching Webhook...' : 'Push Automated HIS Update'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Response Inspector & Architecture Specifications */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Webhook Response Inspector
            </h2>

            {!responseLog ? (
              <div className="text-center py-16 text-xs text-slate-400 space-y-2">
                <ServerCog className="w-8 h-8 text-slate-600 mx-auto" />
                <div>Submit a webhook payload to inspect live response headers & database sync metrics.</div>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      responseLog.status === 'SUCCESS'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}
                  >
                    HTTP {responseLog.code} {responseLog.status}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Time: {responseLog.timestamp}
                  </span>
                </div>

                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto">
                  {JSON.stringify(responseLog.data || { error: responseLog.message }, null, 2)}
                </pre>

                {responseLog.status === 'SUCCESS' && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Inventory batches atomically upserted and real-time WebSocket event broadcasted to clinic dashboard.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Integration Specs */}
          {/* <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2.5">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider">
              Integration API Specification
            </h3>
            <ul className="space-y-1.5 text-[11px] list-disc list-inside leading-relaxed">
              <li><b>Protocol:</b> HTTPS REST / Webhook POST</li>
              <li><b>Endpoint:</b> <code className="text-rose-300">/api/his/sync-inventory</code></li>
              <li><b>Payload:</b> Standard JSON batch array with collection & expiration timestamps.</li>
              <li><b>Concurrency:</b> Thread-safe database transactions with automatic state restoration.</li>
            </ul>
          </div> */}
        </div>
      </div>
    </div>
  );
};
