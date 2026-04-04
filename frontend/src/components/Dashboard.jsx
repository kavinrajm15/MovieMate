import React, { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  CartesianGrid,
} from "recharts";

/* ─────────────────────────────────────────────
   SearchableSelect
───────────────────────────────────────────── */
const SearchableSelect = ({ value, onChange, options, placeholder = "Search…", className = "" }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selectedLabel = options.find((o) => String(o.value) === String(value))?.label || "";
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const filtered = query.trim() ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;
  const select = (val) => { onChange(val); setQuery(""); setOpen(false); };
  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        className="flex items-center gap-1 px-3 py-[7px] rounded-xl text-sm font-semibold bg-white dark:bg-[#2A2A2A] text-slate-700 dark:text-white border border-slate-200 dark:border-[#444] cursor-pointer select-none min-w-[160px]"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} onClick={(e) => e.stopPropagation()}
            placeholder={`Search ${placeholder}…`} className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-[#666] min-w-0" />
        ) : (
          <span className="flex-1 truncate">{selectedLabel || placeholder}</span>
        )}
        <svg className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto bg-white dark:bg-[#2A2A2A] border border-slate-200 dark:border-[#444] rounded-xl shadow-xl py-1 text-sm">
          {filtered.map((o) => (
            <li key={o.value} onMouseDown={() => select(o.value)}
              className={`px-3 py-2 cursor-pointer truncate transition-colors ${String(o.value) === String(value) ? "bg-indigo-50 dark:bg-[#E50914]/10 text-indigo-600 dark:text-[#E50914] font-bold" : "text-slate-700 dark:text-[#ddd] hover:bg-slate-50 dark:hover:bg-[#333]"}`}>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Mini sparkline SVG decoration
───────────────────────────────────────────── */
const Sparkline = ({ color = "#10b981", up = true }) => {
  const paths = up
    ? "M0,30 C15,28 20,22 30,18 C40,14 45,10 55,8 C65,6 70,4 80,2"
    : "M0,8 C10,10 20,16 30,20 C40,24 50,26 60,22 C70,18 75,20 80,25";
  return (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={paths} stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
      <path d={paths + " L80,32 L0,32 Z"} fill={color} fillOpacity="0.08" />
    </svg>
  );
};

/* ─────────────────────────────────────────────
   Theatre Admin Filter Bar (unchanged)
───────────────────────────────────────────── */
const FilterBar = ({ timeFilter, setTimeFilter, customDate, setCustomDate, movieId, setMovieId, theatreId, setTheatreId, availableMovies = [], availableTheatres = [], showTheatre = false }) => {
  const timeOptions = [
    { value: "all", label: "All Time" }, { value: "today", label: "Today" },
    { value: "week", label: "Weekly" }, { value: "month", label: "Monthly" }, { value: "year", label: "Yearly" },
  ];
  const movieOptions = [{ value: "all", label: "All Movies" }, ...(availableMovies?.map((m) => ({ value: String(m.movie_id), label: m.title })) || [])];
  const theatreOptions = [{ value: "all", label: "All Theatres" }, ...(availableTheatres?.map((t) => ({ value: String(t.theatre_id), label: `${t.name} (${t.city})` })) || [])];
  const selectBase = "px-3 py-[7px] rounded-xl text-sm font-semibold bg-white dark:bg-[#2A2A2A] text-slate-700 dark:text-white border border-slate-200 dark:border-[#444] outline-none focus:border-indigo-500 dark:focus:border-[#E50914] transition-colors";
  return (
    <div className="flex flex-wrap items-center gap-2 mb-8 bg-white/40 dark:bg-[#1A1A1A]/80 px-4 py-3 rounded-2xl border border-slate-200 dark:border-[#333]">
      <select value={customDate ? "custom" : timeFilter} onChange={(e) => { setTimeFilter(e.target.value); setCustomDate(""); }} className={`${selectBase} min-w-[110px]`}>
        {timeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        {customDate && <option value="custom">Custom Date</option>}
      </select>
      <input type="date" value={customDate} onChange={(e) => { setCustomDate(e.target.value); setTimeFilter("custom"); }} className={`${selectBase}`} />
      {showTheatre && <SearchableSelect value={theatreId} onChange={setTheatreId} options={theatreOptions} placeholder="All Theatres" className="min-w-[170px]" />}
      <SearchableSelect value={movieId} onChange={setMovieId} options={movieOptions} placeholder="All Movies" className="min-w-[150px]" />
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────── */
const Dashboard = () => {
  const { user } = useOutletContext();
  const [data, setData] = useState(null);
  const [theatreData, setTheatreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Theatre Admin Filters
  const [timeFilter, setTimeFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");
  const [movieId, setMovieId] = useState("all");

  // Staff/SuperAdmin Sales Filters
  const [staffSalesData, setStaffSalesData] = useState(null);
  const [staffTimeFilter, setStaffTimeFilter] = useState("all");
  const [staffCustomDate, setStaffCustomDate] = useState("");
  const [staffMovieId, setStaffMovieId] = useState("all");
  const [staffTheatreId, setStaffTheatreId] = useState("all");

  const COLORS = ["#6366f1", "#10b981", "#f43f5e", "#f59e0b", "#3b82f6"];
  const DONUT_COLORS = ["#22d3ee", "#818cf8", "#f472b6", "#34d399", "#fbbf24"];

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        if (user?.role === "theatre_admin") {
          let url = `http://localhost:5000/admin/theatre-dashboard?time_filter=${timeFilter}&movie_id=${movieId}`;
          if (customDate) url += `&date=${customDate.replace(/-/g, "")}`;
          const response = await fetch(url, { method: "GET", credentials: "include", headers: { Accept: "application/json" } });
          const result = await response.json();
          if (response.ok) setTheatreData(result);
          else { setFetchError(result.error || "Unknown Error"); }
        } else {
          const response = await fetch("http://localhost:5000/admin/dashboard", { method: "GET", credentials: "include", headers: { Accept: "application/json" } });
          if (response.ok) setData(await response.json());
        }
      } catch (error) {
        setFetchError(error.message);
      } finally {
        setLoading(false);
      }
    };
    if (user?.role) fetchDashboardData();
  }, [user?.role, timeFilter, customDate, movieId]);

  useEffect(() => {
    const fetchStaffSales = async () => {
      if (!user?.role || user.role === "theatre_admin") return;
      try {
        let url = `http://localhost:5000/admin/staff-sales-dashboard?time_filter=${staffTimeFilter}&movie_id=${staffMovieId}&theatre_id=${staffTheatreId}`;
        if (staffCustomDate) url += `&date=${staffCustomDate.replace(/-/g, "")}`;
        const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
        if (res.ok) {
          const d = await res.json();
          if (d.status !== "no_access") setStaffSalesData(d);
          else setStaffSalesData(null);
        }
      } catch (e) { console.error("Staff sales fetch error:", e); }
    };
    fetchStaffSales();
  }, [user?.role, staffTimeFilter, staffCustomDate, staffMovieId, staffTheatreId]);

  // Compute top movies by ticket count from chart_data
  const topMoviesByTickets = React.useMemo(() => {
    if (!staffSalesData?.chart_data || !staffSalesData?.top_movie_titles) return [];
    const totals = {};
    staffSalesData.top_movie_titles.forEach((title) => { totals[title] = 0; });
    staffSalesData.chart_data.forEach((row) => {
      staffSalesData.top_movie_titles.forEach((title) => { totals[title] = (totals[title] || 0) + (row[title] || 0); });
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [staffSalesData]);

  const pieData = data?.top_showtimes
    ? [...data.top_showtimes].map((s) => ({ name: s.show_time, value: parseInt(s.count, 10) || 0 })).sort((a, b) => b.value - a.value)
    : [];

  const userRole = user?.role || "";
  const isStaff = userRole && userRole !== "theatre_admin";
  const isTheatreAdmin = userRole === "theatre_admin";
  const isSuperAdmin = userRole === "superadmin";

  const p = staffSalesData?.permissions || {};
  const canSeeRevenue = p.total_income;
  const canSeeTickets = p.ticket_sales_count;
  const canSeeGraph = p.ticket_sales_graph;
  const canSeeTransactions = p.transactions;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-[rgba(30,30,30,0.98)] border border-[rgba(99,102,241,0.2)] dark:border-[#444] rounded-[12px] px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.1)] backdrop-blur-[4px]">
          <p className="m-0 text-[0.85rem] font-bold text-slate-800 dark:text-white mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="m-0 text-[0.85rem] font-semibold flex items-center gap-2 mb-1" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const cardBase = `bg-white/50 dark:bg-[rgba(30,30,30,0.95)] backdrop-blur-[10px] rounded-[20px] border border-white/40 dark:border-[#333333] p-[25px] shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]`;

  /* ─── Time filter pills for Staff/SuperAdmin ─── */
  const timePills = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "month", label: "Monthly" },
    { value: "year", label: "Yearly" },
  ];

  return (
    <div className="p-4 md:p-[30px] w-full max-w-[1400px] mx-auto overflow-hidden">

      {/* ══ THEATRE ADMIN FILTER BAR ══ */}
      {isTheatreAdmin && (
        <FilterBar
          timeFilter={timeFilter} setTimeFilter={setTimeFilter}
          customDate={customDate} setCustomDate={setCustomDate}
          movieId={movieId} setMovieId={setMovieId}
          availableMovies={theatreData?.available_movies}
          showTheatre={false}
        />
      )}

      {/* ══ LOADER / ERROR ══ */}
      {loading ? (
        <div className="flex justify-center items-center h-[50vh] text-[1.2rem] font-semibold text-indigo-500 dark:text-[#E50914] animate-pulse">
          Fetching dashboard metrics...
        </div>
      ) : fetchError ? (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-400 p-6 rounded-2xl mb-8 flex flex-col items-center">
          <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="font-mono text-sm bg-white/50 dark:bg-black/20 px-4 py-2 rounded-lg">{fetchError}</p>
        </div>
      ) : (
        <>
          {/* ════════════════════════════════════════════
              STAFF / SUPER ADMIN DASHBOARD
          ════════════════════════════════════════════ */}
          {isStaff && (
            <>
              {/* ── Time Filter Pills ── */}
              {staffSalesData && (
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  {timePills.map((pill) => (
                    <button
                      key={pill.value}
                      onClick={() => { setStaffTimeFilter(pill.value); setStaffCustomDate(""); }}
                      className={`px-4 py-[7px] rounded-full text-xs font-bold tracking-wide border transition-all duration-200
                        ${staffTimeFilter === pill.value && !staffCustomDate
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-[#E50914] dark:to-[#B20710] text-white border-transparent shadow-[0_4px_15px_rgba(99,102,241,0.4)] dark:shadow-[0_4px_15px_rgba(229,9,20,0.35)]"
                          : "bg-white/60 dark:bg-[#1E1E1E] text-slate-600 dark:text-[#aaa] border-slate-200 dark:border-[#333] hover:border-indigo-400 dark:hover:border-[#E50914]/50"}`}
                    >
                      {pill.label}
                    </button>
                  ))}
                  {/* Movie filter */}
                  {staffSalesData?.available_movies?.length > 0 && (
                    <SearchableSelect
                      value={staffMovieId}
                      onChange={setStaffMovieId}
                      options={[{ value: "all", label: "All Movies" }, ...(staffSalesData.available_movies.map((m) => ({ value: String(m.movie_id), label: m.title })))]}
                      placeholder="All Movies"
                      className="min-w-[150px] ml-2"
                    />
                  )}
                  {/* Theatre filter (superadmin) */}
                  {isSuperAdmin && staffSalesData?.available_theatres?.length > 0 && (
                    <SearchableSelect
                      value={staffTheatreId}
                      onChange={setStaffTheatreId}
                      options={[{ value: "all", label: "All Theatres" }, ...(staffSalesData.available_theatres.map((t) => ({ value: String(t.theatre_id), label: `${t.name} (${t.city})` })))]}
                      placeholder="All Theatres"
                      className="min-w-[170px]"
                    />
                  )}
                </div>
              )}

              {/* ══ 4-STAT CARD ROW ══ */}
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[18px] mb-[22px]">

                {/* Revenue */}
                {(canSeeRevenue || isSuperAdmin) && (
                  <div className={`${cardBase} border-l-[4px] border-l-cyan-500 dark:border-l-cyan-400 relative overflow-hidden`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500 dark:text-[#888]">Total Revenue</span>
                      <div className="w-9 h-9 rounded-[10px] bg-cyan-100 dark:bg-cyan-500/15 flex items-center justify-center text-cyan-600 dark:text-cyan-400 text-base font-black">₹</div>
                    </div>
                    <div className="text-[2.2rem] font-extrabold text-cyan-600 dark:text-cyan-400 leading-none mb-2">
                      {staffSalesData?.total_income != null
                        ? staffSalesData.total_income >= 100000
                          ? `₹${(staffSalesData.total_income / 100000).toFixed(2)}L`
                          : `₹${staffSalesData.total_income.toLocaleString()}`
                        : <span className="text-2xl text-slate-400 dark:text-[#555]">—</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-[#666]">All confirmed bookings</span>
                      <Sparkline color="#22d3ee" up={true} />
                    </div>
                  </div>
                )}

                {/* Ticket Sales */}
                {(canSeeTickets || isSuperAdmin) && (
                  <div className={`${cardBase} border-l-[4px] border-l-indigo-500 dark:border-l-[#818cf8] relative overflow-hidden`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500 dark:text-[#888]">Ticket Sales</span>
                      <div className="w-9 h-9 rounded-[10px] bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-sm">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16-4V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2m16 0H4m8-4v4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                      </div>
                    </div>
                    <div className="text-[2.2rem] font-extrabold text-indigo-600 dark:text-[#818cf8] leading-none mb-2">
                      {staffSalesData?.total_tickets != null
                        ? staffSalesData.total_tickets.toLocaleString()
                        : <span className="text-2xl text-slate-400 dark:text-[#555]">—</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-[#666]">Confirmed seats</span>
                      <Sparkline color="#818cf8" up={true} />
                    </div>
                  </div>
                )}

                {/* Active Movies */}
                {data?.total_movies != null && (
                  <div className={`${cardBase} border-l-[4px] border-l-emerald-500 dark:border-l-[#34d399] relative overflow-hidden`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500 dark:text-[#888]">Active Movies</span>
                      <div className="w-9 h-9 rounded-[10px] bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
                      </div>
                    </div>
                    <div className="text-[2.2rem] font-extrabold text-emerald-600 dark:text-[#34d399] leading-none mb-2">
                      {data.total_movies}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-[#666]">In database</span>
                      <Sparkline color="#34d399" up={true} />
                    </div>
                  </div>
                )}

                {/* Theatres */}
                {data?.total_theatres != null && (
                  <div className={`${cardBase} border-l-[4px] border-l-pink-500 dark:border-l-[#f472b6] relative overflow-hidden`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500 dark:text-[#888]">Theatres</span>
                      <div className="w-9 h-9 rounded-[10px] bg-pink-100 dark:bg-pink-500/15 flex items-center justify-center text-pink-600 dark:text-pink-400 text-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                      </div>
                    </div>
                    <div className="text-[2.2rem] font-extrabold text-pink-600 dark:text-[#f472b6] leading-none mb-2">
                      {data.total_theatres}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-[#666]">
                        {data.total_cities != null ? `Across ${data.total_cities} cities` : "Active venues"}
                      </span>
                      <Sparkline color="#f472b6" up={false} />
                    </div>
                  </div>
                )}
              </section>

              {/* ══ CHARTS ROW 1: Bar (Cities) + Donut (Showtimes) ══ */}
              {(data?.top_cities != null || data?.top_showtimes != null) && (
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-[18px] mb-[18px]">

                  {/* Movies Screening by City */}
                  {data?.top_cities != null && (
                    <div className={cardBase}>
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <h3 className="text-slate-800 dark:text-white text-[1.05rem] font-bold mb-0.5">Movies Screening by City</h3>
                          <p className="text-[11px] text-slate-400 dark:text-[#666] font-medium">Active showtimes today across all cities</p>
                        </div>
                        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 tracking-wide">Live</span>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={data.top_cities} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                          <defs>
                            {data.top_cities.map((_, i) => (
                              <linearGradient key={i} id={`cityGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={DONUT_COLORS[i % DONUT_COLORS.length]} stopOpacity={1} />
                                <stop offset="100%" stopColor={DONUT_COLORS[i % DONUT_COLORS.length]} stopOpacity={0.6} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                          <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                          <Bar dataKey="movie_count" radius={[10, 10, 0, 0]} barSize={44} animationDuration={1500}>
                            {data.top_cities.map((_, i) => (
                              <Cell key={`cell-${i}`} fill={`url(#cityGrad${i})`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Popular Showtimes Donut */}
                  {data?.top_showtimes != null && (
                    <div className={cardBase}>
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <h3 className="text-slate-800 dark:text-white text-[1.05rem] font-bold mb-0.5">Popular Showtimes</h3>
                          <p className="text-[11px] text-slate-400 dark:text-[#666] font-medium">Ticket distribution by slot</p>
                        </div>
                        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-[#818cf8] tracking-wide">Today</span>
                      </div>
                      <div className="relative">
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie data={pieData} innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value" nameKey="name" startAngle={90} endAngle={-270} stroke="none">
                              {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                              formatter={(value) => <span className="text-xs font-semibold text-slate-600 dark:text-[#aaa]">{value}</span>} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Donut center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ right: "30%" }}>
                          <span className="text-[1.6rem] font-extrabold text-slate-800 dark:text-white leading-none">
                            {pieData.reduce((sum, d) => sum + d.value, 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-[#666] mt-1">Total Slots</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ CHARTS ROW 2: Ticket Sales Trend + Top Movies ══ */}
              {staffSalesData && (canSeeGraph || canSeeRevenue || isSuperAdmin) && (
                <div className={`grid grid-cols-1 ${topMoviesByTickets.length > 0 ? "lg:grid-cols-[1.5fr_1fr]" : ""} gap-[18px] mb-[18px]`}>

                  {/* Ticket Sales Trend Line Chart */}
                  {(canSeeGraph || isSuperAdmin) && staffSalesData.chart_data?.length > 0 && (
                    <div className={cardBase}>
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <h3 className="text-slate-800 dark:text-white text-[1.05rem] font-bold mb-0.5">Ticket Sales Trend</h3>
                          <p className="text-[11px] text-slate-400 dark:text-[#666] font-medium">Monthly performance by top movies</p>
                        </div>
                        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#34d399] tracking-wide">
                          {staffSalesData.top_movie_titles?.length || 0} movies
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={staffSalesData.chart_data} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.12)" />
                          <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "#888", fontSize: 12, fontWeight: 600 }} dy={12} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#888", fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: "16px" }}
                            formatter={(value) => <span className="text-xs font-semibold text-slate-600 dark:text-[#aaa]">{value}</span>} />
                          {staffSalesData.top_movie_titles?.map((title, idx) => (
                            <Line key={idx} type="monotone" dataKey={title} stroke={COLORS[idx % COLORS.length]}
                              strokeWidth={2.5} dot={{ r: 4, fill: COLORS[idx % COLORS.length], strokeWidth: 2, stroke: "#fff" }}
                              activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={1500} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Top Movies by Tickets — Horizontal Bar */}
                  {topMoviesByTickets.length > 0 && (
                    <div className={cardBase}>
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <h3 className="text-slate-800 dark:text-white text-[1.05rem] font-bold mb-0.5">Top Movies</h3>
                          <p className="text-[11px] text-slate-400 dark:text-[#666] font-medium">By ticket bookings this period</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 mt-2">
                        {topMoviesByTickets.map((movie, idx) => {
                          const max = topMoviesByTickets[0]?.value || 1;
                          const pct = Math.round((movie.value / max) * 100);
                          const barColor = DONUT_COLORS[idx % DONUT_COLORS.length];
                          return (
                            <div key={movie.name} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[13px] font-bold text-slate-700 dark:text-[#ddd] truncate max-w-[65%]">{movie.name}</span>
                                <span className="text-[12px] font-extrabold" style={{ color: barColor }}>{movie.value.toLocaleString()}</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#2a2a2a] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, background: barColor }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ RECENT TRANSACTIONS TABLE ══ */}
              {staffSalesData && (canSeeTransactions || isSuperAdmin) && staffSalesData.recent_transactions && (
                <div className={`${cardBase} p-0 overflow-hidden`}>
                  <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#333]">
                    <h3 className="text-slate-800 dark:text-white text-[1.05rem] font-bold">Recent Transactions</h3>
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-[#818cf8] tracking-wide uppercase">
                      Last {staffSalesData.recent_transactions.length} Bookings
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#1A1A1A]">
                          {["#", "Customer", "Movie", "Theatre", "Seats", "Total", "Status", "Show", "Booked"].map((h, i) => (
                            <th key={h} className={`p-4 text-[10px] font-extrabold text-slate-400 dark:text-[#555] uppercase tracking-[0.12em] border-b border-slate-200 dark:border-[#2a2a2a] ${i === 0 ? "w-10" : ""}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {staffSalesData.recent_transactions.length > 0
                          ? staffSalesData.recent_transactions.map((tx, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#1f1f1f] transition-colors border-b border-slate-100 dark:border-[#2a2a2a] last:border-none group">
                              <td className="p-4 text-[11px] font-bold text-slate-400 dark:text-[#555]">{String(i + 1).padStart(2, "0")}</td>
                              <td className="p-4 text-[13px] font-bold text-slate-800 dark:text-white">{tx.user_name || "Guest"}</td>
                              <td className="p-4">
                                <span className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold bg-indigo-100 dark:bg-[#E50914]/15 text-indigo-700 dark:text-[#E50914]">{tx.title}</span>
                              </td>
                              <td className="p-4 text-[12.5px] font-semibold text-slate-600 dark:text-[#aaa]">{tx.theatre_name || "—"}</td>
                              <td className="p-4 text-[12.5px] text-slate-600 dark:text-[#aaa]">
                                {tx.seats} <span className="text-[10px] text-slate-400">({tx.seat_count})</span>
                              </td>
                              <td className="p-4 text-[13px] font-extrabold text-slate-800 dark:text-white">₹{tx.total_price}</td>
                              <td className="p-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  {tx.status}
                                </span>
                              </td>
                              <td className="p-4 text-[12px] font-semibold text-slate-500 dark:text-[#777]">
                                {tx.show_date ? `${tx.show_date.slice(6, 8)}/${tx.show_date.slice(4, 6)}` : ""} · {tx.show_time}
                              </td>
                              <td className="p-4 text-[12px] font-semibold text-slate-400 dark:text-[#555]">
                                {tx.booked_at ? new Date(tx.booked_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""}
                              </td>
                            </tr>
                          ))
                          : <tr><td colSpan="9" className="p-10 text-center text-slate-500 dark:text-[#666] font-bold">No recent transactions found.</td></tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════════
              THEATRE ADMIN DASHBOARD (unchanged)
          ════════════════════════════════════════════ */}
          {isTheatreAdmin && theatreData && (
            <>
              {/* Stat Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-[25px] mb-[30px]">
                <div className={`${cardBase} border-l-[6px] border-l-emerald-500 dark:border-l-emerald-400 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[0.85rem] font-extrabold uppercase tracking-widest text-slate-500 dark:text-[#B3B3B3] block mb-2">Total Income</span>
                      <span className="text-4xl lg:text-5xl font-black text-slate-800 dark:text-white">₹{theatreData.total_income?.toLocaleString() || 0}</span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xl">₹</div>
                  </div>
                </div>
                <div className={`${cardBase} border-l-[6px] border-l-indigo-500 dark:border-l-[#E50914] bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-[#E50914]/5`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[0.85rem] font-extrabold uppercase tracking-widest text-slate-500 dark:text-[#B3B3B3] block mb-2">Ticket Sales</span>
                      <span className="text-4xl lg:text-5xl font-black text-slate-800 dark:text-white">{theatreData.total_tickets?.toLocaleString() || 0}</span>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-[#E50914]/20 flex items-center justify-center text-indigo-600 dark:text-[#E50914] font-bold text-xl">#</div>
                  </div>
                </div>
              </section>

              {/* Line Chart */}
              <div className={`${cardBase} mb-[30px]`}>
                <h3 className="mb-6 text-slate-800 dark:text-white text-[1.2rem] font-black">Ticket Sales Trend</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={theatreData.chart_data || []} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: "#888", fontSize: 12, fontWeight: 600 }} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#888", fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                    {theatreData.top_movie_titles?.map((title, idx) => (
                      <Line key={idx} type="monotone" dataKey={title} stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={3} dot={{ r: 4, fill: COLORS[idx % COLORS.length], strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={1500} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Transactions Table */}
              <div className={`${cardBase} p-0 overflow-hidden`}>
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#333]">
                  <h3 className="text-slate-800 dark:text-white text-[1.05rem] font-bold">Recent Transactions</h3>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-[#818cf8] tracking-wide uppercase">Last 10 Bookings</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-[#1A1A1A]">
                        {["#", "Customer", "Movie", "Seats", "Price", "Status", "Show Date", "Booked"].map((h, i) => (
                          <th key={h} className="p-4 text-[10px] font-extrabold text-slate-400 dark:text-[#555] uppercase tracking-[0.12em] border-b border-slate-200 dark:border-[#2a2a2a]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {theatreData.recent_transactions?.length > 0
                        ? theatreData.recent_transactions.map((tx, i) => (
                          <tr key={tx.booked_at} className="hover:bg-slate-50 dark:hover:bg-[#1f1f1f] transition-colors border-b border-slate-100 dark:border-[#2a2a2a] last:border-none">
                            <td className="p-4 text-[11px] font-bold text-slate-400 dark:text-[#555]">{String(i + 1).padStart(2, "0")}</td>
                            <td className="p-4 text-[13px] font-bold text-slate-800 dark:text-white">{tx.user_name || "Guest"}</td>
                            <td className="p-4">
                              <span className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold bg-indigo-100 dark:bg-[#E50914]/15 text-indigo-700 dark:text-[#E50914]">{tx.title}</span>
                            </td>
                            <td className="p-4 text-[12.5px] text-slate-600 dark:text-[#aaa]">{tx.seats} <span className="text-[10px] text-slate-400">({tx.seat_count})</span></td>
                            <td className="p-4 text-[13px] font-extrabold text-slate-800 dark:text-white">₹{tx.total_price}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />{tx.status}
                              </span>
                            </td>
                            <td className="p-4 text-[12px] text-slate-500 dark:text-[#777]">
                              {tx.show_date ? `${tx.show_date.slice(6, 8)}/${tx.show_date.slice(4, 6)}/${tx.show_date.slice(0, 4)}` : ""} · {tx.show_time}
                            </td>
                            <td className="p-4 text-[12px] text-slate-400 dark:text-[#555]">
                              {tx.booked_at ? new Date(tx.booked_at).toLocaleDateString() : ""}
                            </td>
                          </tr>
                        ))
                        : <tr><td colSpan="8" className="p-10 text-center text-slate-500 dark:text-[#666] font-bold">No recent transactions found.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;