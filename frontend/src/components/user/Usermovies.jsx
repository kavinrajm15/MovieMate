import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';

const API = 'http://localhost:5000';

export default function UserMovies() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCity } = useOutletContext();

  const city = searchParams.get('city') || '';
  const dateParam = searchParams.get('date') || '';

  const [movies, setMovies] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const triggerRef = useRef(null);
  const LIMIT = 12;

  useEffect(() => { if (city) setCity(city); }, [city]);

  const loadFirst = useCallback(async () => {
    if (!city) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/movies?city=${city}&date=${dateParam}`,
        { headers: {} });
      const data = await res.json();
      const list = data.movies || [];
      setMovies(list);
      setOffset(list.length);
      setHasMore(list.length >= LIMIT);
    } catch { setHasMore(false); }
    finally { setLoading(false); }
  }, [city, dateParam]);

  const loadMore = useCallback(async (currentOffset) => {
    if (loading || !hasMore || !city) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/load_movies_by_city?city=${city}&offset=${currentOffset}&limit=${LIMIT}&date=${dateParam}`,
        { headers: {} });
      const data = await res.json();
      const list = data.movies || [];
      if (list.length === 0) { setHasMore(false); return; }
      setMovies(prev => [...prev, ...list]);
      setOffset(currentOffset + list.length);
      if (list.length < LIMIT) setHasMore(false);
    } catch { setHasMore(false); }
    finally { setLoading(false); }
  }, [city, dateParam, loading, hasMore]);

  useEffect(() => {
    setMovies([]); setOffset(0); setHasMore(true);
    loadFirst();
  }, [city, dateParam]);

  useEffect(() => {
    if (!triggerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && offset > 0) loadMore(offset); },
      { rootMargin: '300px' }
    );
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [offset, loadMore]);

  return (
    <div>
      {city && (
        <h2 className="text-[1.6rem] font-bold mb-6 text-slate-800 dark:text-white">
          Now Showing in{' '}
          <span className="text-indigo-600 dark:text-[#E50914]">
            {city.charAt(0).toUpperCase() + city.slice(1)}
          </span>
        </h2>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
        {movies.map((m) => (
          <div key={m.movie_id}
            onClick={() => navigate(`/theatres?movie_id=${m.movie_id}&city=${city}`)}
            className="rounded-[16px] p-3 cursor-pointer transition-all duration-300
              hover:-translate-y-2
              bg-white/40 dark:bg-[rgba(30,30,30,0.6)]
              border border-white/40 dark:border-[#333333]
              shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.3)]
              hover:shadow-[0_12px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)]
              dark:hover:border-[#E50914]
              backdrop-blur-[10px]">
            <div className="w-full aspect-[2/3] rounded-[10px] overflow-hidden">
              <img
                src={`${API}/static/${m.image}`}
                alt={m.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="pt-3 pb-1 px-1">
              <h3 className="text-[0.95rem] font-bold truncate mb-1
                text-slate-800 dark:text-white">
                {m.title}
              </h3>
              <p className="text-[0.75rem] font-semibold m-0
                text-[#4a4e69] dark:text-[#B3B3B3]">
                {[m.duration, m.genres, m.certificate].filter(Boolean).join(' • ')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[16px] p-3
              bg-white/30 dark:bg-white/5
              border border-white/30 dark:border-[#333333]">
              <div className="w-full aspect-[2/3] rounded-[10px] animate-pulse bg-slate-200 dark:bg-white/10" />
              <div className="h-3 rounded mt-3 animate-pulse bg-slate-200 dark:bg-white/10" />
              <div className="h-2.5 rounded mt-2 w-2/3 animate-pulse bg-slate-100 dark:bg-white/5" />
            </div>
          ))}
        </div>
      )}

      <div ref={triggerRef} className="h-5 w-full" />

      {!loading && !city && (
        <div className="text-center py-20 text-[0.9rem] font-semibold text-[#4a4e69] dark:text-[#B3B3B3]">
          Please select a city to see movies.
        </div>
      )}
      {!loading && city && movies.length === 0 && !hasMore && (
        <div className="text-center py-20 text-[0.9rem] font-semibold text-[#4a4e69] dark:text-[#B3B3B3]">
          No movies currently showing in {city.charAt(0).toUpperCase() + city.slice(1)}.
        </div>
      )}
    </div>
  );
}