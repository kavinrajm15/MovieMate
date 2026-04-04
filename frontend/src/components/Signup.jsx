import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '', phone: '', theatre_name: '', city: '', password: '', confirmPassword: ''
  });
  const [error, setError]                         = useState('');
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPwdFocused, setIsPwdFocused]           = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone' && !/^\d*$/.test(value)) return;
    if (name === 'name'  && !/^[A-Za-z\s]*$/.test(value)) return;
    setFormData({ ...formData, [name]: value });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      setError(validationError);
      return;
    }
    setError('');

    const loadingToast = toast.loading('Registering your theatre...');

    try {
      const res = await fetch('http://localhost:5000/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Registration successful! Please wait for admin approval.', { id: loadingToast });
        // 🆕 CHANGED from '/login' to '/adminlogin' 🆕
        navigate('/adminlogin'); 
      } else {
        toast.error(data.error || 'Signup failed', { id: loadingToast });
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      toast.error('Server connection error', { id: loadingToast });
      setError('Server connection error');
    }
  };

  const ReqItem = ({ met, text }) => (
    <div className={`flex items-center gap-2 text-[0.8rem] transition-colors duration-300 ${met ? 'text-emerald-500' : 'text-slate-400 dark:text-[#666]'}`}>
      <span>{met ? '✓' : '○'}</span>
      <span>{text}</span>
    </div>
  );

  /* ── Eye icons ── */
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
    <div className="flex justify-center items-center min-h-screen w-screen p-5
      bg-gradient-to-r from-[#e0c3fc] to-[#8ec5fc] dark:bg-none dark:bg-[#0a0a0a]
      transition-colors duration-300 overflow-y-auto"
      style={{ fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>

      <div className="w-full max-w-[500px] px-8 py-10 rounded-[30px] my-8
        bg-white/50 dark:bg-[#141414] backdrop-blur-[12px]
        border border-white/50 dark:border-[#333333]
        shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)]
        transition-colors duration-300">

        <form onSubmit={handleSubmit}>
          {/* ── HEADER ── */}
          <div className="text-center mb-8">
            <h2 className="text-[1.8rem] font-bold mb-2 text-[#4a4e69] dark:text-white">
              Partner Registration
            </h2>
            <p className="text-[0.9rem] text-[#6d6d91] dark:text-[#B3B3B3]">
              Join our network and manage your theatre
            </p>
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl text-center text-[0.85rem] font-medium
              bg-white/80 dark:bg-[rgba(229,9,20,0.1)]
              text-[#d63031] dark:text-[#ff6b6b]
              border border-[rgba(214,48,49,0.2)] dark:border-[#E50914]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 mb-8">
            {/* Split row: Name & Phone */}
            <div className="flex gap-4">
              <input type="text" name="name" placeholder="Full Name"
                value={formData.name} onChange={handleChange} required
                className="w-1/2 px-4 py-3 rounded-2xl text-[0.95rem]
                  bg-white/60 dark:bg-[#222] border-[1.5px] border-transparent
                  text-[#4a4e69] dark:text-white placeholder-[#9ea1bc] dark:placeholder-[#666]
                  outline-none transition-all duration-300
                  focus:bg-white dark:focus:bg-[#333] focus:border-[#a1c4fd] dark:focus:border-[#E50914]" />

              <input type="text" name="phone" placeholder="Phone Number"
                value={formData.phone} onChange={handleChange} required maxLength="10"
                className="w-1/2 px-4 py-3 rounded-2xl text-[0.95rem]
                  bg-white/60 dark:bg-[#222] border-[1.5px] border-transparent
                  text-[#4a4e69] dark:text-white placeholder-[#9ea1bc] dark:placeholder-[#666]
                  outline-none transition-all duration-300
                  focus:bg-white dark:focus:bg-[#333] focus:border-[#a1c4fd] dark:focus:border-[#E50914]" />
            </div>

            {/* Theatre & City */}
            <input type="text" name="theatre_name" placeholder="Theatre Name"
              value={formData.theatre_name} onChange={handleChange} required
              className="w-full px-4 py-3 rounded-2xl text-[0.95rem]
                bg-white/60 dark:bg-[#222] border-[1.5px] border-transparent
                text-[#4a4e69] dark:text-white placeholder-[#9ea1bc] dark:placeholder-[#666]
                outline-none transition-all duration-300
                focus:bg-white dark:focus:bg-[#333] focus:border-[#a1c4fd] dark:focus:border-[#E50914]" />

            <input type="text" name="city" placeholder="City"
              value={formData.city} onChange={handleChange} required
              className="w-full px-4 py-3 rounded-2xl text-[0.95rem]
                bg-white/60 dark:bg-[#222] border-[1.5px] border-transparent
                text-[#4a4e69] dark:text-white placeholder-[#9ea1bc] dark:placeholder-[#666]
                outline-none transition-all duration-300
                focus:bg-white dark:focus:bg-[#333] focus:border-[#a1c4fd] dark:focus:border-[#E50914]" />

            {/* Password */}
            <div className="relative">
              <input type={showPassword ? "text" : "password"} name="password" placeholder="Password"
                value={formData.password} onChange={handleChange} required
                onFocus={() => setIsPwdFocused(true)} onBlur={() => setIsPwdFocused(false)}
                className="w-full px-4 py-3 pr-12 rounded-2xl text-[0.95rem]
                  bg-white/60 dark:bg-[#222] border-[1.5px] border-transparent
                  text-[#4a4e69] dark:text-white placeholder-[#9ea1bc] dark:placeholder-[#666]
                  outline-none transition-all duration-300
                  focus:bg-white dark:focus:bg-[#333] focus:border-[#a1c4fd] dark:focus:border-[#E50914]" />
              <span onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#64748b] dark:text-[#888]
                  hover:text-[#4a4e69] dark:hover:text-white transition-colors duration-200">
                {showPassword ? <EyeOpen /> : <EyeClosed />}
              </span>
            </div>

            {/* Password Requirements Dropdown */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isPwdFocused || formData.password ? 'max-h-[100px] opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
              <div className="grid grid-cols-2 gap-y-2 px-2">
                <ReqItem met={reqs.length}  text="8+ characters" />
                <ReqItem met={reqs.upper}   text="Uppercase letter" />
                <ReqItem met={reqs.number}  text="Number" />
                <ReqItem met={reqs.special} text="Special char (@$!%*?&)" />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password"
                value={formData.confirmPassword} onChange={handleChange} required
                className="w-full px-4 py-3 pr-12 rounded-2xl text-[0.95rem]
                  bg-white/60 dark:bg-[#222] border-[1.5px] border-transparent
                  text-[#4a4e69] dark:text-white placeholder-[#9ea1bc] dark:placeholder-[#666]
                  outline-none transition-all duration-300
                  focus:bg-white dark:focus:bg-[#333] focus:border-[#a1c4fd] dark:focus:border-[#E50914]" />
              <span onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#64748b] dark:text-[#888]
                  hover:text-[#4a4e69] dark:hover:text-white transition-colors duration-200">
                {showConfirmPassword ? <EyeOpen /> : <EyeClosed />}
              </span>
            </div>

          </div>

          {/* ── SUBMIT BUTTON ── */}
          <button type="submit"
            className="w-full py-[14px] rounded-full font-semibold text-base
              border-none cursor-pointer transition-all duration-200
              bg-gradient-to-r from-[#a1c4fd] to-[#c2e9fb]
              dark:bg-none dark:bg-[#E50914]
              text-[#4a4e69] dark:text-white
              shadow-[0_4px_15px_rgba(161,196,253,0.4)]
              dark:shadow-[0_4px_15px_rgba(229,9,20,0.3)]
              hover:-translate-y-0.5
              hover:shadow-[0_6px_20px_rgba(161,196,253,0.6)]
              dark:hover:shadow-[0_6px_20px_rgba(229,9,20,0.5)]">
            Register Theatre
          </button>

          {/* ── LOGIN LINK ── */}
          <p className="text-center mt-6 text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Already have an account?{' '}
            {/* 🆕 CHANGED from '/login' to '/adminlogin' 🆕 */}
            <span
              className="text-[#d946ef] dark:text-[#E50914] font-bold cursor-pointer hover:underline transition-all"
              onClick={() => navigate("/adminlogin")} 
            >
              Login here
            </span>
          </p>

        </form>
      </div>
    </div>
  );
};

export default Signup;