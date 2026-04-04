import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MdAttachMoney, MdMovie, MdClose } from 'react-icons/md';
import toast from 'react-hot-toast';

const MoviePricing = () => {
  const { user } = useOutletContext();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for the modal and form
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [prices, setPrices] = useState({
    silver_price: '',
    gold_price: '',
    platinum_price: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, [user]);

  const fetchPricing = async () => {
    if (!user?.theatre_id) return;
    try {
      const res = await fetch(`http://localhost:5000/admin/theatre/${user.theatre_id}/pricing`, {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setMovies(data.pricing || []);
      }
    } catch (e) {
      console.error("Error fetching pricing:", e);
      toast.error("Failed to load movies.");
    } finally {
      setLoading(false);
    }
  };

  // Open the modal and set the selected movie's current prices
  const openModal = (movie) => {
    setSelectedMovie(movie);
    setPrices({
      silver_price: movie.silver_price || '',
      gold_price: movie.gold_price || '',
      platinum_price: movie.platinum_price || ''
    });
  };

  const closeModal = () => {
    setSelectedMovie(null);
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setPrices(prev => ({ ...prev, [name]: value }));
  };

  const handleSavePricing = async (e) => {
    e.preventDefault();
    if (!selectedMovie) return;
    setIsSaving(true);
    
    const loadingToast = toast.loading('Saving prices...');

    try {
      const res = await fetch(`http://localhost:5000/admin/theatre/${user.theatre_id}/pricing/${selectedMovie.movie_id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          silver_price: parseFloat(prices.silver_price) || 0,
          gold_price: parseFloat(prices.gold_price) || 0,
          platinum_price: parseFloat(prices.platinum_price) || 0
        })
      });

      if (res.ok) {
        toast.success("Pricing updated successfully!", { id: loadingToast });
        
        // Update the local state so the badge reflects the new prices instantly
        setMovies(prevMovies => prevMovies.map(m => 
          m.movie_id === selectedMovie.movie_id 
            ? { 
                ...m, 
                silver_price: parseFloat(prices.silver_price) || 0,
                gold_price: parseFloat(prices.gold_price) || 0,
                platinum_price: parseFloat(prices.platinum_price) || 0
              } 
            : m
        ));
        
        closeModal();
      } else {
        toast.error("Failed to update pricing.", { id: loadingToast });
      }
    } catch (error) {
      console.error("Error saving pricing:", error);
      toast.error("An error occurred while saving.", { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-white">Loading Movies...</div>;

  return (
    <div className="p-6 relative">
      <header className="flex justify-between items-center mb-6 p-5 rounded-2xl bg-white/40 dark:bg-[rgba(30,30,30,0.95)] backdrop-blur-md border border-white/50 dark:border-[#333] shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MdAttachMoney className="text-emerald-500" size={28} />
            Movie Pricing
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#B3B3B3]">
            Select a movie below to set ticket prices for different seat categories.
          </p>
        </div>
      </header>

      {/* ── Movie Grid ── */}
      {movies.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-[#333]">
          <p className="text-slate-500 dark:text-[#B3B3B3]">No movies are currently scheduled for your theatre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {movies.map(movie => {
            const hasPricing = movie.silver_price > 0 || movie.gold_price > 0 || movie.platinum_price > 0;
            
            return (
              <div 
                key={movie.movie_id}
                onClick={() => openModal(movie)}
                className="group flex flex-col bg-white dark:bg-[#1A1A1A] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#333] cursor-pointer hover:shadow-xl hover:border-indigo-400 dark:hover:border-[#E50914] transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="w-full h-64 bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                  {movie.image ? (
                    <img src={`http://localhost:5000/static/${movie.image}`} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400"><MdMovie size={48}/></div>
                  )}
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {hasPricing ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-bold shadow-md backdrop-blur-sm">Pricing Set</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-rose-500/90 text-white text-xs font-bold shadow-md backdrop-blur-sm">Needs Pricing</span>
                    )}
                  </div>
                  
                  {/* Title */}
                  <div className="absolute bottom-0 left-0 w-full p-4">
                    <h4 className="font-bold text-white truncate text-lg drop-shadow-md">{movie.title}</h4>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pricing Modal Popup ── */}
      {selectedMovie && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          {/* Click outside to close (optional background layer) */}
          <div className="absolute inset-0" onClick={closeModal}></div>
          
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-md rounded-2xl shadow-2xl relative z-10 border border-slate-200 dark:border-[#333] overflow-hidden animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#333] bg-slate-50 dark:bg-[rgba(255,255,255,0.02)]">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white truncate pr-4">
                {selectedMovie.title}
              </h2>
              <button 
                onClick={closeModal} 
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSavePricing} className="p-6 flex flex-col gap-5">
              
              <div className="flex items-center gap-4 mb-2">
                {selectedMovie.image && (
                  <img src={`http://localhost:5000/static/${selectedMovie.image}`} alt={selectedMovie.title} className="w-16 h-24 object-cover rounded-lg shadow-md" />
                )}
                <p className="text-sm text-slate-500 dark:text-[#B3B3B3]">
                  Enter the price in Rupees (₹) for each seat category for this specific movie.
                </p>
              </div>

              {/* Silver Price */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-[#cccccc] mb-2">
                  <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-500 shadow-sm"></div>
                  Silver Class Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    name="silver_price"
                    min="0"
                    step="10"
                    value={prices.silver_price}
                    onChange={handlePriceChange}
                    className="w-full pl-8 p-3 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#E50914] outline-none transition-all"
                    placeholder="150"
                    required
                  />
                </div>
              </div>

              {/* Gold Price */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-[#cccccc] mb-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm"></div>
                  Gold Class Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    name="gold_price"
                    min="0"
                    step="10"
                    value={prices.gold_price}
                    onChange={handlePriceChange}
                    className="w-full pl-8 p-3 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#E50914] outline-none transition-all"
                    placeholder="250"
                    required
                  />
                </div>
              </div>

              {/* Platinum Price */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-[#cccccc] mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm"></div>
                  Platinum Class Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input 
                    type="number" 
                    name="platinum_price"
                    min="0"
                    step="10"
                    value={prices.platinum_price}
                    onChange={handlePriceChange}
                    className="w-full pl-8 p-3 rounded-xl bg-slate-50 dark:bg-[rgba(255,255,255,0.05)] border border-slate-200 dark:border-[#444] text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[#E50914] outline-none transition-all"
                    placeholder="400"
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-white dark:bg-[#333] dark:hover:bg-[#444] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#E50914] dark:hover:bg-[#B20710] shadow-[0_4px_15px_rgba(79,70,229,0.3)] dark:shadow-[0_4px_15px_rgba(229,9,20,0.3)] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Prices'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MoviePricing;