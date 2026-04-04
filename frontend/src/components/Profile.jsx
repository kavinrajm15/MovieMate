import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useOutletContext();
  const [loading, setLoading]                     = useState(true);
  const [recentRequest, setRecentRequest]         = useState(null);
  const [showRecentRequest, setShowRecentRequest] = useState(false);

  const [formData, setFormData] = useState({
    name: '', username: '', phone: '', city: '', theatre_name: ''
  });

  const [originalData, setOriginalData] = useState({
    name: '', username: '', phone: '', city: '', theatre_name: ''
  });

  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [profilePicFile, setProfilePicFile]       = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen]   = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwords, setPasswords] = useState({
    current_password: '', new_password: '', confirm_password: ''
  });

  const fetchProfileData = async () => {
    try {
      const res = await fetch('http://localhost:5000/admin/profile', {
        method: 'GET', credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const u = data.user_data || {};
        const loaded = {
          name: u.name || '', username: u.username || '', phone: u.phone || '',
          city: u.city || '', theatre_name: u.theatre_name || ''
        };
        setFormData(loaded);
        setOriginalData(loaded);          // ← snapshot of server state
        if (u.profile_pic) setProfilePicPreview(`http://localhost:5000/static/${u.profile_pic}`);
        if (data.recent_request) setRecentRequest(data.recent_request);
      }
    } catch (error) { console.error('Error fetching profile:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfileData(); }, []);

  useEffect(() => {
    if (recentRequest) {
      if (recentRequest.status === 'pending') {
        setShowRecentRequest(true);
      } else {
        const seenKey = `seen_req_${recentRequest.req_id}`;
        if (!localStorage.getItem(seenKey)) {
          setShowRecentRequest(true);
          const timer = setTimeout(() => {
            setShowRecentRequest(false);
            localStorage.setItem(seenKey, 'true');
          }, 3000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [recentRequest]);

  const handleInputChange    = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicFile(file);
      const reader = new FileReader();
      reader.onload = () => setProfilePicPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // ── Compute which fields actually changed ─────────────────────────────────
  const changedFields = () => {
    const changes = {};
    if (isStaff) {
      if (formData.name.trim()     !== originalData.name)     changes.name     = true;
      if (formData.username.trim() !== originalData.username) changes.username = true;
    } else {
      if (formData.name.trim()         !== originalData.name)         changes.name         = true;
      if (formData.phone.trim()        !== originalData.phone)        changes.phone        = true;
      if (formData.city.trim()         !== originalData.city)         changes.city         = true;
      if (formData.theatre_name.trim() !== originalData.theatre_name) changes.theatre_name = true;
    }
    return changes;
  };

  // ── True if anything was actually changed ─────────────────────────────────
  const hasChanges = () => {
    if (profilePicFile) return true;          
    return Object.keys(changedFields()).length > 0;
  };

  const handleSaveClick = () => {
    if (!hasChanges()) {
      toast.error('No changes detected. Please modify at least one field before saving.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('action', 'update_profile');
    data.append('current_password', passwords.current_password);
    data.append('name', formData.name);
    if (isStaff) {
      data.append('username', formData.username);
    } else {
      data.append('phone', formData.phone);
      data.append('city', formData.city);
      data.append('theatre_name', formData.theatre_name);
      data.append('changed_fields', JSON.stringify(Object.keys(changedFields())));
    }
    if (profilePicFile) data.append('profile_pic', profilePicFile);

    const res = await fetch('http://localhost:5000/admin/profile', {
      method: 'POST', credentials: 'include', body: data
    });
    const result = await res.json();
    if (res.ok && result.status === 'success') {
      toast.success(result.message);
      setIsConfirmModalOpen(false);
      setPasswords({ ...passwords, current_password: '' });
      setProfilePicFile(null);
      fetchProfileData();
    } else {
      toast.error(result.message || 'Error updating profile');
      setIsConfirmModalOpen(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new_password === passwords.current_password) {
      toast.error("Don't enter same old password as your new password!"); return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New passwords do not match! Please check again.'); return;
    }
    const data = new FormData();
    data.append('action', 'change_password');
    data.append('current_password', passwords.current_password);
    data.append('new_password', passwords.new_password);
    const res = await fetch('http://localhost:5000/admin/profile', {
      method: 'POST', credentials: 'include', body: data
    });
    const result = await res.json();
    if (res.ok && result.status === 'success') {
      toast.success(result.message);
      setIsPasswordModalOpen(false);
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } else {
      toast.error(result.message || 'Error changing password');
    }
  };

  const userRole = user?.role || '';
  const isStaff  = userRole !== 'theatre_admin';

  /* ── shared helpers ── */
  const alertCls = (type) => {
    const base = 'px-5 py-[15px] rounded-[12px] font-semibold text-[0.95rem] border fade-in';
    if (type === 'success')
      return `${base} bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30`;
    if (type === 'error')
      return `${base} bg-rose-500/15 text-rose-600 border-rose-500/30 dark:bg-[rgba(229,9,20,0.1)] dark:text-[#E50914] dark:border-[rgba(229,9,20,0.3)]`;
    return `${base} bg-amber-500/15 text-amber-600 border-amber-500/30 dark:bg-[rgba(245,197,24,0.1)] dark:text-[#F5C518] dark:border-[rgba(245,197,24,0.3)]`;
  };

  const fieldCls = (fieldName) => {
    const changed = changedFields()[fieldName];
    return `w-full p-3 rounded-[10px] text-base outline-none box-border font-[inherit]
      border ${changed
        ? 'border-indigo-400 dark:border-[#F5C518]'
        : 'border-[#cbd5e1] dark:border-[#333333]'}
      bg-white dark:bg-[#121212]
      text-slate-800 dark:text-white
      placeholder-[#9ea1bc] dark:placeholder-[#666666]
      focus:border-indigo-500 dark:focus:border-[#E50914]
      transition-colors duration-200`;
  };

  const labelCls = `block mb-2 font-semibold text-[0.95rem] text-[#4a4e69] dark:text-[#B3B3B3]`;
  const overlayBase = `fixed inset-0 z-[1000] flex justify-center items-center bg-[rgba(15,23,42,0.6)] dark:bg-black/80 backdrop-blur-[5px]`;
  const cardBase = `relative w-full max-w-[400px] p-[30px] rounded-[20px] bg-white dark:bg-[#1E1E1E] border border-[#e2e8f0] dark:border-[#333333] shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)] slide-up`;
  const saveBtnCls = `w-full py-3 rounded-[10px] font-semibold text-base text-white border-none cursor-pointer transition-all duration-200 bg-gradient-to-br from-indigo-500 to-purple-500 dark:bg-none dark:bg-[#E50914] hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]`;

  const _changed = changedFields();
  const _hasChanges = hasChanges();

  return (
    <main className="p-[30px]">

      {/* PAGE HEADER */}
      <header className="flex justify-between items-center flex-wrap gap-4 mb-[30px]
        px-[30px] py-5 rounded-[20px]
        bg-white/40 dark:bg-[rgba(30,30,30,0.95)]
        backdrop-blur-[10px]
        border border-white/50 dark:border-[#333333]
        shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div>
          <h1 className="text-[1.8rem] font-bold mb-1 text-slate-800 dark:text-white">
            Profile Settings
          </h1>
          <p className="text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Manage your account details and security.
          </p>
        </div>
      </header>

      {/* ALERTS */}
      <div className="max-w-[800px] mx-auto mb-5 flex flex-col gap-[10px]">
        {showRecentRequest && recentRequest && (
          <div className={alertCls(
            recentRequest.status === 'pending' ? 'warning' :
            recentRequest.status === 'approved' ? 'success' : 'error'
          )}>
            {recentRequest.status === 'pending' &&
              `Your recent ${recentRequest.request_type} update is pending staff approval.`}
            {recentRequest.status === 'approved' &&
              `Your ${recentRequest.request_type} update has been approved and applied!`}
            {recentRequest.status === 'declined' &&
              `Your ${recentRequest.request_type} update request was declined.`}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[50vh]
          text-[1.1rem] font-semibold text-slate-500 dark:text-[#a3a3a3] animate-pulse">
          Loading profile...
        </div>
      ) : (

        <div className="max-w-[800px] mx-auto
          bg-white/50 dark:bg-[rgba(30,30,30,0.95)]
          backdrop-blur-[10px] rounded-[20px]
          border border-white/40 dark:border-[#333333]
          p-[30px]
          shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">

          {/* Section heading */}
          <div className="mb-[30px]">
            <h2 className="text-[1.5rem] font-bold mb-1 text-slate-800 dark:text-white">
              Account Information
            </h2>
            <p className="text-[0.95rem] text-[#4a4e69] dark:text-[#B3B3B3]">
              Update your personal details below.
            </p>
          </div>

          {/* PROFILE PICTURE */}
          <div className="flex items-center gap-6 mb-[30px] p-5 rounded-[15px]
            bg-white/30 dark:bg-[#1E1E1E]
            border border-white/50 dark:border-[#333333]">
            <div className="relative w-[100px] h-[100px] flex-shrink-0">
              <img
                src={profilePicPreview || `http://localhost:5000/static/images/admin.png`}
                alt="Profile"
                className="w-full h-full rounded-full object-cover
                  border-4 border-white dark:border-[#E50914]
                  shadow-[0_4px_15px_rgba(0,0,0,0.1)]" />
              <label
                htmlFor="profilePicInput"
                className="absolute bottom-0 right-0 cursor-pointer
                  px-[10px] py-1 rounded-full text-[0.75rem] font-bold
                  text-white border-2 border-white dark:border-[#121212]
                  bg-indigo-500 dark:bg-[#E50914]
                  hover:bg-indigo-600 dark:hover:bg-[#B20710]
                  hover:scale-105 transition-all duration-200">
                Edit
              </label>
              <input type="file" id="profilePicInput" className="hidden"
                accept="image/*" onChange={handlePicUpload} />
            </div>
            <div>
              <h3 className="font-bold mb-1 text-slate-800 dark:text-white">Profile Picture</h3>
              <p className="text-[0.85rem] text-slate-500 dark:text-[#B3B3B3]">
                Upload a new avatar (JPG, PNG). Applied instantly upon save!
              </p>
            </div>
          </div>

          {/* FORM FIELDS — highlight changed fields with coloured border */}
          <div className="mb-5">
            <label className={labelCls}>
              Full Name
              {_changed.name && (
                <span className="ml-2 text-[0.75rem] font-bold px-2 py-0.5 rounded-full
                  bg-indigo-100 text-indigo-600 dark:bg-[rgba(245,197,24,0.15)] dark:text-[#F5C518]">
                  changed
                </span>
              )}
            </label>
            <input type="text" name="name"
              value={formData.name} onChange={handleInputChange} required
              className={fieldCls('name')} />
          </div>

          {isStaff ? (
            <div className="mb-5">
              <label className={labelCls}>
                Username
                {_changed.username && (
                  <span className="ml-2 text-[0.75rem] font-bold px-2 py-0.5 rounded-full
                    bg-indigo-100 text-indigo-600 dark:bg-[rgba(245,197,24,0.15)] dark:text-[#F5C518]">
                    changed
                  </span>
                )}
              </label>
              <input type="text" name="username"
                value={formData.username} onChange={handleInputChange} required
                className={fieldCls('username')} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={labelCls}>
                    Phone Number
                    {_changed.phone && (
                      <span className="ml-2 text-[0.75rem] font-bold px-2 py-0.5 rounded-full
                        bg-indigo-100 text-indigo-600 dark:bg-[rgba(245,197,24,0.15)] dark:text-[#F5C518]">
                        changed
                      </span>
                    )}
                  </label>
                  <input type="text" name="phone"
                    value={formData.phone} onChange={handleInputChange} required
                    className={fieldCls('phone')} />
                </div>
                <div>
                  <label className={labelCls}>
                    City
                    {_changed.city && (
                      <span className="ml-2 text-[0.75rem] font-bold px-2 py-0.5 rounded-full
                        bg-indigo-100 text-indigo-600 dark:bg-[rgba(245,197,24,0.15)] dark:text-[#F5C518]">
                        changed
                      </span>
                    )}
                  </label>
                  <input type="text" name="city"
                    value={formData.city} onChange={handleInputChange} required
                    className={`${fieldCls('city')} capitalize`} />
                </div>
              </div>
              <div className="mb-5">
                <label className={labelCls}>
                  Theatre Name
                  {_changed.theatre_name && (
                    <span className="ml-2 text-[0.75rem] font-bold px-2 py-0.5 rounded-full
                      bg-indigo-100 text-indigo-600 dark:bg-[rgba(245,197,24,0.15)] dark:text-[#F5C518]">
                      changed
                    </span>
                  )}
                </label>
                <input type="text" name="theatre_name"
                  value={formData.theatre_name} onChange={handleInputChange} required
                  className={fieldCls('theatre_name')} />
              </div>
            </>
          )}

          {/* SAVE BUTTON — greyed out if nothing changed */}
          <button
            onClick={handleSaveClick}
            disabled={!_hasChanges}
            className={`mt-[15px] px-[30px] py-3 rounded-[10px] font-semibold text-base text-white
              border-none transition-all duration-200
              ${_hasChanges
                ? 'cursor-pointer bg-gradient-to-br from-indigo-500 to-purple-500 dark:bg-none dark:bg-[#E50914] hover:from-indigo-600 hover:to-purple-600 dark:hover:bg-[#B20710]'
                : 'cursor-not-allowed opacity-40 bg-slate-400 dark:bg-[#444444]'
              }`}>
            {_hasChanges ? 'Save Changes' : 'No Changes'}
          </button>

          {/* Divider */}
          <hr className="border-none h-px my-[35px] bg-black/10 dark:bg-[#333333]" />

          {/* PASSWORD SECTION */}
          <div>
            <h3 className="text-[1.1rem] font-bold mb-2 text-slate-800 dark:text-white">
              Security & Authentication
            </h3>
            <p className="text-[0.95rem] mb-5 text-[#4a4e69] dark:text-[#B3B3B3]">
              Keep your account secure by updating your password regularly.
            </p>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-6 py-3 rounded-[10px] font-semibold cursor-pointer
                transition-all duration-200 border
                bg-slate-800 dark:bg-[#333333]
                text-white
                border-transparent dark:border-[#444444]
                hover:bg-slate-900 dark:hover:bg-[#444444]">
              Change Password
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM PROFILE MODAL */}
      {isConfirmModalOpen && (
        <div className={overlayBase} onClick={() => setIsConfirmModalOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsConfirmModalOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914]
                transition-colors duration-200">✕</span>
            <h2 className="text-[1.3rem] font-bold mb-2 text-slate-800 dark:text-white">
              Confirm Changes
            </h2>
            <p className="mb-5 text-[0.95rem] text-[#4a4e69] dark:text-[#B3B3B3]">
              Please enter your current password to save these updates.
            </p>
            <form onSubmit={handleProfileSubmit}>
              <div className="mb-5">
                <input type="password" name="current_password"
                  placeholder="Current Password"
                  value={passwords.current_password}
                  onChange={handlePasswordChange} required
                  className={fieldCls(null)} />
              </div>
              <button type="submit" className={saveBtnCls}>Confirm & Save</button>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className={overlayBase} onClick={() => setIsPasswordModalOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <span onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914]
                transition-colors duration-200">✕</span>
            <h2 className="text-[1.3rem] font-bold mb-5 text-slate-800 dark:text-white">
              Change Password
            </h2>
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-5">
                <label className={labelCls}>Current Password</label>
                <input type="password" name="current_password"
                  value={passwords.current_password} onChange={handlePasswordChange}
                  required placeholder="Enter current password"
                  className={fieldCls(null)} />
              </div>
              <div className="mb-5">
                <label className={labelCls}>New Password</label>
                <input type="password" name="new_password"
                  value={passwords.new_password} onChange={handlePasswordChange}
                  required placeholder="Enter new password"
                  className={fieldCls(null)} />
              </div>
              <div className="mb-5">
                <label className={labelCls}>Re-enter New Password</label>
                <input type="password" name="confirm_password"
                  value={passwords.confirm_password} onChange={handlePasswordChange}
                  required placeholder="Confirm new password"
                  className={fieldCls(null)} />
              </div>
              <button type="submit" className={saveBtnCls}>Update Password</button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export default Profile;