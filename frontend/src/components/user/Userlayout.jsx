import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import { FiSearch, FiMapPin, FiChevronDown, FiFilm, FiX, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { BsCameraReels } from 'react-icons/bs';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000';

export default function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer, logoutCustomer } = useCustomerAuth();

  const [profileDropdown, setProfileDropdown] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logoutCustomer();
    setProfileDropdown(false);
    toast.success('Logged out successfully.');
    navigate('/');
  };

  const avatarSrc = customer?.profile_pic ? `${API}/static/${customer.profile_pic}` : null;

  const [city, setCity] = useState(() => localStorage.getItem('userCity') || '');
  const [cityPopup, setCityPopup] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState({ movies: [], theatres: [], cities: [] });
  const [showSearchDrop, setShowSearchDrop] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (city) localStorage.setItem('userCity', city);
  }, [city]);

  useEffect(() => {
    if (cityInput.length < 2) { setCitySuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/city-autocomplete?q=${encodeURIComponent(cityInput)}`,
          { headers: {} });
        setCitySuggestions(await res.json());
      } catch { setCitySuggestions([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [cityInput]);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchSuggestions({ movies: [], theatres: [], cities: [] });
      setShowSearchDrop(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/global-search?q=${encodeURIComponent(searchQuery)}`,
          { headers: {} });
        const data = await res.json();
        setSearchSuggestions(data);
        setShowSearchDrop(true);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectCity = (c) => {
    const lc = c.toLowerCase();
    setCity(lc);
    setCityPopup(false);
    setCityInput('');
    setCitySuggestions([]);
    navigate(`/movies?city=${lc}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSearchDrop(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}${city ? `&city=${city}` : ''}`);
    setSearchQuery('');
  };

  const isActive = (path) => location.pathname === path;
  const cityLabel = city ? city.charAt(0).toUpperCase() + city.slice(1) : 'Select City';

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden bg-[#f1f5f9] dark:bg-[#121212] transition-colors duration-300">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full px-4 md:px-5 py-3
        bg-white/60 dark:bg-[rgba(18,18,18,0.92)]
        backdrop-blur-[15px]
        border-b border-white/50 dark:border-[#333333]
        shadow-[0_2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)]">

        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-1 md:gap-5">

          {/* Left: logo + divider + city */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/"
              className="text-lg sm:text-xl md:text-[1.4rem] font-extrabold tracking-tight no-underline
                text-indigo-600 dark:text-[#E50914] transition-colors">
              MovieMate
            </Link>

            <div className="hidden md:block w-px h-5 bg-slate-200 dark:bg-[#333333]" />

            <button
              onClick={() => setCityPopup(true)} title={cityLabel}
              className="flex items-center gap-1.5 md:px-3 px-2 py-1.5 rounded-full text-sm font-semibold
                bg-white/70 dark:bg-white/5
                border border-slate-200 dark:border-[#444]
                text-slate-700 dark:text-white
                hover:border-indigo-400 dark:hover:border-[#E50914]
                transition-all cursor-pointer shadow-sm dark:shadow-none">
              <FiMapPin size={15} className="text-indigo-500 dark:text-[#E50914] flex-shrink-0" />
              <span className="max-w-[50px] sm:max-w-[100px] md:max-w-none text-xs md:text-sm truncate">{cityLabel}</span>
              <FiChevronDown size={12} className="hidden md:block text-slate-400 dark:text-[#666] flex-shrink-0" />
            </button>
          </div>

          {/* Center Nav */}
          {city && (
            <nav className="hidden md:flex flex-1 justify-center gap-7">
              {[
                { label: 'Home',     to: '/' },
                { label: 'Movies',   to: `/movies?city=${city}` },
                { label: 'Theatres', to: `/theatres?city=${city}` },
              ].map(({ label, to }) => (
                <Link key={label} to={to}
                  className={`text-sm font-semibold no-underline transition-colors
                    ${isActive(to.split('?')[0])
                      ? 'text-indigo-600 dark:text-[#E50914]'
                      : 'text-[#4a4e69] dark:text-[#B3B3B3] hover:text-indigo-500 dark:hover:text-white'}`}>
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right: search + theme + auth */}
          <div className="flex items-center gap-2 md:gap-3">
            <div ref={searchRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setShowSearchInput(true)}
                title="Search movies, cinemas"
                className={`flex md:hidden items-center justify-center w-9 h-9 rounded-full cursor-pointer
                  bg-white/70 dark:bg-white/5
                  border border-slate-200 dark:border-[#444]
                  hover:border-indigo-400 dark:hover:border-[#E50914]
                  transition-all shadow-sm dark:shadow-none
                  ${showSearchInput ? 'hidden' : 'flex'}`}
              >
                <FiSearch size={15} className="text-slate-600 dark:text-[#ccc]" />
              </button>
              
              <form onSubmit={handleSearch} 
                className={`z-[60] md:flex md:w-auto md:bg-transparent md:p-0 md:shadow-none md:border-none md:relative md:top-auto md:left-auto md:transform-none
                  ${showSearchInput ? 'flex fixed top-[70px] left-1/2 -translate-x-1/2 w-[calc(100vw-40px)] max-w-[340px] bg-white dark:bg-[#1c1c1c] p-1.5 sm:p-2 rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.15)] dark:shadow-none border border-slate-100 dark:border-[#333]' : 'hidden'}
                `}>
                <div className="relative flex items-center w-full">
                  <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#666]" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setShowSearchDrop(true)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-8 md:pr-4 py-1.5 md:py-2 text-[13px] md:text-sm rounded-xl outline-none
                      bg-[#f8fafc] dark:bg-[#121212] md:bg-white/60 md:dark:bg-[#121212]
                      border border-slate-200 dark:border-[#333] md:border-indigo-400 md:dark:border-[#121212]
                      text-slate-800 dark:text-white
                      placeholder-[#9ca3af] dark:placeholder-[#666]
                      focus:border-indigo-500 dark:focus:border-[#E50914]
                      transition-all shadow-inner md:shadow-none
                    "
                  />
                  <button type="button" onClick={() => setShowSearchInput(false)} className="md:hidden absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 dark:bg-[#333] text-slate-500 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-[#444] border-none cursor-pointer transition-colors shadow-sm">
                    <FiX size={13} />
                  </button>
                </div>
              </form>

              {/* Search dropdown */}
              {showSearchDrop && (
                searchSuggestions.movies.length > 0 ||
                searchSuggestions.theatres.length > 0 ||
                searchSuggestions.cities.length > 0
              ) && (
                <div className="absolute top-full mt-1.5 left-0 right-0 z-50 rounded-xl overflow-hidden
                  bg-white dark:bg-[#1E1E1E]
                  border border-slate-100 dark:border-[#333333]
                  shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

                  {searchSuggestions.cities.map(c => (
                    <div key={c}
                      onClick={() => { selectCity(c); setShowSearchDrop(false); setSearchQuery(''); }}
                      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm font-semibold
                        text-slate-700 dark:text-white
                        hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors">
                      <FiMapPin size={12} className="text-indigo-500 dark:text-[#E50914]" />
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </div>
                  ))}
                  {searchSuggestions.movies.map(m => (
                    <div key={m.movie_id}
                      onClick={() => {
                        navigate(`/theatres?movie_id=${m.movie_id}${city ? `&city=${city}` : ''}`);
                        setShowSearchDrop(false); setSearchQuery('');
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm
                        text-slate-700 dark:text-[#B3B3B3]
                        hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors">
                      <FiFilm size={12} className="text-indigo-400 dark:text-[#B3B3B3]" />
                      {m.title}
                    </div>
                  ))}
                  {searchSuggestions.theatres.map(t => (
                    <div key={t.theatre_id}
                      onClick={() => {
                        navigate(`/theatre/${t.theatre_id}`);
                        setShowSearchDrop(false); setSearchQuery('');
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm
                        text-slate-600 dark:text-[#B3B3B3]
                        hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors">
                      <BsCameraReels size={12} className="text-slate-400 dark:text-[#666666]" />
                      {t.name}
                      <span className="text-xs text-slate-400 dark:text-[#555555] ml-0.5">— {t.city}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ThemeToggle />

            {/* ── Auth section ── */}
            {customer ? (
              /* Logged-in: avatar + dropdown */
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileDropdown(!profileDropdown)}
                  className="flex items-center gap-2 p-0 md:pl-1 md:pr-3 md:py-1 rounded-full cursor-pointer
                    bg-transparent md:bg-white/70 md:dark:bg-white/5
                    border border-transparent md:border-slate-200 md:dark:border-[#444]
                    hover:border-transparent md:hover:border-indigo-400 md:dark:hover:border-[#E50914]
                    transition-all overflow-hidden md:overflow-visible"
                >
                  {/* Avatar or Initial */}
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="avatar"
                      className="w-9 h-9 md:w-7 md:h-7 rounded-full object-cover border border-slate-200 md:border-indigo-400 dark:border-[#E50914]" />
                  ) : (
                    <div className="w-9 h-9 md:w-7 md:h-7 rounded-full flex items-center justify-center
                      bg-indigo-500 dark:bg-[#E50914] text-white text-[14px] md:text-xs font-bold select-none">
                      {customer.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-slate-700 dark:text-white hidden md:block max-w-[90px] truncate pb-[1px]">
                    {customer.name?.split(' ')[0]}
                  </span>
                  <FiChevronDown size={12} className="hidden md:block text-slate-400 dark:text-[#666]" />
                </button>

                {/* Dropdown */}
                {profileDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-52 z-50 rounded-xl overflow-hidden
                    bg-white dark:bg-[#1E1E1E]
                    border border-slate-100 dark:border-[#333]
                    shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-[#2a2a2a]">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{customer.name}</p>
                      <p className="text-xs text-slate-400 dark:text-[#666] mt-0.5">{customer.phone}</p>
                    </div>

                    <Link to="/profile"
                      onClick={() => setProfileDropdown(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium no-underline
                        text-slate-700 dark:text-[#B3B3B3]
                        hover:bg-indigo-50 dark:hover:bg-white/10
                        transition-colors cursor-pointer border-b border-slate-100 dark:border-[#2a2a2a]">
                      <FiSettings size={15} className="text-indigo-500 dark:text-[#E50914]" />
                      My Profile
                    </Link>

                    <Link to="/my-tickets"
                      onClick={() => setProfileDropdown(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium no-underline
                        text-slate-700 dark:text-[#B3B3B3]
                        hover:bg-indigo-50 dark:hover:bg-white/10
                        transition-colors cursor-pointer">
                      <BsCameraReels size={15} className="text-indigo-500 dark:text-[#B3B3B3]" />
                      My Tickets
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium
                        text-rose-500 dark:text-[#E50914]
                        hover:bg-rose-50 dark:hover:bg-[rgba(229,9,20,0.1)]
                        transition-colors cursor-pointer bg-transparent border-0 text-left">
                      <FiLogOut size={15} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in: Login + Sign Up */
              <div className="flex items-center gap-2">
                <Link to="/login"
                  className="px-4 py-1.5 rounded-full text-sm font-semibold no-underline
                    text-indigo-600 dark:text-white
                    border border-indigo-300 dark:border-[#444]
                    hover:border-indigo-500 dark:hover:border-[#E50914]
                    hover:bg-indigo-50 dark:hover:bg-white/5
                    transition-all">
                  Login
                </Link>
                <Link to="/signup"
                  className="px-4 py-1.5 rounded-full text-sm font-semibold no-underline
                    text-white
                    bg-indigo-600 dark:bg-[#E50914]
                    hover:bg-indigo-700 dark:hover:bg-[#B20710]
                    transition-all">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Nav Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden items-center justify-center w-9 h-9 p-0 rounded-full cursor-pointer
                bg-transparent text-slate-700 dark:text-white
                border border-transparent hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <FiX size={20} className={`${mobileMenuOpen ? 'block' : 'hidden'}`} />
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className={`${!mobileMenuOpen ? 'block' : 'hidden'}`} height="20" width="20" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && city && (
        <div className="md:hidden bg-white dark:bg-[#1A1A1A] border-b border-slate-200 dark:border-[#333] shadow-md px-5 py-2">
          <nav className="flex flex-col">
            {[
              { label: 'Home',     to: '/' },
              { label: 'Movies',   to: `/movies?city=${city}` },
              { label: 'Theatres', to: `/theatres?city=${city}` },
            ].map(({ label, to }) => (
              <Link key={label} to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-[15px] font-semibold no-underline py-3 border-b border-slate-100 dark:border-[#2A2A2A] last:border-0
                  ${isActive(to.split('?')[0])
                    ? 'text-indigo-600 dark:text-[#E50914]'
                    : 'text-slate-700 dark:text-[#B3B3B3] hover:text-indigo-500'}`}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* ── Page Content ── */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 md:px-5 py-6">
        <Outlet context={{ city, setCity }} />
      </main>

      {/* ── City Popup ── */}
      {cityPopup && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setCityPopup(false)}>

          <div className="w-full max-w-md mx-4 rounded-2xl overflow-hidden
            bg-white dark:bg-[#1E1E1E]
            border border-slate-100 dark:border-[#333333]
            shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)]">

            <div className="flex items-center justify-between px-5 py-4
              border-b border-slate-100 dark:border-[#2a2a2a]">
              <h5 className="text-base font-bold m-0 text-slate-800 dark:text-white">Select your city</h5>
              <button onClick={() => setCityPopup(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center
                  text-slate-400 dark:text-[#666666]
                  hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer">
                <FiX size={16} />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="relative">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#555555]" />
                <input
                  autoFocus
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cityInput && selectCity(cityInput)}
                  placeholder="Search for your city (e.g., Erode)"
                  className="w-full pl-8 pr-4 py-2.5 text-sm rounded-xl outline-none
                    bg-[#f1f5f9] dark:bg-[#121212]
                    border border-slate-200 dark:border-[#333333]
                    text-slate-800 dark:text-white
                    placeholder-slate-400 dark:placeholder-[#555555]
                    focus:border-indigo-500 dark:focus:border-[#E50914]
                    transition-all"
                />
              </div>

              {citySuggestions.length > 0 && (
                <div className="mt-2 rounded-xl overflow-hidden
                  border border-slate-100 dark:border-[#333333]">
                  {citySuggestions.map((c) => (
                    <div key={c} onClick={() => selectCity(c)}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium
                        bg-white dark:bg-[#111111]
                        text-slate-700 dark:text-white
                        hover:bg-indigo-50 dark:hover:bg-white/10 transition-colors">
                      <FiMapPin size={13} className="text-indigo-500 dark:text-[#E50914]" />
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}