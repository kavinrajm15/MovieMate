import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API = 'http://localhost:5000';

export const MODULE_ROUTES = {
  cities:           '/admin/cities',
  theatres:         '/admin/theatres',
  movies:           '/admin/movies',
  staff:            '/admin/staff',
  partners:         '/admin/theatre_admins',
  profile_requests: '/admin/profile_requests',
  partner_requests: '/admin/partner_requests',
  movie_requests:   '/admin/movie_requests',
  permissions:      '/admin/permissions',
};

async function fetchPermsFromServer() {
  try {
    const res = await fetch(`${API}/admin/my-permissions`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      return data.permissions || {};
    }
  } catch { /* ignore */ }
  return {};
}

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/admin`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        if (data.isLoggedIn) {
          setUser(data.user);
          if (data.user?.role === 'superadmin') {
            setPermissions('superadmin');
          } else {
            setPermissions(await fetchPermsFromServer());
          }
        } else {
          setUser(null);
          setPermissions({});
        }
      } catch {
        setUser(null);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Poll permissions every 10 seconds so changes apply instantly without refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!user || user.role === 'superadmin') return;
      const perms = await fetchPermsFromServer();
      setPermissions(perms);
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const login = async (userData) => {
    setUser(userData);
    if (userData?.role === 'superadmin') {
      setPermissions('superadmin');
    } else {
      setPermissions(await fetchPermsFromServer());
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API}/admin/logout`, {
        credentials: 'include',
      });
    } catch { /* ignore */ }
    setUser(null);
    setPermissions({});
  };

  // canAccess('cities', 'view') → true/false
  const canAccess = (moduleKey, action = 'view') => {
    if (!user) return false;
    if (user.role === 'superadmin' || permissions === 'superadmin') return true;
    return !!permissions?.[moduleKey]?.[action];
  };

  // canViewRoute('/admin/cities') — used by ProtectedRoute & sidebar
  const canViewRoute = (path) => {
    if (!user) return false;
    if (user.role === 'superadmin' || permissions === 'superadmin') return true;
    if (path === '/admin/dashboard' || path === '/admin/profile') return true;
    if (user.role === 'theatre_admin') {
      return path.startsWith('/admin/theatre/') || path === '/admin/theatre_movie_requests';
    }
    for (const [mod, route] of Object.entries(MODULE_ROUTES)) {
      if (path === route || path.startsWith(route + '/')) {
        return !!permissions?.[mod]?.view;
      }
    }
    if (path.startsWith('/admin/city/'))    return !!permissions?.cities?.view;
    if (path.startsWith('/admin/theatre/')) return !!permissions?.theatres?.view;
    return false;
  };

  const refreshPermissions = async () => {
    if (!user || user.role === 'superadmin') return;
    const perms = await fetchPermsFromServer();
    setPermissions(perms);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, canAccess, canViewRoute, refreshPermissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}