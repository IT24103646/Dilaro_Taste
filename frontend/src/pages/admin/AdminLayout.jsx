import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth.jsx";
import { useState } from "react";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icon = ({ d, ...p }) => (
  <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9} {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);
const icons = {
  dashboard:    "M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z",
  pos:          "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  orders:       "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  reservations: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  menu:         "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  ingredients:  "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  rooms:        "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  laundry:      "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
  users:        "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  contact:      "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  hero:         "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  reports:      "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  logout:       "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  menu2:        "M4 6h16M4 12h16M4 18h16",
};

const navItems = [
  { to: "/admin", label: "Dashboard",    icon: icons.dashboard,    end: true },
  { to: "/admin/pos",          label: "POS",          icon: icons.pos },
  { to: "/admin/orders",       label: "Orders",       icon: icons.orders },
  { to: "/admin/payments",     label: "Payments",     icon: icons.orders },
  { to: "/admin/reservations", label: "Reservations", icon: icons.reservations },
  { to: "/admin/menu",         label: "Menu Items",   icon: icons.menu },
  { to: "/admin/ingredients",  label: "Ingredients",  icon: icons.ingredients },
  { to: "/admin/rooms",        label: "Rooms",        icon: icons.rooms },
  { to: "/admin/laundry",      label: "Laundry",      icon: icons.laundry },
  { to: "/admin/users",        label: "Users",        icon: icons.users },
  { to: "/admin/packages",     label: "Packages",     icon: icons.menu },
  { to: "/admin/contact",      label: "Messages",     icon: icons.contact },
  { to: "/admin/hero",         label: "Hero Slides",  icon: icons.hero },
  { to: "/admin/reports",      label: "Reports",      icon: icons.reports },
];

function SideLink({ to, icon, children, end, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
          isActive
            ? "bg-white/15 text-white shadow-sm"
            : "text-slate-400 hover:text-white hover:bg-white/8"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-full" />
          )}
          <Icon d={icon} className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${isActive ? "text-brand-400" : "text-slate-500 group-hover:text-slate-300"}`} />
          {!collapsed && <span className="truncate">{children}</span>}
        </>
      )}
    </NavLink>
  );
}

// Page title resolver
function usePageTitle(pathname) {
  const item = navItems.find(n => {
    if (n.end) return pathname === n.to;
    return pathname.startsWith(n.to);
  });
  return item?.label || "Admin";
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const pageTitle = usePageTitle(pathname);

  const initials = (user?.name || user?.email || "A")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      {/* ─── Sidebar ──────────────────────────────────────────── */}
      <aside
        className={`flex flex-col flex-shrink-0 bg-admin-sidebar transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        } shadow-sidebar relative z-20`}
        style={{ minHeight: "100vh" }}
      >
        {/* Logo / Brand */}
        <div className={`h-16 border-b border-white/10 flex items-center ${collapsed ? "justify-center px-2" : "px-5 gap-3"}`}>
          <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center text-white font-display font-extrabold text-sm shadow-sm flex-shrink-0">
            R
          </div>
          {!collapsed && (
            <div>
              <div className="text-white font-semibold text-sm leading-tight">Restaurant</div>
              <div className="text-slate-400 text-[11px] font-medium">Admin Panel</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {navItems.map(item => (
            <SideLink key={item.to} to={item.to} icon={item.icon} end={item.end} collapsed={collapsed}>
              {item.label}
            </SideLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/10 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/8 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">{user?.name || "Admin"}</div>
                <div className="text-slate-500 text-[11px] truncate">{user?.email}</div>
              </div>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                title="Sign out"
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <Icon d={icons.logout} className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { logout(); navigate("/login"); }}
              title="Sign out"
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto text-slate-400 hover:text-white hover:bg-white/20 transition-colors"
            >
              <Icon d={icons.logout} className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ─── Main content area ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-stone-200/80 shadow-sm flex items-center justify-between px-5 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(c => !c)}
              className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Icon d={icons.menu2} className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-stone-400">Admin</span>
              <span className="text-stone-300">/</span>
              <span className="font-semibold text-stone-700">{pageTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Go to site */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 hover:border-stone-400 hover:text-stone-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              View Site
            </a>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 bg-stone-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
