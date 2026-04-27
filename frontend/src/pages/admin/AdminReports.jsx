import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { StatCard } from "../../components/Card.jsx";

const fmt$ = (v) => `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (v) => Number(v || 0).toLocaleString();

const statusBadge = (s) => {
  const m = { pending: "badge-warning", confirmed: "badge-info", preparing: "badge-info", ready: "badge-success", dispatched: "badge-purple", completed: "badge-neutral", cancelled: "badge-danger" };
  return m[s?.toLowerCase()] || "badge-neutral";
};

function Section({ title, count, children }) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
        <h2 className="font-semibold text-stone-700 text-sm">{title}</h2>
        {count !== undefined && <span className="badge-neutral text-xs">{count}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AdminReports() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    api.get("/api/reports/overview")
      .then(r => setOverview(r.data))
      .catch(e => setError(e?.response?.data?.message || e.message || "Failed to load report"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const stats = overview?.stats || {};
  const orders = overview?.recentOrders || [];
  const reservations = overview?.recentReservations || [];
  const revenue = overview?.revenue || {};

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports &amp; Analytics</h1>
          <p className="page-subtitle">Business overview and performance metrics</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-outline text-xs px-3.5 py-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)
        ) : (
          <>
            <StatCard title="Today's Orders"        value={fmtN(stats.todayOrders)}        accent="blue"    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>} />
            <StatCard title="Pending Reservations"  value={fmtN(stats.pendingReservations)} accent="amber"   icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>} />
            <StatCard title="Low Stock Items"       value={fmtN(stats.lowStockItems)}       accent="red"     icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>} />
            <StatCard title="Active Rooms"          value={fmtN(stats.activeRooms)}         accent="emerald" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>} />
          </>
        )}
      </div>

      {/* Revenue breakdown (if present) */}
      {!loading && (revenue.today !== undefined || revenue.week !== undefined || revenue.month !== undefined) && (
        <div className="grid sm:grid-cols-3 gap-4">
          {revenue.today   !== undefined && <StatCard title="Revenue Today"      value={fmt$(revenue.today)}  accent="brand" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />}
          {revenue.week    !== undefined && <StatCard title="Revenue This Week"  value={fmt$(revenue.week)}   accent="brand" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>} />}
          {revenue.month   !== undefined && <StatCard title="Revenue This Month" value={fmt$(revenue.month)}  accent="brand" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>} />}
        </div>
      )}

      {/* Recent orders */}
      {!loading && orders.length > 0 && (
        <Section title="Recent Orders" count={orders.length}>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Order #</th>
                  <th className="admin-th">Type</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Total</th>
                  <th className="admin-th">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map(o => (
                  <tr key={o._id} className="admin-tr">
                    <td className="admin-td font-mono text-xs text-stone-500">{o.orderNumber || o._id?.slice(-6)}</td>
                    <td className="admin-td capitalize">{o.type}</td>
                    <td className="admin-td"><span className={statusBadge(o.status)}>{o.status}</span></td>
                    <td className="admin-td font-semibold text-stone-800">${Number(o.totals?.grandTotal || 0).toFixed(2)}</td>
                    <td className="admin-td text-stone-400 text-xs">{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Recent reservations */}
      {!loading && reservations.length > 0 && (
        <Section title="Recent Reservations" count={reservations.length}>
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Reference</th>
                  <th className="admin-th">Guest</th>
                  <th className="admin-th">Room</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {reservations.map(r => (
                  <tr key={r._id} className="admin-tr">
                    <td className="admin-td font-mono text-xs text-stone-500">{r.referenceNo || r._id?.slice(-6)}</td>
                    <td className="admin-td">{r.guest?.name || r.guest?.email || "—"}</td>
                    <td className="admin-td">{r.room?.name || "—"}</td>
                    <td className="admin-td"><span className={statusBadge(r.status)}>{r.status}</span></td>
                    <td className="admin-td text-stone-400 text-xs">{r.startAt ? new Date(r.startAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {!loading && orders.length === 0 && reservations.length === 0 && (
        <div className="admin-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="font-semibold text-stone-700">No activity data yet</div>
          <div className="text-sm text-stone-400 mt-1">Detailed stats will appear here once orders and reservations are recorded.</div>
        </div>
      )}
    </div>
  );
}
