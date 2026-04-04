import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { BsCameraReels } from 'react-icons/bs';
import { FiMapPin } from 'react-icons/fi';

const API = 'http://localhost:5000';

export default function UserTheatreView() {
  const { theatreId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setCity } = useOutletContext();
  const dateParam = searchParams.get('date') || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/theatre/${theatreId}${dateParam ? `?date=${dateParam}` : ''}`,
      { headers: {} })
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.theatre?.city) setCity(d.theatre.city);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false)
      });
  }, [theatreId, dateParam, setCity]);

  const setDate = (d) => {
    const next = new URLSearchParams(searchParams);
    next.set('date', d);
    setSearchParams(next);
  };

  if (loading) return (
    <div className="space-y-4 max-w-6xl mx-auto p-6">
      <div className="h-28 rounded-[20px] animate-pulse bg-slate-200 dark:bg-white/5" />
      <div className="h-16 rounded-[20px] animate-pulse bg-slate-200 dark:bg-white/5" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="aspect-[2/3] rounded-[16px] animate-pulse bg-slate-200 dark:bg-white/5" />
        ))}
      </div>
    </div>
  );

  if (!data?.theatre) return (
    <div className="text-center py-20 text-[0.9rem] font-semibold text-[#4a4e69] dark:text-[#B3B3B3]">
      Theatre not found.
    </div>
  );

  const { theatre, movies, dates, selected_date } = data;
  const safeMovies = Array.isArray(movies) ? movies : [];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-20">
      
      {/* ── Theatre Banner ── */}
      <div className="rounded-[20px] p-6 mb-6 backdrop-blur-[15px]
        bg-white dark:bg-[rgba(30,30,30,0.95)]
        border border-slate-200 dark:border-[#333333] shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[16px] flex items-center justify-center text-4xl
            text-white flex-shrink-0 bg-indigo-500 dark:bg-[#E50914] shadow-md">
            <BsCameraReels />
          </div>
          <div>
            <h2 className="text-[1.8rem] font-extrabold mb-2 text-slate-800 dark:text-white">
              {theatre.name}
            </h2>
            <p className="flex items-center gap-2 text-sm font-medium m-0 text-[#4a4e69] dark:text-[#B3B3B3]">
              <FiMapPin size={13} />
              {theatre.city.charAt(0).toUpperCase() + theatre.city.slice(1)}
            </p>
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

      {/* ── Movies Grid ── */}
      {safeMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {safeMovies.map(m => (
            <div key={m.movie_id}
              // 🆕 This passes the baton back to Usertheatres.jsx to show the specific showtimes!
              onClick={() => navigate(`/theatres?movie_id=${m.movie_id}&city=${theatre.city}&theatre_id=${theatre.theatre_id}`)}
              className="rounded-[14px] p-3 cursor-pointer
                transition-all duration-200 hover:-translate-y-1.5
                bg-white dark:bg-[rgba(30,30,30,0.8)]
                border border-slate-200 dark:border-[#333333]
                shadow-sm hover:shadow-xl dark:hover:border-[#E50914]">
              <img
                src={`${API}/static/${m.image?.replace('static/', '')}`}
                alt={m.title}
                loading="lazy"
                className="w-full aspect-[2/3] rounded-[10px] object-cover"
              />
              <div className="pt-3">
                <h4 className="text-[0.95rem] font-extrabold truncate m-0 mb-1 text-slate-900 dark:text-white">
                  {m.title}
                </h4>
                <p className="text-xs font-medium m-0 text-[#475569] dark:text-[#cbd5e1]">
                  {[m.duration, m.certificate].filter(Boolean).join(' • ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-[16px] font-semibold text-[#4a4e69] dark:text-[#B3B3B3] bg-white dark:bg-white/5 border border-dashed border-slate-300 dark:border-[#444]">
          No movies are currently scheduled at this theatre.
        </div>
      )}
    </div>
  );
}