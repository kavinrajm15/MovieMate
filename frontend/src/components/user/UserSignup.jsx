import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

const UserSignup = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPwdFocused, setIsPwdFocused]           = useState(false);
  const { setCustomer } = useCustomerAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Allow only digits for phone
    if (name === 'phone' && !/^\d*$/.test(value)) return;
    // Allow only letters/spaces for name
    if (name === 'name' && !/^[A-Za-z\s]*$/.test(value)) return;
    setFormData({ ...formData, [name]: value });
  };

  /* ── Password requirements (same logic as Admin Signup) ── */
  const pwd  = formData.password;
  const reqs = {
    length:  pwd.length >= 8,
    upper:   /[A-Z]/.test(pwd),
    number:  /\d/.test(pwd),
    special: /[@$!%*?&]/.test(pwd),
  };

  const validateForm = () => {
    if (!/^[A-Za-z\s]+$/.test(formData.name.trim()))
      return 'Name must contain only alphabets.';
    if (formData.phone.length !== 10)
      return 'Phone number must be exactly 10 digits.';
    if (formData.password !== formData.confirmPassword)
      return 'Passwords do not match.';
    if (!Object.values(reqs).every(Boolean))
      return 'Password does not meet all requirements.';
    return null;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const loadingToast = toast.loading('Creating account...');

    try {
      const res = await fetch('http://localhost:5000/api/user/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        })
      });
      const data = await res.json();

      if (res.ok) {
        setCustomer(data.user);
        toast.success('Account created successfully!', { id: loadingToast });
        navigate('/');
      } else {
        toast.error(data.error || 'Signup failed', { id: loadingToast });
      }
    } catch (error) {
      toast.error('An error occurred.', { id: loadingToast });
    }
  };

  /* ── Requirement item (same as Admin Signup) ── */
  const ReqItem = ({ met, text }) => (
    <div className={`flex items-center gap-2 text-[0.8rem] transition-colors duration-300 ${met ? 'text-emerald-500' : 'text-slate-400 dark:text-[#666]'}`}>
      <span>{met ? '✓' : '○'}</span>
      <span>{text}</span>
    </div>
  );

  /* ── Eye icons (same SVGs as Admin Signup) ── */
  const EyeOpen = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeClosed = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1A1A] p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-[#333]">
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-2">Create Account</h2>
        <p className="text-slate-500 dark:text-[#B3B3B3] mb-8">Join Moviemate to book your tickets.</p>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">

          {/* ── Full Name ── */}
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-[#ccc] mb-1 block">Full Name</label>
            <input
              type="text" name="name" value={formData.name}
              onChange={handleChange} required
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] outline-none focus:border-indigo-500 dark:focus:border-[#E50914] text-slate-800 dark:text-white" />
          </div>

          {/* ── Email ── */}
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-[#ccc] mb-1 block">Email</label>
            <input
              type="email" name="email" value={formData.email}
              onChange={handleChange} required
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] outline-none focus:border-indigo-500 dark:focus:border-[#E50914] text-slate-800 dark:text-white" />
          </div>

          {/* ── Phone ── */}
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-[#ccc] mb-1 block">Phone Number</label>
            <input
              type="tel" name="phone" value={formData.phone}
              onChange={handleChange} maxLength={10}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] outline-none focus:border-indigo-500 dark:focus:border-[#E50914] text-slate-800 dark:text-white" />
          </div>

          {/* ── Password with eye toggle ── */}
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-[#ccc] mb-1 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} name="password" value={formData.password}
                onChange={handleChange} required
                onFocus={() => setIsPwdFocused(true)} onBlur={() => setIsPwdFocused(false)}
                className="w-full p-3 pr-11 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] outline-none focus:border-indigo-500 dark:focus:border-[#E50914] text-slate-800 dark:text-white" />
              <span onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer flex items-center
                  text-slate-400 dark:text-[#888] hover:text-slate-700 dark:hover:text-white transition-colors duration-200">
                {showPassword ? <EyeOpen /> : <EyeClosed />}
              </span>
            </div>
          </div>

          {/* ── Password requirements (animated, same as Admin Signup) ── */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isPwdFocused || formData.password ? 'max-h-[100px] opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-2 gap-y-2 px-2">
              <ReqItem met={reqs.length}  text="8+ characters" />
              <ReqItem met={reqs.upper}   text="Uppercase letter" />
              <ReqItem met={reqs.number}  text="Number" />
              <ReqItem met={reqs.special} text="Special char (@$!%*?&)" />
            </div>
          </div>

          {/* ── Confirm Password with eye toggle ── */}
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-[#ccc] mb-1 block">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword}
                onChange={handleChange} required
                className="w-full p-3 pr-11 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] outline-none focus:border-indigo-500 dark:focus:border-[#E50914] text-slate-800 dark:text-white" />
              <span onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer flex items-center
                  text-slate-400 dark:text-[#888] hover:text-slate-700 dark:hover:text-white transition-colors duration-200">
                {showConfirmPassword ? <EyeOpen /> : <EyeClosed />}
              </span>
            </div>
          </div>

          <button type="submit"
            className="mt-4 w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#E50914] dark:hover:bg-[#B20710] transition-colors">
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-[#888]">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-[#E50914] font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default UserSignup;