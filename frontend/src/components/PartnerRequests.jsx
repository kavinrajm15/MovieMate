import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PartnerRequests = () => {
  const { user, fetchNotifications } = useOutletContext();
  const { canAccess } = useAuth();
  const [requests, setRequests]               = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [currentPage, setCurrentPage]         = useState(1);
  const [itemsPerPage, setItemsPerPage]       = useState(10);

  const canReview = canAccess('partner_requests', 'edit');

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/admin/partner_requests', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setFilteredRequests(data.requests || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    setFilteredRequests(requests.filter(r =>
      (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.theatre_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.phone || '').includes(searchQuery)
    ));
    setCurrentPage(1);
  }, [searchQuery, requests]);

  const indexOfLast  = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(filteredRequests.length / itemsPerPage);
  const total        = filteredRequests.length;
  const startN       = total === 0 ? 0 : indexOfFirst + 1;
  const endN         = Math.min(indexOfLast, total);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, '...', currentPage-1, currentPage, currentPage+1, '...', totalPages];
  };

  const handleAction = async (adminId, actionType) => {
    if (!window.confirm(`Are you sure you want to ${actionType === 'approve' ? 'approve' : 'decline and delete'} this request?`)) return;
    const formData = new FormData();
    formData.append('action', actionType);
    try {
      await fetch(`http://localhost:5000/admin/partner_requests/action/${adminId}`, {
        method: 'POST', credentials: 'include', body: formData
      });
      fetchRequests();
      if (fetchNotifications) fetchNotifications();
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
            Partner Signups
          </h1>
          <p className="text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Review and approve new theatre owner registrations.
          </p>
        </div>

        <input
          type="text"
          placeholder="Search by name, theatre, or phone..."
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
          Loading requests...
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
                  {['Applicant Name', 'Contact (Phone)', 'Theatre Details', 'Submitted On'].map(h => (
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
                {currentItems.map((r, i) => (
                  <tr key={i} className="transition-colors duration-200
                    hover:[&>td]:bg-white/60 dark:hover:[&>td]:bg-[#252525]">

                    {/* Name */}
                    <td className="px-[25px] py-[18px] font-bold capitalize
                      text-slate-800 dark:text-white
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      {r.name}
                    </td>

                    {/* Phone */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <span className="font-semibold tracking-[0.5px]
                        text-indigo-500 dark:text-[#E50914]">
                        {r.phone}
                      </span>
                    </td>

                    {/* Theatre + city */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <div className="flex items-center gap-3">
                        <span className="font-bold capitalize
                          text-slate-800 dark:text-white">
                          {r.theatre_name}
                        </span>
                        <span className="px-3 py-[5px] rounded-full text-[0.85rem] font-semibold
                          inline-block border
                          bg-white dark:bg-[#333333]
                          text-purple-500 dark:text-[#F5C518]
                          border-transparent dark:border-[#444444]">
                          {r.city}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <span className="text-[0.8rem] font-medium
                        text-slate-500 dark:text-[#B3B3B3]">
                        {r.created_at || 'Recently'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-[25px] py-[18px] text-right
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      {canReview ? (
                        <div className="flex gap-2 justify-end">
                          {/* Approve */}
                          <button
                            onClick={() => handleAction(r.admin_id, 'approve')}
                            className="px-4 py-2 rounded-lg font-bold cursor-pointer
                              transition-all duration-200
                              bg-emerald-500/15 text-emerald-600
                              border border-emerald-500/30
                              dark:bg-emerald-500/10 dark:text-emerald-400
                              dark:border-emerald-500/30
                              hover:bg-emerald-500 hover:text-white hover:border-emerald-500
                              dark:hover:bg-emerald-500 dark:hover:text-white">
                            Approve
                          </button>
                          {/* Decline */}
                          <button
                            onClick={() => handleAction(r.admin_id, 'decline')}
                            className="px-4 py-2 rounded-lg font-bold cursor-pointer
                              transition-all duration-200
                              bg-rose-500/15 text-rose-600
                              border border-rose-500/30
                              dark:bg-[rgba(229,9,20,0.1)] dark:text-[#E50914]
                              dark:border-[rgba(229,9,20,0.3)]
                              hover:bg-rose-500 hover:text-white hover:border-rose-500
                              dark:hover:bg-[#E50914] dark:hover:text-white dark:hover:border-[#E50914]">
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className="text-[0.85rem] font-semibold
                          text-slate-400 dark:text-[#666]">
                          View Only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan="5"
                      className="text-center py-[40px] font-medium
                        text-[#94a3b8] dark:text-[#B3B3B3]">
                      No pending signup requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ══════════════════════════════════════
              PAGINATION
          ══════════════════════════════════════ */}
          {(totalPages > 1 || filteredRequests.length > 0) && (
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

              {/* Right — page buttons */}
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

export default PartnerRequests;