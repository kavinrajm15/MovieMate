import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const CityTheatres = () => {
  const { city } = useParams();
  const navigate  = useNavigate();
  const [theatres, setTheatres]               = useState([]);
  const [filteredTheatres, setFilteredTheatres] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [currentPage, setCurrentPage]         = useState(1);
  const [itemsPerPage, setItemsPerPage]       = useState(10);

  useEffect(() => {
    const fetchTheatres = async () => {
      try {
        const res = await fetch(`http://localhost:5000/admin/city/${city}/theatres`, {
          method: 'GET', credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setTheatres(data.theatres || []);
          setFilteredTheatres(data.theatres || []);
        }
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTheatres();
  }, [city]);

  useEffect(() => {
    setFilteredTheatres(
      theatres.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    setCurrentPage(1);
  }, [searchQuery, theatres]);

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const indexOfLast  = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredTheatres.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(filteredTheatres.length / itemsPerPage);
  const total        = filteredTheatres.length;
  const startN       = total === 0 ? 0 : indexOfFirst + 1;
  const endN         = Math.min(indexOfLast, total);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3)               return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2)  return [1, '...', totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, '...', currentPage-1, currentPage, currentPage+1, '...', totalPages];
  };

  /* ── shared nav/number button ── */
  const navBtn = (label, disabled, onClick) => (
    <button
      disabled={disabled}
      onClick={onClick}
      className="min-w-[32px] h-8 rounded-lg flex items-center justify-center
        font-semibold text-[0.9rem] bg-transparent border-none cursor-pointer
        text-[#4a4e69] dark:text-[#B3B3B3]
        hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
        dark:hover:bg-white/10 dark:hover:text-white
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-all duration-200">
      {label}
    </button>
  );

  const pageBtn = (pg, i) => (
    <button
      key={i}
      disabled={pg === '...'}
      onClick={() => pg !== '...' && setCurrentPage(pg)}
      className={`min-w-[32px] h-8 rounded-lg flex items-center justify-center
        font-semibold text-[0.9rem] cursor-pointer transition-all duration-200 px-1
        ${pg === '...'
          ? 'bg-transparent border-none text-[#4a4e69] dark:text-[#B3B3B3] cursor-default'
          : pg === currentPage
            ? 'bg-[#f1f5f9] dark:bg-[#2A2A2A] text-slate-800 dark:text-white border border-[#e2e8f0] dark:border-[#444444]'
            : `bg-transparent border-none text-[#4a4e69] dark:text-[#B3B3B3]
               hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
               dark:hover:bg-white/10 dark:hover:text-white`
        }`}>
      {pg}
    </button>
  );

  return (
    <main className="p-6 w-full box-border">

      {/* ══════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════ */}
      <header className="flex justify-between items-center flex-wrap gap-4 mb-6">

        <div>
          {/* Breadcrumb */}
          <p className="text-[0.9rem] font-semibold capitalize mb-[5px]
            text-[#94a3b8] dark:text-[#B3B3B3]">
            <span
              onClick={() => navigate('/admin/cities')}
              className="text-indigo-500 dark:text-[#E50914] cursor-pointer
                hover:text-indigo-700 dark:hover:text-[#ff4d5a]
                hover:underline transition-colors duration-200">
              Cities
            </span>
            {' / '}
            <span className="text-slate-800 dark:text-white capitalize">{city}</span>
          </p>

          <h1 className="text-[1.8rem] font-bold m-0
            text-slate-800 dark:text-white">
            Theatres in {city}
          </h1>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search theatres..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-4 py-[10px] rounded-lg w-[250px] text-[0.95rem]
            border border-[#cbd5e1] dark:border-[#333333]
            bg-white dark:bg-[#121212]
            text-slate-800 dark:text-white
            placeholder-[#9ea1bc] dark:placeholder-[#666666]
            outline-none transition-colors duration-200
            focus:border-indigo-500 dark:focus:border-[#E50914]" />
      </header>

      {/* ══════════════════════════════════════
          LOADER
      ══════════════════════════════════════ */}
      {loading ? (
        <div className="text-center py-[50px] text-[1.1rem] font-semibold
          text-slate-500 dark:text-[#a3a3a3] animate-pulse">
          Loading theatres...
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════
              TABLE
          ══════════════════════════════════════ */}
          <div className="bg-white dark:bg-[#1a1a1a]
            rounded-[12px] p-5 mb-5 overflow-x-auto
            border border-[#e2e8f0] dark:border-[#333333]
            shadow-[0_4px_6px_rgba(0,0,0,0.05)]
            dark:shadow-[0_4px_6px_rgba(0,0,0,0.3)]">

            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="p-4 font-semibold text-[#64748b] dark:text-[#a3a3a3]
                    border-b-2 border-[#e2e8f0] dark:border-[#333333]">
                    Theatre Name
                  </th>
                  <th className="p-4 font-semibold text-[#64748b] dark:text-[#a3a3a3]
                    border-b-2 border-[#e2e8f0] dark:border-[#333333]
                    text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map(t => (
                  <tr
                    key={t.theatre_id}
                    onClick={() => navigate(`/admin/theatre/view/${t.theatre_id}`)}
                    className="cursor-pointer transition-colors duration-200
                      hover:bg-[#f8fafc] dark:hover:bg-[#242424]">
                    <td className="p-4 font-bold
                      text-slate-800 dark:text-[#e5e5e5]
                      border-b border-[#e2e8f0] dark:border-[#333333]
                      align-middle">
                      {t.name}
                    </td>
                    <td className="p-4 text-right
                      border-b border-[#e2e8f0] dark:border-[#333333]
                      align-middle">
                      <span
                        className="inline-block px-5 py-[10px] rounded-[12px]
                          font-bold cursor-pointer transition-all duration-200
                          text-indigo-600 dark:text-[#E50914]
                          bg-[rgba(99,102,241,0.1)] dark:bg-[rgba(229,9,20,0.1)]
                          border border-[rgba(99,102,241,0.2)] dark:border-[rgba(229,9,20,0.3)]
                          hover:bg-indigo-600 dark:hover:bg-[#E50914]
                          hover:text-white
                          hover:shadow-[0_4px_10px_rgba(79,70,229,0.3)]
                          dark:hover:shadow-[0_4px_10px_rgba(229,9,20,0.3)]">
                        View Movies →
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredTheatres.length === 0 && (
                  <tr>
                    <td colSpan="2"
                      className="text-center py-[40px] font-medium
                        text-[#94a3b8] dark:text-[#B3B3B3]">
                      No theatres found in {city}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ══════════════════════════════════════
              PAGINATION
          ══════════════════════════════════════ */}
          {(totalPages > 1 || filteredTheatres.length > 0) && (
            <div className="flex justify-between items-center flex-wrap gap-4
              px-[10px] py-5 mt-5
              border-t border-[rgba(203,213,225,0.5)] dark:border-[#333333]">

              {/* Left — results + per-page */}
              <div className="flex items-center gap-4">
                <span className="text-[0.9rem] font-medium
                  text-[#4a4e69] dark:text-[#B3B3B3]">
                  Results: {startN} – {endN} of {total}
                </span>
                <select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  className="px-3 py-[6px] rounded-lg font-semibold text-[0.9rem]
                    border border-[#cbd5e1] dark:border-[#333333]
                    bg-white dark:bg-[#121212]
                    text-slate-800 dark:text-white
                    outline-none cursor-pointer">
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Right — page buttons */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {navBtn('<', currentPage === 1, () => setCurrentPage(p => p - 1))}
                  {getPageNumbers().map((pg, i) => pageBtn(pg, i))}
                  {navBtn('>', currentPage === totalPages || totalPages === 0, () => setCurrentPage(p => p + 1))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
};

export default CityTheatres;