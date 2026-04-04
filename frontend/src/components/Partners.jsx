import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Partners = () => {
  const { user } = useOutletContext();
  const { canAccess } = useAuth();
  const [partners, setPartners]               = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [currentPage, setCurrentPage]         = useState(1);
  const [itemsPerPage, setItemsPerPage]       = useState(10);

  const canDelete = canAccess('partners', 'delete');

  const fetchPartners = async () => {
    try {
      const res = await fetch('http://localhost:5000/admin/theatre_admins', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setPartners(data.admins || []);
        setFilteredPartners(data.admins || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPartners(); }, []);

  useEffect(() => {
    setFilteredPartners(partners.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.theatre_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
    ));
    setCurrentPage(1);
  }, [searchQuery, partners]);

  const indexOfLast  = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredPartners.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(filteredPartners.length / itemsPerPage);
  const total        = filteredPartners.length;
  const startN       = total === 0 ? 0 : indexOfFirst + 1;
  const endN         = Math.min(indexOfLast, total);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, '...', currentPage-1, currentPage, currentPage+1, '...', totalPages];
  };

  const handleDeletePartner = async (adminId) => {
    if (!window.confirm('Delete this partner and their theatre data? This cannot be undone.')) return;
    try {
      const res = await fetch(`http://localhost:5000/admin/theatre_admins/delete/${adminId}`, {
        method: 'POST', credentials: 'include'
      });
      if (res.ok) fetchPartners();
      else toast.error('Failed to delete partner.');
    } catch (e) { console.error(e); }
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
            Theatre Partners
          </h1>
          <p className="text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Manage accounts for theatre owners.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search by name, phone, or theatre..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="px-5 py-3 rounded-full w-[300px] text-[0.95rem]
            border border-white/60 dark:border-[#333333]
            bg-white/60 dark:bg-[#121212]
            text-slate-800 dark:text-white
            placeholder-[#9ea1bc] dark:placeholder-[#666666]
            outline-none transition-all duration-300
            focus:bg-white dark:focus:bg-[#121212]
            focus:border-indigo-500 dark:focus:border-[#E50914]" />
      </header>

      {/* ══════════════════════════════════════
          LOADER
      ══════════════════════════════════════ */}
      {loading ? (
        <div className="flex justify-center items-center h-[50vh]
          text-[1.1rem] font-semibold text-slate-500 dark:text-[#a3a3a3] animate-pulse">
          Loading partners...
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════
              TABLE
          ══════════════════════════════════════ */}
          <div className="bg-white/40 dark:bg-[#1E1E1E]
            backdrop-blur-[10px] rounded-[20px] mb-6 overflow-hidden
            border border-white/50 dark:border-[#333333]
            shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Owner Name', 'Phone', 'Theatre Assigned'].map(h => (
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
                {currentItems.map((p, i) => (
                  <tr key={i} className="cursor-pointer transition-colors duration-200
                    hover:[&>td]:bg-white/60 dark:hover:[&>td]:bg-[#252525]">

                    {/* Owner name */}
                    <td className="px-[25px] py-[18px] font-bold capitalize
                      text-slate-800 dark:text-white
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      {p.name}
                    </td>

                    {/* Phone */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <span className="font-semibold tracking-[0.5px]
                        text-indigo-500 dark:text-[#E50914]">
                        {p.phone}
                      </span>
                    </td>

                    {/* Theatre + city */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <div className="flex items-center gap-3">
                        <span className="font-bold capitalize
                          text-slate-800 dark:text-white">
                          {p.theatre_name}
                        </span>
                        <span className="px-3 py-[5px] rounded-full text-[0.85rem]
                          font-semibold capitalize inline-block border
                          bg-white dark:bg-[#333333]
                          text-purple-500 dark:text-[#F5C518]
                          border-transparent dark:border-[#444444]">
                          {p.city}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-[25px] py-[18px] text-right
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      {canDelete ? (
                        <button
                          onClick={() => handleDeletePartner(p.admin_id)}
                          className="px-4 py-[6px] rounded-[6px] font-bold text-[0.9rem]
                            cursor-pointer transition-all duration-200
                            bg-transparent text-rose-500 dark:text-[#E50914]
                            border border-[rgba(229,9,20,0.3)]
                            hover:bg-rose-500/10 dark:hover:bg-[#E50914]
                            dark:hover:text-white dark:hover:border-[#E50914]">
                          Delete
                        </button>
                      ) : (
                        <span className="text-[0.85rem] font-semibold px-3 py-[6px]
                          rounded-[6px] border
                          text-[#94a3b8] dark:text-[#666666]
                          bg-[rgba(148,163,184,0.1)] dark:bg-[#111111]
                          border-white/50 dark:border-[#333333]">
                          View Only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan="4"
                      className="text-center py-[40px] font-medium
                        text-[#a3aed0] dark:text-[#B3B3B3]">
                      No theatre owners registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ══════════════════════════════════════
              PAGINATION
          ══════════════════════════════════════ */}
          {(totalPages > 1 || filteredPartners.length > 0) && (
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
                  <option value={15}>15</option>
                  <option value={20}>20</option>
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
    </main>
  );
};

export default Partners;