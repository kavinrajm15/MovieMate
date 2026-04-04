import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { MdDelete } from "react-icons/md";
import { FaCity } from "react-icons/fa";
import { useAuth } from '../context/AuthContext';

const Cities = () => {
  const { user } = useOutletContext();
  const { canAccess } = useAuth();
  const [cities, setCities]               = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [currentPage, setCurrentPage]     = useState(1);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [newCityName, setNewCityName]     = useState('');
  const [itemsPerPage, setItemsPerPage]   = useState(12);
  const navigate = useNavigate();

  const canAdd    = canAccess('cities', 'add');
  const canDelete = canAccess('cities', 'delete');

  const fetchCities = async () => {
    try {
      const res = await fetch('http://localhost:5000/admin/cities', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setCities(data.cities);
        setFilteredCities(data.cities);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCities(); }, []);

  useEffect(() => {
    setFilteredCities(cities.filter(c =>
      c.city.toLowerCase().includes(searchQuery.toLowerCase())
    ));
    setCurrentPage(1);
  }, [searchQuery, cities]);

  const indexOfLast  = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredCities.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(filteredCities.length / itemsPerPage);
  const total        = filteredCities.length;
  const startN       = total === 0 ? 0 : indexOfFirst + 1;
  const endN         = Math.min(indexOfLast, total);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, '...', currentPage-1, currentPage, currentPage+1, '...', totalPages];
  };

  const handleAddCity = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('city_name', newCityName);
    await fetch('http://localhost:5000/admin/city/add', {
      method: 'POST', credentials: 'include', body: formData
    });
    setNewCityName('');
    setIsModalOpen(false);
    fetchCities();
  };

  const handleDeleteCity = async (e, cityName) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${cityName} and all its theatres?`)) return;
    await fetch(`http://localhost:5000/admin/city/delete/${cityName}`, {
      method: 'POST', credentials: 'include'
    });
    fetchCities();
  };

  /* ── shared page-number button builder ── */
  const pageBtn = (pg, i, active) => (
    <button
      key={i}
      disabled={pg === '...'}
      onClick={() => pg !== '...' && setCurrentPage(pg)}
      className={`min-w-[32px] h-8 rounded-lg flex items-center justify-content
        font-semibold text-[0.9rem] cursor-pointer transition-all duration-200 px-1
        ${pg === '...'
          ? 'cursor-default text-[#4a4e69] dark:text-[#B3B3B3]'
          : active
            ? 'bg-[#f1f5f9] dark:bg-[#2A2A2A] text-slate-800 dark:text-white border border-[#e2e8f0] dark:border-[#444]'
            : `text-[#4a4e69] dark:text-[#B3B3B3] border-none bg-transparent
               hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
               dark:hover:bg-white/10 dark:hover:text-white
               disabled:opacity-40 disabled:cursor-not-allowed`
        }`}>
      {pg}
    </button>
  );

  return (
    /* ── PAGE WRAPPER ── */
    <main className="p-[30px]">

      {/* ══════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════ */}
      <header className="flex justify-between items-center mb-[30px] flex-wrap gap-4
        px-[30px] py-5 rounded-[20px]
        bg-white/40 dark:bg-[rgba(30,30,30,0.95)]
        backdrop-blur-[10px]
        border border-white/50 dark:border-[#333333]
        shadow-[0_4px_15px_rgba(0,0,0,0.05)]
        dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">

        <div>
          <h1 className="text-[1.8rem] font-bold text-slate-800 dark:text-white mb-1">
            Manage Cities
          </h1>
          <p className="text-[#4a4e69] dark:text-[#B3B3B3] text-[0.9rem]">
            View and manage all cities where theatres are located.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search cities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-5 py-3 rounded-full w-[250px]
              border border-white/60 dark:border-[#333333]
              bg-white/60 dark:bg-[#121212]
              text-slate-800 dark:text-white text-[0.95rem]
              placeholder-[#9ea1bc] dark:placeholder-[#666666]
              outline-none transition-all duration-300
              focus:bg-white dark:focus:bg-[#121212]
              focus:border-indigo-500 dark:focus:border-[#E50914]
              focus:shadow-[0_0_10px_rgba(99,102,241,0.2)]
              dark:focus:shadow-[0_0_10px_rgba(229,9,20,0.2)]" />

          {/* Add button */}
          {canAdd && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 rounded-full font-bold tracking-wide text-white
                bg-gradient-to-br from-indigo-500 to-purple-500
                dark:from-[#E50914] dark:to-[#E50914]
                border-none cursor-pointer transition-all duration-200
                hover:-translate-y-0.5
                hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
                dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]">
              Add City
            </button>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════
          LOADER
      ══════════════════════════════════════ */}
      {loading ? (
        <div className="flex justify-center items-center h-[50vh]
          text-[1.1rem] font-semibold
          text-slate-500 dark:text-[#a3a3a3]
          animate-pulse">
          Loading cities...
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════
              CITIES GRID
          ══════════════════════════════════════ */}
          <div className="grid gap-5 mb-[30px] w-full
            [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">

            {currentItems.map((c, i) => (
              <div
                key={i}
                onClick={() => navigate(`/admin/city/${c.city}/theatres`)}
                className="flex flex-row justify-between items-center gap-4
                  px-5 py-[15px] rounded-[12px] cursor-pointer
                  bg-white/80 dark:bg-[#1E1E1E]
                  border border-[#cbd5e1] dark:border-[#333333]
                  transition-all duration-200
                  hover:-translate-y-[3px]
                  hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]
                  dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)]">

                {/* City name */}
                <div className="flex items-center gap-2
                  text-[1.1rem] font-semibold
                  text-slate-800 dark:text-white">
                  <FaCity className="text-indigo-500 dark:text-[#E50914]" />
                  {c.city}
                </div>

                {/* Delete button */}
                {canDelete && (
                  <button
                    onClick={e => handleDeleteCity(e, c.city)}
                    className="flex items-center justify-center p-2 rounded-lg
                      text-[1.2rem] cursor-pointer transition-all duration-200
                      text-red-500 dark:text-[#E50914]
                      border border-red-200 dark:border-[rgba(229,9,20,0.3)]
                      bg-transparent
                      hover:bg-red-500 dark:hover:bg-[#E50914]
                      hover:text-white hover:border-red-500 dark:hover:border-[#E50914]">
                    <MdDelete />
                  </button>
                )}
              </div>
            ))}

            {currentItems.length === 0 && (
              <div className="col-span-full text-center py-[40px]
                text-[#94a3b8] dark:text-[#B3B3B3] font-medium">
                No cities found.
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════
              PAGINATION
          ══════════════════════════════════════ */}
          {(totalPages > 1 || filteredCities.length > 0) && (
            <div className="flex justify-between items-center flex-wrap gap-4
              px-[10px] py-5
              border-t border-[rgba(203,213,225,0.5)] dark:border-[#333333]
              mt-5">

              {/* Left — results info + per-page select */}
              <div className="flex items-center gap-4">
                <span className="text-[0.9rem] font-medium
                  text-[#4a4e69] dark:text-[#B3B3B3]">
                  Results: {startN} – {endN} of {total}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-3 py-[6px] rounded-lg font-semibold text-[0.9rem]
                    border border-[#cbd5e1] dark:border-[#333333]
                    bg-white dark:bg-[#121212]
                    text-slate-800 dark:text-white
                    outline-none cursor-pointer">
                  <option value={12}>12</option>
                  <option value={15}>15</option>
                  <option value={18}>18</option>
                </select>
              </div>

              {/* Right — page buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="min-w-[32px] h-8 rounded-lg flex items-center justify-center
                      font-semibold text-[0.9rem] bg-transparent border-none
                      text-[#4a4e69] dark:text-[#B3B3B3]
                      hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
                      dark:hover:bg-white/10 dark:hover:text-white
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200 cursor-pointer">
                    &lt;
                  </button>

                  {getPageNumbers().map((pg, i) =>
                    pageBtn(pg, i, pg === currentPage)
                  )}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="min-w-[32px] h-8 rounded-lg flex items-center justify-center
                      font-semibold text-[0.9rem] bg-transparent border-none
                      text-[#4a4e69] dark:text-[#B3B3B3]
                      hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
                      dark:hover:bg-white/10 dark:hover:text-white
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200 cursor-pointer">
                    &gt;
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          ADD CITY MODAL
      ══════════════════════════════════════ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[1000] flex justify-center items-center
            bg-[rgba(15,23,42,0.6)] dark:bg-black/80
            backdrop-blur-[5px]"
          onClick={() => setIsModalOpen(false)}>

          <div
            className="relative w-full max-w-[400px] p-[30px] rounded-[20px]
              bg-white/85 dark:bg-[#1E1E1E]
              backdrop-blur-[15px]
              border border-white/50 dark:border-[#333333]
              shadow-[0_15px_35px_rgba(0,0,0,0.2)]
              dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]
              slide-up"
            onClick={e => e.stopPropagation()}>

            {/* Close */}
            <span
              onClick={() => setIsModalOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold
                text-[#4a4e69] dark:text-[#B3B3B3] cursor-pointer
                hover:text-slate-800 dark:hover:text-[#E50914]
                transition-colors duration-200">
              ✕
            </span>

            <h2 className="text-[1.3rem] font-bold mb-5
              text-slate-800 dark:text-white">
              Add New City
            </h2>

            <form onSubmit={handleAddCity}>
              {/* Label */}
              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[0.95rem]
                  text-[#4a4e69] dark:text-[#B3B3B3]">
                  City Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Erode"
                  value={newCityName}
                  onChange={e => setNewCityName(e.target.value)}
                  className="w-full p-3 rounded-[10px] text-base
                    border border-[#cbd5e1] dark:border-[#333333]
                    bg-white dark:bg-[#121212]
                    text-slate-800 dark:text-white
                    placeholder-[#9ea1bc] dark:placeholder-[#666666]
                    outline-none box-border
                    focus:border-indigo-500 dark:focus:border-[#E50914]
                    transition-colors duration-200" />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 rounded-[10px] font-semibold text-base
                  text-white border-none cursor-pointer
                  bg-gradient-to-br from-indigo-500 to-purple-500
                  dark:from-[#E50914] dark:to-[#E50914]
                  hover:from-indigo-600 hover:to-purple-600
                  dark:hover:from-[#B20710] dark:hover:to-[#B20710]
                  transition-all duration-200">
                Create City
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Cities;