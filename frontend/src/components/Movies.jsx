import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/* ════════════════════════════════════════════
   MULTI-SELECT DROPDOWN (fully Tailwind)
════════════════════════════════════════════ */
const MultiSelectDropdown = ({ name, options, initialSelected = [] }) => {
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
              Select certificates...
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
        <span className="font-bold text-[1.2rem] pr-1
          text-[#4a4e69] dark:text-white">
          ▾
        </span>
      </div>

      {/* Dropdown menu */}
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
   MOVIES — MAIN COMPONENT
════════════════════════════════════════════ */
const Movies = () => {
  const { user } = useOutletContext();
  const { canAccess } = useAuth();
  const [movies, setMovies]               = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [currentPage, setCurrentPage]     = useState(1);
  const [itemsPerPage, setItemsPerPage]   = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentMovie, setCurrentMovie]   = useState(null);

  const availableCertificates = ['U', 'U/A', 'A', 'S'];

  const canAdd    = canAccess('movies', 'add');
  const canEdit   = canAccess('movies', 'edit');
  const canDelete = canAccess('movies', 'delete');

  const fetchMovies = async () => {
    try {
      const res = await fetch('http://localhost:5000/admin/movies', {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setMovies(data.movies || []);
        setFilteredMovies(data.movies || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMovies(); }, []);

  useEffect(() => {
    setFilteredMovies(movies.filter(m =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase())
    ));
    setCurrentPage(1);
  }, [searchQuery, movies]);

  const indexOfLast  = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredMovies.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(filteredMovies.length / itemsPerPage);
  const total        = filteredMovies.length;
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

  const handleAddMovie = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!isValidImage(formData.get('image'))) { toast.error('Please upload a valid image (JPG, PNG).'); return; }
    if (!formData.get('certificate')) { toast.error('Please select at least one certificate.'); return; }
    await fetch('http://localhost:5000/admin/movie/add_global', {
      method: 'POST', credentials: 'include', body: formData
    });
    setIsAddModalOpen(false);
    fetchMovies();
  };

  const handleEditMovie = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!isValidImage(formData.get('image'))) { toast.error('Please upload a valid image (JPG, PNG).'); return; }
    if (!formData.get('certificate')) { toast.error('Please select at least one certificate.'); return; }
    await fetch(`http://localhost:5000/admin/movie/edit/${currentMovie.movie_id}`, {
      method: 'POST', credentials: 'include', body: formData
    });
    setIsEditModalOpen(false);
    fetchMovies();
  };

  const handleDeleteMovie = async () => {
    if (!window.confirm('Delete this movie globally?')) return;
    await fetch(`http://localhost:5000/admin/movie/delete_global/${currentMovie.movie_id}`, {
      method: 'POST', credentials: 'include'
    });
    setIsEditModalOpen(false);
    fetchMovies();
  };

  const openEditModal = (movie) => {
    if (!canEdit) return;
    setCurrentMovie(movie);
    setIsEditModalOpen(true);
  };

  /* ── shared form field ── */
  const fieldCls = `w-full p-3 rounded-[10px] text-base outline-none box-border font-[inherit]
    border border-[#cbd5e1] dark:border-[#333333]
    bg-white dark:bg-[#121212]
    text-slate-800 dark:text-white
    placeholder-[#9ea1bc] dark:placeholder-[#666666]
    focus:border-indigo-500 dark:focus:border-[#E50914]
    transition-colors duration-200`;

  /* ── shared label ── */
  const labelCls = `block mb-2 font-semibold text-[0.95rem]
    text-[#4a4e69] dark:text-[#B3B3B3]`;

  /* ── shared modal overlay ── */
  const overlayBase = `fixed inset-0 z-[1000] flex justify-center items-center
    bg-[rgba(15,23,42,0.6)] dark:bg-black/80 backdrop-blur-[5px]`;

  /* ── shared modal card ── */
  const cardBase = `relative w-full max-w-[500px] p-[30px] rounded-[20px]
    bg-white dark:bg-[#1E1E1E]
    border border-[#e2e8f0] dark:border-[#333333]
    shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]
    slide-up overflow-y-auto max-h-[90vh]`;

  /* ── page button ── */
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
            Global Movies
          </h1>
          <p className="text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Manage the platform's universal movie catalog.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-5 py-3 rounded-full w-[250px] text-[0.95rem]
              border border-white/60 dark:border-[#333333]
              bg-white/60 dark:bg-[#121212]
              text-slate-800 dark:text-white
              placeholder-[#9ea1bc] dark:placeholder-[#666666]
              outline-none transition-all duration-300
              focus:bg-white dark:focus:bg-[#121212]
              focus:border-indigo-500 dark:focus:border-[#E50914]" />

          {canAdd && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 rounded-full font-bold tracking-wide text-white
                border-none cursor-pointer transition-all duration-200
                bg-gradient-to-br from-indigo-500 to-purple-500
                dark:bg-none dark:bg-[#E50914]
                hover:-translate-y-0.5
                hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
                dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]">
              Add Movie
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
          Loading movies...
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════
              MOVIES GRID
          ══════════════════════════════════════ */}
          <div className="grid gap-4 pb-5 w-full
            [grid-template-columns:repeat(5,minmax(0,1fr))]
            [@media(max-width:1200px)]:[grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">

            {currentItems.map((m, i) => (
              <div
                key={i}
                onClick={() => openEditModal(m)}
                style={{ cursor: canEdit ? 'pointer' : 'default' }}
                className="flex flex-col relative overflow-hidden rounded-[20px]
                  border border-white/50 dark:border-[#333333]
                  bg-white/65 dark:bg-[#1E1E1E]
                  backdrop-blur-[10px]
                  shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_10px_rgba(0,0,0,0.5)]
                  transition-all duration-200
                  hover:-translate-y-2
                  hover:shadow-[0_15px_30px_rgba(67,24,255,0.15)]
                  hover:border-white/80
                  dark:hover:shadow-[0_15px_30px_rgba(229,9,20,0.2)]
                  dark:hover:border-[#E50914]
                  group">

                {/* Poster */}
                <div className="w-full h-[250px] relative bg-[#eeeeee] dark:bg-[#222222]">
                  {m.image
                    ? <img src={`http://localhost:5000/static/${m.image}`} alt="poster"
                        className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center
                        text-[1.5rem] text-[#cbd5e1] dark:text-[#666666]
                        bg-[#eeeeee] dark:bg-[#222222]">
                        No Image
                      </div>
                  }
                  {/* Hover overlay */}
                  {canEdit && (
                    <div className="absolute inset-0 flex items-center justify-center
                      font-bold gap-2 opacity-0 group-hover:opacity-100
                      transition-opacity duration-200
                      bg-[rgba(67,24,255,0.7)] text-white
                      dark:bg-black/80 dark:text-[#E50914]">
                      Edit
                    </div>
                  )}
                </div>

                {/* Movie info */}
                <div className="px-5 py-[15px] w-full">
                  <h3 className="text-[1rem] font-bold mb-2 truncate
                    text-[#1B2559] dark:text-white">
                    {m.title}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.85rem] font-semibold
                      text-[#a3aed0] dark:text-[#B3B3B3]">
                      {m.duration}
                    </span>
                    <span className="px-2 py-[2px] rounded-[6px] text-[0.7rem] font-bold
                      bg-[#FFF4DE] text-[#FF9F43] border border-transparent
                      dark:bg-[rgba(245,197,24,0.2)] dark:text-[#F5C518]
                      dark:border-[rgba(245,197,24,0.3)]">
                      {m.certificate}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {currentItems.length === 0 && (
              <div className="col-span-full text-center py-[40px] font-medium
                text-[#a3aed0] dark:text-[#B3B3B3]">
                No movies found.
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════
              PAGINATION
          ══════════════════════════════════════ */}
          {(totalPages > 1 || filteredMovies.length > 0) && (
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
          ADD MOVIE MODAL
      ══════════════════════════════════════ */}
      {isAddModalOpen && (
        <div className={overlayBase} onClick={() => setIsAddModalOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsAddModalOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914]
                transition-colors duration-200">
              ✕
            </span>
            <h2 className="text-[1.3rem] font-bold mb-5 text-slate-800 dark:text-white">
              Add Movie
            </h2>
            <form onSubmit={handleAddMovie}>
              <div className="mb-5">
                <label className={labelCls}>Movie Title</label>
                <input type="text" name="title" required placeholder="Title" className={fieldCls} />
              </div>
              <div className="mb-5">
                <label className={labelCls}>Movie Poster</label>
                <input type="file" name="image" accept=".jpg,.jpeg,.png" required className={fieldCls} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelCls}>Duration</label>
                  <input type="text" name="duration" required placeholder="e.g. 2h 30m" className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Certificate</label>
                  <MultiSelectDropdown name="certificate" options={availableCertificates} />
                </div>
              </div>
              <div className="mb-5">
                <label className={labelCls}>Genres</label>
                <input type="text" name="genres" required placeholder="e.g. Action, Sci-Fi" className={fieldCls} />
              </div>
              <button type="submit"
                className="w-full py-3 rounded-[10px] font-semibold text-base text-white
                  border-none cursor-pointer transition-all duration-200
                  bg-gradient-to-br from-indigo-500 to-purple-500
                  dark:bg-none dark:bg-[#E50914]
                  hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]">
                Save Movie
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          EDIT MOVIE MODAL
      ══════════════════════════════════════ */}
      {isEditModalOpen && currentMovie && (
        <div className={overlayBase} onClick={() => setIsEditModalOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsEditModalOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914]
                transition-colors duration-200">
              ✕
            </span>
            <h2 className="text-[1.3rem] font-bold mb-5 text-slate-800 dark:text-white">
              Edit Movie
            </h2>
            <form onSubmit={handleEditMovie}>
              <div className="mb-5">
                <label className={labelCls}>Movie Title</label>
                <input type="text" name="title" required defaultValue={currentMovie.title} className={fieldCls} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelCls}>Duration</label>
                  <input type="text" name="duration" required defaultValue={currentMovie.duration} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Certificate</label>
                  <MultiSelectDropdown
                    name="certificate"
                    options={availableCertificates}
                    initialSelected={currentMovie.certificate ? currentMovie.certificate.split(', ') : []} />
                </div>
              </div>
              <div className="mb-5">
                <label className={labelCls}>Genres</label>
                <input type="text" name="genres" required defaultValue={currentMovie.genres} className={fieldCls} />
              </div>
              <div className="mb-5">
                <label className={labelCls}>Update Poster (Optional)</label>
                <input type="file" name="image" accept=".jpg,.jpeg,.png" className={fieldCls} />
              </div>

              {/* Save + Delete buttons */}
              <div className="flex gap-[10px] mt-[10px]">
                <button type="submit"
                  className="flex-1 py-3 rounded-[10px] font-semibold text-base text-white
                    border-none cursor-pointer transition-all duration-200
                    bg-gradient-to-br from-indigo-500 to-purple-500
                    dark:bg-none dark:bg-[#E50914]
                    hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]">
                  Update Details
                </button>
                {canDelete && (
                  <button type="button" onClick={handleDeleteMovie}
                    className="flex-1 py-3 rounded-[10px] font-bold cursor-pointer
                      transition-all duration-200
                      bg-rose-500/10 text-rose-600 border border-rose-500/20
                      dark:bg-[rgba(229,9,20,0.1)] dark:text-[#E50914]
                      dark:border-[rgba(229,9,20,0.2)]
                      hover:bg-rose-500 hover:text-white hover:border-rose-500
                      dark:hover:bg-[#E50914] dark:hover:text-white dark:hover:border-[#E50914]">
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Movies;