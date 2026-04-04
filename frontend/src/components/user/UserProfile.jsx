import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import toast from 'react-hot-toast';

const API = 'http://localhost:5000';

const UserProfile = () => {
  const { customer, setCustomer, logoutCustomer } = useCustomerAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [profilePicFile, setProfilePicFile]       = useState(null);
  const [isConfirmModalOpen,  setIsConfirmModalOpen]  = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Pre-fill from context immediately — no blank-field flash while API loads
  const [formData, setFormData] = useState({
    name:  customer?.name  || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
  });
  const [originalData, setOriginalData] = useState({
    name:  customer?.name  || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
  });

  const [passwords, setPasswords] = useState({
    current_password: '', new_password: '', confirm_password: ''
  });

  // ── Redirect if not logged in ──────────────────────────────────────────────
  useEffect(() => {
    if (!customer && !loading) {
      toast.error('Please login to view your profile.');
      navigate('/login', { state: { from: '/profile' } });
    }
  }, [customer, loading]);

  // ── Fetch fresh profile data ───────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/api/user/profile`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const u = data.user || {};
        const loaded = {
          name:  u.name  || '',
          phone: u.phone || '',
          email: u.email || '',
        };
        setFormData(loaded);
        setOriginalData(loaded);
        if (u.profile_pic) setProfilePicPreview(`${API}/static/${u.profile_pic}`);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // ── Changed-field detection ────────────────────────────────────────────────
  const changedFields = () => {
    const c = {};
    if (formData.name.trim()  !== originalData.name)  c.name  = true;
    if (formData.phone.trim() !== originalData.phone) c.phone = true;
    if (formData.email.trim() !== originalData.email) c.email = true;
    return c;
  };

  const hasChanges = () => !!profilePicFile || Object.keys(changedFields()).length > 0;
  const _changed   = changedFields();

  const handleInputChange    = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const handlePicUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfilePicFile(file);
    const reader = new FileReader();
    reader.onload = () => setProfilePicPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveClick = () => {
    if (!hasChanges()) {
      toast.error('No changes detected. Please modify at least one field before saving.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  // ── Submit profile update ──────────────────────────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('action',           'update_profile');
    data.append('current_password', passwords.current_password);
    data.append('name',             formData.name);
    data.append('phone',            formData.phone);
    data.append('email',            formData.email);
    if (profilePicFile) data.append('profile_pic', profilePicFile);

    const loadingToast = toast.loading('Saving changes…');
    try {
      const res    = await fetch(`${API}/api/user/profile`, { method: 'POST', credentials: 'include', body: data });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || 'Profile updated!', { id: loadingToast });
        setIsConfirmModalOpen(false);
        setPasswords(p => ({ ...p, current_password: '' }));
        setProfilePicFile(null);
        // Update context so topbar reflects new name/pic/email
        setCustomer(prev => ({
          ...prev,
          name:  formData.name,
          phone: formData.phone,
          email: formData.email,
        }));
        fetchProfile();
      } else {
        toast.error(result.error || 'Failed to update profile.', { id: loadingToast });
        setIsConfirmModalOpen(false);
      }
    } catch {
      toast.error('Server error. Please try again.', { id: loadingToast });
      setIsConfirmModalOpen(false);
    }
  };

  // ── Submit password change ─────────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.new_password === passwords.current_password) {
      toast.error("New password must be different from current password.");
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error("New passwords do not match. Please check again.");
      return;
    }
    const data = new FormData();
    data.append('action',           'change_password');
    data.append('current_password', passwords.current_password);
    data.append('new_password',     passwords.new_password);
    data.append('confirm_password', passwords.confirm_password);

    const loadingToast = toast.loading('Changing password…');
    try {
      const res    = await fetch(`${API}/api/user/profile`, { method: 'POST', credentials: 'include', body: data });
      const result = await res.json();
      if (res.ok) {
        toast.success(result.message || 'Password changed!', { id: loadingToast });
        setIsPasswordModalOpen(false);
        setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        toast.error(result.error || 'Failed to change password.', { id: loadingToast });
      }
    } catch {
      toast.error('Server error. Please try again.', { id: loadingToast });
    }
  };

  const handleLogout = async () => {
    await logoutCustomer();
    toast.success('Logged out successfully.');
    navigate('/');
  };

  // ── Shared style helpers ───────────────────────────────────────────────────
  const fieldCls = (fieldName) => {
    const changed = fieldName && _changed[fieldName];
    return `w-full p-3 rounded-xl text-base outline-none
      border ${changed
        ? 'border-indigo-400 dark:border-amber-400'
        : 'border-slate-200 dark:border-[#333]'}
      bg-white dark:bg-[#121212]
      text-slate-800 dark:text-white
      placeholder-slate-400 dark:placeholder-[#666]
      focus:border-indigo-500 dark:focus:border-[#E50914]
      transition-colors`;
  };

  const labelCls = 'block mb-1.5 font-semibold text-sm text-slate-600 dark:text-[#B3B3B3]';
  const overlayBase = 'fixed inset-0 z-[1000] flex justify-center items-center bg-black/50 backdrop-blur-sm';
  const cardBase = 'relative w-full max-w-[420px] p-8 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#333] shadow-2xl';
  const saveBtnCls = 'w-full py-3 rounded-xl font-bold text-base text-white cursor-pointer transition-all bg-indigo-600 hover:bg-indigo-700 dark:bg-[#E50914] dark:hover:bg-[#B20710]';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="text-slate-400 dark:text-[#B3B3B3] animate-pulse font-semibold">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">

      {/* ── Page Header ── */}
      <div className="mb-8 px-8 py-6 rounded-2xl
        bg-white/60 dark:bg-[#1A1A1A]
        border border-slate-200 dark:border-[#333]
        shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-1">My Profile</h1>
        <p className="text-sm text-slate-500 dark:text-[#B3B3B3]">Manage your personal details and security.</p>
      </div>

      {/* ── Main Card ── */}
      <div className="bg-white dark:bg-[#1A1A1A]
        rounded-2xl border border-slate-200 dark:border-[#333]
        p-8 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">

        {/* ── Profile Picture ── */}
        <div className="flex items-center gap-6 mb-8 p-5 rounded-xl
          bg-slate-50 dark:bg-[#111]
          border border-slate-200 dark:border-[#333]">
          <div className="relative w-24 h-24 flex-shrink-0">
            <img
              src={profilePicPreview || `${API}/static/images/admin.png`}
              alt="Profile"
              className="w-full h-full rounded-full object-cover
                border-4 border-white dark:border-[#E50914]
                shadow-md"
            />
            <label
              htmlFor="userPicInput"
              className="absolute bottom-0 right-0 cursor-pointer
                px-2.5 py-0.5 rounded-full text-xs font-bold
                text-white border-2 border-white dark:border-[#1A1A1A]
                bg-indigo-500 dark:bg-[#E50914]
                hover:scale-105 transition-all">
              Edit
            </label>
            <input type="file" id="userPicInput" className="hidden"
              accept="image/*" onChange={handlePicUpload} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white mb-1">{formData.name || 'Your Name'}</h3>
            <p className="text-sm text-slate-500 dark:text-[#B3B3B3]">{formData.phone}</p>
            <p className="text-xs text-slate-400 dark:text-[#666] mt-0.5">{formData.email}</p>
          </div>
        </div>

        {/* ── Account Info Heading ── */}
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Account Information</h2>
        <p className="text-sm text-slate-500 dark:text-[#B3B3B3] mb-6">Update your personal details below.</p>

        {/* ── Full Name ── */}
        <div className="mb-5">
          <label className={labelCls}>
            Full Name
            {_changed.name && (
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full
                bg-indigo-100 text-indigo-600 dark:bg-amber-400/15 dark:text-amber-400">
                changed
              </span>
            )}
          </label>
          <input type="text" name="name"
            value={formData.name} onChange={handleInputChange}
            className={fieldCls('name')} />
        </div>

        {/* ── Phone Number ── */}
        <div className="mb-5">
          <label className={labelCls}>
            Phone Number
            {_changed.phone && (
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full
                bg-indigo-100 text-indigo-600 dark:bg-amber-400/15 dark:text-amber-400">
                changed
              </span>
            )}
          </label>
          <input type="tel" name="phone" maxLength={10}
            value={formData.phone} onChange={handleInputChange}
            className={fieldCls('phone')} />
          <p className="text-xs text-slate-400 dark:text-[#666] mt-1">
            This is your login number — changing it will update your login credentials.
          </p>
        </div>

        {/* ── Email Address (Now Editable) ── */}
        <div className="mb-8">
          <label className={labelCls}>
            Email Address
            {_changed.email && (
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full
                bg-indigo-100 text-indigo-600 dark:bg-amber-400/15 dark:text-amber-400">
                changed
              </span>
            )}
          </label>
          <input type="email" name="email"
            value={formData.email} onChange={handleInputChange}
            className={fieldCls('email')} />
        </div>

        {/* ── Save Button ── */}
        <button
          onClick={handleSaveClick}
          disabled={!hasChanges()}
          className={`px-8 py-3 rounded-xl font-semibold text-base text-white border-none transition-all
            ${hasChanges()
              ? 'cursor-pointer bg-indigo-600 hover:bg-indigo-700 dark:bg-[#E50914] dark:hover:bg-[#B20710]'
              : 'cursor-not-allowed opacity-40 bg-slate-400 dark:bg-[#444]'}`}>
          {hasChanges() ? 'Save Changes' : 'No Changes'}
        </button>

        {/* ── Divider ── */}
        <hr className="my-8 border-slate-200 dark:border-[#333]" />

        {/* ── Security Section ── */}
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Security & Authentication</h3>
        <p className="text-sm text-slate-500 dark:text-[#B3B3B3] mb-5">
          Keep your account secure by updating your password regularly.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer
              bg-slate-800 dark:bg-[#333] border border-transparent dark:border-[#444]
              hover:bg-slate-900 dark:hover:bg-[#444] transition-colors">
            Change Password
          </button>
          <button
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm cursor-pointer
              bg-rose-50 dark:bg-[rgba(229,9,20,0.1)]
              text-rose-600 dark:text-[#E50914]
              border border-rose-200 dark:border-[rgba(229,9,20,0.3)]
              hover:bg-rose-100 dark:hover:bg-[rgba(229,9,20,0.2)] transition-colors">
            Logout
          </button>
        </div>
      </div>

      {/* ── Confirm Save Modal ── */}
      {isConfirmModalOpen && (
        <div className={overlayBase} onClick={() => setIsConfirmModalOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute top-4 right-5 text-xl font-bold text-slate-400
                hover:text-slate-700 dark:hover:text-white transition-colors bg-transparent border-0 cursor-pointer">
              ✕
            </button>
            <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">Confirm Changes</h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-[#B3B3B3]">
              Enter your current password to save these updates.
            </p>
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
              <input type="password" name="current_password"
                placeholder="Current Password"
                value={passwords.current_password}
                onChange={handlePasswordChange}
                required
                className={fieldCls(null)} />
              <button type="submit" className={saveBtnCls}>Confirm & Save</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {isPasswordModalOpen && (
        <div className={overlayBase} onClick={() => setIsPasswordModalOpen(false)}>
          <div className={cardBase} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-4 right-5 text-xl font-bold text-slate-400
                hover:text-slate-700 dark:hover:text-white transition-colors bg-transparent border-0 cursor-pointer">
              ✕
            </button>
            <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">Change Password</h2>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
              <div>
                <label className={labelCls}>Current Password</label>
                <input type="password" name="current_password"
                  value={passwords.current_password} onChange={handlePasswordChange}
                  required placeholder="Enter current password"
                  className={fieldCls(null)} />
              </div>
              <div>
                <label className={labelCls}>New Password</label>
                <input type="password" name="new_password"
                  value={passwords.new_password} onChange={handlePasswordChange}
                  required placeholder="Enter new password"
                  className={fieldCls(null)} />
              </div>
              <div>
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

    </div>
  );
};

export default UserProfile;