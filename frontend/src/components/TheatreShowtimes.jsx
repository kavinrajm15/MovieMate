import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdOutlineModeEditOutline, MdDelete } from "react-icons/md";

const TheatreShowtimes = () => {
  const { theatre_id, movie_id } = useParams();
  const navigate = useNavigate();
  const { user, canAccess } = useAuth();
  const isTheatreAdmin = user?.role === 'theatre_admin';
  const canAdd    = isTheatreAdmin || canAccess('showtime', 'add');
  const canEdit   = isTheatreAdmin || canAccess('showtime', 'edit');
  const canDelete = isTheatreAdmin || canAccess('showtime', 'delete');
  const [data, setData]       = useState({ theatre: null, movie: null, schedule: {} });
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentSt, setCurrentSt]   = useState(null);

  const fetchSchedule = async () => {
    try {
      const res = await fetch(`http://localhost:5000/admin/theatre/${theatre_id}/movie/${movie_id}`, {
        method: 'GET', credentials: 'include'
      });
      if (res.ok) {
        const result = await res.json();
        setData({ theatre: result.theatre, movie: result.movie, schedule: result.schedule || {} });
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSchedule(); }, [theatre_id, movie_id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:5000/admin/showtime/add', {
      method: 'POST', credentials: 'include', body: new FormData(e.target)
    });
    setIsAddOpen(false);
    fetchSchedule();
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    await fetch(`http://localhost:5000/admin/showtime/edit/${currentSt.showtime_id}`, {
      method: 'POST', credentials: 'include', body: new FormData(e.target)
    });
    setIsEditOpen(false);
    fetchSchedule();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this showtime?')) return;
    await fetch(`http://localhost:5000/admin/showtime/delete/${id}`, {
      method: 'GET', credentials: 'include'
    });
    fetchSchedule();
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [time, meridiem] = timeStr.trim().split(' ');
    let [hours, minutes]   = time.split(':').map(Number);
    if (meridiem?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (meridiem?.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + (minutes || 0);
  };

  const sortedTimes = (times) =>
    [...times].sort((a, b) => parseTimeToMinutes(a.show_time) - parseTimeToMinutes(b.show_time));

  const formatDisplayDate = (raw) => {
    if (!raw || raw.length !== 8) return raw;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${raw.substring(6,8)} ${months[parseInt(raw.substring(4,6))-1]}, ${raw.substring(0,4)}`;
  };

  /* ── shared form field ── */
  const fieldCls = `w-full p-3 rounded-[10px] text-base outline-none box-border font-[inherit]
    border border-[#cbd5e1] dark:border-[#333333]
    bg-white dark:bg-[#121212]
    text-slate-800 dark:text-white
    focus:border-indigo-500 dark:focus:border-[#E50914]
    transition-colors duration-200`;

  const labelCls = `block mb-2 font-semibold text-[0.95rem]
    text-[#4a4e69] dark:text-[#B3B3B3]`;

  /* ── shared modal overlay ── */
  const overlayBase = `fixed inset-0 z-[1000] flex justify-center items-center
    bg-[rgba(15,23,42,0.6)] dark:bg-black/80 backdrop-blur-[5px]`;

  /* ── shared modal card ── */
  const cardBase = `relative w-full max-w-[400px] p-[30px] rounded-[20px]
    bg-white dark:bg-[#1E1E1E]
    border border-[#e2e8f0] dark:border-[#333333]
    shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]
    slide-up`;

  /* ── shared save button ── */
  const saveBtnCls = `w-full py-3 rounded-[10px] font-semibold text-base text-white
    border-none cursor-pointer transition-all duration-200
    bg-gradient-to-br from-indigo-500 to-purple-500
    dark:bg-none dark:bg-[#E50914]
    hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]`;

  return (
    <main className="p-[30px]">

      {/* ══════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════ */}
      <header className="flex justify-between items-center flex-wrap gap-4 mb-[30px]
        px-[30px] py-5 rounded-[20px]
        bg-white/40 dark:bg-[rgba(30,30,30,0.95)]
        backdrop-blur-[10px]
        border border-white/50 dark:border-[#333333]
        shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div>
          {/* Breadcrumb */}
          <p className="text-[0.9rem] font-semibold capitalize mb-1
            text-[#94a3b8] dark:text-[#B3B3B3]">
            <span
              onClick={() => navigate(`/admin/theatre/view/${theatre_id}`)}
              className="text-indigo-500 dark:text-[#E50914] cursor-pointer
                hover:text-indigo-700 dark:hover:text-[#ff4d5a]
                hover:underline transition-colors duration-200">
              ← Back to {data.theatre?.name}
            </span>
          </p>
          <h1 className="text-[1.8rem] font-bold mb-1 text-slate-800 dark:text-white">
            Manage Showtimes
          </h1>
        </div>

        {canAdd && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-6 py-3 rounded-full font-bold tracking-wide text-white
              border-none cursor-pointer transition-all duration-200
              bg-gradient-to-br from-indigo-500 to-purple-500
              dark:bg-none dark:bg-[#E50914]
              hover:-translate-y-0.5
              hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
              dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]">
            Add Showtime
          </button>
        )}
      </header>

      {/* ══════════════════════════════════════
          LOADER
      ══════════════════════════════════════ */}
      {loading ? (
        <div className="flex justify-center items-center h-[50vh]
          text-[1.1rem] font-semibold text-slate-500 dark:text-[#a3a3a3] animate-pulse">
          Loading schedule...
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════
              MOVIE SUMMARY BANNER
          ══════════════════════════════════════ */}
          <div className="flex items-center gap-5 p-5 mb-[30px] rounded-[12px]
            bg-white/50 dark:bg-[#1E1E1E]
            border border-white/40 dark:border-[#333333]
            backdrop-blur-[10px]">

            {/* Poster */}
            <div className="w-[70px] h-[100px] rounded-[10px] overflow-hidden flex-shrink-0
              flex items-center justify-center
              bg-[#cbd5e1] dark:bg-[#121212]
              border border-white/40 dark:border-[#333333]
              text-slate-500 dark:text-[#666] text-[0.8rem] font-bold">
              {data.movie?.image
                ? <img src={`http://localhost:5000/static/${data.movie.image}`} alt="poster"
                    className="w-full h-full object-cover" />
                : 'No Image'
              }
            </div>

            {/* Info */}
            <div>
              <h2 className="text-[1.5rem] font-bold mb-1 text-slate-800 dark:text-white">
                {data.movie?.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-[2px] rounded-[6px] text-[0.7rem] font-bold
                  bg-[#FFF4DE] text-[#FF9F43]
                  dark:bg-[rgba(245,197,24,0.2)] dark:text-[#F5C518]
                  dark:border dark:border-[rgba(245,197,24,0.3)]">
                  {data.movie?.certificate}
                </span>
                <span className="text-[0.85rem] font-medium ml-[10px]
                  text-slate-500 dark:text-[#B3B3B3]">
                  {data.movie?.duration}
                </span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════
              SCHEDULE
          ══════════════════════════════════════ */}
          <div className="flex flex-col gap-5">
            {Object.keys(data.schedule).length > 0 ? (
              Object.entries(data.schedule).map(([dateStr, times]) => (
                <div key={dateStr}
                  className="p-5 rounded-[12px]
                    bg-white/50 dark:bg-[#1E1E1E]
                    border border-white/40 dark:border-[#333333]
                    backdrop-blur-[10px]">

                  {/* Day title */}
                  <div className="text-[1.1rem] font-bold mb-4 pb-[10px]
                    text-slate-800 dark:text-white
                    border-b border-black/5 dark:border-[#333333]">
                    {formatDisplayDate(dateStr)}
                  </div>

                  {/* Showtime pills */}
                  <div className="flex flex-wrap gap-4">
                    {sortedTimes(times).map(st => (
                      <div key={st.showtime_id}
                        className="flex flex-col gap-[10px] min-w-[120px] px-4 py-3
                          rounded-[12px]
                          bg-white/70 dark:bg-[#252525]
                          border border-[rgba(99,102,241,0.2)] dark:border-[#333333]
                          transition-all duration-200
                          hover:-translate-y-[3px]
                          hover:shadow-[0_5px_15px_rgba(99,102,241,0.1)]
                          hover:border-indigo-500
                          dark:hover:shadow-[0_5px_15px_rgba(0,0,0,0.5)]
                          dark:hover:border-[#E50914]">

                        {/* Time + format */}
                        <div className="flex justify-between items-center gap-4">
                          <span className="font-extrabold text-[1.05rem]
                            text-slate-800 dark:text-white">
                            {st.show_time}
                          </span>
                          <span className="px-[6px] py-[2px] rounded-[4px]
                            text-[0.75rem] font-bold border
                            bg-[#e2e8f0] text-[#4a4e69]
                            dark:bg-[#121212] dark:text-[#F5C518] dark:border-[#333333]">
                            {st.format}
                          </span>
                        </div>

                        {/* Edit / Delete — hidden for view-only staff */}
                        {(canEdit || canDelete) && (
                          <div className="flex justify-between pt-2
                            border-t border-dashed border-black/10 dark:border-[#444444]">
                            {canEdit && (
                              <button
                                onClick={() => { setCurrentSt({ ...st, date: dateStr }); setIsEditOpen(true); }}
                                className="px-2 py-1 rounded-[6px] font-bold cursor-pointer
                                  transition-all duration-200 border-none bg-transparent
                                  text-indigo-600 dark:text-[#E50914]
                                  hover:bg-[rgba(79,70,229,0.1)]
                                  dark:hover:bg-[rgba(229,9,20,0.1)]">
                                <MdOutlineModeEditOutline size={16} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(st.showtime_id)}
                                className="px-2 py-1 rounded-[6px] font-bold cursor-pointer
                                  transition-all duration-200 border-none bg-transparent
                                  text-rose-500 dark:text-[#666666]
                                  hover:bg-rose-500/10
                                  dark:hover:text-[#E50914]">
                                <MdDelete size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-[40px] font-medium
                text-[#94a3b8] dark:text-[#B3B3B3]
                bg-white/50 dark:bg-[#1E1E1E]
                border border-white/40 dark:border-[#333333]
                rounded-[12px] backdrop-blur-[10px]">
                No showtimes scheduled for this movie yet.
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════
          ADD SHOWTIME MODAL
      ══════════════════════════════════════ */}
      {isAddOpen && (
        <div className={overlayBase} onClick={() => setIsAddOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsAddOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914]
                transition-colors duration-200">
              ✕
            </span>
            <h2 className="text-[1.3rem] font-bold mb-5 text-slate-800 dark:text-white">
              Add Showtime
            </h2>
            <form onSubmit={handleAdd}>
              <input type="hidden" name="theatre_id" value={theatre_id} />
              <input type="hidden" name="movie_id"   value={movie_id} />

              <div className="mb-5">
                <label className={labelCls}>Date</label>
                <input type="date" name="date" required
                  min={new Date().toISOString().split('T')[0]}
                  className={fieldCls} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelCls}>Time</label>
                  <input type="text" name="show_time" required placeholder="10:30 AM"
                    className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Format</label>
                  <select name="format" required className={fieldCls}>
                    <option>2D</option>
                    <option>3D</option>
                    <option>IMAX</option>
                    <option>4DX</option>
                  </select>
                </div>
              </div>

              <button type="submit" className={saveBtnCls}>Add Showtime</button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          EDIT SHOWTIME MODAL
      ══════════════════════════════════════ */}
      {isEditOpen && currentSt && (
        <div className={overlayBase} onClick={() => setIsEditOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsEditOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914]
                transition-colors duration-200">
              ✕
            </span>
            <h2 className="text-[1.3rem] font-bold mb-5 text-slate-800 dark:text-white">
              Edit Showtime
            </h2>
            <form onSubmit={handleEdit}>

              <div className="mb-5">
                <label className={labelCls}>Date</label>
                <input type="date" name="date" required
                  min={new Date().toISOString().split('T')[0]}
                  defaultValue={currentSt.date
                    ? `${currentSt.date.substring(0,4)}-${currentSt.date.substring(4,6)}-${currentSt.date.substring(6,8)}`
                    : ''}
                  className={fieldCls} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelCls}>Time</label>
                  <input type="text" name="show_time" required
                    defaultValue={currentSt.show_time}
                    className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Format</label>
                  <select name="format" required defaultValue={currentSt.format}
                    className={fieldCls}>
                    <option>2D</option>
                    <option>3D</option>
                    <option>IMAX</option>
                    <option>4DX</option>
                  </select>
                </div>
              </div>

              <button type="submit" className={saveBtnCls}>Update Details</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default TheatreShowtimes;