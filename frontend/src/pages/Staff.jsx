import React, { useEffect, useState } from "react";
import { Card } from "../components/Card.jsx";
import { api } from "../lib/api.js";
import { createSocket } from "../lib/socket.js";

export default function Staff() {
  const [queue, setQueue] = useState([]);
  const [low, setLow] = useState([]);
  const [laundry, setLaundry] = useState([]);
  const [calendar, setCalendar] = useState([]);

  async function refresh() {
    const [q, l, la, c] = await Promise.all([
      api.get("/api/orders/queue"),
      api.get("/api/inventory/kitchen/alerts/low-stock"),
      api.get("/api/laundry"),
      api.get("/api/reservations/calendar")
    ]);
    setQueue(q.data.orders);
    setLow(l.data.low);
    setLaundry(la.data.items);
    setCalendar(c.data.reservations);
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

  async function setStatus(orderId, status) {
    await api.post(`/api/orders/${orderId}/status`, { status });
    await refresh();
  }

  async function setLaundryStatus(id, status, verify=false) {
    await api.post(`/api/laundry/${id}/status`, { status, verify });
    await refresh();
  }

  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="text-lg font-semibold">Kitchen Queue</h1>
        <div className="mt-3 grid gap-2">
          {queue.map(o => (
            <div key={o._id} className="border rounded p-3 text-sm">
              <div className="font-medium">{o.orderNo} — {o.type}</div>
              <div className="text-slate-600">Status: {o.status}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {["confirmed","preparing","ready","dispatched","completed","cancelled"].map(s => (
                  <button key={s} onClick={()=>setStatus(o._id, s)} className="px-2 py-1 rounded border text-xs hover:bg-slate-50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {queue.length === 0 ? <p className="text-sm text-slate-600">No active orders.</p> : null}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold">Low Stock Alerts</h2>
          <div className="mt-2 grid gap-2 text-sm">
            {low.map(i => (
              <div key={i._id} className="border rounded p-2">
                {i.name} — {i.stock}{i.unit} (min {i.minThreshold}{i.unit})
              </div>
            ))}
            {low.length === 0 ? <p className="text-sm text-slate-600">All good.</p> : null}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Laundry Tasks</h2>
          <div className="mt-2 grid gap-2 text-sm">
            {laundry.map(it => (
              <div key={it._id} className="border rounded p-2">
                <div className="font-medium">{it.type} x {it.quantity}</div>
                <div className="text-slate-600">Status: {it.status}</div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {["soiled","queued","in-progress","cleaned","ready"].map(s => (
                    <button key={s} onClick={()=>setLaundryStatus(it._id, s, s==="ready")} className="px-2 py-1 rounded border text-xs hover:bg-slate-50">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {laundry.length === 0 ? <p className="text-sm text-slate-600">No laundry tasks.</p> : null}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Reservations Calendar (list view)</h2>
        <div className="mt-3 grid gap-2 text-sm">
          {calendar.map(r => (
            <div key={r._id} className="border rounded p-3">
              <div className="font-medium">{r.referenceNo} — {r.room?.code} {r.room?.name}</div>
              <div className="text-slate-600">
                {new Date(r.startAt).toLocaleString()} → {new Date(r.endAt).toLocaleString()} | Status: {r.status}
              </div>
            </div>
          ))}
          {calendar.length === 0 ? <p className="text-sm text-slate-600">No reservations in range.</p> : null}
        </div>
      </Card>
    </div>
  );
}
