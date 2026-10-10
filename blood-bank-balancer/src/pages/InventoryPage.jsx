import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { BloodGroupBadge, StatusBadge } from '../components/Badge';
import { 
  Droplets, 
  Plus, 
  Clock, 
  RefreshCw,
  Building2,
  X
} from 'lucide-react';

export const InventoryPage = () => {
  const { user } = useAuth();
  const { latestEvent } = useWebSocket();
  const [inventories, setInventories] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [expiringSoonOnly, setExpiringSoonOnly] = useState(false);
  const [allFacilitiesView, setAllFacilitiesView] = useState(user?.role === 'ADMIN');

  // Add Batch Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(() => ({
    facility_id: user?.facility_id || '',
    blood_group: 'O+',
    component_type: 'WHOLE_BLOOD',
    units_available: 5,
    batch_code: `BATCH-${Date.now().toString().slice(-6)}`,
    collection_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'AVAILABLE'
  }));
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Wrapped in useCallback to prevent infinite render loops
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBloodGroup) params.blood_group = selectedBloodGroup;
      if (selectedStatus) params.status = selectedStatus;
      if (expiringSoonOnly) params.expiring_soon_only = 'true';
      if (allFacilitiesView || user?.role === 'ADMIN') params.all_facilities = 'true';

      const [data, facs] = await Promise.all([
        api.inventory.list(params),
        api.facilities.list()
      ]);
      setInventories(data);
      setFacilities(facs);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBloodGroup, selectedStatus, expiringSoonOnly, allFacilitiesView, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInventory();
  }, [fetchInventory, latestEvent]);

  const handleAddBatch = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const payload = {
        ...formData,
        facility_id: Number(formData.facility_id || user?.facility_id || facilities[0]?.facility_id),
        units_available: Number(formData.units_available)
      };
      await api.inventory.add(payload);
      setShowAddModal(false);
      fetchInventory();
    } catch (err) {
      setModalError(err.message || 'Failed to register blood batch');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteBatch = async (inventoryId) => {
    if (!window.confirm("Are you sure you want to permanently remove this expired batch?")) return;
    
    try {
      await api.inventory.delete(inventoryId); 
      fetchInventory(); 
    } catch (err) {
      console.error(err);
      alert('Failed to delete batch. Make sure the delete method exists in your api.js file.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mb-2">
            <Droplets className="w-3.5 h-3.5" />
            Inventory Control & Expiry Tracking (Feature 2)
          </div> */}
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Blood Stock & Expiration Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {allFacilitiesView
              ? 'Viewing all regional participating healthcare facilities (Admin Mode)'
              : `Scoped to local inventory for ${user?.facility?.name || 'Local Facility'}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormData({
                facility_id: user?.facility_id || facilities[0]?.facility_id || '',
                blood_group: 'O+',
                component_type: 'WHOLE_BLOOD',
                units_available: 5,
                batch_code: `BATCH-${Date.now().toString().slice(-6)}`,
                collection_date: new Date().toISOString().split('T')[0],
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'AVAILABLE'
              });
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Blood Batch
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedBloodGroup}
            onChange={(e) => setSelectedBloodGroup(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Blood Groups</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="RESERVED">RESERVED</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>

          <button
            onClick={() => setExpiringSoonOnly(!expiringSoonOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              expiringSoonOnly
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-950'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Expiring &lt; 72h Only
          </button>

          <button
            onClick={() => setAllFacilitiesView(!allFacilitiesView)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              allFacilitiesView
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            {allFacilitiesView ? 'Showing All Regional Facilities' : 'Local Facility Only'}
          </button>
        </div>

        <button
          onClick={fetchInventory}
          className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Loading inventory data...</div>
        ) : inventories.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <Droplets className="w-8 h-8 text-slate-600 mx-auto" />
            <div>No inventory batches matching selected criteria.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Batch Code</th>
                  <th className="py-3.5 px-4">Facility</th>
                  <th className="py-3.5 px-4">Blood Group</th>
                  <th className="py-3.5 px-4">Component</th>
                  <th className="py-3.5 px-4">Stock Units</th>
                  <th className="py-3.5 px-4">Collection Date</th>
                  <th className="py-3.5 px-4">Expiry Timeline</th>
                  <th className="py-3.5 px-4">Status & Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/60">
                {inventories.map((item) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isExpired = item.expiry_date < todayStr;

                  return (
                    <tr
                      key={item.inventory_id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        item.is_expiring_soon ? 'bg-amber-950/10' : ''
                      } ${isExpired ? 'opacity-75' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        {item.batch_code}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        {item.facility?.name || `Facility #${item.facility_id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <BloodGroupBadge bloodGroup={item.blood_group} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {item.component_type?.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-sm text-white">
                        {item.units_available} units
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {item.collection_date}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={`font-mono ${isExpired ? 'text-red-400 line-through' : 'text-slate-200'}`}>
                          {item.expiry_date}
                        </div>
                        {item.is_expiring_soon && !isExpired && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Expiring soon ({Math.round(item.hours_until_expiry)}h left)</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {isExpired ? (
                            <span className="px-2 py-1 rounded-md bg-red-950/80 text-red-400 text-[10px] font-bold border border-red-500/30 uppercase">
                              Expired
                            </span>
                          ) : (
                            <StatusBadge status={item.status} />
                          )}
                          
                          {isExpired && (
                            <button
                              onClick={() => handleDeleteBatch(item.inventory_id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 transition-colors cursor-pointer"
                              title="Delete Expired Batch"
                            >
                              <X className="w-4 h-4" />
                            </button>
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

      {/* Add Batch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-400" />
                Register New Blood Batch
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddBatch} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1">Target Facility</label>
                <select
                  value={formData.facility_id}
                  onChange={(e) => setFormData({ ...formData, facility_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                >
                  {facilities.map((f) => (
                    <option key={f.facility_id} value={f.facility_id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Blood Group</label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-bold"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Component</label>
                  <select
                    value={formData.component_type}
                    onChange={(e) => setFormData({ ...formData, component_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  >
                    <option value="WHOLE_BLOOD">Whole Blood</option>
                    <option value="RED_CELLS">Red Cells</option>
                    <option value="PLATELETS">Platelets</option>
                    <option value="PLASMA">Plasma</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Units Available</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.units_available}
                    onChange={(e) => setFormData({ ...formData, units_available: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Batch Code</label>
                  <input
                    type="text"
                    required
                    value={formData.batch_code}
                    onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Collection Date</label>
                  <input
                    type="date"
                    required
                    value={formData.collection_date}
                    onChange={(e) => setFormData({ ...formData, collection_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};