import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { RiDashboardHorizontalFill, RiMovie2AiFill } from "react-icons/ri";
import { FaCity, FaBell, FaShieldAlt, FaInbox, FaIdCard, FaUserTie } from "react-icons/fa";
import { FaPeopleGroup } from "react-icons/fa6";
import { BsCameraReelsFill } from "react-icons/bs";
import { CgProfile } from "react-icons/cg";
import { FiLogOut } from "react-icons/fi";
import { MdAddCircleOutline, MdEventSeat, MdAttachMoney } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "./ThemeToggle";

const AdminLayout = () => {
  const { user, logout, canAccess } = useAuth();
  const { theme } = useTheme();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchNotifications = async () => {
    try {
      const res = await fetch(
        "http://localhost:5000/admin/notifications/count",
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setNotificationCount(data.total || 0);
        setNotifications(data.items || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const id = setInterval(fetchNotifications, 60000);
      return () => clearInterval(id);
    }
  }, [user]);

  if (!user) return null;

  const userRole = user?.role || "";
  const isStaff = userRole !== "theatre_admin";

  const toggleNotifications = async () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown && !isStaff && notificationCount > 0) {
      try {
        await fetch("http://localhost:5000/admin/notifications/mark_viewed", {
          method: "POST",
          credentials: "include",
        });
        setNotificationCount(0);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleNotificationItemClick = (item) => {
    setShowDropdown(false);
    if (isStaff) {
      if (item.type === "movie") navigate("/admin/movie_requests");
      else if (item.type === "profile") navigate("/admin/profile_requests");
      else if (item.type === "partner signup")
        navigate("/admin/partner_requests");
    } else {
      if (item.type === "movie") navigate("/admin/theatre_movie_requests");
      else if (item.type === "profile") navigate("/admin/profile");
    }
  };

  const handleLogout = async () => {
    await logout();
    // 🔄 Ensure admins redirect to the dedicated admin login page!
    navigate("/adminlogin", { replace: true });
  };

  const isActive = (...paths) =>
    paths.some(
      (p) => location.pathname === p || location.pathname.startsWith(p + "/"),
    );

  const navItem = (active) =>
    `flex items-center gap-[10px] px-4 py-3 mb-[6px] rounded-[10px] cursor-pointer
     text-[0.95rem] tracking-[0.3px] border transition-all duration-200 select-none
     ${
       active
         ? `bg-gradient-to-r from-[#d946ef] to-[#a855f7]
          dark:from-[#E50914] dark:to-[#B20710]
          text-white font-semibold border-white/20
          shadow-[0_4px_15px_rgba(217,70,239,0.4)]
          dark:shadow-[0_4px_15px_rgba(229,9,20,0.4)]`
         : `text-[#d1d5db] dark:text-[#B3B3B3] font-medium border-transparent
          hover:bg-white/10 hover:text-white hover:translate-x-1`
     }`;

  return (
    <div
      className="flex w-screen h-screen overflow-hidden
       bg-gradient-to-br from-[#e0c3fc] to-[#8ec5fc]
      dark:bg-none dark:bg-[#121212]
      transition-colors duration-300"
    >
      {/* ══ SIDEBAR ══ */}
      <aside
        className="w-[260px] h-screen flex flex-col flex-shrink-0 z-[100]
        bg-gradient-to-b from-[rgba(18,18,18,0.98)] to-[rgba(40,40,40,0.9)]
        dark:from-[#1F1F1F] dark:to-[#121212]
        backdrop-blur-xl text-white
        shadow-[5px_0_25px_rgba(0,0,0,0.4)]
        border-r border-white/[0.08]"
      >
        <div
          className="h-[70px] flex items-center justify-center
          border-b border-white/5 bg-white/[0.02] flex-shrink-0"
        >
          <h2
            className="text-[1.4rem] font-extrabold tracking-[1px]
            bg-gradient-to-r from-[#d946ef] to-[#a855f7]
            dark:from-[#E50914] dark:to-[#B20710]
            bg-clip-text text-transparent"
          >
            MovieMate
          </h2>
        </div>

        <nav className="flex-1 overflow-y-auto py-[15px] px-3">
          <ul className="list-none p-0 m-0">
            {isStaff ? (
              <>
                <li className={navItem(isActive("/admin/dashboard"))} onClick={() => navigate("/admin/dashboard")}>
                  <RiDashboardHorizontalFill /> Dashboard
                </li>
                {canAccess("cities", "view") && (
                  <li className={navItem(isActive("/admin/cities", "/admin/city"))} onClick={() => navigate("/admin/cities")}>
                    <FaCity /> Cities
                  </li>
                )}
                {canAccess("theatres", "view") && (
                  <li className={navItem(isActive("/admin/theatres", "/admin/theatre"))} onClick={() => navigate("/admin/theatres")}>
                    <BsCameraReelsFill /> Theatres
                  </li>
                )}
                {canAccess("movies", "view") && (
                  <li className={navItem(isActive("/admin/movies"))} onClick={() => navigate("/admin/movies")}>
                    <RiMovie2AiFill /> Movies
                  </li>
                )}
                {canAccess("partner_requests", "view") && (
                  <li className={navItem(isActive("/admin/partner_requests"))} onClick={() => navigate("/admin/partner_requests")}>
                    <FaUserTie /> Partner Requests
                  </li>
                )}
                {canAccess("partners", "view") && (
                  <li className={navItem(isActive("/admin/theatre_admins"))} onClick={() => navigate("/admin/theatre_admins")}>
                    <FaPeopleGroup /> Partners
                  </li>
                )}
                {canAccess("movie_requests", "view") && (
                  <li className={navItem(isActive("/admin/movie_requests"))} onClick={() => navigate("/admin/movie_requests")}>
                    <FaInbox /> Movie Requests
                  </li>
                )}
                {canAccess("profile_requests", "view") && (
                  <li className={navItem(isActive("/admin/profile_requests"))} onClick={() => navigate("/admin/profile_requests")}>
                    <FaIdCard /> Profile Requests
                  </li>
                )}
                {canAccess("staff", "view") && (
                  <li className={navItem(isActive("/admin/staff"))} onClick={() => navigate("/admin/staff")}>
                    <FaUserTie /> Manage Staff
                  </li>
                )}
                {canAccess("permissions", "view") && (
                  <li className={navItem(isActive("/admin/permissions"))} onClick={() => navigate("/admin/permissions")}>
                    <FaShieldAlt /> Permissions
                  </li>
                )}
              </>
            ) : (
              <>
                <li className={navItem(isActive("/admin/dashboard"))} onClick={() => navigate("/admin/dashboard")}>
                  <RiDashboardHorizontalFill /> Dashboard
                </li>
                <li className={navItem(isActive("/admin/theatre/view"))} onClick={() => navigate(`/admin/theatre/view/${user?.theatre_id}`)}>
                  <BsCameraReelsFill /> My Schedule
                </li>
                <li className={navItem(isActive("/admin/theatre_movie_requests"))} onClick={() => navigate("/admin/theatre_movie_requests")}>
                  <MdAddCircleOutline /> Request Movie
                </li>
                {/* 🆕 Seat Management & Movie Pricing */}
                <li className={navItem(isActive("/admin/theatre/seats"))} onClick={() => navigate("/admin/theatre/seats")}>
                  <MdEventSeat /> Seat Management
                </li>
                <li className={navItem(isActive("/admin/theatre/pricing"))} onClick={() => navigate("/admin/theatre/pricing")}>
                  <MdAttachMoney /> Movie Pricing
                </li>
              </>
            )}

            <li className={navItem(isActive("/admin/profile"))} onClick={() => navigate("/admin/profile")}>
              <CgProfile /> Profile
            </li>

            <li
              className="flex justify-center items-center gap-[10px]
                mx-[5px] my-[10px] px-3 py-3 rounded-[10px] cursor-pointer font-semibold
                text-[#fda4af] dark:text-[#F5C518]
                border border-[rgba(225,29,72,0.3)] dark:border-[rgba(245,197,24,0.3)]
                bg-[rgba(225,29,72,0.05)] dark:bg-[rgba(245,197,24,0.05)]
                hover:bg-[rgba(225,29,72,0.15)] dark:hover:bg-[#F5C518]
                hover:text-white dark:hover:text-[#121212]
                hover:-translate-y-0.5
                hover:shadow-[0_5px_15px_rgba(225,29,72,0.2)]
                dark:hover:shadow-[0_5px_15px_rgba(245,197,24,0.2)]
                transition-all duration-200 select-none"
              onClick={handleLogout}
            >
              <FiLogOut /> Logout
            </li>
          </ul>
        </nav>
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── TOPBAR ── */}
        <header
          className="h-[70px] flex justify-end items-center px-[30px]
          flex-shrink-0 z-[999] relative
          bg-white/50 dark:bg-[rgba(30,30,30,0.95)]
          backdrop-blur-[15px]
          border-b border-white/40 dark:border-[#333333]
          shadow-[0_4px_15px_rgba(0,0,0,0.02)]
          transition-colors duration-300"
        >
          <div className="flex items-center gap-5">
            <ThemeToggle />

            {/* Notification Bell */}
            <div
              className="relative cursor-pointer flex items-center
              text-[#4a4e69] dark:text-[#B3B3B3] group"
            >
              <div onClick={toggleNotifications} className="flex items-center">
                <FaBell
                  className="text-[1.3rem] transition-colors duration-200
                  group-hover:text-[#d946ef] dark:group-hover:text-[#E50914]"
                />
                {notificationCount > 0 && (
                  <span
                    className="absolute -top-[5px] -right-[6px]
                    bg-[#f43f5e] dark:bg-[#E50914]
                    text-white text-[0.6rem] font-extrabold
                    h-4 w-4 rounded-full flex items-center justify-center
                    shadow-[0_0_10px_rgba(244,63,94,0.4)]
                    dark:shadow-[0_0_10px_rgba(229,9,20,0.4)]"
                  >
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </div>

              {showDropdown && (
                <div
                  className="absolute top-[45px] right-[-10px] w-[320px]
                  bg-white/85 dark:bg-[rgba(30,30,30,0.95)]
                  backdrop-blur-[20px] rounded-[12px]
                  border border-white/50 dark:border-[#333333]
                  z-[1000]
                  shadow-[0_10px_40px_rgba(0,0,0,0.1)]
                  dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)]
                  cursor-default overflow-hidden slide-up"
                >
                  <div className="px-5 py-[15px] border-b border-[rgba(128,128,128,0.2)]">
                    <h4 className="text-base text-slate-800 dark:text-white m-0 font-extrabold">
                      Notifications
                    </h4>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-[25px] py-6 text-center text-[0.9rem] text-[#64748b] m-0">
                        No new notifications
                      </p>
                    ) : (
                      <ul className="list-none p-0 m-0">
                        {notifications.map((n, i) => (
                          <li
                            key={i}
                            className="px-5 py-[15px]
                              border-b border-[rgba(128,128,128,0.1)] last:border-b-0
                              cursor-pointer transition-colors duration-200
                              hover:bg-[rgba(99,102,241,0.08)]
                              dark:hover:bg-[rgba(229,9,20,0.15)]"
                            onClick={() => handleNotificationItemClick(n)}
                          >
                            <div>
                              {isStaff ? (
                                <p
                                  className="text-[0.85rem] text-[#4a4e69] dark:text-[#cccccc]
                                  m-0 mb-[6px] leading-[1.4]"
                                >
                                  <strong className="text-slate-800 dark:text-white">
                                    {n.theatre}
                                  </strong>{" "}
                                  has requested a
                                  <strong className="text-slate-800 dark:text-white">
                                    {n.type === "movie"
                                      ? " movie update"
                                      : n.type === "partner signup"
                                        ? " partner signup"
                                        : " profile change"}
                                  </strong>
                                  .
                                </p>
                              ) : (
                                <p
                                  className="text-[0.85rem] text-[#4a4e69] dark:text-[#cccccc]
                                  m-0 mb-[6px] leading-[1.4]"
                                >
                                  Your{" "}
                                  {n.type === "movie"
                                    ? `movie request (${n.title})`
                                    : "profile request"}{" "}
                                  was{" "}
                                  <strong className="text-slate-800 dark:text-white">
                                    {n.status}
                                  </strong>
                                  .
                                </p>
                              )}
                              <span className="text-[0.7rem] text-[#94a3b8] block">
                                {n.time || "Just now"}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div
              className="flex items-center gap-[10px] cursor-pointer
                pl-[15px] border-l border-[rgba(128,128,128,0.2)]"
              onClick={() => navigate("/admin/profile")}
            >
              <div
                className="w-[38px] h-[38px] rounded-full flex items-center justify-center
                bg-white dark:bg-[#E50914]
                text-[#d946ef] dark:text-white
                font-extrabold text-base overflow-hidden flex-shrink-0
                shadow-[0_0_10px_rgba(217,70,239,0.4)]
                dark:shadow-[0_0_10px_rgba(229,9,20,0.4)]"
              >
                {user?.profile_pic ? (
                  <img
                    src={`http://localhost:5000/static/${user.profile_pic}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                  </span>
                )}
              </div>
              <div>
                <p
                  className="font-bold text-[0.9rem] text-slate-800 dark:text-white
                  capitalize m-0 leading-tight"
                >
                  {user?.name || "Admin"}
                </p>
                <span
                  className="text-[0.65rem] text-[#4a4e69] dark:text-[#B3B3B3]
                  uppercase font-bold block mt-[1px]"
                >
                  {userRole.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Outlet */}
        <div className="flex-1 overflow-y-auto">
          <Outlet context={{ user, fetchNotifications }} />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;