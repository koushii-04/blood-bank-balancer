import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  AlertCircle, 
  User, 
  Mail, 
  Shield, 
  Building2, 
  Lock, 
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const SignupPage = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const navigate = useNavigate();

 const [formData, setFormData] = useState({
  fullName: '',
  email: '',
  role: 'CLINIC_STAFF',

  facilityName: '',
  facilityType: 'HOSPITAL',
  address: '',

  password: '',
  confirmPassword: ''
});

  // const [facilities, setFacilities] = useState([]);
  // const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // useEffect(() => {
  //   let isMounted = true;
  //   const fetchFacilities = async () => {
  //     try {
  //       setFacilitiesLoading(true);
  //       const data = await api.facilities.list();
  //       if (isMounted) {
  //         setFacilities(data || []);
  //         if (data && data.length > 0) {
  //           setFormData((prev) => ({
  //             ...prev,
  //             facilityId: prev.facilityId || String(data[0].facility_id)
  //           }));
  //         }
  //       }
  //     } catch (err) {
  //       console.warn('Could not load facilities list:', err);
  //       // Fallback default facilities if backend is initializing
  //       if (isMounted) {
  //         const fallbackFacs = [
  //           { facility_id: 1, name: 'Metro Central Hospital', facility_type: 'HOSPITAL' },
  //           { facility_id: 2, name: 'Apollo Care Clinic', facility_type: 'CLINIC' },
  //           { facility_id: 3, name: 'St. Jude Medical Center', facility_type: 'HOSPITAL' },
  //           { facility_id: 4, name: 'Green Valley Community Clinic', facility_type: 'CLINIC' },
  //           { facility_id: 5, name: 'Regional Red Cross Blood Center', facility_type: 'BLOOD_BANK' }
  //         ];
  //         setFacilities(fallbackFacs);
  //         setFormData((prev) => ({ ...prev, facilityId: '1' }));
  //       }
  //     } finally {
  //       if (isMounted) setFacilitiesLoading(false);
  //     }
  //   };

  //   fetchFacilities();
  //   return () => {
  //     isMounted = false;
  //   };
  // }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanName = formData.fullName.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    if (!cleanName) {
      setError('Please enter your full name & title.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid work email address.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

   if (formData.role !== 'ADMIN') {
  if (!formData.facilityName.trim()) {
    setError('Please enter the medical facility name.');
    return;
  }

  if (!formData.latitude || !formData.longitude) {
    setError('Please enter the facility latitude and longitude.');
    return;
  }

  const latitude = Number(formData.latitude);
  const longitude = Number(formData.longitude);

  if (
    Number.isNaN(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    setError('Latitude must be between -90 and 90.');
    return;
  }

  if (
    Number.isNaN(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    setError('Longitude must be between -180 and 180.');
    return;
  }
}

    setLoading(true);
    try {
  const payload = {
  full_name: cleanName,
  email: cleanEmail,
  password: formData.password,
  role: formData.role,

  facility_name:
    formData.role === 'ADMIN'
      ? null
      : formData.facilityName.trim(),

  facility_type:
    formData.role === 'ADMIN'
      ? null
      : formData.facilityType,

  latitude:
    formData.role === 'ADMIN'
      ? null
      : Number(formData.latitude),

  longitude:
    formData.role === 'ADMIN'
      ? null
      : Number(formData.longitude)
};
      // const payload = {
      //   full_name: cleanName,
      //   email: cleanEmail,
      //   password: formData.password,
      //   role: formData.role,
      //   facility_id: formData.role === 'ADMIN' ? null : Number(formData.facilityId)
      // };

      await register(payload);
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans text-slate-100">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 shadow-xl shadow-rose-950 relative -top-7">
            <UserPlus className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight -mt-5">
            Create Healthcare Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Join the Inter-Clinic Blood Bank Network
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name & Title
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Dr.John"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Institutional / Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="doctor@hospital.org"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Role & Facility Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Role */}
              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  System Role
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
                  >
                    <option value="CLINIC_STAFF">Clinic Staff</option>
                    <option value="HOSPITAL_STAFF">Hospital Staff</option>
                    <option value="BLOOD_BANK_STAFF">Blood Bank Staff</option>
                    {/* <option value="ADMIN">Regional Admin</option> */}
                  </select>
                </div>
              </div>

              {/* Facility */}
              {/* Facility */}
{/* Facility */}
<div>
  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
    Facility Name
  </label>

  {formData.role === 'ADMIN' ? (
    <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-rose-400 font-semibold flex items-center gap-1.5 h-[38px]">
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">Regional Oversight</span>
    </div>
  ) : (
    <div className="relative">
      <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

      <input
        type="text"
        name="facilityName"
        required
        value={formData.facilityName}
        onChange={handleChange}
        placeholder="e.g. Apollo Hospital"
        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
      />
    </div>
  )}
</div>
{/* Facility Type */}
<div>
  <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
    Facility Type
  </label>

  <div className="relative">
    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

    <select
      name="facilityType"
      value={formData.facilityType}
      onChange={handleChange}
      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
    >
      <option value="HOSPITAL">Hospital</option>
      <option value="CLINIC">Clinic</option>
      <option value="BLOOD_BANK">Blood Bank</option>
    </select>
  </div>
</div>
{/* Facility Coordinates */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  <div>
    <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
      Latitude
    </label>

    <input
      type="number"
      name="latitude"
      required
      step="any"
      value={formData.latitude}
      onChange={handleChange}
      placeholder="e.g. 13.0827"
      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
    />
  </div>

  <div>
    <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
      Longitude
    </label>

    <input
      type="number"
      name="longitude"
      required
      step="any"
      value={formData.longitude}
      onChange={handleChange}
      placeholder="e.g. 80.2707"
      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
    />
  </div>
</div>
              {/* <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assigned Facility
                </label>
                {formData.role === 'ADMIN' ? (
                  <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-rose-400 font-semibold flex items-center gap-1.5 h-[38px]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Regional Oversight</span>
                  </div>
                ) : (
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      name="facilityId"
                      value={formData.facilityId}
                      onChange={handleChange}
                      disabled={facilitiesLoading}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer disabled:opacity-50 truncate"
                    >
                      {facilities.map((fac) => (
                        <option key={fac.facility_id} value={fac.facility_id}>
                          {fac.name} ({fac.facility_type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div> */}
            </div>
          
            {/* Passwords Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Complete Registration & Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login Link */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              {onSwitchToLogin ? (
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer ml-1"
                >
                  Sign In here
                </button>
              ) : (
                <Link
                  to="/login"
                  className="font-bold text-rose-400 hover:text-rose-300 hover:underline ml-1"
                >
                  Sign In here
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};