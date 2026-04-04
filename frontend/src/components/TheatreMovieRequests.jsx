import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

/* ════════════════════════════════════════════
   MULTI-SELECT DROPDOWN (fully Tailwind)
════════════════════════════════════════════ */
const MultiSelectDropdown = ({ name, options, initialSelected = [], placeholder = 'Select...' }) => {
  const [selected, setSelected] = useState(initialSelected);
  const [isOpen, setIsOpen]     = useState(false);

  const handleSelect = (option) => {
    if (!selected.includes(option)) setSelected([...selected, option]);
    setIsOpen(false);
  };

  const handleRemove = (e, option) => {
    e.stopPropagation();
    setSelected(selected.filter(item => item !== option));
  };

  return (
    <div className="relative w-full">
      <input type="hidden" name={name} value={selected.join(', ')} />

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full
          px-3 py-2 min-h-[48px] rounded-[10px] cursor-pointer box-border
          border border-[#cbd5e1] dark:border-[#333333]
          bg-white dark:bg-[#121212]">
        <div className="flex flex-wrap gap-[6px] items-center">
          {selected.length === 0 && (
            <span className="pl-2 text-[#94a3b8] dark:text-[#737373]">
              {placeholder}
            </span>
          )}
          {selected.map(opt => (
            <span key={opt}
              className="flex items-center gap-[6px] px-[10px] py-1 rounded-full
                text-[0.85rem] font-semibold text-white
                bg-gradient-to-r from-indigo-500 to-purple-500
                dark:bg-none dark:bg-[#E50914]">
              {opt}
              <span
                onClick={e => handleRemove(e, opt)}
                className="cursor-pointer font-bold text-[1.1rem] leading-none
                  hover:text-rose-200 transition-colors">
                ×
              </span>
            </span>
          ))}
        </div>
        <span className="font-bold text-[1.2rem] pr-1 text-[#4a4e69] dark:text-white">▾</span>
      </div>

      {/* Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-[5px] z-[100]
          rounded-[10px] overflow-hidden
          bg-white dark:bg-[#1E1E1E]
          border border-[#cbd5e1] dark:border-[#333333]
          shadow-[0_10px_25px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          {options.filter(opt => !selected.includes(opt)).length === 0 && (
            <div className="px-4 py-3 text-[#94a3b8] cursor-default text-[0.9rem]">
              All options selected
            </div>
          )}
          {options.filter(opt => !selected.includes(opt)).map(opt => (
            <div key={opt}
              onClick={() => handleSelect(opt)}
              className="px-4 py-3 cursor-pointer text-[0.9rem]
                text-slate-800 dark:text-white
                border-b border-black/5 dark:border-white/5 last:border-b-0
                hover:bg-[rgba(99,102,241,0.1)] dark:hover:bg-[rgba(229,9,20,0.2)]
                transition-colors duration-150">
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════
   THEATRE MOVIE REQUESTS — MAIN COMPONENT
════════════════════════════════════════════ */
const TheatreMovieRequests = () => {
  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [isEditOpen, setIsEditOpen]     = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [currentReq, setCurrentReq]     = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const availableCertificates = ['U', 'U/A', 'A', 'S'];

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/admin/theatre_movie_requests', {
        method: 'GET', credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const indexOfLast  = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = requests.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(requests.length / itemsPerPage);
  const total        = requests.length;
  const startN       = total === 0 ? 0 : indexOfFirst + 1;
  const endN         = Math.min(indexOfLast, total);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, '...', currentPage-1, currentPage, currentPage+1, '...', totalPages];
  };

  const isValidImage = (file) => {
    if (!file || file.size === 0) return true;
    return ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!isValidImage(formData.get('image'))) { toast.error('Please upload a valid image (JPG, PNG).'); return; }
    if (!formData.get('certificate')) { toast.error('Please select at least one certificate.'); return; }
    await fetch('http://localhost:5000/admin/theatre_movie_requests', {
      method: 'POST', credentials: 'include', body: formData
    });
    setIsAddOpen(false);
    fetchRequests();
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!isValidImage(formData.get('image'))) { toast.error('Please upload a valid image (JPG, PNG).'); return; }
    if (!formData.get('certificate')) { toast.error('Please select at least one certificate.'); return; }
    await fetch(`http://localhost:5000/admin/theatre_movie_requests/edit/${currentReq.request_id}`, {
      method: 'POST', credentials: 'include', body: formData
    });
    setIsEditOpen(false);
    fetchRequests();
  };

  /* ── status badge helper ── */
  const statusBadge = (status) => {
    const base = 'px-3 py-[6px] rounded-full text-[0.8rem] font-bold capitalize inline-block border';
    if (status === 'accepted' || status === 'approved')
      return `${base} bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30`;
    if (status === 'pending')
      return `${base} bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-[rgba(245,197,24,0.1)] dark:text-[#F5C518] dark:border-[rgba(245,197,24,0.3)]`;
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

  /* ── shared form field ── */
  const fieldCls = `w-full p-3 rounded-[10px] text-base outline-none box-border font-[inherit]
    border border-[#cbd5e1] dark:border-[#333333]
    bg-white dark:bg-[#121212]
    text-slate-800 dark:text-white
    placeholder-[#9ea1bc] dark:placeholder-[#666666]
    focus:border-indigo-500 dark:focus:border-[#E50914]
    transition-colors duration-200`;

  const labelCls = `block mb-2 font-semibold text-[0.95rem] text-[#4a4e69] dark:text-[#B3B3B3]`;

  /* ── shared modal overlay ── */
  const overlayBase = `fixed inset-0 z-[1000] flex justify-center items-center
    bg-[rgba(15,23,42,0.6)] dark:bg-black/80 backdrop-blur-[5px]`;

  /* ── shared modal card ── */
  const cardBase = `relative w-full max-w-[500px] p-[30px] rounded-[20px]
    bg-white dark:bg-[#1E1E1E]
    border border-[#e2e8f0] dark:border-[#333333]
    shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]
    slide-up max-h-[90vh] overflow-y-auto`;

  /* ── shared save button ── */
  const saveBtnCls = `w-full py-3 rounded-[10px] font-semibold text-base text-white
    border-none cursor-pointer transition-all duration-200
    bg-gradient-to-br from-indigo-500 to-purple-500
    dark:bg-none dark:bg-[#E50914]
    hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]`;

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
            My Movie Requests
          </h1>
          <p className="text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Propose missing movies to the platform administrators.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-6 py-3 rounded-full font-bold tracking-wide text-white
            border-none cursor-pointer transition-all duration-200
            bg-gradient-to-br from-indigo-500 to-purple-500
            dark:bg-none dark:bg-[#E50914]
            hover:-translate-y-0.5
            hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
            dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]">
          Propose Movie
        </button>
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
                  {['Movie Details', 'Genres', 'Submitted On', 'Status'].map(h => (
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
                {currentItems.map(r => (
                  <tr key={r.request_id} className="transition-colors duration-200
                    hover:[&>td]:bg-white/60 dark:hover:[&>td]:bg-[#252525]">

                    {/* Movie preview */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <div className="flex items-center gap-4">
                        <div className="w-[50px] h-[75px] rounded-lg overflow-hidden flex-shrink-0
                          bg-[#cbd5e1] dark:bg-[#333333]
                          border border-transparent dark:border-[#444444]">
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
                          <span className="block font-bold text-slate-800 dark:text-white">
                            {r.title}
                          </span>
                          <span className="text-[0.8rem] font-medium text-slate-500 dark:text-[#B3B3B3]">
                            {r.duration} | {r.certificate}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Genres */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <span className="text-[0.8rem] font-medium text-slate-500 dark:text-[#B3B3B3]">
                        {r.genres}
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

                      {r.status === 'pending' && (
                        <button
                          onClick={() => { setCurrentReq(r); setIsEditOpen(true); }}
                          className="px-4 py-2 rounded-lg font-bold cursor-pointer
                            transition-all duration-200
                            bg-[rgba(99,102,241,0.1)] text-indigo-600
                            border border-[rgba(99,102,241,0.2)]
                            dark:bg-[rgba(229,9,20,0.1)] dark:text-[#E50914]
                            dark:border-[rgba(229,9,20,0.2)]
                            hover:bg-indigo-500 hover:text-white hover:border-indigo-500
                            dark:hover:bg-[#E50914] dark:hover:text-white dark:hover:border-[#E50914]
                            hover:shadow-[0_4px_10px_rgba(79,70,229,0.3)]">
                          Edit Request
                        </button>
                      )}

                      {r.status === 'declined' && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[0.75rem] font-semibold text-rose-500 dark:text-[#E50914]">
                            Declined by {r.reviewed_by}
                          </span>
                          <button
                            onClick={() => { setCurrentReq(r); setIsFeedbackOpen(true); }}
                            className="px-4 py-2 rounded-lg font-bold cursor-pointer
                              transition-all duration-200
                              bg-[rgba(99,102,241,0.1)] text-indigo-600
                              border border-[rgba(99,102,241,0.2)]
                              dark:bg-[rgba(229,9,20,0.1)] dark:text-[#E50914]
                              dark:border-[rgba(229,9,20,0.2)]
                              hover:bg-indigo-500 hover:text-white hover:border-indigo-500
                              dark:hover:bg-[#E50914] dark:hover:text-white dark:hover:border-[#E50914]">
                            View Feedback
                          </button>
                        </div>
                      )}

                      {(r.status === 'accepted' || r.status === 'approved') && (
                        <div className="inline-block px-3 py-[6px] rounded-lg
                          text-[0.85rem] font-semibold
                          text-[#4a4e69] dark:text-[#B3B3B3]
                          bg-white/40 dark:bg-[#1E1E1E]
                          border border-transparent dark:border-[#333333]">
                          Approved by {r.reviewed_by}
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
                      You haven't requested any movies yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ══════════════════════════════════════
              PAGINATION
          ══════════════════════════════════════ */}
          {(totalPages > 1 || requests.length > 0) && (
            <div className="flex justify-between items-center flex-wrap gap-4
              px-[10px] py-5 mt-5
              border-t border-[rgba(203,213,225,0.5)] dark:border-[#333333]">
              <div className="flex items-center gap-4">
                <span className="text-[0.9rem] font-medium text-[#4a4e69] dark:text-[#B3B3B3]">
                  Results: {startN} – {endN} of {total}
                </span>
                <select value={itemsPerPage} onChange={handleItemsPerPageChange}
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
                      font-semibold bg-transparent border-none cursor-pointer
                      text-[#4a4e69] dark:text-[#B3B3B3]
                      hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
                      dark:hover:bg-white/10 dark:hover:text-white
                      disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200">
                    &lt;
                  </button>
                  {getPageNumbers().map((pg, i) => pageBtn(pg, i))}
                  <button disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(p => p+1)}
                    className="min-w-[32px] h-8 rounded-lg flex items-center justify-center
                      font-semibold bg-transparent border-none cursor-pointer
                      text-[#4a4e69] dark:text-[#B3B3B3]
                      hover:bg-[rgba(99,102,241,0.1)] hover:text-indigo-600
                      dark:hover:bg-white/10 dark:hover:text-white
                      disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200">
                    &gt;
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          ADD REQUEST MODAL
      ══════════════════════════════════════ */}
      {isAddOpen && (
        <div className={overlayBase} onClick={() => setIsAddOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsAddOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914] transition-colors duration-200">
              ✕
            </span>
            <h2 className="text-[1.3rem] font-bold mb-5 text-slate-800 dark:text-white">
              Request New Movie
            </h2>
            <form onSubmit={handleAdd}>
              <div className="mb-5">
                <label className={labelCls}>Movie Title</label>
                <input type="text" name="title" required placeholder="Movie Title" className={fieldCls} />
              </div>
              <div className="mb-5">
                <label className={labelCls}>Movie Poster</label>
                <input type="file" name="image" accept=".jpg,.jpeg,.png" required className={fieldCls} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelCls}>Duration</label>
                  <input type="text" name="duration" required placeholder="e.g. 2h 15m" className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Certificate</label>
                  <MultiSelectDropdown name="certificate" options={availableCertificates} placeholder="Select..." />
                </div>
              </div>
              <div className="mb-5">
                <label className={labelCls}>Genres</label>
                <input type="text" name="genres" required placeholder="e.g. Action, Drama" className={fieldCls} />
              </div>
              <button type="submit" className={saveBtnCls}>Submit Request</button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          EDIT REQUEST MODAL
      ══════════════════════════════════════ */}
      {isEditOpen && currentReq && (
        <div className={overlayBase} onClick={() => setIsEditOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsEditOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914] transition-colors duration-200">
              ✕
            </span>
            <h2 className="text-[1.3rem] font-bold mb-5 text-slate-800 dark:text-white">
              Edit Request
            </h2>
            <form onSubmit={handleEdit}>
              <div className="mb-5">
                <label className={labelCls}>Movie Title</label>
                <input type="text" name="title" required defaultValue={currentReq.title} className={fieldCls} />
              </div>
              <div className="mb-5">
                <label className={labelCls}>Update Poster (Optional)</label>
                <input type="file" name="image" accept=".jpg,.jpeg,.png" className={fieldCls} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelCls}>Duration</label>
                  <input type="text" name="duration" required defaultValue={currentReq.duration} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Certificate</label>
                  <MultiSelectDropdown
                    name="certificate"
                    options={availableCertificates}
                    initialSelected={currentReq.certificate
                      ? currentReq.certificate.split(',').map(c => c.trim())
                      : []}
                    placeholder="Select..." />
                </div>
              </div>
              <div className="mb-5">
                <label className={labelCls}>Genres</label>
                <input type="text" name="genres" required defaultValue={currentReq.genres} className={fieldCls} />
              </div>
              <button type="submit" className={saveBtnCls}>Update Request</button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          FEEDBACK MODAL
      ══════════════════════════════════════ */}
      {isFeedbackOpen && currentReq && (
        <div className={overlayBase} onClick={() => setIsFeedbackOpen(false)}>
          <div className={`${cardBase} max-w-[450px]`} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsFeedbackOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914] transition-colors duration-200">
              ✕
            </span>

            <h2 className="text-[1.3rem] font-bold mb-2 text-slate-800 dark:text-white">
              Request Declined
            </h2>
            <p className="text-[0.85rem] font-medium mb-5 text-slate-500 dark:text-[#B3B3B3]">
              Movie: <strong className="text-slate-800 dark:text-white">{currentReq.title}</strong>
            </p>

            {/* Feedback banner */}
            <div className="pl-4 pr-4 py-3 rounded-r-lg
              bg-rose-500/10 dark:bg-[rgba(229,9,20,0.1)]
              border-l-4 border-rose-500 dark:border-[#E50914]
              text-[0.9rem]
              text-rose-800 dark:text-[#ff6b6b]">
              <strong className="text-rose-600 dark:text-[#E50914]">Admin Feedback:</strong>
              <br /><br />
              <span className="leading-[1.5]">
                {currentReq.feedback || 'The administrators did not provide a specific reason for declining this request.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default TheatreMovieRequests;