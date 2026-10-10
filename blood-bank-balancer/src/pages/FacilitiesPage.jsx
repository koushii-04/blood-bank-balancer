/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Building2, Phone, Mail, MapPin, Droplet, Plus } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const createFacilityIcon = (type) => {
  const color = type === 'HOSPITAL' ? '#e11d48' : type === 'CLINIC' ? '#3b82f6' : '#8b5cf6';
  return L.divIcon({
    className: 'facility-marker',
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
        <span>🏥</span>
        <span>${type}</span>
      </div>
    `,
    iconSize: [80, 24],
    iconAnchor: [40, 12],
  });
};

export const FacilitiesPage = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const data = await api.facilities.list();
        setFacilities(data);
      } catch (err) {
        console.error('Error fetching facilities:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFacilities();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            Healthcare Facility Directory
          </div> */}
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Participating Regional Medical Network
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Hospitals, outpatient clinics, and blood centers synchronized across geospatial routing coordinates.
          </p>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-400" />
          Network Geospatial Map
        </h2>
        <div className="h-[380px] rounded-xl overflow-hidden border border-slate-800">
          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={11}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {facilities.map((fac) => (
              <Marker
                key={fac.facility_id}
                position={[fac.latitude, fac.longitude]}
                icon={createFacilityIcon(fac.facility_type)}
              >
                <Popup>
                  <div className="p-2 text-xs space-y-1">
                    <div className="font-bold text-rose-400">{fac.name}</div>
                    <div className="text-slate-300 font-semibold">{fac.facility_type}</div>
                    <div>{fac.address}</div>
                    <div className="text-slate-400">Phone: {fac.contact_phone}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {facilities.map((fac) => (
          <div
            key={fac.facility_id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-rose-400 border border-slate-700 font-mono">
                  {fac.facility_type}
                </span>
                <h3 className="font-bold text-base text-white mt-1.5">{fac.name}</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">ID #{fac.facility_id}</span>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{fac.address || 'Address not listed'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{fac.contact_phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{fac.contact_email || 'N/A'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>GPS: {fac.latitude}, {fac.longitude}</span>
              <span className="text-emerald-400 font-bold">● Active Node</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
