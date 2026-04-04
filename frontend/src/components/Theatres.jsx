import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Theatres = () => {
  const { user } = useOutletContext();
  const { canAccess } = useAuth();
  const [theatres, setTheatres]               = useState([]);
  const [filteredTheatres, setFilteredTheatres] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [currentPage, setCurrentPage]         = useState(1);
  const [itemsPerPage, setItemsPerPage]       = useState(10);
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const navigate = useNavigate();

  const canAdd    = canAccess('theatres', 'add');
  const canDelete = canAccess('theatres', 'delete');

  const fetchTheatres = async () => {
    try {
      const res = await fetch('http://localhost:5000/admin/theatres', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setTheatres(data.theatres || []);
        setFilteredTheatres(data.theatres || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTheatres(); }, []);

  useEffect(() => {
    setFilteredTheatres(theatres.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase())
    ));
    setCurrentPage(1);
  }, [searchQuery, theatres]);

  const indexOfLast  = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredTheatres.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(filteredTheatres.length / itemsPerPage);
  const total        = filteredTheatres.length;
  const startN       = total === 0 ? 0 : indexOfFirst + 1;
  const endN         = Math.min(indexOfLast, total);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, '...', currentPage-1, currentPage, currentPage+1, '...', totalPages];
  };

  const handleAddTheatre = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await fetch('http://localhost:5000/admin/theatre/add', {
      method: 'POST', credentials: 'include', body: formData
    });
    setIsModalOpen(false);
    fetchTheatres();
  };

  const handleDeleteTheatre = async (e, theatreId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this theatre entirely?')) return;
    await fetch(`http://localhost:5000/admin/theatre/delete/${theatreId}`, {
      method: 'POST', credentials: 'include'
    });
    fetchTheatres();
  };

  /* ── page button helper ── */
  const pageBtn = (pg, i) => (
    <button key={i} disabled={pg === '...'}
      onClick={() => pg !== '...' && setCurrentPage(pg)}
      className={`min-w-[32px] h-8 rounded-lg flex items-center justify-center
        font-semibold text-[0.9rem] cursor-pointer transition-all duration-200 px-1
        ${pg === '...'
          ? 'bg-transparent border-none text-[#4a4e69] dark:text-[#B3B3B3] cursor-default'
          : pg === currentPage
            ? 'bg-[#f1f5f9] dark:bg-[#2A2A2A] text-slate-800 dark:text-white border border-[#e2e8f0] dark:border-[#444]'
            : 'bg-transparent border-none text-[#4a4e69] dark:text-[#B3B3B3] hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600 dark:hover:bg-white/10 dark:hover:text-white'
        }`}>
      {pg}
    </button>
  );

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
          <h1 className="text-[1.8rem] font-bold mb-1 text-slate-800 dark:text-white">
            All Theatres
          </h1>
          <p className="text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Manage all registered theatres across the platform.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search name or city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-5 py-3 rounded-full w-[250px] text-[0.95rem]
              border border-white/60 dark:border-[#333333]
              bg-white/60 dark:bg-[#121212]
              text-slate-800 dark:text-white
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
                border-none cursor-pointer transition-all duration-200
                bg-gradient-to-br from-indigo-500 to-purple-500
                dark:bg-none dark:bg-[#E50914]
                hover:-translate-y-0.5
                hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
                dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]">
              Add Theatre
            </button>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════
          LOADER
      ══════════════════════════════════════ */}
      {loading ? (
        <div className="flex justify-center items-center h-[50vh]
          text-[1.1rem] font-semibold text-slate-500 dark:text-[#a3a3a3] animate-pulse">
          Loading theatres...
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════
              TABLE
          ══════════════════════════════════════ */}
          <div className="bg-white/40 dark:bg-[#1E1E1E]
            backdrop-blur-[10px] rounded-[20px] mb-6 overflow-hidden
            border border-white/50 dark:border-[#333333]
            shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Theatre Name', 'City'].map(h => (
                    <th key={h}
                      className="px-[25px] py-[18px] text-left font-bold
                        text-slate-800 dark:text-[#B3B3B3]
                        bg-[rgba(99,102,241,0.1)] dark:bg-[#121212]
                        border-b border-white/50 dark:border-[#333333]">
                      {h}
                    </th>
                  ))}
                  <th className="px-[25px] py-[18px] text-right font-bold
                    text-slate-800 dark:text-[#B3B3B3]
                    bg-[rgba(99,102,241,0.1)] dark:bg-[#121212]
                    border-b border-white/50 dark:border-[#333333]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((t, i) => (
                  <tr
                    key={i}
                    onClick={() => navigate(`/admin/theatre/view/${t.theatre_id}`)}
                    className="cursor-pointer transition-colors duration-200
                      hover:[&>td]:bg-white/60 dark:hover:[&>td]:bg-[#252525]">

                    {/* Theatre name */}
                    <td className="px-[25px] py-[18px] font-bold
                      text-slate-800 dark:text-white
                      border-b border-white/30 dark:border-[#2A2A2A]">
                      {t.name}
                    </td>

                    {/* City pill */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A]">
                      <span className="px-3 py-[5px] rounded-full text-[0.85rem]
                        font-semibold capitalize inline-block border
                        bg-white dark:bg-[#333333]
                        text-indigo-500 dark:text-[#F5C518]
                        border-transparent dark:border-[#444444]">
                        {t.city}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-[25px] py-[18px] text-right
                      border-b border-white/30 dark:border-[#2A2A2A]">
                      {canDelete ? (
                        <button
                          onClick={e => handleDeleteTheatre(e, t.theatre_id)}
                          className="px-3 py-[6px] rounded-[6px] font-bold text-[0.9rem]
                            cursor-pointer transition-all duration-200
                            bg-transparent text-rose-500 dark:text-[#E50914]
                            border border-[rgba(225,29,72,0.3)] dark:border-[rgba(229,9,20,0.3)]
                            hover:bg-rose-500/10 dark:hover:bg-[#E50914]
                            dark:hover:text-white dark:hover:border-[#E50914]">
                          Delete
                        </button>
                      ) : (
                        <span className="text-[0.85rem] font-semibold
                          text-[#94a3b8] dark:text-[#666666]">
                          View Only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan="3"
                      className="text-center py-[40px] font-medium
                        text-[#94a3b8] dark:text-[#B3B3B3]">
                      No theatres found.
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

              {/* Left */}
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
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Right */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="min-w-[32px] h-8 rounded-lg flex items-center justify-center
                      font-semibold bg-transparent border-none cursor-pointer
                      text-[#4a4e69] dark:text-[#B3B3B3]
                      hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
                      dark:hover:bg-white/10 dark:hover:text-white
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200">
                    &lt;
                  </button>

                  {getPageNumbers().map((pg, i) => pageBtn(pg, i))}

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="min-w-[32px] h-8 rounded-lg flex items-center justify-center
                      font-semibold bg-transparent border-none cursor-pointer
                      text-[#4a4e69] dark:text-[#B3B3B3]
                      hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
                      dark:hover:bg-white/10 dark:hover:text-white
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200">
                    &gt;
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          ADD THEATRE MODAL
      ══════════════════════════════════════ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[1000] flex justify-center items-center
            bg-[rgba(15,23,42,0.6)] dark:bg-black/80 backdrop-blur-[5px]"
          onClick={() => setIsModalOpen(false)}>

          <div
            className="relative w-full max-w-[400px] p-[30px] rounded-[20px]
              bg-white dark:bg-[#1E1E1E]
              border border-[#e2e8f0] dark:border-[#333333]
              shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]
              slide-up"
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
              Add Theatre
            </h2>

            <form onSubmit={handleAddTheatre}>
              {/* Theatre Name */}
              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[0.95rem]
                  text-[#4a4e69] dark:text-[#B3B3B3]">
                  Theatre Name
                </label>
                <input
                  type="text" name="name" required placeholder="e.g. Grand Cinemas"
                  className="w-full p-3 rounded-[10px] text-base outline-none box-border
                    border border-[#cbd5e1] dark:border-[#333333]
                    bg-white dark:bg-[#121212]
                    text-slate-800 dark:text-white
                    placeholder-[#9ea1bc] dark:placeholder-[#666666]
                    focus:border-indigo-500 dark:focus:border-[#E50914]
                    transition-colors duration-200" />
              </div>

              {/* City */}
              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[0.95rem]
                  text-[#4a4e69] dark:text-[#B3B3B3]">
                  City
                </label>
                <input
                  type="text" name="city" required placeholder="e.g. Chennai"
                  className="w-full p-3 rounded-[10px] text-base outline-none box-border
                    border border-[#cbd5e1] dark:border-[#333333]
                    bg-white dark:bg-[#121212]
                    text-slate-800 dark:text-white
                    placeholder-[#9ea1bc] dark:placeholder-[#666666]
                    focus:border-indigo-500 dark:focus:border-[#E50914]
                    transition-colors duration-200" />
              </div>

              {/* Save button */}
              <button
                type="submit"
                className="w-full py-3 rounded-[10px] font-semibold text-base text-white
                  border-none cursor-pointer transition-all duration-200
                  bg-gradient-to-br from-indigo-500 to-purple-500
                  dark:bg-none dark:bg-[#E50914]
                  hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]">
                Save Theatre
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Theatres;