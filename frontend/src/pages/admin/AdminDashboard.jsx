import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { StatCard } from "../../components/Card.jsx";
import { Link } from "react-router-dom";

const quickLinks = [
  { to: "/admin/pos",          label: "POS",          desc: "Counter billing and instant order tickets", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", hoverCls: "hover:border-teal-300 hover:bg-teal-50/50" },
  { to: "/admin/orders",       label: "Orders",       desc: "Manage kitchen queue & statuses",   icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",                                                                                                                                                                                                                         hoverCls: "hover:border-blue-300 hover:bg-blue-50/50" },
  { to: "/admin/reservations", label: "Reservations", desc: "Approve or cancel room bookings",    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",                                                                                                                                                                          hoverCls: "hover:border-emerald-300 hover:bg-emerald-50/50" },
  { to: "/admin/menu",         label: "Menu Items",   desc: "Edit offerings, photos & pricing",  icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", hoverCls: "hover:border-amber-300 hover:bg-amber-50/50" },
  { to: "/admin/rooms",        label: "Rooms",        desc: "Manage rooms & availability",       icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",                                                                                                           hoverCls: "hover:border-violet-300 hover:bg-violet-50/50" },
  { to: "/admin/ingredients",  label: "Ingredients",  desc: "Monitor kitchen stock levels",      icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",    hoverCls: "hover:border-rose-300 hover:bg-rose-50/50" },
  { to: "/admin/reports",      label: "Reports",      desc: "Revenue analytics & metrics",      icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",                                                                                                                               hoverCls: "hover:border-indigo-300 hover:bg-indigo-50/50" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get("/api/reports/overview")
      .then(r => { if (alive) setStats(r.data?.stats || {}); })
      .catch(() => { if (alive) setStats({}); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-7 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back — your restaurant at a glance</p>
        </div>
        <div className="text-xs text-stone-400 self-end pb-1 hidden sm:block">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-card p-5 h-[100px] skeleton" />
          ))
        ) : (
          <>
            <StatCard
              title="Today's Orders"
              value={stats?.todayOrders ?? 0}
              accent="blue"
              subtitle="Orders placed today"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>}
            />
            <StatCard
              title="Pending Reservations"
              value={stats?.pendingReservations ?? 0}
              accent="amber"
              subtitle="Awaiting confirmation"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
            />
            <StatCard
              title="Low Stock Items"
              value={stats?.lowStockItems ?? 0}
              accent="red"
              subtitle="Needs restocking"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
            />
            <StatCard
              title="Active Rooms"
              value={stats?.activeRooms ?? 0}
              accent="emerald"
              subtitle="Currently occupied"
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>}
            />
          </>
        )}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map(({ to, label, desc, icon, hoverCls }) => (
            <Link
              key={to}
              to={to}
              className={`admin-card p-4 border border-stone-200 flex items-start gap-3.5 transition-all duration-150 ${hoverCls} group`}
            >
              <div className="w-9 h-9 rounded-xl bg-stone-100 group-hover:bg-white flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors">
                <svg className="w-[18px] h-[18px] text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-stone-800">{label}</div>
                <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{desc}</div>
              </div>
              <svg className="w-4 h-4 text-stone-300 group-hover:text-stone-500 ml-auto mt-1 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
