/* eslint-disable no-unused-vars */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  ArrowRight, 
  Lock, 
  Mail, 
  Users, 
  UserPlus, 
  AlertCircle,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const LoginPage = ({ onSwitchToSignup }) => {
  const { login, loginAsDemo, demoUsers } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoadingEmail, setDemoLoadingEmail] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your work email address.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanEmail, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (demoEmail) => {
    setError('');
    setDemoLoadingEmail(demoEmail);
    try {
      await loginAsDemo(demoEmail);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setDemoLoadingEmail(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans text-slate-100">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 shadow-xl shadow-rose-950 relative -top-30 -z-10">
            <Activity className="w-7 h-7 text-white animate-pulse " />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight -mt-30">
            Inter-Clinic Blood Bank Balancer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {/* Real-Time Geospatial Inventory Routing & Concurrency Engine */}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="admin@bloodbank.org"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* New User Sign Up Switch Link */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">New healthcare staff?</span>
            {onSwitchToSignup ? (
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create an Account
              </button>
            ) : (
              <Link
                to="/signup"
                className="font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create an Account
              </Link>
            )}
          </div>

          {/* Quick Demo Switcher Section */}
          {/* <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-rose-400" />
              <span>1-Click Lab Evaluation Demo Logins</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {demoUsers.map((demo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDemoSelect(demo.email)}
                  disabled={demoLoadingEmail === demo.email}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between text-xs group cursor-pointer disabled:opacity-50"
                >
                  <div className="truncate mr-2">
                    <div className="font-bold text-slate-200 group-hover:text-rose-300 transition-colors">
                      {demo.full_name.split(' (')[0]}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{demo.facility_name}</div>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-rose-400 border border-slate-700 shrink-0">
                    {demoLoadingEmail === demo.email ? 'Logging in...' : demo.role}
                  </span>
                </button>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};
