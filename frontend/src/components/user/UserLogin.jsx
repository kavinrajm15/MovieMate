import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

const UserLogin = () => {
  const [phone, setPhone]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { setCustomer } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Logging in...');
    
    try {
      const res = await fetch('http://localhost:5000/api/user/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setCustomer(data.user);
        toast.success(`Welcome back, ${data.user.name}!`, { id: loadingToast });
        navigate(from, { replace: true });
      } else {
        toast.error(data.error || 'Login failed', { id: loadingToast });
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.', { id: loadingToast });
    }
  };

  /* ── Eye icons (same as Admin Login) ── */
  const EyeOpen = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeClosed = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1A1A] p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-[#333]">
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Login to Moviemate</h2>
        <p className="text-slate-500 dark:text-[#B3B3B3] mb-8">Welcome back! Please enter your details.</p>
        
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-[#ccc] mb-1 block">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your 10-digit phone number"
              maxLength={10}
              required
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] outline-none focus:border-indigo-500 dark:focus:border-[#E50914] text-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-[#ccc] mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-3 pr-11 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] outline-none focus:border-indigo-500 dark:focus:border-[#E50914] text-slate-800 dark:text-white"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer flex items-center
                  text-slate-400 dark:text-[#888] hover:text-slate-700 dark:hover:text-white transition-colors duration-200">
                {showPassword ? <EyeOpen /> : <EyeClosed />}
              </span>
            </div>
          </div>
          <button type="submit" className="mt-4 w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#E50914] dark:hover:bg-[#B20710] transition-colors">Sign In</button>
        </form>
        
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-[#888]">
          Don't have an account? <Link to="/signup" className="text-indigo-600 dark:text-[#E50914] font-bold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default UserLogin;