/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { BloodGroupBadge, StatusBadge, PriorityBadge } from '../components/Badge';
import { 
  Droplet, 
  Clock, 
  ArrowLeftRight, 
  Building2,  
  Navigation, 
  ChevronRight, 
  TrendingUp, 
  Zap, 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { latestEvent } = useWebSocket();
  const [summary, setSummary] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [sumData, transData, facData] = await Promise.all([
        api.inventory.getSummary(user?.facility_id),
        api.transfers.list(),
        api.facilities.list(),
      ]);
      setSummary(sumData);
      setTransfers(transData);
      setFacilities(facData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, latestEvent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400">Loading Regional Balancer Metrics...</span>
        </div>
      </div>
    );
  }

  const pendingTransfersCount = transfers.filter((t) => t.status === 'PENDING').length;
  const inTransitCount = transfers.filter((t) => t.status === 'IN_TRANSIT').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border border-rose-900/40 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold"> */}
              {/* <Zap className="w-3.5 h-3.5" /> */}
              {/* Automated B2B Balancer Network Active */}
            {/* </div> */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {user?.facility ? user.facility.name : 'Central Healthcare Command Center'}
            </h1>
            <p className="text-sm text-slate-300">
              Monitoring regional blood volume, batch expiration lifecycles, and automated geospatial proximity triage in real time.
            </p>
          </div>

          <Link
            to="/triage"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-xl shadow-rose-950 transition-all group shrink-0"
          >
            <Navigation className="w-4 h-4 group-hover:animate-bounce" />
            Launch Proximity Triage
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Available Stock</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {summary?.total_available_units ?? 0}
            <span className="text-sm font-normal text-slate-400 ml-1.5">units</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Active across all blood types</span>
          </div>
        </div>

        {/* Expiring Soon (<72h) */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-amber-900/40 space-y-2 relative overflow-hidden">
          {summary?.total_expiring_soon_units > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 animate-pulse"></div>
          )}
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <span>Expiring &lt; 72h</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400">
            {summary?.total_expiring_soon_units ?? 0}
            <span className="text-sm font-normal text-slate-400 ml-1.5">units</span>
          </div>
          <div className="text-xs text-amber-300/80">
            Automated priority flags for rapid routing
          </div>
        </div>

        {/* Pending Requests */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Pending Approvals</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {pendingTransfersCount}
            <span className="text-sm font-normal text-slate-400 ml-1.5">requests</span>
          </div>
          <div className="text-xs text-slate-400">
            {inTransitCount} batch(es) currently in transit
          </div>
        </div>

        {/* Connected Facilities */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Network Facilities</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {facilities.length}
            <span className="text-sm font-normal text-slate-400 ml-1.5">hospitals/clinics</span>
          </div>
          <div className="text-xs text-slate-400">
            Geospatially mapped & synced
          </div>
        </div>
      </div>

      {/* Blood Group Inventory Matrix */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Supply Inventory by Blood Group</h2>
            <p className="text-xs text-slate-400">
              Real-time available units and near-expiration status
            </p>
          </div>
          <Link
            to="/inventory"
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            Manage Inventory <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {summary?.groups?.map((group) => {
            const isLowStock = group.total_units < 5;
            const hasExpiring = group.expiring_soon_units > 0;
            return (
              <div
                key={group.blood_group}
                className={`p-3.5 rounded-xl border text-center transition-all ${
                  isLowStock
                    ? 'bg-red-950/20 border-red-800/40 shadow-inner shadow-red-950'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <BloodGroupBadge bloodGroup={group.blood_group} size="sm" />
                <div className="text-xl font-extrabold text-white mt-2">
                  {group.total_units}
                </div>
                <div className="text-[10px] text-slate-400">Available</div>

                {hasExpiring && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] font-semibold text-amber-400 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{group.expiring_soon_units} exp &lt; 72h</span>
                  </div>
                )}
                {isLowStock && !hasExpiring && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] font-bold text-red-400">
                    Low Stock
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transfers & Active Network Operations */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Inter-Clinic Transfer Activity</h2>
            <p className="text-xs text-slate-400">
              Atomic state transactions & real-time status transitions
            </p>
          </div>
          <Link
            to="/transfers"
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            View All Pipeline <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {transfers.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No transfer requests in pipeline yet. Launch proximity triage to request blood.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Request</th>
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Distance</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transfers.slice(0, 5).map((t) => (
                  <tr key={t.request_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300 font-bold">
                      #{t.request_id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {t.requesting_facility?.name || `Facility #${t.requesting_facility_id}`}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      {t.supplying_facility?.name || `Facility #${t.supplying_facility_id}`}
                    </td>
                    <td className="py-3 px-4">
                      <BloodGroupBadge bloodGroup={t.blood_group} size="sm" />
                      <span className="ml-1.5 text-slate-400 font-bold">×{t.units_requested}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {t.distance_km} km
                    </td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
