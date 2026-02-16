import React, { useEffect, useState } from "react";
import { Card } from "../components/Card.jsx";
import { api } from "../lib/api.js";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [roomId, setRoomId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [purpose, setPurpose] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/api/rooms").then(r => {
      setRooms(r.data.rooms);
      if (r.data.rooms[0]) setRoomId(r.data.rooms[0]._id);
    });
  }, []);

  async function reserve() {
    setMsg("");
    const payload = { roomId, startAt, endAt, purpose, guest, paymentRequired: false };
    const { data } = await api.post("/api/reservations", payload);
    if (data.waitlisted) setMsg(`Waitlisted: ${data.reservation.referenceNo}`);
    else setMsg(`Reserved: ${data.reservation.referenceNo} (status: ${data.reservation.status})`);
  }

  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="text-lg font-semibold">Rooms</h1>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {rooms.map(r => (
            <div key={r._id} className="border rounded p-3">
              <div className="font-medium">{r.code} — {r.name}</div>
              <div className="text-xs text-slate-600 mt-1">{r.description}</div>
              <div className="text-xs text-slate-600 mt-1">Capacity: {r.capacity} | Status: {r.status}</div>
              <div className="text-xs text-slate-600 mt-1">Amenities: {(r.amenities||[]).join(", ") || "-"}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Reserve a Room (Guest supported)</h2>
        <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
          <div className="grid gap-2">
            <label className="font-medium">Select room</label>
            <select className="border rounded px-2 py-2" value={roomId} onChange={e=>setRoomId(e.target.value)}>
              {rooms.map(r => <option key={r._id} value={r._id}>{r.code} — {r.name}</option>)}
            </select>

            <label className="font-medium">Start</label>
            <input className="border rounded px-2 py-2" type="datetime-local" value={startAt} onChange={e=>setStartAt(e.target.value)} />
            <label className="font-medium">End</label>
            <input className="border rounded px-2 py-2" type="datetime-local" value={endAt} onChange={e=>setEndAt(e.target.value)} />
            <label className="font-medium">Purpose</label>
            <input className="border rounded px-2 py-2" value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="Meeting / stay / etc." />
          </div>

          <div className="grid gap-2">
            <label className="font-medium">Guest details</label>
            <input className="border rounded px-2 py-2" placeholder="Name" value={guest.name} onChange={e=>setGuest({...guest, name:e.target.value})} />
            <input className="border rounded px-2 py-2" placeholder="Email" value={guest.email} onChange={e=>setGuest({...guest, email:e.target.value})} />
            <input className="border rounded px-2 py-2" placeholder="Phone" value={guest.phone} onChange={e=>setGuest({...guest, phone:e.target.value})} />
            <button onClick={reserve} className="mt-2 px-3 py-2 rounded bg-emerald-600 text-white">Reserve</button>
            {msg ? <p className="text-sm">{msg}</p> : <p className="text-xs text-slate-600">Double-booking prevention + waitlist included.</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}
