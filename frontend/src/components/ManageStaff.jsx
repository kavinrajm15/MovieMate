import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000';

const ManageStaff = () => {
  const { user } = useOutletContext();
  const { canAccess } = useAuth();
  const [staff, setStaff]                           = useState([]);
  const [managers, setManagers]                     = useState([]);
  const [availableRoles, setAvailableRoles]         = useState([]);
  const [filteredStaff, setFilteredStaff]           = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [searchQuery, setSearchQuery]               = useState('');
  const [roleFilter, setRoleFilter]                 = useState('all');
  const [currentPage, setCurrentPage]               = useState(1);
  const [itemsPerPage, setItemsPerPage]             = useState(10);
  const [isAddModalOpen, setIsAddModalOpen]         = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen]   = useState(false);
  const [currentAssignStaff, setCurrentAssignStaff] = useState(null);
  const [assignRole, setAssignRole]                 = useState('');
  const [assignableUsers, setAssignableUsers]       = useState([]);
  const [assignUserId, setAssignUserId]             = useState('');
  const [loadingAssignUsers, setLoadingAssignUsers] = useState(false);
  // Add staff modal - assign under states
  const [addAssignRole, setAddAssignRole]       = useState('');
  const [addAssignUsers, setAddAssignUsers]     = useState([]);
  const [addAssignUserId, setAddAssignUserId]   = useState('');
  const [loadingAddUsers, setLoadingAddUsers]   = useState(false);
  const [newStaffRole, setNewStaffRole]             = useState('');

  const isSuperadmin = user?.role === 'superadmin';
  const canAdd    = canAccess('staff', 'add');
  const canDelete = canAccess('staff', 'delete');
  const canEdit   = canAccess('staff', 'edit');
  const canAssign = canAccess('staff', 'assign');

  const fetchStaffData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/staff`, {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
        setManagers(data.managers || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/roles/list-all`, {
        credentials: 'include'
      });
      if (res.ok) { const d = await res.json(); setAvailableRoles(d.roles || []); }
    } catch(e) {}
  }, []);

  const fetchUsersByRole = async (roleName) => {
    if (!roleName) { setAssignableUsers([]); return; }
    setLoadingAssignUsers(true);
    try {
      const res = await fetch(`${API}/admin/staff/by-role/${roleName}`, {
        credentials: 'include'
      });
      if (res.ok) { const d = await res.json(); setAssignableUsers(d.staff || []); }
    } catch(e) {}
    setLoadingAssignUsers(false);
  };

  const fetchAddAssignUsers = async (roleName) => {
    if (!roleName) { setAddAssignUsers([]); return; }
    setLoadingAddUsers(true);
    try {
      const res = await fetch(`${API}/admin/staff/by-role/${roleName}`, {
        credentials: 'include'
      });
      if (res.ok) { const d = await res.json(); setAddAssignUsers(d.staff || []); }
    } catch(e) {}
    setLoadingAddUsers(false);
  };

  useEffect(() => {
    fetchStaffData();
    fetchRoles();
  }, [fetchStaffData, fetchRoles]);

  useEffect(() => {
    const defaultRole = isSuperadmin ? 'manager' : 'supervisor';
    setNewStaffRole(availableRoles.find(r => r.role_name === defaultRole)?.role_name || availableRoles[0]?.role_name || 'supervisor');
  }, [isSuperadmin, availableRoles]);

  useEffect(() => {
    const filtered = staff.filter(s => {
      const textMatch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const roleMatch = roleFilter === 'all' || s.role === roleFilter;
      return textMatch && roleMatch;
    });
    setFilteredStaff(filtered);
    setCurrentPage(1);
  }, [searchQuery, roleFilter, staff]);

  const indexOfLast  = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredStaff.slice(indexOfFirst, indexOfLast);
  const totalPages   = Math.ceil(filteredStaff.length / itemsPerPage);
  const total        = filteredStaff.length;
  const startN       = total === 0 ? 0 : indexOfFirst + 1;
  const endN         = Math.min(indexOfLast, total);

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages-3, totalPages-2, totalPages-1, totalPages];
    return [1, '...', currentPage-1, currentPage, currentPage+1, '...', totalPages];
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch(`${API}/admin/staff/add`, {
      method: 'POST', credentials: 'include', body: formData
    });
    if (res.ok) { setIsAddModalOpen(false); fetchStaffData(); }
    else { const err = await res.json(); toast.error(err.error || 'Failed to add staff'); }
  };

  const handleAssignManager = async () => {
    const formData = new FormData();
    // assignUserId = 'unassign' or '' means unassign; otherwise assign to that user
    if (assignUserId && assignUserId !== 'unassign') formData.append('manager_id', assignUserId);
    await fetch(`${API}/admin/staff/assign/${currentAssignStaff.staff_id}`, {
      method: 'POST', credentials: 'include', body: formData
    });
    setIsAssignModalOpen(false);
    setAssignRole('');
    setAssignUserId('');
    setAssignableUsers([]);
    fetchStaffData();
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    const res = await fetch(`${API}/admin/staff/delete/${staffId}`, {
      method: 'POST', credentials: 'include'
    });
    if (res.ok) fetchStaffData();
    else { const err = await res.json(); toast.error(err.error || 'Failed to delete staff'); }
  };

  /* ── shared styles ── */
  const formInput = `w-full p-3 rounded-[10px] text-base outline-none box-border
    border border-[#cbd5e1] dark:border-[#333333]
    bg-white dark:bg-[#121212]
    text-slate-800 dark:text-white
    placeholder-[#9ea1bc] dark:placeholder-[#666]
    focus:border-indigo-500 dark:focus:border-[#E50914]
    transition-colors duration-200`;

  const modalOverlay = `fixed inset-0 z-[1000] flex justify-center items-center
    bg-[rgba(15,23,42,0.6)] dark:bg-black/80 backdrop-blur-[5px]`;

  const modalCard = `relative w-full max-w-[500px] p-[30px] rounded-[20px]
    bg-white dark:bg-[#1E1E1E]
    border border-[#e2e8f0] dark:border-[#333333]
    shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]
    slide-up`;

  const roleBadge = (role) => {
    const base = 'px-3 py-[6px] rounded-full text-[0.8rem] font-bold capitalize inline-block border';
    if (role === 'manager' || role === 'superadmin')
      return `${base} bg-[rgba(99,102,241,0.15)] text-indigo-600 border-[rgba(99,102,241,0.3)] dark:bg-[rgba(229,9,20,0.1)] dark:text-[#E50914] dark:border-[rgba(229,9,20,0.3)]`;
    return `${base} bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-[rgba(245,197,24,0.1)] dark:text-[#F5C518] dark:border-[rgba(245,197,24,0.3)]`;
  };

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

  // Unique roles from staff list for filter
  const roleOptions = [...new Set(staff.map(s => s.role))].filter(Boolean);

  return (
    <main className="p-[30px]">
      {/* ══ PAGE HEADER ══ */}
      <header className="flex justify-between items-center flex-wrap gap-4 mb-[30px]
        px-[30px] py-5 rounded-[20px]
        bg-white/40 dark:bg-[rgba(30,30,30,0.95)]
        backdrop-blur-[10px]
        border border-white/50 dark:border-[#333333]
        shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div>
          <h1 className="text-[1.8rem] font-bold mb-1 text-slate-800 dark:text-white">
            Platform Staff
          </h1>
          <p className="text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Manage access and assign supervisors to managers.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Role filter */}
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="min-w-[150px] px-5 py-3 rounded-full text-[0.95rem]
              border border-white/60 dark:border-[#333333]
              bg-white/60 dark:bg-[#121212]
              text-slate-800 dark:text-white
              outline-none cursor-pointer transition-all duration-300
              hover:bg-white hover:border-indigo-500 dark:hover:border-[#E50914]
              focus:bg-white dark:focus:bg-[#121212]
              focus:border-indigo-500 dark:focus:border-[#E50914]">
            <option value="all">All Roles</option>
            {roleOptions.map(r => <option key={r} value={r}>{r.replace(/_/g,' ')}</option>)}
          </select>

          {/* Search */}
          <input type="text" placeholder="Search staff..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-[250px] px-5 py-3 rounded-full text-[0.95rem]
              border border-white/60 dark:border-[#333333]
              bg-white/60 dark:bg-[#121212]
              text-slate-800 dark:text-white
              placeholder-[#9ea1bc] dark:placeholder-[#666666]
              outline-none transition-all duration-300
              focus:bg-white dark:focus:bg-[#121212]
              focus:border-indigo-500 dark:focus:border-[#E50914]" />

          {/* Add Staff */}
          {canAdd && (
            <button onClick={() => {
              setIsAddModalOpen(true);
              setAddAssignRole('');
              setAddAssignUserId('');
              setAddAssignUsers([]);
            }}
              className="px-6 py-3 rounded-full font-bold tracking-wide text-white
                border-none cursor-pointer transition-all duration-200
                bg-gradient-to-br from-indigo-500 to-purple-500
                dark:bg-none dark:bg-[#E50914]
                hover:-translate-y-0.5
                hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
                dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]">
              Add Staff
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="text-center py-[50px] text-[1.1rem] font-semibold
          text-slate-500 dark:text-[#a3a3a3] animate-pulse">
          Loading staff accounts...
        </div>
      ) : (
        <>
          {/* ══ TABLE ══ */}
          <div className="bg-white/40 dark:bg-[#1E1E1E]
            backdrop-blur-[10px] rounded-[20px] mb-6 overflow-hidden
            border border-white/50 dark:border-[#333333]
            shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Staff Member', 'Role', 'Assigned To', 'Action'].map((h, idx) => (
                    <th key={h} className={`px-[25px] py-[18px] font-bold
                      text-slate-800 dark:text-[#B3B3B3]
                      bg-[rgba(99,102,241,0.1)] dark:bg-[#121212]
                      border-b border-white/50 dark:border-[#333333]
                      ${idx === 3 ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((s, i) => (
                  <tr key={i} className="transition-colors duration-200
                    hover:[&>td]:bg-white/60 dark:hover:[&>td]:bg-[#252525]">

                    {/* Name */}
                    <td className="px-[25px] py-[18px] font-bold capitalize
                      text-slate-800 dark:text-white
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      {s.name}
                    </td>

                    {/* Role */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      <span className={roleBadge(s.role)}>{s.role?.replace(/_/g,' ')}</span>
                    </td>

                    {/* Assigned To */}
                    <td className="px-[25px] py-[18px]
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      {s.role !== 'superadmin' ? (
                        <div className="flex items-center gap-3">
                          {s.manager_name ? (
                            <span className="px-3 py-[6px] rounded-full text-[0.8rem] font-semibold
                              whitespace-nowrap border inline-block
                              bg-violet-500/10 text-violet-700 border-violet-500/20
                              dark:bg-purple-500/10 dark:text-[#c084fc] dark:border-purple-500/30">
                              {s.manager_name}
                            </span>
                          ) : (
                            <span className="px-3 py-[6px] rounded-full text-[0.8rem] font-semibold
                              whitespace-nowrap border inline-block italic
                              bg-slate-100 text-slate-500 border-slate-200
                              dark:bg-[#a3a3a3]/10 dark:text-[#a3a3a3] dark:border-[#a3a3a3]/20">
                              Unassigned
                            </span>
                          )}
                          {canAssign && s.staff_id !== user?.staff_id && (
                            <button
                              onClick={() => {
                              setCurrentAssignStaff(s);
                              setAssignRole('');
                              setAssignUserId('');
                              setAssignableUsers([]);
                              setIsAssignModalOpen(true);
                            }}
                              className="px-4 py-2 rounded-lg font-bold text-[0.85rem] ml-[10px]
                                cursor-pointer transition-all duration-200
                                bg-sky-500/10 text-sky-600 border border-sky-500/30
                                dark:bg-sky-400/10 dark:text-[#38bdf8] dark:border-sky-400/30
                                hover:bg-sky-500 hover:text-white
                                dark:hover:bg-[#38bdf8] dark:hover:text-[#121212]
                                hover:shadow-[0_4px_10px_rgba(14,165,233,0.3)]">
                              {s.manager_name ? 'Change' : 'Assign'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[0.85rem] font-semibold text-slate-400 dark:text-[#666]">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-[25px] py-[18px] text-right
                      border-b border-white/30 dark:border-[#2A2A2A] align-middle">
                      {s.staff_id === user?.staff_id ? (
                        <span className="text-[0.85rem] text-slate-400 dark:text-[#666] font-semibold">
                          Current User
                        </span>
                      ) : canDelete ? (
                        <button onClick={() => handleDeleteStaff(s.staff_id)}
                          className="px-4 py-2 rounded-lg font-bold cursor-pointer
                            transition-all duration-200
                            bg-transparent text-rose-500 dark:text-[#E50914]
                            border border-rose-200 dark:border-[rgba(229,9,20,0.3)]
                            hover:bg-rose-500 hover:text-white hover:border-rose-500
                            dark:hover:bg-[#E50914] dark:hover:text-white dark:hover:border-[#E50914]">
                          Remove
                        </button>
                      ) : (
                        <span className="text-[0.85rem] text-slate-400 dark:text-[#666] font-semibold">
                          View Only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan={4}
                      className="text-center py-[40px] font-medium text-[#94a3b8] dark:text-[#B3B3B3]">
                      No staff accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ══ PAGINATION ══ */}
          {(totalPages > 1 || filteredStaff.length > 0) && (
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

      {/* ══ ASSIGN UNDER MODAL ══ */}
      {isAssignModalOpen && currentAssignStaff && (
        <div className={modalOverlay} onClick={() => setIsAssignModalOpen(false)}>
          <div className={modalCard} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsAssignModalOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914] transition-colors duration-200">
              ✕
            </span>
            <h2 className="text-[1.3rem] font-bold mb-1 text-slate-800 dark:text-white">
              Assign Under
            </h2>
            <p className="text-[0.9rem] mb-5 text-[#4a4e69] dark:text-[#B3B3B3]">
              Assign <strong className="text-slate-800 dark:text-white">{currentAssignStaff.name}</strong> under a user.
            </p>

            {/* Step 1 — Select Role */}
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
                Step 1 — Select Role
              </label>
              <select
                value={assignRole}
                onChange={e => {
                  const r = e.target.value;
                  setAssignRole(r);
                  setAssignUserId('');
                  fetchUsersByRole(r);
                }}
                className={formInput}>
                <option value="">— Pick a role —</option>
                {availableRoles
                  .filter(r => r.role_name !== 'superadmin')
                  .map(r => (
                    <option key={r.role_name} value={r.role_name}>
                      {r.role_name.replace(/_/g, ' ')}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Step 2 — Select User */}
            {assignRole && (
              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
                  Step 2 — Select User
                </label>
                {loadingAssignUsers ? (
                  <div className="text-[0.85rem] text-slate-400 dark:text-[#666] animate-pulse py-2">
                    Loading users...
                  </div>
                ) : assignableUsers.length === 0 ? (
                  <div className="text-[0.85rem] text-slate-400 dark:text-[#666] py-2">
                    No users found with this role.
                  </div>
                ) : (
                  <select
                    value={assignUserId}
                    onChange={e => setAssignUserId(e.target.value)}
                    className={formInput}>
                    <option value="">— Pick a user —</option>
                    {assignableUsers
                      .filter(u => u.staff_id !== currentAssignStaff.staff_id)
                      .map(u => (
                        <option key={u.staff_id} value={u.staff_id}>{u.name}</option>
                      ))
                    }
                  </select>
                )}
              </div>
            )}

            {/* Unassign option */}
            <div className="mb-5">
              <button
                type="button"
                onClick={() => { setAssignRole(''); setAssignUserId('unassign'); setAssignableUsers([]); }}
                className={`w-full py-2 rounded-[10px] text-[0.85rem] font-semibold cursor-pointer
                  transition-all duration-200 border
                  ${assignUserId === 'unassign'
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-transparent border-[#cbd5e1] dark:border-[#333] text-slate-500 dark:text-[#94a3b8] hover:border-rose-400 hover:text-rose-500 dark:hover:border-rose-400 dark:hover:text-rose-400'
                  }`}>
                {assignUserId === 'unassign' ? '✓ Will Unassign' : 'Unassign Instead'}
              </button>
            </div>

            <button
              type="button"
              disabled={!assignUserId}
              onClick={handleAssignManager}
              className="w-full py-3 rounded-[10px] font-semibold text-base text-white
                border-none cursor-pointer transition-all duration-200
                bg-gradient-to-br from-indigo-500 to-purple-500
                dark:bg-none dark:bg-[#E50914]
                hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]
                disabled:opacity-40 disabled:cursor-not-allowed">
              Save Assignment
            </button>
          </div>
        </div>
      )}

            {/* ══ ADD STAFF MODAL ══ */}
      {isAddModalOpen && (
        <div className={modalOverlay} onClick={() => setIsAddModalOpen(false)}>
          <div className="relative w-full max-w-[500px] max-h-[90vh] flex flex-col rounded-[20px]
            bg-white dark:bg-[#1E1E1E]
            border border-[#e2e8f0] dark:border-[#333333]
            shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]
            slide-up overflow-hidden"
          onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-[30px] pt-[30px] pb-4 flex-shrink-0">
              <h2 className="text-[1.3rem] font-bold text-slate-800 dark:text-white">
                Add New Staff
              </h2>
              <span onClick={() => setIsAddModalOpen(false)}
                className="text-[1.2rem] font-bold cursor-pointer
                  text-[#4a4e69] dark:text-[#B3B3B3]
                  hover:text-slate-800 dark:hover:text-[#E50914] transition-colors duration-200">
                ✕
              </span>
            </div>
            <div className="overflow-y-auto px-[30px] pb-[30px] flex-1
              [scrollbar-width:thin] [scrollbar-color:#e2e8f0_transparent]
              dark:[scrollbar-color:#2a2a2a_transparent]">
            <form onSubmit={handleAddStaff} autoComplete="off">
              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[0.95rem] text-[#4a4e69] dark:text-[#B3B3B3]">Full Name</label>
                <input type="text" name="name" required placeholder="e.g.sathyamoorthy" autoComplete="off" className={formInput} />
              </div>
              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[0.95rem] text-[#4a4e69] dark:text-[#B3B3B3]">Login Username</label>
                <input type="text" name="username" required placeholder="e.g. tamizh" autoComplete="off" className={formInput} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block mb-2 font-semibold text-[0.95rem] text-[#4a4e69] dark:text-[#B3B3B3]">Password</label>
                  <input type="password" name="password" required placeholder="e.g. password123" autoComplete="new-password" className={formInput} />
                </div>
                <div>
                  <label className="block mb-2 font-semibold text-[0.95rem] text-[#4a4e69] dark:text-[#B3B3B3]">Assign Role</label>
                  <select name="role" required value={newStaffRole}
                    onChange={e => setNewStaffRole(e.target.value)} className={formInput}>
                    {isSuperadmin
                      ? availableRoles.map(r => <option key={r.role_name} value={r.role_name}>{r.role_name.replace(/_/g,' ')}</option>)
                      : availableRoles.filter(r => r.role_name !== 'manager').map(r => <option key={r.role_name} value={r.role_name}>{r.role_name.replace(/_/g,' ')}</option>)
                    }
                  </select>
                </div>
              </div>
              {/* Assign Under — Role → User two-step (not for manager/superadmin) */}
              {newStaffRole !== 'superadmin' && (
                <div className="mb-5">
                  <label className="block mb-2 font-semibold text-[0.95rem] text-[#4a4e69] dark:text-[#B3B3B3]">
                    Assign Under <span className="text-slate-400 dark:text-[#666] font-normal">(Optional)</span>
                  </label>
                  {/* Step A: pick a role */}
                  <select
                    value={addAssignRole}
                    onChange={e => {
                      setAddAssignRole(e.target.value);
                      setAddAssignUserId('');
                      fetchAddAssignUsers(e.target.value);
                    }}
                    className={`${formInput} mb-3`}>
                    <option value="">— Select role to assign under —</option>
                    {availableRoles
                      .filter(r => r.role_name !== newStaffRole && r.role_name !== 'superadmin')
                      .map(r => (
                        <option key={r.role_name} value={r.role_name}>
                          {r.role_name.replace(/_/g, ' ')}
                        </option>
                      ))
                    }
                  </select>
                  {/* Step B: pick a user of that role */}
                  {addAssignRole && (
                    loadingAddUsers ? (
                      <div className="text-[0.82rem] text-slate-400 dark:text-[#666] animate-pulse py-1">
                        Loading users...
                      </div>
                    ) : addAssignUsers.length === 0 ? (
                      <div className="text-[0.82rem] text-slate-400 dark:text-[#666] py-1">
                        No users available for this role.
                      </div>
                    ) : (
                      <select
                        value={addAssignUserId}
                        onChange={e => setAddAssignUserId(e.target.value)}
                        className={formInput}>
                        <option value="">— Select user —</option>
                        {addAssignUsers.map(u => (
                          <option key={u.staff_id} value={u.staff_id}>{u.name}</option>
                        ))}
                      </select>
                    )
                  )}
                  {/* Hidden input carries manager_id to the form */}
                  <input type="hidden" name="manager_id" value={addAssignUserId} />
                </div>
              )}
              <div className="mt-3 px-4 py-3 rounded-[10px] text-[0.8rem] text-slate-500 dark:text-[#666]
                bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a]">
                Default permissions for the <strong className="text-slate-700 dark:text-[#94a3b8]">{newStaffRole?.replace(/_/g,' ')}</strong> role will be applied automatically.
              </div>
              <button type="submit"
                className="w-full mt-4 py-3 rounded-[10px] font-semibold text-base text-white
                  border-none cursor-pointer transition-all duration-200
                  bg-gradient-to-br from-indigo-500 to-purple-500
                  dark:bg-none dark:bg-[#E50914]
                  hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]">
                Create Account
              </button>
            </form>
            </div>{/* end scroll wrapper */}
          </div>
        </div>
      )}
    </main>
  );
};

export default ManageStaff;