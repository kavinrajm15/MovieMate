import React, { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { FaShieldAlt, FaUserShield, FaRedo } from "react-icons/fa";
import { MdAdminPanelSettings } from "react-icons/md";

const API = "http://localhost:5000";

const PERM_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    actions: [
      "total_movies",
      "total_theatres",
      "top_cities",
      "top_showtimes",
      "total_income",
      "ticket_sales_count",
      "ticket_sales_graph",
      "transactions",
    ],
    groups: [
      {
        label: "Stat Cards",
        actions: [
          "total_income",
          "ticket_sales_count",
          "total_movies",
          "total_theatres",
        ],
      },
      {
        label: "Charts",
        actions: ["top_cities", "top_showtimes", "ticket_sales_graph"],
      },
      { label: "Table", actions: ["transactions"] },
    ],
  },
  { key: "cities", label: "Cities", actions: ["view", "add", "delete"] },
  { key: "theatres", label: "Theatres", actions: ["view", "add", "delete"] },
  {
    key: "movies",
    label: "Movies",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    key: "staff",
    label: "Staff",
    actions: ["view", "add", "assign", "delete"],
  },
  { key: "partners", label: "Partners", actions: ["view", "delete"] },
  {
    key: "profile_requests",
    label: "Profile Requests",
    actions: ["view", "edit"],
  },
  {
    key: "partner_requests",
    label: "Partner Requests",
    actions: ["view", "edit"],
  },
  { key: "movie_requests", label: "Movie Requests", actions: ["view", "edit"] },
  { key: "permissions", label: "Permissions", actions: ["view"] },
  {
    key: "showtime",
    label: "Showtime",
    actions: ["add", "edit", "delete"],
    actionLabels: {
      add: "Add Showtime",
      edit: "Edit Showtime",
      delete: "Delete Showtime",
    },
  },
];

const ACTION_LABELS = {
  view: "View",
  add: "Create",
  edit: "Update",
  delete: "Delete",
  assign: "Assign",
  // Dashboard — Stat Cards
  total_income: "Revenue Card",
  ticket_sales_count: "Ticket Sales Card",
  total_movies: "Active Movies Card",
  total_theatres: "Theatres Card",
  // Dashboard — Charts
  top_cities: "Movies by City Chart",
  top_showtimes: "Popular Showtimes Chart",
  ticket_sales_graph: "Sales Trend & Top Movies",
  // Dashboard — Table
  transactions: "Recent Transactions Table",
};

function buildEmpty() {
  const p = {};
  PERM_MODULES.forEach((m) => {
    p[m.key] = {
      view: false,
      add: false,
      edit: false,
      delete: false,
      assign: false,
      total_movies: false,
      total_theatres: false,
      top_cities: false,
      top_showtimes: false,
      total_income: false,
      ticket_sales_count: false,
      ticket_sales_graph: false,
      transactions: false,
    };
  });
  p["showtime"] = { add: false, edit: false, delete: false };
  return p;
}

function buildFull() {
  const p = {};
  PERM_MODULES.forEach((m) => {
    p[m.key] = {
      view: true,
      add: true,
      edit: true,
      delete: true,
      assign: true,
      total_movies: true,
      total_theatres: true,
      top_cities: true,
      top_showtimes: true,
      total_income: true,
      ticket_sales_count: true,
      ticket_sales_graph: true,
      transactions: true,
    };
  });
  p["showtime"] = { add: true, edit: true, delete: true };
  return p;
}

