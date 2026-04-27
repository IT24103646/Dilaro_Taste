import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { createSocket } from "../lib/socket.js";

// ── Status helpers ─────────────────────────────────────────────────────────
const ORDER_STATUSES   = ["confirmed", "preparing", "ready", "dispatched", "completed", "cancelled"];
const LAUNDRY_STATUSES = ["soiled", "queued", "in-progress", "cleaned", "ready"];

const orderStatusCls = {
  pending:    "badge-warning",
  confirmed:  "badge-info",
  preparing:  "badge-info",
  ready:      "badge-success",
  dispatched: "badge-purple",
  completed:  "badge-neutral",
  cancelled:  "badge-danger",
};
const laundryStatusCls = {
  soiled:       "badge-danger",
  queued:       "badge-neutral",
  "in-progress":"badge-info",
  cleaned:      "badge-warning",
  ready:        "badge-success",
};
const reservationStatusCls = {
  pending:   "badge-warning",
  confirmed: "badge-success",
  cancelled: "badge-danger",
  completed: "badge-neutral",
};

function Section({ title, count, icon, children, accent = "stone" }) {
  const accentMap = { stone: "border-stone-200", amber: "border-amber-300", blue: "border-blue-300", emerald: "border-emerald-300", red: "border-red-300" };
  return (
    <div className={`bg-white rounded-2xl border shadow-glass overflow-hidden ${accentMap[accent] || accentMap.stone}`}>
      <div className={`px-5 py-3.5 border-b border-stone-100 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-stone-500">{icon}</span>
          <span className="font-semibold text-stone-700 text-sm">{title}</span>
        </div>
        {count !== undefined && (
          <span className="badge-neutral tabular-nums">{count}</span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusBtn({ label, active, onClick, disabled }) {
  return (
    <button
      disabled={disabled || active}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
        active
          ? "bg-stone-800 text-white border-stone-800 cursor-default"
          : "border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
      }`}
    >
      {label}
    </button>
  );
}

