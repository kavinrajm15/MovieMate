import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom';
import { FiFilm, FiSearch, FiMapPin } from 'react-icons/fi';
import { BsCameraReels } from 'react-icons/bs';

const API = 'http://localhost:5000';

export default function UserSearchResults() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { city } = useOutletContext();

  const query = searchParams.get('q') || '';
  const [results, setResults] = useState({ movies: [], theatres: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) { setLoading(false); return; }
    setLoading(true);
    const params = new URLSearchParams({ q: query });
    if (city) params.set('city', city);

    fetch(`${API}/search?${params.toString()}`, { headers: {} })
      .then(r => r.json())
      .then(d => { setResults(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [query, city]);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded animate-pulse bg-white/40 dark:bg-white/5" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="aspect-[2/3] rounded-[16px] animate-pulse bg-white/40 dark:bg-white/5" />
        ))}
      </div>
    </div>
  );

  const hasResults = results.movies?.length > 0 || results.theatres?.length > 0;

  return (
    <div className="pb-10">
      <h2 className="text-[1.6rem] font-bold mb-8 text-slate-800 dark:text-white">
        Search Results for{' '}
        <span className="text-indigo-600 dark:text-[#E50914]">"{query}"</span>
      </h2>

      {!hasResults ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-[20px]
          bg-white/40 dark:bg-[rgba(30,30,30,0.6)]
          border border-white/40 dark:border-[#333333]">
          <FiSearch size={40} className="text-slate-300 dark:text-[#444444]" />
          <h3 className="text-[1.1rem] font-bold m-0 text-slate-800 dark:text-white">No results found</h3>
          <p className="m-0 text-sm text-[#4a4e69] dark:text-[#B3B3B3]">
            We couldn't find any movies or cinemas matching your search.
          </p>
        </div>
      ) : (
        <div className="space-y-10">

          {/* Movies */}
          {results.movies?.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-[1.1rem] font-bold mb-5 pb-3
                text-[#4a4e69] dark:text-[#B3B3B3]
                border-b-2 border-black/5 dark:border-white/5">
                <FiFilm className="text-indigo-500 dark:text-[#F5C518]" />
                Movies
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {results.movies.map(m => (
                  <div key={m.movie_id}
                    onClick={() => navigate(`/theatres?movie_id=${m.movie_id}${city ? `&city=${city}` : ''}`)}
                    className="rounded-[14px] p-3 cursor-pointer
                      transition-all duration-200 hover:-translate-y-1.5
                      bg-[#e2e8f0] dark:bg-[rgba(30,30,30,0.8)]
                      border border-transparent dark:border-[#333333]
                      shadow-[0_4px_10px_rgba(0,0,0,0.05)]
                      hover:shadow-[0_10px_25px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]
                      dark:hover:border-[#E50914]">
                    <img
                      src={`${API}/static/${m.image?.replace('static/', '')}`}
                      alt={m.title}
                      loading="lazy"
                      className="w-full aspect-[2/3] rounded-[10px] object-cover"
                    />
                    <div className="pt-3">
                      <h4 className="text-[0.95rem] font-extrabold truncate m-0 mb-1
                        text-slate-900 dark:text-white">
                        {m.title}
                      </h4>
                      <p className="text-xs font-medium m-0 text-[#475569] dark:text-[#B3B3B3]">
                        {m.duration}{m.genres ? ` • ${m.genres.split(',')[0]}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Theatres */}
          {results.theatres?.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 text-[1.1rem] font-bold mb-5 pb-3
                text-[#4a4e69] dark:text-[#B3B3B3]
                border-b-2 border-black/5 dark:border-white/5">
                <BsCameraReels className="text-indigo-500 dark:text-[#F5C518]" />
                Cinemas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.theatres.map(t => (
                  <div key={t.theatre_id} onClick={() => navigate(`/theatre/${t.theatre_id}`)}
                    className="flex items-center gap-4 p-5 rounded-[16px] cursor-pointer
                      transition-all duration-300 hover:-translate-y-1
                      bg-white/40 dark:bg-[rgba(30,30,30,0.6)]
                      border border-white/40 dark:border-[#333333]
                      shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.3)]
                      hover:shadow-[0_12px_30px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)]
                      dark:hover:border-[#E50914]
                      backdrop-blur-[10px]">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
                      bg-indigo-500 dark:bg-[#E50914] text-white text-lg">
                      <BsCameraReels />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[1rem] font-bold truncate m-0 mb-1
                        text-slate-800 dark:text-white">{t.name}</h3>
                      <p className="text-sm m-0 flex items-center gap-1 font-medium
                        text-[#4a4e69] dark:text-[#B3B3B3]">
                        <FiMapPin size={12} /> {t.city.charAt(0).toUpperCase() + t.city.slice(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}