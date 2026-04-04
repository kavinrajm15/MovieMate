import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TheatreView = () => {
  const { theatre_id } = useParams();
  const navigate = useNavigate();
  const { user } = useOutletContext();
  const [data, setData]           = useState({ theatre: null, movies: [], all_movies: [] });
  const [loading, setLoading]     = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch(`http://localhost:5000/admin/theatre/view/${theatre_id}`, {
        method: 'GET', credentials: 'include'
      });
      if (res.ok) {
        const result = await res.json();
        setData({
          theatre:    result.theatre,
          movies:     result.movies     || [],
          all_movies: result.all_movies || [],
        });
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [theatre_id]);

  const handleAssignMovie = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:5000/admin/showtime/add', {
      method: 'POST', credentials: 'include', body: new FormData(e.target)
    });
    setIsModalOpen(false);
    fetchData();
  };

  const isStaff = user?.role !== 'theatre_admin';
  const { canAccess } = useAuth();
  const isTheatreAdmin = user?.role === 'theatre_admin';
  const canAssign = isTheatreAdmin || canAccess('showtime', 'add');

  /* ── shared form field ── */
  const fieldCls = `w-full p-3 rounded-[10px] text-base outline-none box-border font-[inherit]
    border border-[#cbd5e1] dark:border-[#333333]
    bg-white dark:bg-[#121212]
    text-slate-800 dark:text-white
    placeholder-[#9ea1bc] dark:placeholder-[#666666]
    focus:border-indigo-500 dark:focus:border-[#E50914]
    transition-colors duration-200`;

  const labelCls = `block mb-2 font-semibold text-[0.95rem]
    text-[#4a4e69] dark:text-[#B3B3B3]`;

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
            {isStaff && (
              <>
                <span
                  onClick={() => navigate('/admin/cities')}
                  className="text-indigo-500 dark:text-[#E50914] cursor-pointer
                    hover:text-indigo-700 dark:hover:text-[#ff4d5a]
                    hover:underline transition-colors duration-200">
                  Cities
                </span>
                {' / '}
                <span
                  onClick={() => navigate(`/admin/city/${data.theatre?.city}/theatres`)}
                  className="text-indigo-500 dark:text-[#E50914] cursor-pointer
                    hover:text-indigo-700 dark:hover:text-[#ff4d5a]
                    hover:underline transition-colors duration-200">
                  {data.theatre?.city}
                </span>
                {' / '}
              </>
            )}
            <span className="text-slate-800 dark:text-white">
              {data.theatre?.name}
            </span>
          </p>

          <h1 className="text-[1.8rem] font-bold text-slate-800 dark:text-white">
            Movies Running Here
          </h1>
        </div>

        {canAssign && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 rounded-full font-bold tracking-wide text-white
              border-none cursor-pointer transition-all duration-200
              bg-gradient-to-br from-indigo-500 to-purple-500
              dark:bg-none dark:bg-[#E50914]
              hover:-translate-y-0.5
              hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
              dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]">
            Assign New Movie
          </button>
        )}
      </header>

      {/* ══════════════════════════════════
          LOADER
      ══════════════════════════════════════ */}
      {loading ? (
        <div className="flex justify-center items-center h-[50vh]
          text-[1.1rem] font-semibold text-slate-500 dark:text-[#a3a3a3] animate-pulse">
          Loading schedule...
        </div>
      ) : (

        /* ═══════════════════════════════════
            MOVIES GRID
        ══════════════════════════════════════ */
        <div className="grid gap-4 pb-5 w-full
          [grid-template-columns:repeat(5,minmax(0,1fr))]
          [@media(max-width:1200px)]:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">

          {data.movies.map(m => (
            <div
              key={m.movie_id}
              onClick={() => navigate(`/admin/theatre/${theatre_id}/movie/${m.movie_id}`)}
              className="flex flex-col relative overflow-hidden rounded-[20px] cursor-pointer
                border border-white/50 dark:border-[#333333]
                bg-white/65 dark:bg-[#1E1E1E]
                backdrop-blur-[10px]
                shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.5)]
                transition-all duration-200
                hover:-translate-y-2
                hover:shadow-[0_15px_30px_rgba(67,24,255,0.15)]
                hover:border-white/80
                dark:hover:shadow-[0_15px_30px_rgba(229,9,20,0.2)]
                dark:hover:border-[#E50914]
                group">

              {/* Poster */}
              <div className="w-full h-[250px] relative bg-[#eeeeee] dark:bg-[#222222]">
                {m.image
                  ? <img src={`http://localhost:5000/static/${m.image}`} alt="poster"
                      className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center
                      text-[1.5rem] text-[#cbd5e1] dark:text-[#666666]
                      bg-[#eeeeee] dark:bg-[#222222]">
                      No Image
                    </div>
                }
                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center
                  font-bold opacity-0 group-hover:opacity-100
                  transition-opacity duration-200
                  bg-[rgba(67,24,255,0.7)] text-white
                  dark:bg-black/85 dark:text-[#E50914]">
                  {canAssign ? 'Manage Showtimes →' : 'View Showtimes →'}
                </div>
              </div>

              {/* Movie info */}
              <div className="px-5 py-[15px] w-full">
                <h3 className="mb-2 text-[1.05rem] font-bold
                  text-[#1B2559] dark:text-white
                  overflow-hidden text-ellipsis
                  [display:-webkit-box] [-webkit-line-clamp:2]
                  [-webkit-box-orient:vertical]
                  h-[2.8rem] leading-[1.4rem]">
                  {m.title}
                </h3>
                <div className="flex justify-between items-center">
                  <span className="text-[0.85rem] font-semibold
                    text-[#a3aed0] dark:text-[#B3B3B3]">
                    {m.duration}
                  </span>
                  <span className="px-2 py-[2px] rounded-[6px] text-[0.7rem] font-bold border
                    bg-[#FFF4DE] text-[#FF9F43] border-transparent
                    dark:bg-[rgba(245,197,24,0.2)] dark:text-[#F5C518]
                    dark:border-[rgba(245,197,24,0.3)]">
                    {m.certificate}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {data.movies.length === 0 && (
            <div className="col-span-full text-center py-[40px] font-medium
              text-[#94a3b8] dark:text-[#B3B3B3]">
              No movies are currently scheduled here.
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          ASSIGN MOVIE MODAL
      ══════════════════════════════════════ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[1000] flex justify-center items-center
            bg-[rgba(15,23,42,0.6)] dark:bg-black/80 backdrop-blur-[5px]"
          onClick={() => setIsModalOpen(false)}>

          <div
            className="relative w-full max-w-[500px] p-[30px] rounded-[20px]
              bg-white dark:bg-[#1E1E1E]
              border border-[#e2e8f0] dark:border-[#333333]
              shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]
              slide-up max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Close */}
            <span
              onClick={() => setIsModalOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914]
                transition-colors duration-200">
              ✕
            </span>

            <h2 className="text-[1.3rem] font-bold mb-5 text-slate-800 dark:text-white">
              Assign Movie
            </h2>

            <form onSubmit={handleAssignMovie}>
              <input type="hidden" name="theatre_id" value={theatre_id} />

              {/* Movie select */}
              <div className="mb-5">
                <label className={labelCls}>Select Movie from Global Catalog</label>
                <select name="movie_id" required className={fieldCls}>
                  <option value="" disabled>-- Select Movie --</option>
                  {data.all_movies.map(am => (
                    <option key={am.movie_id} value={am.movie_id}>{am.title}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="mb-5">
                <label className={labelCls}>Show Date</label>
                <input type="date" name="date" required
                  min={new Date().toISOString().split('T')[0]}
                  className={fieldCls} />
              </div>

              {/* Time + Format */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelCls}>Time</label>
                  <input type="text" name="show_time" required placeholder="e.g. 10:30 AM"
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

              {/* Save */}
              <button type="submit"
                className="w-full py-3 rounded-[10px] font-semibold text-base text-white
                  border-none cursor-pointer transition-all duration-200
                  bg-gradient-to-br from-indigo-500 to-purple-500
                  dark:bg-none dark:bg-[#E50914]
                  hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]">
                Assign & Save
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default TheatreView;