/* ════════════════════════════════════════════
   MODULE CARD
════════════════════════════════════════════ */
function ModuleCard({ mod, perms, onChange, readOnly }) {
  const allOn = mod.actions.every((a) => perms[mod.key]?.[a]);
  const someOn = mod.actions.some((a) => perms[mod.key]?.[a]);
  // Per-module label overrides, fall back to global ACTION_LABELS
  const getLabel = (action) =>
    mod.actionLabels?.[action] || ACTION_LABELS[action] || action;

  const toggleAll = () => {
    const next = !allOn;
    const updated = { ...perms[mod.key] };
    mod.actions.forEach((a) => {
      updated[a] = next;
    });
    onChange(mod.key, updated);
  };

  return (
    <div
      className="rounded-[14px] overflow-hidden
      bg-white/80 dark:bg-[#1E1E1E]
      border border-[#e2e8f0] dark:border-[#333333]
      shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]
      transition-all duration-200
      hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)] dark:hover:shadow-[0_6px_18px_rgba(0,0,0,0.4)]"
    >
      {/* Card Header */}
      <div
        className="flex items-center justify-between px-4 py-[12px]
        bg-[rgba(99,102,241,0.05)] dark:bg-[#161616]
        border-b border-[#e8eaf6] dark:border-[#2a2a2a]"
      >
        <div className="flex items-center gap-[10px]">
          <span
            className={`w-[8px] h-[8px] rounded-full flex-shrink-0 transition-colors duration-200
            ${
              allOn
                ? "bg-indigo-500 dark:bg-[#E50914] shadow-[0_0_6px_rgba(99,102,241,0.5)] dark:shadow-[0_0_6px_rgba(229,9,20,0.5)]"
                : someOn
                  ? "bg-amber-400"
                  : "bg-slate-300 dark:bg-[#444]"
            }`}
          />
          <span className="font-bold text-[0.875rem] text-slate-700 dark:text-[#e2e8f0]">
            {mod.label}
          </span>
        </div>
        {!readOnly && (
          <button
            onClick={toggleAll}
            className={`px-[10px] py-[4px] rounded-[7px] text-[0.75rem] font-bold
              border cursor-pointer transition-all duration-200
              ${
                allOn
                  ? `bg-gradient-to-br from-indigo-500 to-purple-500
                   dark:from-[#E50914] dark:to-[#E50914]
                   text-white border-transparent`
                  : `bg-transparent
                   border-[#cbd5e1] dark:border-[#333333]
                   text-slate-500 dark:text-[#B3B3B3]
                   hover:border-indigo-400 dark:hover:border-[#E50914]
                   hover:text-indigo-600 dark:hover:text-[#E50914]`
              }`}
          >
            {allOn ? "All On" : "Toggle"}
          </button>
        )}
      </div>

      {/* Checkboxes — grouped if mod.groups defined, flat list otherwise */}
      <div className="px-4 py-[14px] flex flex-col gap-[11px]">
        {mod.groups
          ? mod.groups.map((group) => (
              <div key={group.label} className="mb-1">
                {/* Sub-section label */}
                <div className="flex items-center gap-2 mb-[8px] mt-[2px]">
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400 dark:text-[#555]">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-[#2a2a2a]" />
                </div>
                <div className="flex flex-col gap-[10px]">
                  {group.actions.map((action) => (
                    <label
                      key={action}
                      className={`flex items-center gap-[10px] select-none
                      ${readOnly ? "cursor-default opacity-60" : "cursor-pointer group"}`}
                    >
                      <input
                        type="checkbox"
                        checked={!!perms[mod.key]?.[action]}
                        onChange={() => {
                          if (readOnly) return;
                          onChange(mod.key, {
                            ...perms[mod.key],
                            [action]: !perms[mod.key]?.[action],
                          });
                        }}
                        disabled={readOnly}
                        className="w-4 h-4 rounded flex-shrink-0
                        accent-indigo-500 dark:accent-[#E50914] cursor-pointer"
                      />
                      <span
                        className="text-[0.85rem] font-medium
                      text-slate-600 dark:text-[#94a3b8]
                      group-hover:text-slate-800 dark:group-hover:text-white
                      transition-colors duration-150"
                      >
                        {getLabel(action)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          : mod.actions.map((action) => (
              <label
                key={action}
                className={`flex items-center gap-[10px] select-none
                ${readOnly ? "cursor-default opacity-60" : "cursor-pointer group"}`}
              >
                <input
                  type="checkbox"
                  checked={!!perms[mod.key]?.[action]}
                  onChange={() => {
                    if (readOnly) return;
                    onChange(mod.key, {
                      ...perms[mod.key],
                      [action]: !perms[mod.key]?.[action],
                    });
                  }}
                  disabled={readOnly}
                  className="w-4 h-4 rounded flex-shrink-0
                  accent-indigo-500 dark:accent-[#E50914] cursor-pointer"
                />
                <span
                  className="text-[0.85rem] font-medium
                text-slate-600 dark:text-[#94a3b8]
                group-hover:text-slate-800 dark:group-hover:text-white
                transition-colors duration-150"
                >
                  {getLabel(action)}
                </span>
              </label>
            ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   ROLE BADGE
════════════════════════════════════════════ */
function RoleBadge({ role }) {
  const base =
    "px-3 py-[5px] rounded-full text-[0.78rem] font-bold capitalize border inline-block";
  if (role === "superadmin")
    return (
      <span
        className={`${base} bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30`}
      >
        {role}
      </span>
    );
  if (role === "manager")
    return (
      <span
        className={`${base} bg-[rgba(99,102,241,0.15)] text-indigo-600 border-[rgba(99,102,241,0.3)] dark:bg-[rgba(229,9,20,0.1)] dark:text-[#E50914] dark:border-[rgba(229,9,20,0.3)]`}
      >
        {role}
      </span>
    );
  return (
    <span
      className={`${base} bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:bg-[rgba(245,197,24,0.1)] dark:text-[#F5C518] dark:border-[rgba(245,197,24,0.3)]`}
    >
      {role.replace(/_/g, " ")}
    </span>
  );
}

/* ════════════════════════════════════════════
   USERS TAB
════════════════════════════════════════════ */
function UsersTab({ currentUser }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [perms, setPerms] = useState(buildEmpty());
  const [hasCustom, setHasCustom] = useState(false);
  const [visibleMods, setVisibleMods] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/admin/permissions-staff-list`, {
        credentials: "include",
      });
      if (res.ok) {
        const d = await res.json();
        const sorted = (d.staff || []).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
        setStaffList(sorted);
      }
    })();
  }, []);

  const loadPerms = useCallback(
    async (staffId) => {
      if (!staffId) return;
      setLoading(true);
      const staff = staffList.find((x) => x.staff_id === Number(staffId));
      setSelectedStaff(staff || null);
      try {
        const [permRes, visRes] = await Promise.all([
          fetch(`${API}/admin/permissions/${staffId}`, {
            credentials: "include",
          }),
          staff?.role
            ? fetch(`${API}/admin/roles/${staff.role}/visible-modules`, {
                credentials: "include",
              })
            : Promise.resolve(null),
        ]);
        if (permRes.ok) {
          const d = await permRes.json();
          setPerms({ ...buildEmpty(), ...d.permissions });
          setHasCustom(d.has_custom === true);
        }
        if (visRes && visRes.ok) {
          const v = await visRes.json();
          setVisibleMods(v.visible_modules || {});
        } else {
          // Default: all visible
          setVisibleMods(
            Object.fromEntries(PERM_MODULES.map((m) => [m.key, true])),
          );
        }
      } catch (e) {}
      setLoading(false);
    },
    [staffList],
  );

  const handleSelect = (e) => {
    setSelectedId(e.target.value);
    setSaved(false);
    loadPerms(e.target.value);
  };

  const handleChange = (modKey, updated) => {
    setPerms((prev) => ({ ...prev, [modKey]: updated }));
    setSaved(false);
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/permissions/${selectedId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: perms }),
      });
      if (res.ok) {
        setSaved(true);
        setHasCustom(true); // now has custom perms
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {}
    setSaving(false);
  };

  const resetToRoleDefaults = async () => {
    if (!selectedId) return;
    if (
      !window.confirm(
        `Reset ${selectedStaff?.name}'s permissions back to their role (${selectedStaff?.role}) defaults?`,
      )
    )
      return;
    setResetting(true);
    try {
      const res = await fetch(
        `${API}/admin/permissions/${selectedId}/reset-to-role`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (res.ok) {
        setHasCustom(false);
        await loadPerms(selectedId);
      }
    } catch (e) {}
    setResetting(false);
  };

  return (
    <div>
      {/* Select User Box */}
      <div
        className="mb-6 px-[26px] py-5 rounded-[16px]
        bg-white/80 dark:bg-[#1E1E1E]
        border border-[#e2e8f0] dark:border-[#333333]
        shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
      >
        <label
          className="block mb-2 font-bold text-[0.82rem] uppercase tracking-wide
          text-slate-500 dark:text-[#B3B3B3]"
        >
          Select User
        </label>
        <select
          value={selectedId}
          onChange={handleSelect}
          className="w-full max-w-[420px] px-4 py-3 rounded-[10px] text-[0.9rem]
            outline-none cursor-pointer
            border border-[#cbd5e1] dark:border-[#333333]
            bg-white dark:bg-[#121212]
            text-slate-800 dark:text-white
            transition-all duration-200
            focus:border-indigo-500 dark:focus:border-[#E50914]
            focus:shadow-[0_0_10px_rgba(99,102,241,0.15)] dark:focus:shadow-[0_0_10px_rgba(229,9,20,0.15)]"
        >
          <option value="">— Select a user —</option>
          {staffList.map((s) => (
            <option key={s.staff_id} value={s.staff_id}>
              {s.name} ({s.role.replace(/_/g, " ")})
            </option>
          ))}
        </select>
      </div>

      {/* Content area */}
      {!selectedId ? (
        <div className="py-16 flex flex-col items-center gap-3 text-slate-400 dark:text-[#555]">
          <FaUserShield className="text-[2.5rem] opacity-30" />
          <p className="text-[0.9rem] font-medium">
            Select a user above to manage their permissions.
          </p>
        </div>
      ) : loading ? (
        <div
          className="py-12 text-center text-[0.9rem] font-semibold
          text-slate-500 dark:text-[#a3a3a3] animate-pulse"
        >
          Loading permissions...
        </div>
      ) : selectedStaff?.role === "superadmin" ? (
        <div
          className="px-6 py-5 rounded-[14px] text-[0.875rem] font-medium leading-relaxed
          bg-amber-50 dark:bg-amber-500/[0.07]
          border border-amber-200 dark:border-amber-500/20
          text-amber-700 dark:text-[#fcd34d]"
        >
          Superadmin has unrestricted access to all modules. Permissions cannot
          be modified.
        </div>
      ) : (
        <>
          {/* User info row */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center
                text-white font-bold text-[1rem] flex-shrink-0
                bg-gradient-to-br from-indigo-500 to-purple-500
                dark:from-[#E50914] dark:to-[#B20710]"
              >
                {selectedStaff?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-[0.95rem] mb-[3px] text-slate-800 dark:text-white">
                  {selectedStaff?.name}
                </div>
                <RoleBadge role={selectedStaff?.role || ""} />
              </div>

              {/* Status badge — custom vs role defaults */}
              {!hasCustom ? (
                <span
                  className="px-3 py-[5px] rounded-full text-[0.75rem] font-bold border
                  bg-sky-100 text-sky-600 border-sky-300
                  dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30"
                >
                  Using role defaults
                </span>
              ) : (
                <span
                  className="px-3 py-[5px] rounded-full text-[0.75rem] font-bold border
                  bg-indigo-100 text-indigo-600 border-indigo-300
                  dark:bg-[rgba(99,102,241,0.1)] dark:text-[#818cf8] dark:border-[rgba(99,102,241,0.3)]"
                >
                  Custom permissions
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Reset to role defaults — only shown when custom perms exist */}
              {hasCustom && (
                <button
                  onClick={resetToRoleDefaults}
                  disabled={resetting}
                  className="flex items-center gap-[7px] px-4 py-[9px] rounded-[10px]
                    font-semibold text-[0.82rem] cursor-pointer transition-all duration-200
                    border border-amber-300 dark:border-amber-500/40
                    bg-amber-50 dark:bg-amber-500/10
                    text-amber-600 dark:text-amber-400
                    hover:bg-amber-100 dark:hover:bg-amber-500/20
                    disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FaRedo
                    className={`text-[0.8rem] ${resetting ? "animate-spin" : ""}`}
                  />
                  {resetting ? "Resetting..." : "Reset to Role Defaults"}
                </button>
              )}

              <button
                onClick={save}
                disabled={saving}
                className={`px-[22px] py-[9px] rounded-[10px] border-none font-bold text-[0.85rem]
                  text-white cursor-pointer transition-all duration-200 min-w-[140px]
                  disabled:opacity-65 disabled:cursor-not-allowed hover:-translate-y-px
                  ${
                    saved
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                      : `bg-gradient-to-br from-indigo-500 to-purple-500
                       dark:from-[#E50914] dark:to-[#E50914]
                       hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
                       dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]`
                  }`}
              >
                {saving ? "Saving..." : saved ? "✓ Saved" : "Save Permissions"}
              </button>
            </div>
          </div>

          {/* Module cards grid — filtered by role's visible_modules setting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERM_MODULES.filter((mod) => visibleMods[mod.key] !== false).map(
              (mod) => (
                <ModuleCard
                  key={mod.key}
                  mod={mod}
                  perms={perms}
                  onChange={handleChange}
                  readOnly={false}
                />
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   EDIT ROLE TABS (Permissions + Visibility)
════════════════════════════════════════════ */
function EditRoleTabs({
  editRole,
  editPerms,
  editVisible,
  setEditPerms,
  setEditVisible,
  setEditSaved,
}) {
  const [subTab, setSubTab] = useState("permissions");
  const isSuperadmin = editRole.role_name === "superadmin";

  const MODULE_LABELS = {
    cities: "Cities",
    theatres: "Theatres",
    movies: "Movies",
    staff: "Staff",
    partners: "Partners",
    profile_requests: "Profile Requests",
    partner_requests: "Partner Requests",
    movie_requests: "Movie Requests",
    permissions: "Permissions",
    showtime: "Showtime",
  };

  const subTabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setSubTab(id)}
      className={`px-5 py-[8px] rounded-full text-[0.82rem] font-bold cursor-pointer border
        transition-all duration-200 select-none
        ${
          subTab === id
            ? "bg-gradient-to-br from-indigo-500 to-purple-500 dark:from-[#E50914] dark:to-[#E50914] text-white border-transparent shadow-[0_3px_10px_rgba(99,102,241,0.3)] dark:shadow-[0_3px_10px_rgba(229,9,20,0.3)]"
            : "bg-white/60 dark:bg-transparent border-white/60 dark:border-[#333333] text-slate-500 dark:text-[#94a3b8] hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-[#E50914] dark:hover:text-[#E50914]"
        }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Sub-tab switcher */}
      <div className="flex items-center gap-2 mb-5">
        {subTabBtn("permissions", "🔐 Default Permissions")}
        {subTabBtn("visibility", "👁 Module Visibility")}
      </div>

      {subTab === "permissions" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PERM_MODULES.map((mod) => (
            <ModuleCard
              key={mod.key}
              mod={mod}
              perms={editPerms}
              onChange={(k, v) => {
                setEditPerms((p) => ({ ...p, [k]: v }));
                setEditSaved(false);
              }}
              readOnly={isSuperadmin}
            />
          ))}
        </div>
      ) : (
        <div>
          <p className="text-[0.82rem] text-[#4a4e69] dark:text-[#B3B3B3] mb-4">
            Choose which modules are{" "}
            <strong className="text-slate-700 dark:text-[#e2e8f0]">
              visible
            </strong>{" "}
            in the Permission editor for users with this role. Hidden modules
            won't appear when managing their individual permissions.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PERM_MODULES.map((mod) => {
              const isVisible = editVisible[mod.key] !== false;
              return (
                <div
                  key={mod.key}
                  onClick={() => {
                    if (isSuperadmin) return;
                    setEditVisible((v) => ({ ...v, [mod.key]: !isVisible }));
                    setEditSaved(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-[12px]
                    border cursor-pointer transition-all duration-200 select-none
                    ${isSuperadmin ? "opacity-60 cursor-default" : ""}
                    ${
                      isVisible
                        ? "bg-indigo-50 dark:bg-[rgba(229,9,20,0.07)] border-indigo-200 dark:border-[rgba(229,9,20,0.25)]"
                        : "bg-white/60 dark:bg-[#1a1a1a] border-[#e2e8f0] dark:border-[#333]"
                    }`}
                >
                  <div className="flex items-center gap-[10px]">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0
                      ${isVisible ? "bg-indigo-500 dark:bg-[#E50914]" : "bg-slate-300 dark:bg-[#444]"}`}
                    />
                    <span
                      className={`font-semibold text-[0.875rem]
                      ${isVisible ? "text-slate-800 dark:text-white" : "text-slate-400 dark:text-[#555]"}`}
                    >
                      {MODULE_LABELS[mod.key] || mod.key}
                    </span>
                  </div>
                  <span
                    className={`text-[0.75rem] font-bold px-2 py-[3px] rounded-full
                    ${
                      isVisible
                        ? "bg-indigo-100 dark:bg-[rgba(229,9,20,0.15)] text-indigo-600 dark:text-[#E50914]"
                        : "bg-slate-100 dark:bg-[#2a2a2a] text-slate-400 dark:text-[#555]"
                    }`}
                  >
                    {isVisible ? "Visible" : "Hidden"}
                  </span>
                </div>
              );
            })}
          </div>
          {isSuperadmin && (
            <div
              className="mt-4 px-5 py-3 rounded-[12px] text-[0.82rem] font-medium
              bg-amber-50 dark:bg-amber-500/[0.07] border border-amber-200 dark:border-amber-500/20
              text-amber-700 dark:text-[#fcd34d]"
            >
              Superadmin sees all modules. Visibility cannot be restricted.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   ROLES TAB
════════════════════════════════════════════ */
function RolesTab({ currentUser }) {
  const isSuperadmin = currentUser?.role === "superadmin";
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState(null);
  const [editPerms, setEditPerms] = useState(buildEmpty());
  const [editVisible, setEditVisible] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editSaved, setEditSaved] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [addError, setAddError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/roles`, {
        credentials: "include",
      });
      if (res.ok) {
        const d = await res.json();
        setRoles(d.roles || []);
      }
    } catch (e) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const buildDefaultVisible = () =>
    Object.fromEntries(PERM_MODULES.map((m) => [m.key, true]));

  const openEdit = (role) => {
    setEditRole(role);
    if (role.role_name === "superadmin") {
      setEditPerms(buildFull());
    } else {
      setEditPerms({ ...buildEmpty(), ...role.permissions });
    }
    setEditVisible({
      ...buildDefaultVisible(),
      ...(role.visible_modules || {}),
    });
    setEditSaved(false);
  };

  const saveEditRole = async () => {
    if (!editRole) return;
    setEditSaving(true);
    try {
      const res = await fetch(`${API}/admin/roles/${editRole.role_name}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: editPerms,
          visible_modules: editVisible,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setEditSaved(d.message || "Saved");
        setTimeout(() => setEditSaved(false), 3000);
        fetchRoles();
      }
    } catch (e) {}
    setEditSaving(false);
  };

  const handleAddRole = async () => {
    setAddError("");
    const name = newRoleName.trim();
    if (!name) {
      setAddError("Role name is required");
      return;
    }
    try {
      const res = await fetch(`${API}/admin/roles/add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_name: name, permissions: buildEmpty() }),
      });
      const d = await res.json();
      if (res.ok) {
        setAddModal(false);
        setNewRoleName("");
        fetchRoles();
      } else setAddError(d.error || "Failed to create role");
    } catch (e) {
      setAddError("Network error");
    }
  };

  const handleDeleteRole = async (roleName) => {
    setDeleteError("");
    if (!window.confirm(`Delete role "${roleName}"? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`${API}/admin/roles/${roleName}/delete`, {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json();
      if (res.ok) fetchRoles();
      else setDeleteError(d.error || "Failed to delete");
    } catch (e) {}
  };

  /* ── Role edit view ── */
  if (editRole) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditRole(null)}
              className="px-4 py-2 rounded-[10px] font-semibold text-[0.85rem] cursor-pointer
                border border-[#cbd5e1] dark:border-[#333333]
                bg-white dark:bg-transparent
                text-slate-500 dark:text-[#94a3b8]
                hover:bg-slate-100 dark:hover:bg-[#1a1a1a]
                hover:text-slate-700 dark:hover:text-[#e2e8f0]
                transition-all duration-200"
            >
              ← Back to Roles
            </button>
            <div>
              <h3 className="font-bold text-[1rem] text-slate-800 dark:text-white capitalize">
                {editRole.role_name.replace(/_/g, " ")} — Default Permissions
              </h3>
              <p className="text-[0.78rem] text-slate-400 dark:text-[#555] mt-[2px]">
                {editRole.is_builtin ? "Built-in role" : "Custom role"} ·
                Applies to <strong>new</strong> staff added with this role ·
                Does not affect existing users
              </p>
            </div>
          </div>
          <button
            onClick={saveEditRole}
            disabled={editSaving}
            className={`px-[22px] py-[9px] rounded-[10px] border-none font-bold text-[0.85rem]
              text-white cursor-pointer transition-all duration-200 min-w-[130px]
              disabled:opacity-65 hover:-translate-y-px
              ${
                editSaved
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                  : `bg-gradient-to-br from-indigo-500 to-purple-500
                   dark:from-[#E50914] dark:to-[#E50914]
                   hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
                   dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]`
              }`}
          >
            {editSaving
              ? "Saving..."
              : editSaved
                ? `✓ ${editSaved}`
                : "Save Role"}
          </button>
        </div>

        {editRole.role_name === "superadmin" && (
          <div
            className="mb-5 px-5 py-4 rounded-[12px] text-[0.85rem] font-medium
            bg-amber-50 dark:bg-amber-500/[0.07]
            border border-amber-200 dark:border-amber-500/20
            text-amber-700 dark:text-[#fcd34d]"
          >
            Superadmin has unrestricted access. Permissions cannot be modified.
          </div>
        )}

        {/* Two sub-tabs: Default Permissions | Module Visibility */}
        <EditRoleTabs
          editRole={editRole}
          editPerms={editPerms}
          editVisible={editVisible}
          setEditPerms={setEditPerms}
          setEditVisible={setEditVisible}
          setEditSaved={setEditSaved}
        />
      </div>
    );
  }

  /* ── Roles list ── */
  return (
    <div>
      {deleteError && (
        <div
          className="mb-4 px-5 py-4 rounded-[12px] text-[0.85rem] font-medium
          bg-rose-50 dark:bg-rose-500/[0.07]
          border border-rose-200 dark:border-rose-500/20
          text-rose-600 dark:text-rose-400"
        >
          {deleteError}
        </div>
      )}

      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <p className="text-[0.85rem] text-[#4a4e69] dark:text-[#B3B3B3]">
          Role permissions are{" "}
          <strong className="text-slate-700 dark:text-[#e2e8f0]">
            default templates
          </strong>{" "}
          applied only when new staff is added with that role. Existing users
          are{" "}
          <strong className="text-slate-700 dark:text-[#e2e8f0]">
            not affected
          </strong>{" "}
          when a role is edited.
        </p>
        {isSuperadmin && (
          <button
            onClick={() => {
              setAddModal(true);
              setNewRoleName("");
              setAddError("");
            }}
            className="px-6 py-[9px] rounded-full font-bold text-[0.85rem] text-white
              border-none cursor-pointer transition-all duration-200 flex-shrink-0
              bg-gradient-to-br from-indigo-500 to-purple-500
              dark:from-[#E50914] dark:to-[#E50914]
              hover:-translate-y-0.5
              hover:shadow-[0_5px_15px_rgba(99,102,241,0.4)]
              dark:hover:shadow-[0_5px_15px_rgba(229,9,20,0.4)]"
          >
            + Add Role
          </button>
        )}
      </div>

      {loading ? (
        <div
          className="py-12 text-center text-[0.9rem] font-semibold
          text-slate-500 dark:text-[#a3a3a3] animate-pulse"
        >
          Loading roles...
        </div>
      ) : (
        <div
          className="rounded-[16px] overflow-hidden
          bg-white/40 dark:bg-[#1E1E1E]
          border border-white/50 dark:border-[#333333]
          shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
        >
          <table className="w-full border-collapse text-[0.875rem]">
            <thead>
              <tr
                className="bg-[rgba(99,102,241,0.1)] dark:bg-[#121212]
                border-b border-white/50 dark:border-[#333333]"
              >
                {["Role", "Type", "Members", "Actions"].map((h, idx) => (
                  <th
                    key={h}
                    className={`px-[25px] py-[18px] font-bold text-[0.8rem] uppercase tracking-wide
                      text-slate-800 dark:text-[#B3B3B3]
                      ${idx === 3 ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr
                  key={role.role_name}
                  className="transition-colors duration-200
                    hover:[&>td]:bg-white/60 dark:hover:[&>td]:bg-[#252525]"
                >
                  <td
                    className="px-[25px] py-[18px]
                    border-b border-white/30 dark:border-[#2A2A2A] align-middle"
                  >
                    <RoleBadge role={role.role_name} />
                  </td>

                  <td
                    className="px-[25px] py-[18px]
                    border-b border-white/30 dark:border-[#2A2A2A] align-middle"
                  >
                    <span
                      className={`px-3 py-[5px] rounded-full text-[0.75rem] font-bold border
                      ${
                        role.is_builtin
                          ? "bg-slate-100 text-slate-500 border-slate-300 dark:bg-white/5 dark:text-[#555] dark:border-[#333]"
                          : "bg-violet-100 text-violet-600 border-violet-300 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30"
                      }`}
                    >
                      {role.is_builtin ? "Built-in" : "Custom"}
                    </span>
                  </td>

                  <td
                    className="px-[25px] py-[18px]
                    border-b border-white/30 dark:border-[#2A2A2A] align-middle
                    font-semibold text-slate-600 dark:text-[#94a3b8]"
                  >
                    {role.user_count}{" "}
                    {role.user_count === 1 ? "member" : "members"}
                  </td>

                  <td
                    className="px-[25px] py-[18px] text-right
                    border-b border-white/30 dark:border-[#2A2A2A] align-middle"
                  >
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(role)}
                        className="px-[15px] py-[6px] rounded-[9px] font-bold text-[0.82rem]
                          cursor-pointer transition-all duration-200
                          border border-[rgba(99,102,241,0.25)] bg-[rgba(99,102,241,0.07)] text-indigo-600
                          dark:border-[rgba(229,9,20,0.25)] dark:bg-[rgba(229,9,20,0.07)] dark:text-[#E50914]
                          hover:bg-indigo-500 hover:text-white hover:border-indigo-500
                          dark:hover:bg-[#E50914] dark:hover:text-white dark:hover:border-[#E50914]
                          hover:-translate-y-px
                          hover:shadow-[0_3px_10px_rgba(99,102,241,0.25)]
                          dark:hover:shadow-[0_3px_10px_rgba(229,9,20,0.25)]"
                      >
                        Edit Permissions
                      </button>

                      {/* Delete — custom roles only; built-in roles cannot be deleted */}
                      {isSuperadmin && !role.is_builtin ? (
                        <button
                          onClick={() => handleDeleteRole(role.role_name)}
                          className="px-4 py-[6px] rounded-[9px] font-bold text-[0.82rem]
                            cursor-pointer transition-all duration-200
                            bg-transparent text-rose-500 dark:text-[#E50914]
                            border border-rose-200 dark:border-[rgba(229,9,20,0.3)]
                            hover:bg-rose-500 hover:text-white hover:border-rose-500
                            dark:hover:bg-[#E50914] dark:hover:text-white dark:hover:border-[#E50914]"
                        >
                          Delete
                        </button>
                      ) : isSuperadmin && role.is_builtin ? (
                        <span
                          className="px-4 py-[6px] rounded-[9px] text-[0.78rem] font-semibold
                          text-slate-300 dark:text-[#444] border border-slate-200 dark:border-[#2a2a2a]
                          cursor-not-allowed select-none"
                          title="Built-in roles cannot be deleted"
                        >
                          Protected
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Role Modal ── */}
      {addModal && (
        <div
          className="fixed inset-0 z-[1000] flex justify-center items-center
          bg-[rgba(15,23,42,0.6)] dark:bg-black/80 backdrop-blur-[5px]"
          onClick={() => setAddModal(false)}
        >
          <div
            className="relative w-full max-w-[440px] p-[30px] rounded-[20px] slide-up
            bg-white dark:bg-[#1E1E1E]
            border border-[#e2e8f0] dark:border-[#333333]
            shadow-[0_15px_35px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              onClick={() => setAddModal(false)}
              className="absolute top-[15px] right-5 text-[1.2rem] font-bold cursor-pointer
                text-[#4a4e69] dark:text-[#B3B3B3]
                hover:text-slate-800 dark:hover:text-[#E50914]
                transition-colors duration-200"
            >
              ✕
            </span>
            <h2 className="text-[1.3rem] font-bold mb-1 text-slate-800 dark:text-white">
              New Custom Role
            </h2>
            <p className="text-[0.85rem] mb-5 text-[#4a4e69] dark:text-[#B3B3B3]">
              Create a new role. Set its default permissions after creating it
              from the roles list.
            </p>
            <label className="block mb-2 font-semibold text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
              Role Name
            </label>
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => {
                setNewRoleName(e.target.value);
                setAddError("");
              }}
              placeholder="e.g. data_entry"
              className="w-full p-3 rounded-[10px] text-[0.95rem] outline-none mb-2
                border border-[#cbd5e1] dark:border-[#333333]
                bg-white dark:bg-[#121212]
                text-slate-800 dark:text-white
                placeholder-[#9ea1bc] dark:placeholder-[#666]
                focus:border-indigo-500 dark:focus:border-[#E50914]
                transition-colors duration-200"
            />
            {addError && (
              <p className="text-rose-500 dark:text-rose-400 text-[0.82rem] mb-3 font-medium">
                {addError}
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setAddModal(false)}
                className="flex-1 py-3 rounded-[10px] font-semibold text-[0.9rem] cursor-pointer
                  border border-[#cbd5e1] dark:border-[#333333]
                  bg-white dark:bg-transparent
                  text-slate-500 dark:text-[#94a3b8]
                  hover:bg-slate-100 dark:hover:bg-[#1a1a1a]
                  transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                className="flex-1 py-3 rounded-[10px] font-bold text-[0.9rem] text-white
                  border-none cursor-pointer transition-all duration-200
                  bg-gradient-to-br from-indigo-500 to-purple-500
                  dark:from-[#E50914] dark:to-[#E50914]
                  hover:from-indigo-600 hover:to-purple-600
                  dark:hover:from-[#B20710] dark:hover:to-[#B20710]"
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN — PERMISSIONS PAGE
════════════════════════════════════════════ */
const Permissions = () => {
  const { user } = useOutletContext();
  const isSuperadmin = user?.role === "superadmin";
  const [activeTab, setActiveTab] = useState("users");

  const tabBtn = (id, label, Icon) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-[10px] rounded-full
        font-bold text-[0.85rem] cursor-pointer border
        transition-all duration-200 select-none
        ${
          activeTab === id
            ? `bg-gradient-to-br from-indigo-500 to-purple-500
             dark:from-[#E50914] dark:to-[#E50914]
             text-white border-transparent
             shadow-[0_4px_15px_rgba(99,102,241,0.35)]
             dark:shadow-[0_4px_15px_rgba(229,9,20,0.35)]`
            : `bg-white/60 dark:bg-transparent
             border-white/60 dark:border-[#333333]
             text-slate-600 dark:text-[#B3B3B3]
             hover:bg-white hover:border-indigo-400 hover:text-indigo-600
             dark:hover:border-[#E50914] dark:hover:text-[#E50914]`
        }`}
    >
      <Icon className="text-[0.9rem]" /> {label}
    </button>
  );

  return (
    <main className="p-[30px]">
      {/* ══ PAGE HEADER ══ */}
      <header
        className="flex justify-between items-center flex-wrap gap-4 mb-[30px]
        px-[30px] py-5 rounded-[20px]
        bg-white/40 dark:bg-[rgba(30,30,30,0.95)]
        backdrop-blur-[10px]
        border border-white/50 dark:border-[#333333]
        shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
      >
        <div>
          <h1 className="text-[1.8rem] font-bold mb-1 text-slate-800 dark:text-white">
            Permission Management
          </h1>
          <p className="text-[0.9rem] text-[#4a4e69] dark:text-[#B3B3B3]">
            Control access levels for individual users and roles.
          </p>
        </div>
        {/* Superadmin sees both tabs; others only see Users */}
        {isSuperadmin && (
          <div className="flex items-center gap-3">
            {tabBtn("users", "Users", FaUserShield)}
            {tabBtn("roles", "Roles", MdAdminPanelSettings)}
          </div>
        )}
      </header>

      {/* ══ CONTENT PANEL ══ */}
      <div
        className="bg-white/40 dark:bg-[rgba(30,30,30,0.95)]
        backdrop-blur-[10px] rounded-[20px] p-6
        border border-white/50 dark:border-[#333333]
        shadow-[0_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
      >
        {activeTab === "users" ? (
          <UsersTab currentUser={user} />
        ) : (
          <RolesTab currentUser={user} />
        )}
      </div>
    </main>
  );
};

export default Permissions;
