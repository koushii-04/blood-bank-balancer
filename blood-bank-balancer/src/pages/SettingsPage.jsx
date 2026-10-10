/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Settings as SettingsIcon, 
  User, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Compass, 
  Key, 
  Copy, 
  Check, 
  Loader2,
  Navigation,
  Sparkles
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom Pin Icon for Location Picker
const createPickerIcon = () => {
  return L.divIcon({
    className: 'custom-location-marker',
    html: `
      <div style="
        background-color: #e11d48;
        color: white;
        font-weight: bold;
        font-size: 12px;
        padding: 6px 12px;
        border-radius: 9999px;
        border: 2px solid white;
        box-shadow: 0 4px 15px rgba(225, 29, 72, 0.6);
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
      ">
        <span>📍</span>
        <span>Drag / Click to Set Location</span>
      </div>
    `,
    iconSize: [180, 28],
    iconAnchor: [90, 14],
  });
};

function LocationPickerEvents({ onLocationSelected }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom() || 13);
    }
  }, [center, map]);
  return null;
}

export const SettingsPage = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'facility', 'alerts', 'api'

  // User Profile Form State
  const [profileForm, setProfileForm] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phoneNumber: user?.phone_number || '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  // Facility Form State
  const [facilityForm, setFacilityForm] = useState({
    facilityId: user?.facility?.facility_id || null,
    name: user?.facility?.name || '',
    facilityType: user?.facility?.facility_type || 'HOSPITAL',
    address: user?.facility?.address || '',
    contactPhone: user?.facility?.contact_phone || '',
    contactEmail: user?.facility?.contact_email || '',
    latitude: user?.facility?.latitude ?? 12.9716,
    longitude: user?.facility?.longitude ?? 77.5946,
  });

  // Alert & Automation Preferences (stored in localStorage)
  const [alertSettings, setAlertSettings] = useState({
    enableAudioAlerts: localStorage.getItem('pref_audio_alerts') !== 'false',
    expiryThresholdHours: localStorage.getItem('pref_expiry_hours') || '72',
    shortageWarningUnits: localStorage.getItem('pref_shortage_units') || '5',
    autoRoutingPriority: true,
  });

  // Feedback states
  const [profileLoading, setProfileLoading] = useState(false);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [copiedKey, setCopiedKey] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);

  // Sync state when user object updates
  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        fullName: user.full_name || '',
        email: user.email || '',
        phoneNumber: user.phone_number || ''
      }));

      if (user.facility) {
        setFacilityForm({
          facilityId: user.facility.facility_id,
          name: user.facility.name || '',
          facilityType: user.facility.facility_type || 'HOSPITAL',
          address: user.facility.address || '',
          contactPhone: user.facility.contact_phone || '',
          contactEmail: user.facility.contact_email || '',
          latitude: user.facility.latitude ?? 12.9716,
          longitude: user.facility.longitude ?? 77.5946,
        });
      }
    }
  }, [user]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (profileForm.newPassword) {
      if (!profileForm.currentPassword) {
        setFeedback({ type: 'error', message: 'Current password is required to set a new password.' });
        return;
      }
      if (profileForm.newPassword !== profileForm.confirmNewPassword) {
        setFeedback({ type: 'error', message: 'New passwords do not match.' });
        return;
      }
      if (profileForm.newPassword.length < 6) {
        setFeedback({ type: 'error', message: 'New password must be at least 6 characters.' });
        return;
      }
    }

    setProfileLoading(true);
    try {
      const payload = {
        full_name: profileForm.fullName.trim(),
        email: profileForm.email.trim().toLowerCase(),
        phone_number: profileForm.phoneNumber.trim() || null,
        current_password: profileForm.currentPassword || null,
        new_password: profileForm.newPassword || null,
      };

      await api.auth.updateProfile(payload);
      await refreshUser();
      setProfileForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
      setFeedback({ type: 'success', message: 'Personal profile & contact records updated successfully!' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Facility & Location Update
  const handleFacilitySubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!facilityForm.facilityId) {
      setFeedback({ type: 'error', message: 'No facility linked to this account to update.' });
      return;
    }

    const lat = Number(facilityForm.latitude);
    const lon = Number(facilityForm.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setFeedback({ type: 'error', message: 'Latitude must be a valid number between -90 and 90.' });
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setFeedback({ type: 'error', message: 'Longitude must be a valid number between -180 and 180.' });
      return;
    }

    setFacilityLoading(true);
    try {
      const payload = {
        name: facilityForm.name.trim(),
        facility_type: facilityForm.facilityType,
        address: facilityForm.address.trim(),
        contact_phone: facilityForm.contactPhone.trim(),
        contact_email: facilityForm.contactEmail.trim().toLowerCase(),
        latitude: lat,
        longitude: lon,
      };

      await api.facilities.update(facilityForm.facilityId, payload);
      await refreshUser();
      setFeedback({ 
        type: 'success', 
        message: 'Facility details, official address, and GPS coordinates updated! Proximity triage routing will now use your new location.' 
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update facility details.' });
    } finally {
      setFacilityLoading(false);
    }
  };

  // Detect Current Geolocation
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setFeedback({ type: 'error', message: 'Geolocation is not supported by your browser.' });
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setFacilityForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon
        }));
        setGeoLocating(false);
        setFeedback({ type: 'info', message: `Detected GPS location: ${lat}, ${lon}. Click "Save Facility & Location" to apply.` });
      },
      (err) => {
        setGeoLocating(false);
        setFeedback({ type: 'error', message: `Could not retrieve GPS location: ${err.message}` });
      }
    );
  };

  // Map pin drag/click update
  const handleMapLocationSelect = (lat, lon) => {
    setFacilityForm((prev) => ({
      ...prev,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lon.toFixed(6))
    }));
  };

  // Save Preferences
  const handleSaveAlertPreferences = (e) => {
    e.preventDefault();
    localStorage.setItem('pref_audio_alerts', String(alertSettings.enableAudioAlerts));
    localStorage.setItem('pref_expiry_hours', String(alertSettings.expiryThresholdHours));
    localStorage.setItem('pref_shortage_units', String(alertSettings.shortageWarningUnits));
    setFeedback({ type: 'success', message: 'Notification & automation preferences saved.' });
  };

  // Copy API Token
  const handleCopyApiToken = () => {
    const token = `his_key_${user?.facility?.facility_id || 'reg'}_${btoa(user?.email || 'api').slice(0, 16)}`;
    navigator.clipboard.writeText(token);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const currentMapCenter = [Number(facilityForm.latitude) || 12.9716, Number(facilityForm.longitude) || 77.5946];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold mb-2">
            <SettingsIcon className="w-3.5 h-3.5" />
            Configuration & Profile Management
          </div> */}
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Facility Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {/* Update personal contact records, hospital address & phone, GPS triage routing coordinates, and alert thresholds. */}
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border flex items-center justify-between animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-red-950/60 border-red-500/40 text-red-200'
              : 'bg-blue-950/60 border-blue-500/40 text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', message: '' })}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => { setActiveTab('profile'); setFeedback({ type: '', message: '' }); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/60'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          Personal Profile
        </button>

        <button
          onClick={() => { setActiveTab('facility'); setFeedback({ type: '', message: '' }); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'facility'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/60'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Facility & GPS Location
        </button>

        <button
          onClick={() => { setActiveTab('alerts'); setFeedback({ type: '', message: '' }); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'alerts'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/60'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          Alert & Automation
        </button>

        {/* <button
          onClick={() => { setActiveTab('api'); setFeedback({ type: '', message: '' }); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'api'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/60'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          HIS API Tokens
        </button> */}
      </div>

      {/* TAB 1: PERSONAL PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-rose-400" />
                Personal Profile & Contact Details
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {/* Update your name, direct contact phone number, and work email. */}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-rose-300 font-mono border border-slate-700">
              Role: {user?.role}
            </span>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name & Title
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                    placeholder="e.g. Dr. Koushitha Senthilkumar"
                  />
                </div>
              </div>

              {/* Work Email */}
              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                    placeholder="user@hospital.org"
                  />
                </div>
              </div>

              {/* Direct Phone Number */}
              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Direct Phone / Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={profileForm.phoneNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Associated Facility Info */}
              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Associated Healthcare Center
                </label>
                <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>{user?.facility?.name || 'Regional Administration Oversight'}</span>
                </div>
              </div>
            </div>

            {/* Password Change Section */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                Change Password (Leave blank to keep existing password)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={profileForm.newPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={profileForm.confirmNewPassword}
                    onChange={(e) => setProfileForm({ ...profileForm, confirmNewPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {profileLoading ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: FACILITY & GPS LOCATION */}
      {activeTab === 'facility' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rose-400" />
                  Facility Records, Official Contact & Location Coordinates
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {/* Configure your clinic or hospital's official address, emergency hotline, and GPS coordinates for distance-based Haversine triage. */}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={geoLocating}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 ${geoLocating ? 'animate-spin' : ''}`} />
                {geoLocating ? 'Detecting...' : 'Detect Current GPS'}
              </button>
            </div>

            <form onSubmit={handleFacilitySubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Facility Name */}
                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Facility Name
                  </label>
                  <input
                    type="text"
                    required
                    value={facilityForm.name}
                    onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                    placeholder="e.g. Apollo Care Clinic"
                  />
                </div>

                {/* Facility Type */}
                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Facility Classification
                  </label>
                  <select
                    value={facilityForm.facilityType}
                    onChange={(e) => setFacilityForm({ ...facilityForm, facilityType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-rose-500"
                  >
                    <option value="HOSPITAL">Hospital</option>
                    <option value="CLINIC">Clinic</option>
                    <option value="BLOOD_BANK">Central Blood Bank</option>
                  </select>
                </div>

                {/* Official Address */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Street Address & Location Description
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={facilityForm.address}
                      onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                      placeholder="e.g. 45 Koramangala 4th Block, Bengaluru"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Emergency Blood Dispatch Hotline (Phone)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={facilityForm.contactPhone}
                      onChange={(e) => setFacilityForm({ ...facilityForm, contactPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                      placeholder="+91 80 2555 2002"
                    />
                  </div>
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Official Facility Blood Bank Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={facilityForm.contactEmail}
                      onChange={(e) => setFacilityForm({ ...facilityForm, contactEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                      placeholder="bloodbank@facility.org"
                    />
                  </div>
                </div>

                {/* Latitude */}
                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    GPS Latitude (Decimal Degrees)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={facilityForm.latitude}
                    onChange={(e) => setFacilityForm({ ...facilityForm, latitude: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                    placeholder="12.971600"
                  />
                </div>

                {/* Longitude */}
                <div>
                  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    GPS Longitude (Decimal Degrees)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={facilityForm.longitude}
                    onChange={(e) => setFacilityForm({ ...facilityForm, longitude: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                    placeholder="77.594600"
                  />
                </div>
              </div>

              {/* Interactive Location Picker Map */}
              <div className="space-y-2 pt-3">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-rose-400" />
                    Interactive Map Location Picker (Click anywhere to place pin)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Pin at: {facilityForm.latitude}, {facilityForm.longitude}
                  </span>
                </div>

                <div className="h-[320px] rounded-xl overflow-hidden border border-slate-800 relative shadow-inner">
                  <MapContainer
                    center={currentMapCenter}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <MapUpdater center={currentMapCenter} />
                    <LocationPickerEvents onLocationSelected={handleMapLocationSelect} />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                      position={currentMapCenter}
                      icon={createPickerIcon()}
                    />
                  </MapContainer>
                </div>
              </div>

              {/* Routing Impact Explainer */}
              {/* <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Haversine Triage Proximity Impact
                </div>
                <p className="text-[11px] leading-relaxed">
                  Updating this location updates your node in the regional network graph. When neighboring hospitals suffer emergency blood shortages, the routing engine calculates exact distance from these GPS coordinates using spherical geometry.
                </p>
              </div> */}

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={facilityLoading}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {facilityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {facilityLoading ? 'Saving Facility...' : 'Save Facility & Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: ALERT & AUTOMATION PREFERENCES */}
      {activeTab === 'alerts' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-400" />
              Real-Time Alert Thresholds & Notification Rules
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {/* Customize audio alarms and background automated sweep schedules for your dashboard. */}
            </p>
          </div>

          <form onSubmit={handleSaveAlertPreferences} className="space-y-5 text-xs">
            {/* Audio Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-slate-200">Audio Alarm on Urgent Demand</div>
                <div className="text-slate-400 text-xs">
                  Plays a high-priority audible tone whenever an emergency transfer request is received via WebSockets.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertSettings.enableAudioAlerts}
                  onChange={(e) => setAlertSettings({ ...alertSettings, enableAudioAlerts: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {/* Expiry Window */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-sm text-slate-200">Automated Expiry Warning Horizon</div>
              <div className="text-slate-400 text-xs">
                How far in advance the background worker sweeps batches to flag them for urgent transfer prioritization.
              </div>
              <div className="flex items-center gap-3 pt-2">
                {[
                  { value: '24', label: '24 Hours (< 1 day)' },
                  { value: '48', label: '48 Hours (< 2 days)' },
                  { value: '72', label: '72 Hours (< 3 days - Recommended)' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAlertSettings({ ...alertSettings, expiryThresholdHours: opt.value })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      alertSettings.expiryThresholdHours === opt.value
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shortage Threshold */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-bold text-sm text-slate-200">Critical Blood Shortage Threshold</div>
              <div className="text-slate-400 text-xs">
                Trigger a visual shortage warning banner on dashboard when available units for any blood group fall below this count.
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={alertSettings.shortageWarningUnits}
                  onChange={(e) => setAlertSettings({ ...alertSettings, shortageWarningUnits: e.target.value })}
                  className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 font-bold focus:outline-none focus:border-rose-500 font-mono"
                />
                <span className="text-slate-400 text-xs">Units of blood</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Preferences
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
