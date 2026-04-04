import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';

const API = 'http://localhost:5000';

export default function UserHome() {
  const { city } = useOutletContext();
  const [movies, setMovies] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialDone, setInitialDone] = useState(false);
  const triggerRef = useRef(null);
  const LIMIT = 10;

  const loadMovies = useCallback(async (currentOffset) => {
    if (loading) return;
    setLoading(true);
    try {
      let list = [];
      if (currentOffset === 0) {
        const res = await fetch(`${API}/`, { headers: {} });
        const data = await res.json();
        list = data.movies || [];
        setMovies(list);
      } else {
        const res = await fetch(`${API}/load_movies?offset=${currentOffset}&limit=${LIMIT}`,
          { headers: {} });
        const data = await res.json();
        list = data.movies || [];
        if (list.length === 0) { setHasMore(false); setLoading(false); return; }
        setMovies(prev => [...prev, ...list]);
      }
      setOffset(currentOffset + list.length);
      if (list.length < (currentOffset === 0 ? 1 : LIMIT)) setHasMore(false);
    } catch { setHasMore(false); }
    finally { setLoading(false); }
  }, [loading]);

  useEffect(() => {
    if (!initialDone) { loadMovies(0); setInitialDone(true); }
  }, []);

  useEffect(() => {
    if (!triggerRef.current || !initialDone) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading) loadMovies(offset); },
      { rootMargin: '150px' }
    );
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [offset, hasMore, loading, initialDone]);

  return (
    <div>
      <h2 className="text-[1.6rem] font-bold text-slate-800 dark:text-white mb-6">
        Now Streaming Near You
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
        {movies.map((m, i) => (
          <div key={`${m.title}-${i}`} className="group cursor-pointer">
            <div className="w-full aspect-[2/3] rounded-[16px] overflow-hidden
              bg-white/40 dark:bg-[rgba(30,30,30,0.5)]
              border border-white/40 dark:border-[#333333]
              shadow-[0_8px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
              <img
                src={`${API}/static/${m.image}`}
                alt={m.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
              />
            </div>
            <h3 className="mt-3 text-[0.9rem] font-bold text-center truncate
              text-slate-800 dark:text-white px-1">
              {m.title}
            </h3>
          </div>
        ))}
      </div>

      {/* Skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 mt-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="w-full aspect-[2/3] rounded-[16px] animate-pulse
                bg-white/50 dark:bg-white/5" />
              <div className="h-3 rounded mt-3 mx-3 animate-pulse
                bg-white/50 dark:bg-white/5" />
            </div>
          ))}
        </div>
      )}

      <div ref={triggerRef} className="h-5 w-full" />

      {!loading && movies.length === 0 && (
        <div className="text-center py-20 text-[0.9rem] font-semibold text-[#4a4e69] dark:text-[#B3B3B3]">
          No movies currently showing.
        </div>
      )}
    </div>
  );
}