import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { createSocket } from "../lib/socket.js";
import { useAuth } from "../lib/auth.jsx";

export default function Track() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    const s = createSocket();
    s.emit("join", "customer");
    s.on("order:status", (payload) => {
      // naive refresh
      refresh();
    });
    return () => s.disconnect();
  }, []);

  async function refresh() {
    if (!user) return;
    const [o, r] = await Promise.all([
      api.get("/api/orders/my"),
      api.get("/api/reservations/my")
    ]);
    setOrders(o.data.orders);
    setReservations(r.data.reservations);
  }

  useEffect(() => { refresh(); }, [user]);

  const STATUS_COLOR = {
    pending: "bg-amber-100 text-amber-700",
    preparing: "bg-blue-100 text-blue-700",
    ready: "bg-purple-100 text-purple-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-600",
    confirmed: "bg-emerald-100 text-emerald-700",
    waitlisted: "bg-amber-100 text-amber-700",
    checked_in: "bg-blue-100 text-blue-700",
    checked_out: "bg-stone-100 text-stone-600",
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">📦</div>
        <div className="section-label mb-2">Order Tracking</div>
        <h1 className="font-display text-2xl font-semibold text-stone-900">Your updates in one place</h1>
        <p className="text-stone-500 mt-3 text-sm">Sign in to view your orders and reservation history.</p>
        <Link to="/login" className="btn-primary inline-block mt-6 px-7 py-3 rounded-xl">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="section-label mb-1">My Activity</div>
          <h1 className="font-display text-3xl font-semibold text-stone-900">Track your orders</h1>
        </div>
        <button
          onClick={refresh}
          className="btn-outline text-sm px-4 py-2 rounded-xl"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Orders */}
      <div>
        <h2 className="font-semibold text-stone-800 mb-3">Orders</h2>
        {orders.length === 0 ? (
          <div className="card-premium p-8 text-center text-stone-400">
            <div className="text-3xl mb-2">🛒</div>
            <div className="text-sm">No orders yet. <Link to="/menu" className="underline text-brand-500">Browse menu →</Link></div>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o._id} className="card-premium p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">{o.orderNo}</div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {o.type} • {o.items?.length || 0} item{o.items?.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`badge text-xs ${STATUS_COLOR[o.status] || "bg-stone-100 text-stone-600"}`}>
                      {o.status}
                    </span>
                    {o.totals?.grandTotal != null && (
                      <div className="text-sm font-semibold text-stone-900 mt-1">${Number(o.totals.grandTotal).toFixed(2)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reservations */}
      <div>
        <h2 className="font-semibold text-stone-800 mb-3">Reservations</h2>
        {reservations.length === 0 ? (
          <div className="card-premium p-8 text-center text-stone-400">
            <div className="text-3xl mb-2">🏨</div>
            <div className="text-sm">No reservations yet. <Link to="/rooms" className="underline text-brand-500">Browse rooms →</Link></div>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map(r => (
              <div key={r._id} className="card-premium p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">{r.referenceNo}</div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {r.room?.name || "Room"} • {r.purpose || "—"}
                    </div>
                    {r.startAt && (
                      <div className="text-xs text-stone-400 mt-1">
                        {new Date(r.startAt).toLocaleString()} – {r.endAt ? new Date(r.endAt).toLocaleString() : ""}
                      </div>
                    )}
                  </div>
                  <span className={`badge text-xs ${STATUS_COLOR[r.status] || "bg-stone-100 text-stone-600"}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
