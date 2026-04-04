import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const MovieRequests = () => {
  const { user } = useOutletContext();
  const { canAccess } = useAuth();
  const [requests, setRequests]               = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [currentPage, setCurrentPage]         = useState(1);
  const [itemsPerPage, setItemsPerPage]       = useState(10);
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [currentReq, setCurrentReq]           = useState(null);
  const [feedback, setFeedback]               = useState('');

  const canReview = canAccess('movie_requests', 'edit');

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/admin/movie_requests', {
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
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.theatre_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.status.toLowerCase().includes(searchQuery.toLowerCase())
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

  const openReviewModal = (req) => { setCurrentReq(req); setFeedback(''); setIsModalOpen(true); };

  const handleAction = async (e, actionType) => {
    e.preventDefault();
    if (actionType === 'decline' && feedback.trim() === '') {
      toast.error('Please write a reason before declining.'); return;
    }
    if (actionType === 'decline' && !window.confirm('Decline this request and send feedback?')) return;
    const formData = new FormData();
    formData.append('action', actionType);
    formData.append('feedback', feedback);
    await fetch(`http://localhost:5000/admin/movie_requests/action/${currentReq.request_id}`, {
      method: 'POST', credentials: 'include', body: formData
    });
    setIsModalOpen(false);
    fetchRequests();
  };

  /* ── status badge helper ── */
  const statusBadge = (status) => {
    const base = 'px-3 py-[6px] rounded-full text-[0.8rem] font-bold capitalize inline-block border';
    if (status === 'pending')
      return `${base} bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-[rgba(245,197,24,0.1)] dark:text-[#F5C518] dark:border-[rgba(245,197,24,0.3)]`;
    if (status === 'accepted')
      return `${base} bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30`;
    return `${base} bg-rose-500/15 text-rose-600 border-rose-500/30 dark:bg-[rgba(229,9,20,0.1)] dark:text-[#E50914] dark:border-[rgba(229,9,20,0.3)]`;
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
            Partner Movie Requests
          </h1>
          <p className="text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Review and approve new movies submitted by theatre owners.
          </p>
        </div>
        <input
          type="text"
          placeholder="Search movies, theatres, or status..."
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
                  {['Proposed Movie', 'Requested By', 'Submitted On', 'Status'].map(h => (
                    <th key={h} className="px-[25px] py-[18px] text-left font-bold
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

                    {/* Movie preview */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <div className="flex items-center gap-4">
                        {/* Thumbnail */}
                        <div className="w-[50px] h-[75px] rounded-lg overflow-hidden flex-shrink-0
                          bg-[#cbd5e1] dark:bg-[#333333]">
                          {r.image
                            ? <img src={`http://localhost:5000/static/${r.image}`} alt="poster"
                                className="w-full h-full object-cover" />
                            : <div className="flex items-center justify-center h-full w-full
                                text-[0.7rem] font-bold text-center leading-tight
                                text-[#4a4e69] dark:text-[#666666]
                                bg-white/50 dark:bg-[#1E1E1E]">
                                No Img
                              </div>
                          }
                        </div>
                        <div>
                          <span className="block font-bold capitalize
                            text-slate-800 dark:text-white">
                            {r.title}
                          </span>
                          <span className="text-[0.8rem] font-medium text-slate-500 dark:text-[#B3B3B3]">
                            {r.duration} | {r.certificate} | {r.genres}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Theatre */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <span className="block font-bold capitalize
                        text-slate-800 dark:text-white">
                        {r.theatre_name}
                      </span>
                      <span className="text-[0.8rem] font-medium text-slate-500 dark:text-[#B3B3B3]">
                        ({r.city})
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <span className="text-[0.8rem] font-medium text-slate-500 dark:text-[#B3B3B3]">
                        {r.created_at}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <span className={statusBadge(r.status)}>{r.status}</span>
                    </td>

                    {/* Action */}
                    <td className="px-[25px] py-[18px] text-right
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      {r.status === 'pending' && canReview ? (
                        <button onClick={() => openReviewModal(r)}
                          className="px-4 py-2 rounded-lg font-bold cursor-pointer
                            transition-all duration-200
                            bg-[rgba(99,102,241,0.1)] text-indigo-600
                            border border-[rgba(99,102,241,0.2)]
                            dark:bg-[rgba(245,197,24,0.1)] dark:text-[#F5C518]
                            dark:border-[rgba(245,197,24,0.2)]
                            hover:bg-indigo-500 hover:text-white hover:border-indigo-500
                            dark:hover:bg-[#F5C518] dark:hover:text-[#121212] dark:hover:border-[#F5C518]
                            hover:shadow-[0_4px_10px_rgba(79,70,229,0.3)]">
                          Review
                        </button>
                      ) : r.status === 'pending' ? (
                        <span className="text-[0.85rem] font-semibold
                          text-slate-400 dark:text-[#666]">
                          Pending
                        </span>
                      ) : (
                        <div className="inline-block text-right px-2 py-[6px] rounded-lg
                          text-[0.85rem] font-semibold
                          text-[#4a4e69] dark:text-[#B3B3B3]
                          bg-white/40 dark:bg-[#1E1E1E]
                          border border-transparent dark:border-[#333333]">
                          Processed by {r.reviewed_by}<br />
                          <span className="text-[0.75rem] font-medium
                            text-slate-400 dark:text-[#666]">
                            {r.reviewed_at}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan="5"
                      className="text-center py-[40px] font-medium
                        text-[#94a3b8] dark:text-[#B3B3B3]">
                      No pending requests found.
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
              <div className="flex items-center gap-4">
                <span className="text-[0.9rem] font-medium text-[#4a4e69] dark:text-[#B3B3B3]">
                  Results: {startN} – {endN} of {total}
                </span>
                <select value={itemsPerPage}
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-3 py-[6px] rounded-lg font-semibold text-[0.9rem]
                    border border-[#cbd5e1] dark:border-[#333333]
                    bg-white dark:bg-[#121212]
                    text-slate-800 dark:text-white outline-none cursor-pointer">
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p-1)}
                    className="min-w-[32px] h-8 rounded-lg flex items-center justify-center
                      font-semibold bg-transparent border-none
                      text-[#4a4e69] dark:text-[#B3B3B3]
                      hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
                      dark:hover:bg-white/10 dark:hover:text-white
                      disabled:opacity-40 disabled:cursor-not-allowed
                      cursor-pointer transition-all duration-200">
                    &lt;
                  </button>
                  {getPageNumbers().map((pg, i) => pageBtn(pg, i))}
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p+1)}
                    className="min-w-[32px] h-8 rounded-lg flex items-center justify-center
                      font-semibold bg-transparent border-none
                      text-[#4a4e69] dark:text-[#B3B3B3]
                      hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
                      dark:hover:bg-white/10 dark:hover:text-white
                      disabled:opacity-40 disabled:cursor-not-allowed
                      cursor-pointer transition-all duration-200">
                    &gt;
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          REVIEW MODAL
      ══════════════════════════════════════ */}
      {isModalOpen && currentReq && (
        <div
          className="fixed inset-0 z-[1000] flex justify-center items-center
            bg-[rgba(15,23,42,0.6)] dark:bg-black/80 backdrop-blur-[5px]"
          onClick={() => setIsModalOpen(false)}>

          <div
            className="relative w-full max-w-[500px] p-[30px] rounded-[20px]
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
              Review Request
            </h2>

            {/* Movie details box */}
            <div className="flex gap-5 p-4 rounded-[12px] mb-5
              bg-slate-50 dark:bg-[#121212]
              border border-[#e2e8f0] dark:border-[#333333]">

              {/* Poster */}
              <div className="w-[80px] h-[120px] rounded-lg overflow-hidden flex-shrink-0
                bg-[#cbd5e1] dark:bg-[#333333]">
                {currentReq.image
                  ? <img src={`http://localhost:5000/static/${currentReq.image}`} alt="poster"
                      className="w-full h-full object-cover" />
                  : <div className="flex items-center justify-center h-full w-full
                      text-[0.7rem] font-bold text-center leading-tight
                      text-[#4a4e69] dark:text-[#666666]
                      bg-white/50 dark:bg-[#1E1E1E]">
                      No Image
                    </div>
                }
              </div>

              {/* Info */}
              <div>
                <h3 className="text-[1.1rem] font-bold mb-[10px]
                  text-slate-800 dark:text-white">
                  {currentReq.title}
                </h3>
                {[
                  ['Duration', currentReq.duration],
                  ['Certificate', currentReq.certificate],
                  ['Genres', currentReq.genres],
                ].map(([label, value]) => (
                  <p key={label} className="text-[0.9rem] mb-1
                    text-[#4a4e69] dark:text-[#B3B3B3]">
                    <strong className="text-slate-700 dark:text-[#e2e8f0]">{label}:</strong> {value}
                  </p>
                ))}
              </div>
            </div>

            {/* Feedback textarea */}
            <div className="mb-0">
              <label className="block mb-2 font-semibold text-[0.95rem]
                text-[#4a4e69] dark:text-[#B3B3B3]">
                Feedback / Reason for Decline
              </label>
              <textarea
                rows="3"
                placeholder="Leave blank if approving. Required if declining."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                className="w-full p-3 rounded-lg text-base resize-vertical
                  border border-[#cbd5e1] dark:border-[#333333]
                  bg-white dark:bg-[#121212]
                  text-slate-800 dark:text-white
                  placeholder-[#9ea1bc] dark:placeholder-[#666666]
                  outline-none box-border font-[inherit]
                  focus:border-indigo-500 dark:focus:border-[#E50914]
                  transition-colors duration-200" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 mt-6">
              {/* Approve */}
              <button
                onClick={e => handleAction(e, 'approve')}
                className="flex-1 py-3 rounded-[10px] font-bold text-base text-white
                  border-none cursor-pointer transition-all duration-200
                  bg-gradient-to-r from-emerald-500 to-emerald-600
                  hover:-translate-y-0.5
                  hover:shadow-[0_5px_15px_rgba(16,185,129,0.4)]">
                Approve & Add
              </button>

              {/* Decline */}
              <button
                onClick={e => handleAction(e, 'decline')}
                className="flex-1 py-3 rounded-[10px] font-bold text-base
                  cursor-pointer transition-all duration-200 border
                  bg-rose-500/15 text-rose-600 border-rose-500/30
                  dark:bg-[rgba(229,9,20,0.1)] dark:text-[#E50914]
                  dark:border-[rgba(229,9,20,0.3)]
                  hover:bg-rose-500 hover:text-white hover:border-rose-500
                  dark:hover:bg-[#E50914] dark:hover:text-white dark:hover:border-[#E50914]">
                Decline
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
};

export default MovieRequests;