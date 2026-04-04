import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; 
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext'; 

// Admin & Staff Components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Cities from './components/Cities';
import Theatres from './components/Theatres';
import Movies from './components/Movies';
import AdminLayout from './components/AdminLayout';
import ManageStaff from './components/ManageStaff';
import ProtectedRoute from './components/ProtectedRoute';
import Permissions from './components/Permissions';
import Profile from './components/Profile';
import Signup from './components/Signup';
import Partners from './components/Partners';
import PartnerRequests from './components/PartnerRequests';
import ProfileRequests from './components/ProfileRequests';
import MovieRequests from './components/MovieRequests';
import TheatreView from './components/TheatreView';
import TheatreShowtimes from './components/TheatreShowtimes';
import TheatreMovieRequests from './components/TheatreMovieRequests';
import CityTheatres from './components/CityTheatres';
import SeatManagement from './components/SeatManagement';
import MoviePricing from './components/MoviePricing';

// User (Customer) Components
import Userlayout from './components/user/Userlayout';
import Home from './components/user/Userhome';
import Usermovies from './components/user/Usermovies';
import Usersearchresults from './components/user/Usersearchresults';
import Usertheatres from './components/user/Usertheatres';
import Usertheatreview from './components/user/Usertheatreview';
import UserLogin from './components/user/UserLogin';         
import UserSignup from './components/user/UserSignup';       
import UserSeatBooking from './components/user/UserSeatBooking';
import UserProfile from './components/user/UserProfile';
import UserTickets from './components/user/UserTickets';

const RootRedirect = () => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/adminlogin" replace />; // 🔄 Redirects admins to new login URL
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* 🆕 Wrap with Customer Auth */}
        <CustomerAuthProvider>
          <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#121212] text-slate-800 dark:text-[#E0E0E0] transition-colors duration-300">
            
            {/* 🆕 Global Toaster for notifications */}
            <Toaster 
              position="top-right" 
              reverseOrder={false} 
              toastOptions={{
                className: 'dark:bg-[#1E1E1E] dark:text-white dark:border dark:border-[#333]',
                duration: 3000,
              }}
            />

            <BrowserRouter>
              <Routes>
                
                {/* ── CUSTOMER ROUTES (Public) ── */}
                <Route element={<Userlayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/movies" element={<Usermovies />} />
                  <Route path="/search" element={<Usersearchresults />} />
                  <Route path="/theatres" element={<Usertheatres />} />
                  <Route path="/theatre/:theatreId" element={<Usertheatreview />} />
                  
                  {/* 🆕 New Customer Auth & Booking */}
                  <Route path="/login"   element={<UserLogin />} />
                  <Route path="/signup"  element={<UserSignup />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/book/:showtimeId" element={<UserSeatBooking />} />
                  <Route path="/my-tickets" element={<UserTickets />} />
                </Route>

                {/* ── ADMIN / PARTNER PUBLIC ROUTES ── */}
                <Route path="/adminlogin" element={<Login />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/partner-signup" element={<Signup />} />

                {/* Root Redirect for Admins */}
                <Route path="/admin" element={<RootRedirect />} />

                {/* ── PROTECTED ADMIN ROUTES ── */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  {/* Dashboard - Visible to all logged-in staff/admins based on role */}
                  <Route path="dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />

                  {/* ── Superadmin & specific Staff only ──────────────────────── */}
                  <Route path="cities" element={
                    <ProtectedRoute module="cities">
                      <Cities />
                    </ProtectedRoute>
                  } />
                  <Route path="city/:city/theatres" element={
                    <ProtectedRoute module="cities">
                      <CityTheatres />
                    </ProtectedRoute>
                  } />
                  <Route path="theatres" element={
                    <ProtectedRoute module="theatres">
                      <Theatres />
                    </ProtectedRoute>
                  } />
                  <Route path="movies" element={
                    <ProtectedRoute module="movies">
                      <Movies />
                    </ProtectedRoute>
                  } />
                  {/* ── #5 Fix: Partners route was missing ── */}
                  <Route path="theatre_admins" element={
                    <ProtectedRoute module="partners">
                      <Partners />
                    </ProtectedRoute>
                  } />
                  <Route path="partner_requests" element={
                    <ProtectedRoute module="partner_requests">
                      <PartnerRequests />
                    </ProtectedRoute>
                  } />
                  <Route path="movie_requests" element={
                    <ProtectedRoute module="movie_requests">
                      <MovieRequests />
                    </ProtectedRoute>
                  } />
                  <Route path="profile_requests" element={
                    <ProtectedRoute module="profile_requests">
                      <ProfileRequests />
                    </ProtectedRoute>
                  } />
                  <Route path="staff" element={
                    <ProtectedRoute module="staff">
                      <ManageStaff />
                    </ProtectedRoute>
                  } />
                  <Route path="permissions" element={
                    <ProtectedRoute module="permissions">
                      <Permissions />
                    </ProtectedRoute>
                  } />

                  {/* ── Theatre admin only ───────────────────────────────────── */}
                  <Route path="theatre/view/:theatre_id" element={
                    <ProtectedRoute module="theatres">
                      <TheatreView />
                    </ProtectedRoute>
                  } />
                  {/* ── #4 Fix: restored movie_id param — TheatreShowtimes & TheatreView use it ── */}
                  <Route path="theatre/:theatre_id/movie/:movie_id" element={
                    <ProtectedRoute module="theatres">
                      <TheatreShowtimes />
                    </ProtectedRoute>
                  } />
                  <Route path="theatre_movie_requests" element={
                    <ProtectedRoute theatreAdminOnly>
                      <TheatreMovieRequests />
                    </ProtectedRoute>
                  } />
                  <Route path="theatre/seats" element={
                    <ProtectedRoute theatreAdminOnly>
                      <SeatManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="theatre/pricing" element={
                    <ProtectedRoute theatreAdminOnly>
                      <MoviePricing />
                    </ProtectedRoute>
                  } />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </div>
        </CustomerAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;