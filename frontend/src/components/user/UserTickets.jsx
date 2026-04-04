import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiClock, FiMapPin, FiFilm } from 'react-icons/fi';
import { BsTicketPerforated, BsCreditCard } from 'react-icons/bs';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000';

const UserTickets = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API}/api/my-bookings`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        
        // Group booking seats by showtime_id and booked_at to display together
        const grouped = data.bookings.reduce((acc, b) => {
          const key = `${b.showtime_id}_${b.booked_at}`;
          if (!acc[key]) {
            acc[key] = {
              ...b,
              seats: [],
              total_amount: 0
            };
          }
          
          acc[key].seats.push({ row_name: b.row_name, col_num: b.col_num, category: b.category });
          acc[key].total_amount += b.price_paid || 0;
          
          return acc;
        }, {});
        
        // Convert to array and sort by booked_at descending
        const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.booked_at) - new Date(a.booked_at));
        setBookings(groupedArray);
      } else {
        toast.error('Failed to load tickets.');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Network error loading tickets.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (raw) => {
    if (!raw || raw.length < 8) return raw || '';
    try {
      return new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`)
        .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) { return raw; }
  };

  const isExpired = (dateRaw, showTime) => {
    try {
      // dateRaw is YYYYMMDD e.g. "20260330"
      const dateStr = `${dateRaw.slice(0,4)}-${dateRaw.slice(4,6)}-${dateRaw.slice(6,8)}`;
      // showTime is like "10:30 AM" or "10:30"
      const showDateTime = new Date(`${dateStr} ${showTime}`);
      return !isNaN(showDateTime) && showDateTime < new Date();
    } catch (_) { return false; }
  };

  const formatBookedAt = (isoString) => {
    try {
      return new Date(isoString).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (_) { return isoString; }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 dark:text-[#888] font-bold tracking-wide">Fetching Your Tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-8">
        <BsTicketPerforated className="text-3xl text-indigo-600 dark:text-[#E50914]" />
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">My Tickets</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-12 text-center border border-slate-200 dark:border-[#333] shadow-sm">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-5">
            <FiFilm className="text-indigo-300 dark:text-[#555] text-4xl" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No tickets found</h2>
          <p className="text-slate-500 dark:text-[#888] mb-6">Looks like you haven't booked any movies yet.</p>
          <Link to="/" className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#E50914] dark:hover:bg-[#B20710] text-white font-bold rounded-xl transition-colors">
            Browse Movies
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {bookings.map((b) => (
            <div key={b.booking_id} className="bg-white dark:bg-[#1E1E1E] rounded-[20px] md:rounded-[24px] overflow-hidden border border-slate-200 dark:border-[#333] shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-row relative transition-transform hover:-translate-y-1 duration-300">
              
              {/* Poster Section */}
              <div className="w-[100px] sm:w-[140px] md:w-56 bg-slate-100 dark:bg-[#111] relative flex-shrink-0 z-0">
                {b.image ? (
                  <img src={`${API}/static/${b.image}`} alt={b.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FiFilm className="text-3xl text-slate-300 dark:text-[#333]" />
                  </div>
                )}
                {/* Status Badge */}
                <div className={`absolute top-2 left-2 px-1.5 py-0.5 md:px-2 md:py-1 text-[9px] md:text-[10px] font-bold rounded-md shadow-sm uppercase tracking-wider text-white ${
                  isExpired(b.date, b.show_time)
                    ? 'bg-slate-500'
                    : 'bg-emerald-500'
                }`}>
                  {isExpired(b.date, b.show_time) ? 'Expired' : b.status === 'confirmed' ? 'Confirmed' : b.status}
                </div>
              </div>

              {/* Perforation Line (Simulated Ticket Tear) */}
              <div className="absolute top-0 bottom-0 left-[100px] sm:left-[140px] md:left-[224px] w-0 border-l-2 border-dashed border-slate-200/50 dark:border-[#121212] z-10 mix-blend-overlay shadow-[-1px_0_0_rgba(0,0,0,0.05)]" />

              {/* Details Section */}
              <div className="p-3 sm:p-5 md:p-6 flex-1 flex flex-col justify-between z-10 bg-white dark:bg-[#1E1E1E]">
                <div>
                  <h3 className="text-[15px] sm:text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight mb-2 tracking-tight">{b.title}</h3>
                  <div className="flex flex-col gap-1.5 mt-2 text-[11px] sm:text-xs md:text-sm font-semibold text-slate-500 dark:text-[#bbb]">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-white"><FiMapPin className="text-indigo-400 dark:text-[#E50914] flex-shrink-0" /> <span className="truncate">{b.theatre_name}, {b.city.charAt(0).toUpperCase() + b.city.slice(1)}</span></span>
                    <span className="flex items-center gap-1.5"><FiCalendar className="text-indigo-400 dark:text-[#E50914] flex-shrink-0" /> {formatDate(b.date)} &bull; {b.show_time}</span>
                  </div>
                </div>

                {/* Seats and Footer */}
                <div className="mt-3 sm:mt-5 pt-3 sm:pt-4 border-t border-dashed border-slate-200 dark:border-[#444] flex flex-col sm:flex-row sm:items-end justify-between gap-3 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiPjwvcmVjdD4KPGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PC9jaXJjbGU+Cjwvc3ZnPg==')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiPjwvcmVjdD4KPGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PC9jaXJjbGU+Cjwvc3ZnPg==')]">
                  <div>
                    <span className="text-[9px] sm:text-[10px] md:text-[11px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-[#777]">Admit {b.seats.length}</span>
                    <div className="mt-1 sm:mt-1.5 flex flex-wrap gap-1 md:gap-1.5 w-full">
                      {b.seats.map((seat, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded md:rounded-md text-[10px] sm:text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-[#E50914]/10 dark:text-[#E50914] border border-indigo-100 dark:border-[#E50914]/20 shadow-sm">
                          {seat.row_name}{seat.col_num}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-left sm:text-right mt-1 sm:mt-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0.5 w-full sm:w-auto">
                    <span className="text-[13px] sm:text-[15px] font-black text-slate-800 dark:text-white">
                      ₹{b.total_amount}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 dark:text-[#666] flex items-center justify-end gap-1">
                      <BsCreditCard /> Booked {formatBookedAt(b.booked_at).split(',')[0]}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserTickets;