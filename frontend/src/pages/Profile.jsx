import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HeroCarousel from "../components/HeroCarousel.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { createSocket } from "../lib/socket.js";

const ORDER_STATUS_CLASS = {
  pending_payment: "badge-warning",
  confirmed: "badge-success",
  preparing: "badge-info",
  ready: "badge-purple",
  dispatched: "badge-info",
  completed: "badge-neutral",
  cancelled: "badge-danger",
};

const RES_STATUS_CLASS = {
  pending_payment: "badge-warning",
  confirmed: "badge-success",
  waitlisted: "badge-warning",
  completed: "badge-neutral",
  cancelled: "badge-danger",
};

function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function Profile() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [livePulse, setLivePulse] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [ordersRes, reservationsRes] = await Promise.all([
        api.get("/api/orders/my"),
        api.get("/api/reservations/my"),
      ]);
      setOrders(ordersRes.data?.orders || []);
      setReservations(reservationsRes.data?.reservations || []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = createSocket();
    socket.emit("join", "customer");
    socket.emit("join", "reservations");

    const onLiveUpdate = () => {
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 1800);
      refresh();
    };

    socket.on("order:status", onLiveUpdate);
    socket.on("reservation:new", onLiveUpdate);
    socket.on("reservation:updated", onLiveUpdate);
    socket.on("reservation:cancelled", onLiveUpdate);

    return () => {
      socket.off("order:status", onLiveUpdate);
      socket.off("reservation:new", onLiveUpdate);
      socket.off("reservation:updated", onLiveUpdate);
      socket.off("reservation:cancelled", onLiveUpdate);
      socket.disconnect();
    };
  }, [refresh]);

  const summary = useMemo(() => {
    const completedOrders = orders.filter((o) => o.status === "completed").length;
    const activeOrders = orders.filter((o) => ["confirmed", "preparing", "ready", "dispatched", "pending_payment"].includes(o.status)).length;
    const activeReservations = reservations.filter((r) => ["confirmed", "pending_payment", "waitlisted"].includes(r.status)).length;
    const spent = orders
      .filter((o) => o.payment?.status === "paid" || o.status === "completed")
      .reduce((sum, o) => sum + Number(o.totals?.grandTotal || 0), 0);

    return {
      totalOrders: orders.length,
      completedOrders,
      activeOrders,
      totalReservations: reservations.length,
      activeReservations,
      spent,
    };
  }, [orders, reservations]);

  if (!user) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-3xl font-semibold text-stone-900">Sign in to view your profile</h1>
        <p className="text-stone-500 mt-2">Track your activity, orders, and reservations in one place.</p>
        <Link to="/login" className="btn-primary mt-6">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <HeroCarousel
        className="mb-2"
        eyebrow="My Account"
        title={`Welcome back, ${user.name || "Guest"}`}
        subtitle="Your profile includes order history, reservations, and a live activity summary."
        primaryAction={{ to: "/menu", label: "Order Food" }}
        secondaryAction={{ to: "/rooms", label: "Book a Room" }}
      >
        <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-400/40 rounded-full px-3 py-1.5">
          <span className={`w-2 h-2 rounded-full bg-emerald-400 ${livePulse ? "animate-pulse" : ""}`} />
          Live tracking enabled
        </div>
      </HeroCarousel>

      {error ? <div className="alert-error">{error}</div> : null}

      <div className="card-premium p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-stone-900">Profile Overview</h2>
            <p className="text-xs text-stone-500 mt-1">Last update: {lastUpdated ? lastUpdated.toLocaleTimeString() : "-"}</p>
          </div>
          <button type="button" onClick={refresh} className="btn-outline text-xs px-3 py-2" disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          <div className="admin-card p-4"><div className="text-xs text-stone-500">Total Orders</div><div className="text-2xl font-bold text-stone-900 mt-1">{summary.totalOrders}</div></div>
          <div className="admin-card p-4"><div className="text-xs text-stone-500">Active Orders</div><div className="text-2xl font-bold text-stone-900 mt-1">{summary.activeOrders}</div></div>
          <div className="admin-card p-4"><div className="text-xs text-stone-500">Reservations</div><div className="text-2xl font-bold text-stone-900 mt-1">{summary.totalReservations}</div></div>
          <div className="admin-card p-4"><div className="text-xs text-stone-500">Active Reservations</div><div className="text-2xl font-bold text-stone-900 mt-1">{summary.activeReservations}</div></div>
          <div className="admin-card p-4"><div className="text-xs text-stone-500">Completed Orders</div><div className="text-2xl font-bold text-stone-900 mt-1">{summary.completedOrders}</div></div>
          <div className="admin-card p-4"><div className="text-xs text-stone-500">Estimated Spend</div><div className="text-2xl font-bold text-stone-900 mt-1">${summary.spent.toFixed(2)}</div></div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-stone-100 pb-3 mb-4">
          <button onClick={() => setActiveTab("summary")} className={activeTab === "summary" ? "btn-primary text-xs px-3 py-1.5" : "btn-outline text-xs px-3 py-1.5"}>Summary</button>
          <button onClick={() => setActiveTab("orders")} className={activeTab === "orders" ? "btn-primary text-xs px-3 py-1.5" : "btn-outline text-xs px-3 py-1.5"}>Orders</button>
          <button onClick={() => setActiveTab("reservations")} className={activeTab === "reservations" ? "btn-primary text-xs px-3 py-1.5" : "btn-outline text-xs px-3 py-1.5"}>Reservations</button>
        </div>

        {activeTab === "summary" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="admin-card p-4">
              <div className="section-label mb-2">Account</div>
              <div className="text-sm text-stone-700 space-y-1">
                <div><span className="text-stone-500">Name:</span> {user.name || "-"}</div>
                <div><span className="text-stone-500">Email:</span> {user.email || "-"}</div>
                <div><span className="text-stone-500">Role:</span> <span className="capitalize">{user.role || "customer"}</span></div>
              </div>
            </div>
            <div className="admin-card p-4">
              <div className="section-label mb-2">Quick Actions</div>
              <div className="flex flex-wrap gap-2">
                <Link to="/menu" className="btn-outline text-xs px-3 py-2">Order Now</Link>
                <Link to="/rooms" className="btn-outline text-xs px-3 py-2">Reserve Room</Link>
                <Link to="/track" className="btn-outline text-xs px-3 py-2">Track Live Status</Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="overflow-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Order</th>
                  <th className="admin-th">Date</th>
                  <th className="admin-th">Type</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Amount</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="admin-tr">
                    <td className="admin-td font-semibold">{o.orderNo}</td>
                    <td className="admin-td">{fmtDate(o.createdAt)}</td>
                    <td className="admin-td capitalize">{o.type}</td>
                    <td className="admin-td"><span className={ORDER_STATUS_CLASS[o.status] || "badge-neutral"}>{o.status}</span></td>
                    <td className="admin-td">${Number(o.totals?.grandTotal || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-td text-center text-stone-500 py-8">No orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "reservations" && (
          <div className="overflow-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Reference</th>
                  <th className="admin-th">Room</th>
                  <th className="admin-th">Start</th>
                  <th className="admin-th">End</th>
                  <th className="admin-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r._id} className="admin-tr">
                    <td className="admin-td font-semibold">{r.referenceNo}</td>
                    <td className="admin-td">{r.room?.name || "-"}</td>
                    <td className="admin-td">{fmtDate(r.startAt)}</td>
                    <td className="admin-td">{fmtDate(r.endAt)}</td>
                    <td className="admin-td"><span className={RES_STATUS_CLASS[r.status] || "badge-neutral"}>{r.status}</span></td>
                  </tr>
                ))}
                {reservations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-td text-center text-stone-500 py-8">No reservations yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
