import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [formData, setFormData]         = useState({ username: "", password: "" });
  const [error, setError]               = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate  = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const formPayload = new FormData();
    formPayload.append("username", formData.username);
    formPayload.append("password", formData.password);

    try {
      const response = await fetch("http://localhost:5000/admin", {
        method: "POST",
        credentials: "include",
        body: formPayload,
      });

      const data = await response.json();

      if (response.ok) {
        login(data.user);
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Server connection error");
    }
  };

  /* ── Eye icons ── */
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
    /* ── PAGE BACKGROUND ── */
    <div className="flex justify-center items-center
      w-screen h-screen p-5 overflow-hidden
      bg-gradient-to-r from-[#e0c3fc] to-[#8ec5fc]
      dark:bg-none dark:bg-black
      transition-colors duration-300"
      style={{ fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>

      {/* ── CARD ── */}
      <div className="w-full max-w-[420px] px-8 py-12 rounded-[30px]
        bg-white/40 dark:bg-[#141414]
        backdrop-blur-[12px]
        border border-white/50 dark:border-[#333333]
        shadow-[0_10px_30px_rgba(0,0,0,0.05)]
        dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)]
        transition-colors duration-300">

        <form onSubmit={handleSubmit}>

          {/* ── FORM HEADER ── */}
          <div className="text-center mb-10">
            <h2 className="text-[1.8rem] font-bold mb-2
              text-[#4a4e69] dark:text-white">
              Admin Login
            </h2>
            <p className="text-[0.9rem] text-[#6d6d91] dark:text-[#b3b3b3]">
              Enter your credentials to continue
            </p>
          </div>

          {/* ── ERROR BANNER ── */}
          {error && (
            <div className="mb-6 px-4 py-[10px] rounded-lg text-center
              text-[0.85rem] font-medium
              bg-white/80 dark:bg-[rgba(229,9,20,0.1)]
              text-[#d63031] dark:text-[#ff6b6b]
              border border-[rgba(214,48,49,0.2)] dark:border-[#e50914]">
              {error}
            </div>
          )}

          {/* ── INPUT GROUP ── */}
          <div className="flex flex-col gap-5 mb-8">

            {/* Username */}
            <input
              type="text"
              name="username"
              placeholder="Phone no"
              onChange={handleChange}
              required
              className="w-full px-5 py-[14px] rounded-full text-base
                bg-white/60 dark:bg-[#333333]
                border-[1.5px] border-transparent
                text-[#4a4e69] dark:text-white
                placeholder-[#9ea1bc] dark:placeholder-[#888888]
                outline-none box-border transition-all duration-300
                focus:bg-white dark:focus:bg-[#444444]
                focus:border-[#a1c4fd] dark:focus:border-[#e50914]" />

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                onChange={handleChange}
                required
                className="w-full px-5 py-[14px] pr-[45px] rounded-full text-base
                  bg-white/60 dark:bg-[#333333]
                  border-[1.5px] border-transparent
                  text-[#4a4e69] dark:text-white
                  placeholder-[#9ea1bc] dark:placeholder-[#888888]
                  outline-none box-border transition-all duration-300
                  focus:bg-white dark:focus:bg-[#444444]
                  focus:border-[#a1c4fd] dark:focus:border-[#e50914]" />

              {/* Eye toggle */}
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[15px] top-1/2 -translate-y-1/2
                  cursor-pointer flex items-center
                  text-[#64748b] dark:text-[#888888]
                  hover:text-[#4a4e69] dark:hover:text-white
                  transition-colors duration-200">
                {showPassword ? <EyeOpen /> : <EyeClosed />}
              </span>
            </div>
          </div>

          {/* ── LOGIN BUTTON ── */}
          <button
            type="submit"
            className="w-full py-[14px] rounded-full
              font-bold text-[1.1rem] border-none cursor-pointer
              bg-gradient-to-r from-[#a1c4fd] to-[#c2e9fb]
              dark:bg-none dark:bg-[#e50914]
              text-[#4a4e69] dark:text-white
              shadow-[0_4px_15px_rgba(161,196,253,0.4)]
              dark:shadow-[0_4px_15px_rgba(229,9,20,0.3)]
              hover:-translate-y-0.5
              hover:shadow-[0_6px_20px_rgba(161,196,253,0.6)]
              dark:hover:shadow-[0_6px_20px_rgba(229,9,20,0.5)]
              transition-all duration-200">
            Login
          </button>

          {/* ── SIGNUP LINK ── */}
          <p className="text-center mt-8 text-[0.9rem]
            text-[#4a4e69] dark:text-[#b3b3b3]">
            Are you a theatre partner?{' '}
            <a
              href="/partner-signup"
              className="font-bold ml-1 no-underline
                text-[#574b90] dark:text-white
                hover:underline dark:hover:text-[#e50914]
                transition-colors duration-200">
              Sign Up
            </a>
          </p>

        </form>
      </div>
    </div>
  );
};

export default Login;