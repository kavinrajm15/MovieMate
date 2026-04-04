import React, { createContext, useState, useContext, useEffect } from 'react';

const CustomerAuthContext = createContext();

const STORAGE_KEY = 'moviemate_customer';

export const CustomerAuthProvider = ({ children }) => {
  // Seed initial state from localStorage so the UI never flickers to "logged out" on refresh
  const [customer, setCustomerState] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  });

  // loading=true only when we haven't yet confirmed with the server
  const [loading, setLoading] = useState(true);

  // Keep localStorage in sync whenever customer changes
  const setCustomer = (user) => {
    setCustomerState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/user/me', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.user); // refresh localStorage with latest data from server
      } else {
        // Server says not logged in — clear any stale cache
        setCustomer(null);
      }
    } catch (error) {
      // Network error: keep cached user so the UI doesn't suddenly log them out
      // (e.g. backend restarting). Don't call setCustomer(null) here.
      console.warn('Auth check failed — keeping cached session.', error);
    } finally {
      setLoading(false);
    }
  };

  const logoutCustomer = async () => {
    try {
      await fetch('http://localhost:5000/api/user/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setCustomer(null); // always clear local state, even if request fails
    }
  };

  return (
    <CustomerAuthContext.Provider value={{ customer, setCustomer, loading, checkAuth, logoutCustomer }}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => useContext(CustomerAuthContext);