/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BloodGroupBadge, PriorityBadge } from '../components/Badge';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Compass, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Truck,
  Sparkles,
  Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom Leaflet Icons using SVG Data URIs
const createCustomIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        font-weight: bold;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 9999px;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      ">
        <span>📍</span>
        <span>${label}</span>
      </div>
    `,
    iconSize: [80, 24],
    iconAnchor: [40, 12],
  });
};

function MapAutoCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 12);
    }
  }, [center, map]);
  return null;
}

export const TriagePage = () => {
  const { user } = useAuth();
  const [bloodGroup, setBloodGroup] = useState('O-');
  const [componentType, setComponentType] = useState('WHOLE_BLOOD');
  const [unitsRequested, setUnitsRequested] = useState(2);
  const [maxRadiusKm, setMaxRadiusKm] = useState(50);
  const [requestingFacilityId, setRequestingFacilityId] = useState(user?.facility_id || 1);

  const [facilities, setFacilities] = useState([]);
  const [triageResults, setTriageResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Selected route for map highlight
  const [highlightedMatch, setHighlightedMatch] = useState(null);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const facs = await api.facilities.list();
        setFacilities(facs);
        if (user?.facility_id) {
          setRequestingFacilityId(user.facility_id);
        } else if (facs.length > 0) {
          setRequestingFacilityId(facs[0].facility_id);
        }
      } catch (err) {
        console.error('Error fetching facilities:', err);
      }
    };
    loadFacilities();
  }, [user]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const data = await api.triage.findMatch({
        blood_group: bloodGroup,
        component_type: componentType,
        units_requested: parseInt(unitsRequested, 10),
        max_radius_km: parseFloat(maxRadiusKm),
        requesting_facility_id: requestingFacilityId
      });
      setTriageResults(data);
      if (data.recommended_matches?.length > 0) {
        setHighlightedMatch(data.recommended_matches[0]);
      } else {
        setHighlightedMatch(null);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to execute proximity triage calculation');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestTransfer = async (match) => {
    setSubmittingId(match.inventory_id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const resp = await api.triage.requestTransfer({
        supplying_facility_id: match.facility_id,
        blood_group: bloodGroup,
        units_requested: parseInt(unitsRequested, 10),
        priority: 'CRITICAL',
        inventory_id: match.inventory_id
      });
      setSuccessMessage(
        `✅ Emergency Transfer Request #${resp.request_id} created successfully! Real-time WebSocket alert pushed to ${match.name}.`
      );
      // Re-run search to update matches
      handleSearch();
    } catch (err) {
      setErrorMessage(err.message || 'Transfer request failed');
    } finally {
      setSubmittingId(null);
    }
  };

  const currentReqFacility = facilities.find((f) => f.facility_id === Number(requestingFacilityId));
  const defaultCenter = currentReqFacility ? [currentReqFacility.latitude, currentReqFacility.longitude] : [12.9716, 77.5946];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mb-2"> */}
            {/* <Compass className="w-3.5 h-3.5" /> */}
            {/* Algorithmic Proximity Triage Engine (Feature 1) */}
          {/* </div> */}
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Distance-Based Blood Allocation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {/* Calculates great-circle distance via the Haversine formula and optimizes for near-expiring inventory surplus. */}
          </p>
        </div>
      </div>

      {/* Notification banners */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Triage Search Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
          1. Emergency Demand Criteria
        </h2>
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Requesting Facility */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Requesting Clinic / Hospital
            </label>
            <select
              value={requestingFacilityId}
              onChange={(e) => setRequestingFacilityId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              {facilities.map((f) => (
                <option key={f.facility_id} value={f.facility_id}>
                  {f.name} ({f.facility_type})
                </option>
              ))}
            </select>
          </div>

          {/* Blood Group */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Required Blood Group
            </label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-rose-500"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg} {bg === 'O-' ? '(Universal Donor)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Component */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Blood Component
            </label>
            <select
              value={componentType}
              onChange={(e) => setComponentType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="WHOLE_BLOOD">Whole Blood</option>
              <option value="RED_CELLS">Packed Red Cells</option>
              <option value="PLATELETS">Platelets</option>
              <option value="PLASMA">Plasma</option>
            </select>
          </div>

          {/* Units */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Units Requested
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={unitsRequested}
              onChange={(e) => setUnitsRequested(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Submit Search Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Calculating...' : 'Run Proximity Triage'}
              <Zap className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Geospatial Map and Ranked Matches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Geospatial Routing Visualizer</h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Coordinates: {currentReqFacility?.latitude}, {currentReqFacility?.longitude}
              </span>
            </div>

            <div className="h-[420px] rounded-xl overflow-hidden relative border border-slate-800">
              <MapContainer
                center={defaultCenter}
                zoom={12}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <MapAutoCenter center={defaultCenter} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Requesting Facility Pin */}
                {currentReqFacility && (
                  <Marker
                    position={[currentReqFacility.latitude, currentReqFacility.longitude]}
                    icon={createCustomIcon('#e11d48', `REQ: ${currentReqFacility.name}`)}
                  >
                    <Popup>
                      <div className="p-2 text-xs">
                        <div className="font-bold text-rose-400">REQUESTER: {currentReqFacility.name}</div>
                        <div>{currentReqFacility.address}</div>
                        <div className="mt-1 font-semibold text-white">Demanding: {unitsRequested} units of {bloodGroup}</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Matching Supplier Pins & Route Polylines */}
                {triageResults?.recommended_matches?.map((m) => {
                  const isHighlighted = highlightedMatch?.inventory_id === m.inventory_id;
                  return (
                    <React.Fragment key={m.inventory_id}>
                      <Marker
                        position={[m.latitude, m.longitude]}
                        icon={createCustomIcon(
                          m.is_expiring_soon ? '#f59e0b' : '#3b82f6',
                          `${m.distance_km}km • ${m.name}`
                        )}
                        eventHandlers={{
                          click: () => setHighlightedMatch(m)
                        }}
                      >
                        <Popup>
                          <div className="p-2 text-xs space-y-1">
                            <div className="font-bold text-blue-400">{m.name}</div>
                            <div>{m.address}</div>
                            <div className="text-slate-300">Distance: <b className="text-white">{m.distance_km} km</b> (~{m.estimated_transit_minutes} min transit)</div>
                            <div className="text-slate-300">Available: <b className="text-emerald-400">{m.units_available} units</b></div>
                            <div className="text-slate-300">Batch Expiry: <b className={m.is_expiring_soon ? 'text-amber-400' : 'text-slate-200'}>{m.days_until_expiry} days ({m.expiry_date})</b></div>
                          </div>
                        </Popup>
                      </Marker>

                      {/* Route Line from Requester to Supplier */}
                      {currentReqFacility && (
                        <Polyline
                          positions={[
                            [currentReqFacility.latitude, currentReqFacility.longitude],
                            [m.latitude, m.longitude]
                          ]}
                          pathOptions={{
                            color: isHighlighted ? '#e11d48' : '#3b82f6',
                            weight: isHighlighted ? 4 : 2,
                            dashArray: isHighlighted ? undefined : '6, 6',
                            opacity: isHighlighted ? 0.9 : 0.4
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-slate-400 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                <span>Requesting Facility</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Expiring Batch Surplus (&lt;72h Urgent Routing)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span>Standard Matching Supplier</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ranked Triage Recommendations */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Ranked Supplier Recommendations
              </h3>
              {triageResults && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {triageResults.total_matching_facilities} found
                </span>
              )}
            </div>

            {!triageResults ? (
              <div className="text-center py-16 px-4 space-y-3">
                <Compass className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Select your blood group criteria and click <b>Run Proximity Triage</b> to calculate the nearest matching facilities.
                </p>
              </div>
            ) : triageResults.recommended_matches?.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2 bg-slate-950/40 rounded-xl border border-slate-800">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-sm font-bold text-slate-200">No Matching Surplus Found</div>
                <p className="text-xs text-slate-400">{triageResults.notes}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {triageResults.recommended_matches.map((match, idx) => {
                  const isHighlighted = highlightedMatch?.inventory_id === match.inventory_id;
                  return (
                    <div
                      key={match.inventory_id}
                      onClick={() => setHighlightedMatch(match)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isHighlighted
                          ? 'bg-gradient-to-b from-rose-950/40 to-slate-900 border-rose-500/60 shadow-lg shadow-rose-950/40'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Card Header: Rank & Facility Name */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            idx === 0 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-sm text-white">{match.name}</div>
                            <div className="text-[11px] text-slate-400">{match.address}</div>
                          </div>
                        </div>

                        {match.is_expiring_soon && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            ⏳ Waste Prevention
                          </span>
                        )}
                      </div>

                      {/* Distance & Transit Time Metrics */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                        <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Haversine Distance</div>
                          <div className="text-sm font-extrabold text-rose-300 font-mono mt-0.5">
                            {match.distance_km} km
                          </div>
                        </div>
                        <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Est. Transit Time</div>
                          <div className="text-sm font-extrabold text-blue-300 font-mono mt-0.5 flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" />
                            ~{match.estimated_transit_minutes} min
                          </div>
                        </div>
                      </div>

                      {/* Batch Details */}
                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-300">
                        <div>
                          Batch: <span className="font-mono text-slate-200">{match.batch_code}</span>
                        </div>
                        <div className={match.is_expiring_soon ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          Expires in {match.days_until_expiry} day(s)
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Available: <b className="text-white">{match.units_available}</b> units
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestTransfer(match);
                          }}
                          disabled={submittingId === match.inventory_id}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {submittingId === match.inventory_id ? 'Dispatching...' : 'Request Atomic Transfer'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mathematical Rationale Card */}
        </div>
      </div>
    </div>
  );
};