export default function Staff() {
  const [queue, setQueue]       = useState([]);
  const [low, setLow]           = useState([]);
  const [laundry, setLaundry]   = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(null);

  async function refresh() {
    try {
      const [q, l, la, c] = await Promise.all([
        api.get("/api/orders/queue"),
        api.get("/api/inventory/kitchen/alerts/low-stock"),
        api.get("/api/laundry"),
        api.get("/api/reservations/calendar"),
      ]);
      setQueue(q.data.orders || []);
      setLow(l.data.low || []);
      setLaundry(la.data.items || []);
      setCalendar(c.data.reservations || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const s = createSocket();
    s.emit("join", "kitchen");
    s.emit("join", "laundry");
    s.emit("join", "reservations");
    s.on("order:new", refresh);
    s.on("order:status", refresh);
    s.on("laundry:new", refresh);
    s.on("laundry:status", refresh);
    s.on("reservation:new", refresh);
    s.on("reservation:updated", refresh);
    return () => s.disconnect();
  }, []);

  async function setOrderStatus(id, status) {
    setUpdating(id + status);
    try { await api.post(`/api/orders/${id}/status`, { status }); await refresh(); }
    finally { setUpdating(null); }
  }

  async function setLaundryStatus(id, status, verify = false) {
    setUpdating(id + status);
    try { await api.post(`/api/laundry/${id}/status`, { status, verify }); await refresh(); }
    finally { setUpdating(null); }
  }

  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <span className="text-sm text-stone-500 font-medium">Loading staff dashboard…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900">Staff Dashboard</h1>
          <p className="text-sm text-stone-500 mt-0.5">Live updates • {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <button onClick={refresh} className="btn-ghost border border-stone-200 text-xs px-3 py-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Kitchen Queue */}
        <div className="lg:col-span-2">
          <Section
            title="Kitchen Queue"
            count={queue.length}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          >
            {queue.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm">No active orders — all clear!</div>
            ) : (
              <div className="grid gap-3">
                {queue.map(o => (
                  <div key={o._id} className={`rounded-xl border p-4 ${o.status === "ready" ? "border-emerald-200 bg-emerald-50/60" : "border-stone-100 bg-stone-50/80"}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <span className="font-mono text-xs text-stone-500 mr-2">{o.orderNumber || o._id?.slice(-6)}</span>
                        <span className="font-semibold text-stone-800 text-sm capitalize">{o.type}</span>
                        {o.items?.length > 0 && <span className="text-stone-400 text-xs ml-2">• {o.items.length} item(s)</span>}
                      </div>
                      <span className={orderStatusCls[o.status] || "badge-neutral"}>{o.status}</span>
                    </div>
                    {o.items?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {o.items.map((it, i) => (
                          <span key={i} className="bg-white border border-stone-200 rounded-lg px-2 py-0.5 text-xs text-stone-700">
                            {it.name || it.menuItem?.name} ×{it.qty}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {ORDER_STATUSES.map(s => (
                        <StatusBtn
                          key={s}
                          label={s.charAt(0).toUpperCase() + s.slice(1)}
                          active={o.status === s}
                          disabled={updating === o._id + s}
                          onClick={() => setOrderStatus(o._id, s)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Low Stock */}
        <Section
          title="Low Stock Alerts"
          count={low.length}
          accent={low.length > 0 ? "red" : "stone"}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
        >
          {low.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-emerald-600 font-medium text-sm">✓ All stock levels OK</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {low.map(i => (
                <div key={i._id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <div>
                    <div className="font-medium text-stone-800 text-sm">{i.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5">Min: {i.minThreshold} {i.unit}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600 tabular-nums">{i.stock}</div>
                    <div className="text-xs text-stone-400">{i.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Laundry */}
        <Section
          title="Laundry Tasks"
          count={laundry.length}
          accent="blue"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>}
        >
          {laundry.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-sm">No laundry tasks</div>
          ) : (
            <div className="grid gap-3">
              {laundry.map(it => (
                <div key={it._id} className="border border-stone-100 rounded-xl p-3 bg-stone-50/80">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="font-medium text-stone-800 text-sm capitalize">{it.type} <span className="text-stone-400 font-normal">×{it.quantity}</span></div>
                    <span className={laundryStatusCls[it.status] || "badge-neutral"}>{it.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {LAUNDRY_STATUSES.map(s => (
                      <StatusBtn
                        key={s}
                        label={s.charAt(0).toUpperCase() + s.slice(1)}
                        active={it.status === s}
                        disabled={updating === it._id + s}
                        onClick={() => setLaundryStatus(it._id, s, s === "ready")}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Reservations */}
        <div className="lg:col-span-2">
          <Section
            title="Upcoming Reservations"
            count={calendar.length}
            accent="emerald"
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
          >
            {calendar.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm">No reservations in range</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="admin-th">Reference</th>
                      <th className="admin-th">Room</th>
                      <th className="admin-th">Guest</th>
                      <th className="admin-th">Check-in</th>
                      <th className="admin-th">Check-out</th>
                      <th className="admin-th">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {calendar.map(r => (
                      <tr key={r._id} className="admin-tr">
                        <td className="admin-td font-mono text-xs text-stone-500">{r.referenceNo || r._id?.slice(-6)}</td>
                        <td className="admin-td font-medium text-stone-700">{r.room?.name || r.room?.code || "—"}</td>
                        <td className="admin-td text-stone-600">{r.guest?.name || r.guest?.email || "—"}</td>
                        <td className="admin-td text-xs text-stone-500">{fmtDate(r.startAt)} {fmtTime(r.startAt)}</td>
                        <td className="admin-td text-xs text-stone-500">{fmtDate(r.endAt)} {fmtTime(r.endAt)}</td>
                        <td className="admin-td"><span className={reservationStatusCls[r.status] || "badge-neutral"}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
