import React, { useEffect, useState } from "react";
import { Card } from "../components/Card.jsx";
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

  if (!user) {
    return (
      <Card>
        <h1 className="text-lg font-semibold">Track</h1>
        <p className="text-sm text-slate-600 mt-2">Login to see your order/reservation history.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="text-lg font-semibold">My Orders</h1>
        <div className="mt-3 grid gap-2">
          {orders.map(o => (
            <div key={o._id} className="border rounded p-3 text-sm">
              <div className="font-medium">{o.orderNo}</div>
              <div className="text-slate-600">Status: {o.status} | Total: ${o.totals?.grandTotal?.toFixed(2)}</div>
            </div>
          ))}
          {orders.length === 0 ? <p className="text-sm text-slate-600">No orders yet.</p> : null}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">My Reservations</h2>
        <div className="mt-3 grid gap-2">
          {reservations.map(r => (
            <div key={r._id} className="border rounded p-3 text-sm">
              <div className="font-medium">{r.referenceNo}</div>
              <div className="text-slate-600">Status: {r.status} | Room: {r.room?.name}</div>
            </div>
          ))}
          {reservations.length === 0 ? <p className="text-sm text-slate-600">No reservations yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}
