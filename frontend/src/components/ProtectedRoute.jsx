import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const ProtectedRoute = ({ children, module, action = 'view', theatreAdminOnly = false }) => {
  const { user, loading, canAccess } = useAuth();
  const location = useLocation();

  // ── 1. Still loading auth state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen
        bg-[#f1f5f9] dark:bg-[#121212]">
        <div className="text-sm font-semibold text-slate-500 dark:text-[#B3B3B3]">
          Authenticating…
        </div>
      </div>
    );
  }

  // ── 2. Not logged in ─────────────────────────────────────────────────────
  if (!user) {
    return <Navigate to="/adminlogin" state={{ from: location }} replace />;
  }

  // ── 3. Superadmin — always allow ─────────────────────────────────────────
  if (user.role === 'superadmin') {
    return children;
  }

  // ── 4. Theatre admin ─────────────────────────────────────────────────────
  if (user.role === 'theatre_admin') {
    // Routes marked theatreAdminOnly → allow
    if (theatreAdminOnly) return children;

    // Profile and their own theatre views → allow
    if (
      location.pathname === '/admin/profile' ||
      location.pathname === '/admin/dashboard' ||
      location.pathname === '/admin/theatre_movie_requests' ||
      location.pathname.startsWith('/admin/theatre/')
    ) {
      return children;
    }

    // Everything else → send to their theatre page
    return <Navigate to={`/admin/theatre/view/${user.theatre_id}`} replace />;
  }

  // ── 5. Theatre-admin-only route accessed by staff → deny ─────────────────
  if (theatreAdminOnly) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // ── 6. Routes with no module requirement (profile, theatre views) → allow ─
  if (!module) {
    return children;
  }

  // ── 7. Dynamic permission check — mirrors backend check_perm(module, action)
  if (canAccess(module, action)) {
    return children;
  }

  // ── 8. Permission denied → dashboard ─────────────────────────────────────
  return <Navigate to="/admin/dashboard" replace />;
};

export default ProtectedRoute;