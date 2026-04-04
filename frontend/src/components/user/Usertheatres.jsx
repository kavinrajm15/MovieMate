import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import { BsCameraReels } from 'react-icons/bs';
import { FiMapPin } from 'react-icons/fi';

const API = 'http://localhost:5000';

/* ── Shared Skeleton Loader ── */
const Skeleton = ({ rows = 3 }) => (
  <div className="space-y-4 max-w-5xl mx-auto p-6">
    <div className="h-32 rounded-[20px] animate-pulse bg-slate-200 dark:bg-white/5" />
    <div className="h-16 rounded-[20px] animate-pulse bg-slate-200 dark:bg-white/5" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-28 rounded-[20px] animate-pulse bg-slate-200 dark:bg-white/5" />
    ))}
  </div>
);

export default function UserTheatres() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setCity } = useOutletContext();

  const movieId        = searchParams.get('movie_id');
  const city           = searchParams.get('city') || '';
  const dateParam      = searchParams.get('date') || '';
  const theatreIdParam = searchParams.get('theatre_id') || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (city) setCity(city); }, [city, setCity]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ city });
    if (movieId) params.set('movie_id', movieId);
    if (dateParam) params.set('date', dateParam);
    if (theatreIdParam) params.set('theatre_id', theatreIdParam);

    fetch(`${API}/theatres?${params.toString()}`, { headers: {} })
      .then(r => r.json())
      .then(d => { 
        setData(d); 
        setLoading(false); 
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [movieId, city, dateParam, theatreIdParam]);

  const setDate = (d) => {
    const next = new URLSearchParams(searchParams);
    next.set('date', d);
    setSearchParams(next);
  };

  if (loading) return <Skeleton />;

  /* ═════════════════════════════════════════════════════════════════════
     MODE 1: CITY VIEW (No Movie ID) - Shows Grid of Theatres
     ═════════════════════════════════════════════════════════════════════ */
  if (!movieId) {
    // Safely check if data.theatres is an array
    const theatresArray = Array.isArray(data?.theatres) ? data.theatres : [];

    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 min-h-screen">
        <h2 className="text-[1.6rem] font-bold mb-6 text-slate-800 dark:text-white">
          Theatres in{' '}
          <span className="text-indigo-600 dark:text-[#E50914]">
            {city ? city.charAt(0).toUpperCase() + city.slice(1) : 'All Cities'}
          </span>
        </h2>

        {theatresArray.length === 0 ? (
          <p className="text-center py-12 rounded-[16px] font-semibold text-[#4a4e69] dark:text-[#B3B3B3] border border-dashed border-black/10 dark:border-white/10 bg-white/40 dark:bg-[rgba(30,30,30,0.6)]">
            No theatres listed for the selected criteria.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {theatresArray.map(t => (
              <div key={t.theatre_id} onClick={() => navigate(`/theatre/${t.theatre_id}`)}
                className="flex items-center gap-4 p-5 rounded-[16px] cursor-pointer
                  transition-all duration-300 hover:-translate-y-1
                  bg-white dark:bg-[rgba(30,30,30,0.6)]
                  border border-slate-200 dark:border-[#333333]
                  shadow-sm hover:shadow-lg dark:hover:border-[#E50914] backdrop-blur-[10px]">
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-500 dark:bg-[#E50914] text-white text-lg">
                  <BsCameraReels />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[1rem] font-bold truncate m-0 mb-1 text-slate-800 dark:text-white">{t.name}</h3>
                  <p className="text-sm m-0 flex items-center gap-1 font-medium text-[#4a4e69] dark:text-[#B3B3B3]">
                    <FiMapPin size={12} /> {t.city.charAt(0).toUpperCase() + t.city.slice(1)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════════════
     MODE 2: MOVIE VIEW (Has Movie ID) - Shows Theatres + Showtimes
     ═════════════════════════════════════════════════════════════════════ */
  if (!data?.movie) return (
    <div className="text-center py-20 text-[0.9rem] font-semibold text-[#4a4e69] dark:text-[#B3B3B3]">
      Movie data not found.
    </div>
  );

  const { movie, movie_title, theatres, dates, selected_date } = data;
  // Fallback to empty object if backend didn't send theatres dict
  const theatresDict = theatres || {}; 

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 min-h-screen">
      
      {/* ── Movie Banner ── */}
      <div className="rounded-[20px] p-6 mb-6 backdrop-blur-[15px]
        bg-white/80 dark:bg-[rgba(30,30,30,0.95)]
        border border-slate-200 dark:border-[#333333] shadow-sm">
        <div className="flex gap-6 items-start">
          <img
            src={`${API}/static/${movie.image?.replace('static/', '')}`}
            alt={movie_title}
            className="w-[120px] sm:w-[140px] aspect-[2/3] rounded-[12px] object-cover shadow-md flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-[1.8rem] font-extrabold mb-3 break-words text-slate-800 dark:text-white">
              {movie_title}
            </h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {movie.certificate && (
                <span className="px-3 py-1 rounded-[6px] text-xs font-bold border border-indigo-500 text-indigo-500 dark:border-[#F5C518] dark:text-[#F5C518]">
                  {movie.certificate}
                </span>
              )}
              {movie.duration && (
                <span className="px-3 py-1 rounded-[6px] text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white">
                  {movie.duration}
                </span>
              )}
            </div>
            <p className="text-sm font-medium m-0 text-[#4a4e69] dark:text-[#B3B3B3]">{movie.genres}</p>
          </div>
        </div>
      </div>

      {/* ── Date Strip ── */}
      {dates?.length > 0 && (
        <div className="sticky top-[68px] z-40 rounded-[16px] py-4 mb-6 backdrop-blur-[20px] bg-white/80 dark:bg-[rgba(18,18,18,0.8)] border border-slate-200 dark:border-[#333333] shadow-sm">
          <div className="flex gap-3 overflow-x-auto px-4" style={{ scrollbarWidth: 'none' }}>
            {dates.map(d => {
              const active = d.raw === selected_date;
              return (
                <button key={d.raw} onClick={() => setDate(d.raw)}
                  className={`flex-shrink-0 w-[60px] py-3 flex flex-col items-center rounded-[12px]
                    border-0 cursor-pointer transition-all duration-200
                    ${active
                      ? 'bg-indigo-600 dark:bg-[#E50914] text-white shadow-md'
                      : 'bg-slate-100 dark:bg-[rgba(40,40,40,0.6)] border border-transparent dark:border-[#444444] hover:bg-slate-200 dark:hover:bg-white/15'}`}>
                  <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-[#4a4e69] dark:text-[#B3B3B3]'}`}>{d.day}</span>
                  <span className={`text-xl font-extrabold my-0.5 ${active ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{d.date}</span>
                  <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-[#4a4e69] dark:text-[#B3B3B3]'}`}>{d.month}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Theatres + Showtimes ── */}
      <div className="flex flex-col gap-5 pb-20">
        {Object.entries(theatresDict).length === 0 ? (
          <p className="text-center py-12 font-semibold text-[#4a4e69] dark:text-[#B3B3B3]">
            No showtimes available for this date.
          </p>
        ) : (
          Object.entries(theatresDict).map(([name, shows]) => (
            <div key={name}
              className="rounded-[16px] p-6 backdrop-blur-[10px] bg-white dark:bg-[rgba(30,30,30,0.8)] border border-slate-200 dark:border-[#333333] shadow-sm">
              
              {/* Theatre Name Header */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-dashed border-slate-200 dark:border-white/10">
                <BsCameraReels className="text-xl flex-shrink-0 text-indigo-500 dark:text-[#E50914]" />
                <h3 className="text-[1.1rem] font-bold m-0 break-words text-slate-800 dark:text-white">{name}</h3>
              </div>
              
              {/* Timeslots */}
              <div className="flex flex-wrap gap-3">
                {Array.isArray(shows) && shows.map((s, i) => (
                  <div key={i}
                    // 🆕 MAGIC LINK: THIS TAKES THEM TO THE SEAT BOOKING PAGE 🆕
                    onClick={() => navigate(`/book/${s.showtime_id}`)}
                    className="flex flex-col items-center justify-center px-5 py-2.5 rounded-[10px]
                      cursor-pointer transition-all duration-200 hover:-translate-y-1 group
                      border border-indigo-500 dark:border-[#E50914]
                      bg-indigo-50 dark:bg-[rgba(229,9,20,0.05)]
                      hover:bg-indigo-600 dark:hover:bg-[#E50914]
                      hover:shadow-md">
                    <span className="text-[15px] font-bold transition-colors text-indigo-600 dark:text-[#E50914] group-hover:text-white">
                      {s.time || s.show_time}
                    </span>
                    <span className="text-[11px] font-semibold mt-1 transition-colors text-slate-500 dark:text-[#B3B3B3] group-hover:text-indigo-100 dark:group-hover:text-[#ffcccc]">
                      {s.format}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}