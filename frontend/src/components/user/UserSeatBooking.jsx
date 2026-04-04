import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

const API = 'http://localhost:5000';

const UserSeatBooking = () => {
  const { showtimeId } = useParams();
  const navigate       = useNavigate();
  const location       = useLocation();
  const { customer }   = useCustomerAuth();

  const [showtime, setShowtime]           = useState(null);
  const [seats, setSeats]                 = useState([]);
  const [pricing, setPricing]             = useState({ silver_price: 0, gold_price: 0, platinum_price: 0 });
  const [notForSale, setNotForSale]       = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [gridRows, setGridRows]           = useState([]);
  const [gridCols, setGridCols]           = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [booking, setBooking]                   = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [timeLeft, setTimeLeft]                 = useState(180);

  // ── Fetch showtime + seat layout ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!showtimeId || showtimeId === 'undefined') {
      toast.error('Invalid showtime. Please select a showtime from the listings.');
      navigate(-1);
      return;
    }
    setLoading(true);
    try {
      const [stRes, seatRes] = await Promise.all([
        fetch(`${API}/api/showtime/${showtimeId}`),
        fetch(`${API}/api/showtime/${showtimeId}/seats`),
      ]);

      if (!stRes.ok) { toast.error('Showtime not found.'); navigate(-1); return; }

      const stData   = await stRes.json();
      const seatData = await seatRes.json();

      setShowtime(stData.showtime);

      // Backend signals this showtime is not yet set up for sale
      if (seatData.not_for_sale) {
        setNotForSale(true);
        setLoading(false);
        return;
      }

      const allSeats = seatData.seats || [];
      setSeats(allSeats);
      setPricing(seatData.pricing || { silver_price: 0, gold_price: 0, platinum_price: 0 });

      if (allSeats.length > 0) {
        setGridRows([...new Set(allSeats.map(s => s.row_name))].sort());
        setGridCols([...new Set(allSeats.map(s => s.col_num))].sort((a, b) => a - b));
      }
    } catch (e) {
      console.error(e);
      toast.error('Could not load seat map. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showtimeId, navigate]);

  useEffect(() => {
    fetchData();
    // Restore pending seats if the user was bounced to login and came back
    const saved = localStorage.getItem('pendingSeats');
    if (saved) {
      try { setSelectedSeats(JSON.parse(saved)); } catch (_) {}
      localStorage.removeItem('pendingSeats');
    }
  }, [fetchData]);

  // ── Seat helpers ───────────────────────────────────────────────────────────
  const getSeat    = (row, col) => seats.find(s => s.row_name === row && s.col_num === col);
  const isSelected = (seat)     => seat && selectedSeats.some(s => s.seat_id === seat.seat_id);

  const priceFor = (seat) => {
    if (!seat) return 0;
    const cat = (seat.category || '').toLowerCase();
    if (cat === 'platinum' || cat === 'diamond') return pricing.platinum_price;
    if (cat === 'gold') return pricing.gold_price;
    return pricing.silver_price;
  };

  const total = selectedSeats.reduce((sum, s) => sum + priceFor(s), 0);

  const toggleSeat = (seat) => {
    if (!seat || seat.status !== 'available') return;
    setSelectedSeats(prev => {
      const exists = prev.find(s => s.seat_id === seat.seat_id);
      return exists ? prev.filter(s => s.seat_id !== seat.seat_id) : [...prev, seat];
    });
  };

  // ── Seat styling ───────────────────────────────────────────────────────────
  const getSeatClass = (seat, selected) => {
    if (!seat) return '';
    if (seat.status === 'aisle')
      return 'bg-transparent border border-dashed border-slate-300 dark:border-[#333] opacity-20 cursor-default pointer-events-none';
    if (seat.status === 'damaged')
      return 'bg-rose-100 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-600 cursor-not-allowed opacity-40';
    if (seat.status === 'booked')
      return 'bg-slate-600 dark:bg-[#1a1a1a] border border-slate-700 dark:border-[#333] text-slate-300 dark:text-[#555] cursor-not-allowed opacity-60';

    // Available
    if (selected) {
      if (seat.category === 'Platinum')
        return 'bg-purple-500 border-2 border-white dark:border-white/20 shadow-[0_0_14px_rgba(168,85,247,0.5)] dark:shadow-[0_0_14px_rgba(168,85,247,0.9)] text-white cursor-pointer';
      if (seat.category === 'Gold')
        return 'bg-amber-400 border-2 border-white dark:border-white/20 shadow-[0_0_14px_rgba(251,191,36,0.5)] dark:shadow-[0_0_14px_rgba(251,191,36,0.9)] text-slate-900 cursor-pointer';
      return 'bg-[#E50914] border-2 border-white dark:border-white/20 shadow-[0_0_14px_rgba(229,9,20,0.5)] dark:shadow-[0_0_14px_rgba(229,9,20,0.8)] text-white cursor-pointer';
    }

    if (seat.category === 'Platinum')
      return 'bg-purple-200 dark:bg-purple-950 border border-purple-400 dark:border-purple-700 text-purple-800 dark:text-purple-400 hover:bg-purple-500 hover:text-white dark:hover:bg-purple-700 dark:hover:text-white cursor-pointer hover:scale-110 shadow-sm dark:shadow-none';
    if (seat.category === 'Gold')
      return 'bg-amber-200 dark:bg-amber-950 border border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-400 hover:bg-amber-400 hover:text-slate-900 dark:hover:bg-amber-500 dark:hover:text-white cursor-pointer hover:scale-110 shadow-sm dark:shadow-none';
    return 'bg-slate-200 dark:bg-[#2d2d2d] border border-slate-400 dark:border-[#555] text-slate-700 dark:text-[#aaa] hover:bg-slate-700 hover:text-white dark:hover:bg-[#555] dark:hover:text-white cursor-pointer hover:scale-110 shadow-sm dark:shadow-none';
  };

  // ── Booking ────────────────────────────────────────────────────────────────
  const handleCancelBooking = async (isTimeout = false) => {
    setShowPaymentModal(false);
    if (isTimeout) toast.error("Payment window expired. Seats released.");
    
    try {
      await fetch(`${API}/api/booking/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showtime_id: parseInt(showtimeId),
          seat_ids: selectedSeats.map(s => s.seat_id),
        }),
      });
      fetchData();
    } catch (e) {
      console.error("Failed to cancel booking locks", e);
    }
  };

  useEffect(() => {
    let timer;
    if (showPaymentModal && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (showPaymentModal && timeLeft === 0) {
      handleCancelBooking(true);
    }
    return () => clearInterval(timer);
  }, [showPaymentModal, timeLeft]);

  const handleLockSeats = async () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat first.');
      return;
    }
    if (!customer) {
      localStorage.setItem('pendingSeats', JSON.stringify(selectedSeats));
      toast.error('Please log in to complete your booking.');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    setBooking(true);
    try {
      const res = await fetch(`${API}/api/booking/lock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showtime_id: parseInt(showtimeId),
          seat_ids: selectedSeats.map(s => s.seat_id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to lock seats.');
      
      setTimeLeft(180);
      setShowPaymentModal(true);
    } catch (e) {
      toast.error(e.message);
      fetchData(); // refresh to show updated seat availability
    } finally {
      setBooking(false);
    }
  };

  const handleConfirmPayment = async () => {
    setBooking(true);
    try {
      const res = await fetch(`${API}/api/booking/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showtime_id: parseInt(showtimeId),
          seat_ids: selectedSeats.map(s => s.seat_id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed.');
      toast.success(`🎉 Payment successful! Tickets booked.`);
      setShowPaymentModal(false);
      setSelectedSeats([]);
      fetchData();
      // Stay on the same showtime page
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBooking(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDate = (raw) => {
    if (!raw || raw.length < 8) return raw || '';
    try {
      return new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`)
        .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) { return raw; }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 dark:text-[#888] font-semibold">Loading seat map…</p>
      </div>
    </div>
  );

  // ── Not available for sale ─────────────────────────────────────────────────
  if (notForSale) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-200 px-4">
      <div className="max-w-md w-full text-center bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#2a2a2a] rounded-2xl p-10 shadow-sm">
        {showtime?.image && (
          <img src={`${API}/static/${showtime.image}`} alt={showtime?.title}
            className="w-20 h-24 object-cover rounded-xl mx-auto mb-5 shadow-lg opacity-60" />
        )}
        <div className="text-4xl mb-4">🎭</div>
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">
          Tickets Not Yet Available
        </h2>
        <p className="text-slate-500 dark:text-[#888] text-sm leading-relaxed mb-6">
          Tickets for this show are currently not open for sale.<br />
          Please check back later.
        </p>
        {showtime && (
          <div className="text-sm font-semibold text-slate-600 dark:text-[#aaa] mb-6">
            <span className="block">{showtime.title}</span>
            <span className="block text-xs mt-1 text-slate-400 dark:text-[#666]">
              {showtime.theatre_name} · {showtime.show_time}
            </span>
          </div>
        )}
        <button onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-xl bg-[#E50914] hover:bg-[#B20710] text-white font-bold text-sm transition-colors">
          ← Go Back
        </button>
      </div>
    </div>
  );

  const availableCount   = seats.filter(s => s.status === 'available').length;
  const bookedCount      = seats.filter(s => s.status === 'booked').length;

  return (
    <div className="min-h-screen pb-36 pt-6 bg-slate-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4">

        {/* ── Showtime info banner ── */}
        {showtime && (
          <div className="mb-8 rounded-2xl p-5 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#2a2a2a] flex flex-col sm:flex-row gap-4 items-start sm:items-center shadow-sm dark:shadow-none">
            {showtime.image && (
              <img
                src={`${API}/static/${showtime.image}`}
                alt={showtime.title}
                className="w-16 h-20 object-cover rounded-xl flex-shrink-0 shadow-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white truncate">{showtime.title}</h2>
              <p className="text-sm text-slate-500 dark:text-[#888] mt-1">
                {showtime.theatre_name} &middot; {showtime.city?.charAt(0).toUpperCase() + showtime.city?.slice(1)}
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                <span className="px-3 py-1 rounded-lg bg-rose-100 dark:bg-[#E50914]/20 text-rose-600 dark:text-[#E50914] text-xs font-bold">{showtime.show_time}</span>
                <span className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white text-xs font-bold">{showtime.format}</span>
                <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-[#aaa] text-xs font-semibold">{formatDate(showtime.date)}</span>
              </div>
            </div>
            <div className="text-right text-sm hidden sm:block flex-shrink-0">
              <p className="text-slate-500 dark:text-[#888]"><span className="text-emerald-600 dark:text-white font-bold">{availableCount}</span> available</p>
              <p className="text-slate-500 dark:text-[#888] mt-1"><span className="text-slate-400 dark:text-[#555] font-bold">{bookedCount}</span> booked</p>
            </div>
          </div>
        )}

        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white text-center mb-8">Select Your Seats</h1>

        {/* ── Screen curve ── */}
        <div className="w-3/4 max-w-lg mx-auto mb-10 text-center">
          <div className="h-1 bg-gradient-to-r from-transparent via-[#E50914] to-transparent rounded-full mb-1 opacity-80" />
          <span className="text-[10px] font-bold tracking-[0.3em] text-slate-400 dark:text-[#555] uppercase">Screen this way</span>
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-8">
          {[
            { cls: 'bg-slate-200 dark:bg-[#2d2d2d] border-slate-400 dark:border-[#555] shadow-sm dark:shadow-none', label: `Silver  ₹${pricing.silver_price}` },
            { cls: 'bg-amber-200 dark:bg-amber-950 border-amber-400 dark:border-amber-700 shadow-sm dark:shadow-none', label: `Gold  ₹${pricing.gold_price}` },
            { cls: 'bg-purple-200 dark:bg-purple-950 border-purple-400 dark:border-purple-700 shadow-sm dark:shadow-none', label: `Platinum  ₹${pricing.platinum_price}` },
            { cls: 'bg-[#E50914] border-white dark:border-white/20', label: 'Selected' },
            { cls: 'bg-slate-600 dark:bg-[#1a1a1a] border-slate-700 dark:border-[#333] opacity-60', label: 'Booked' },
          ].map(({ cls, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded-sm border ${cls}`} />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-[#777]">{label}</span>
            </div>
          ))}
        </div>

        {/* ── Seat Grid ── */}
        {seats.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-slate-300 dark:border-[#333]">
            <p className="text-lg font-bold text-slate-500 dark:text-[#666]">No seats configured for this theatre.</p>
            <p className="text-sm text-slate-400 dark:text-[#555] mt-2">The theatre admin needs to set up a seat layout first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 w-full">
            <div className="w-max mx-auto select-none space-y-1.5">

              {/* Column numbers header */}
              <div className="flex items-center gap-1 pl-9">
                {gridCols.map(c => (
                  <div key={c} className="w-7 text-center">
                    <span className="text-[9px] text-slate-400 dark:text-[#444] font-bold">{c}</span>
                  </div>
                ))}
              </div>

              {/* Seat rows */}
              {gridRows.map(row => (
                <div key={row} className="flex items-center gap-1">
                  <span className="w-7 text-center text-xs font-extrabold text-slate-500 dark:text-[#555] flex-shrink-0">{row}</span>

                  {gridCols.map(col => {
                    const seat    = getSeat(row, col);
                    const selected = isSelected(seat);
                    const isAisle = seat?.status === 'aisle';
                    return (
                      <div
                        key={col}
                        onClick={() => toggleSeat(seat)}
                        className={`
                          w-7 h-7 rounded-t-md rounded-b-sm flex items-center justify-center
                          transition-all duration-100 flex-shrink-0
                          ${seat ? getSeatClass(seat, selected) : 'bg-transparent'}
                          ${!isAisle && seat ? 'border' : ''}
                        `}
                        title={
                          !seat        ? '' :
                          isAisle      ? 'Aisle' :
                          seat.status === 'booked'  ? `${row}${col} — Already booked` :
                          seat.status === 'damaged' ? `${row}${col} — Unavailable` :
                          `${row}${col} · ${seat.category} · ₹${priceFor(seat)}`
                        }
                      >
                        {seat && !isAisle && (
                          <span className="text-[8px] font-bold leading-none opacity-70 pointer-events-none">
                            {col}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  <span className="w-7 text-center text-xs font-extrabold text-slate-500 dark:text-[#555] flex-shrink-0">{row}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Selected seat chips ── */}
        {selectedSeats.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            {selectedSeats.map(s => (
              <button
                key={s.seat_id}
                onClick={() => toggleSeat(s)}
                className="px-3 py-1.5 rounded-full text-xs font-bold
                  bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30
                  hover:bg-[#E50914]/30 transition-colors"
              >
                {s.row_name}{s.col_num} · {s.category} · ₹{priceFor(s)}  ✕
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Fixed checkout bar ── */}
      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-[#0f0f0f] border-t border-slate-200 dark:border-[#222] shadow-[0_-8px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.7)] z-50 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-[#777]">
              Selected Seats: <span className="font-bold text-slate-800 dark:text-white">{selectedSeats.length}</span>
            </p>
            <p className="text-2xl font-extrabold text-[#E50914] leading-tight">₹{total}</p>
          </div>

          <button
            onClick={handleLockSeats}
            disabled={booking || selectedSeats.length === 0}
            className={`px-8 py-3.5 rounded-xl font-extrabold text-white text-base
              transition-all duration-150
              ${selectedSeats.length === 0
                ? 'bg-slate-200 dark:bg-[#222] text-slate-400 dark:text-[#555] cursor-not-allowed'
                : booking
                  ? 'bg-[#E50914]/50 cursor-wait'
                  : 'bg-[#E50914] hover:bg-[#c40812] shadow-[0_4px_24px_rgba(229,9,20,0.45)] hover:-translate-y-0.5 active:translate-y-0'
              }`}
          >
            {booking
              ? 'Confirming…'
              : customer
                ? `Pay ₹${total} & Confirm`
                : 'Login to Book'}
          </button>
        </div>
      </div>
      {/* ── Payment / Ticket Summary Modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#f2f2f2] w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#f2f2f2] border-b border-gray-300">
              <span className="text-[#E50914] font-bold text-sm tracking-wide">Your Ticket</span>
              <button onClick={() => handleCancelBooking()} disabled={booking} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-500 hover:text-[#E50914] shadow-sm border border-gray-200 transition-colors disabled:opacity-50">
                ✕
              </button>
            </div>

            {/* Ticket Info Area */}
            <div className="bg-white m-3 rounded-[20px] p-5 shadow-sm border border-gray-100 flex gap-4 relative">
              <div className="w-16 h-20 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden shadow-inner">
                 <img src={showtime?.image ? `${API}/static/${showtime.image}` : ''} alt="poster" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                 <h3 className="font-extrabold text-gray-900 truncate text-lg">{showtime?.title}</h3>
                 <p className="text-xs text-gray-500 mt-1">{showtime?.format} &middot; {showtime?.certificate || 'U/A'}</p>
                 <p className="text-xs text-gray-600 font-semibold mt-1">{formatDate(showtime?.date)} | {showtime?.show_time}</p>
                 <p className="text-xs text-gray-400 mt-1 truncate">{showtime?.theatre_name}</p>
              </div>
              {/* Notch effects */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f2f2f2] rounded-full"></div>
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f2f2f2] rounded-full"></div>
            </div>

            {/* Seat Summary & Timer Area */}
            <div className="bg-white mx-3 mb-3 rounded-[20px] p-6 shadow-sm border border-gray-100 relative">
               <div className="text-center">
                 <p className="text-sm font-semibold text-gray-500 mb-1">{selectedSeats.length} Ticket(s)</p>
                 <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-snug">{selectedSeats.map(s => `${s.row_name}${s.col_num}`).join(', ')}</h2>
                 <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2 font-bold">Screen This Way</p>
               </div>
               
               <div className="mt-5 pt-5 border-t border-dashed border-gray-300 text-center">
                 <p className="text-sm font-bold text-gray-800">Complete payment within</p>
                 <p className={`text-3xl font-black mt-1 ${timeLeft <= 60 ? 'text-[#E50914] animate-pulse' : 'text-gray-900'}`}>
                   {formatTime(timeLeft)}
                 </p>
               </div>
               {/* Notch effects matching above */}
               <div className="absolute -left-3 -top-3 w-6 h-6 bg-[#f2f2f2] rounded-full"></div>
               <div className="absolute -right-3 -top-3 w-6 h-6 bg-[#f2f2f2] rounded-full"></div>
            </div>

            {/* Total & Action Buttons */}
            <div className="px-6 py-5 bg-[#f2f2f2] flex flex-col gap-3">
               <div className="flex justify-between items-center px-2">
                 <span className="text-gray-600 font-bold text-sm">Total Amount</span>
                 <span className="text-gray-900 font-black text-lg">₹{total}</span>
               </div>
               <div className="flex gap-3 mt-2">
                 <button 
                   onClick={() => handleCancelBooking()}
                   disabled={booking}
                   className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                 >
                   Cancel Book
                 </button>
                 <button 
                   onClick={handleConfirmPayment}
                   disabled={booking}
                   className="flex-1 py-3.5 rounded-xl font-extrabold text-white bg-[#E50914] hover:bg-[#c40812] shadow-md transition-colors disabled:opacity-50"
                 >
                   {booking ? 'Processing...' : 'Confirm'}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSeatBooking;