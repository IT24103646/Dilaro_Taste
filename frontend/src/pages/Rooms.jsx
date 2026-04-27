import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import HeroCarousel from "../components/HeroCarousel.jsx";

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [roomId, setRoomId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [paymentOption, setPaymentOption] = useState("later");
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [loading, setLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState({});

  useEffect(() => {
    api.get("/api/rooms").then(r => {
      setRooms(r.data.rooms);
      if (r.data.rooms[0]) setRoomId(r.data.rooms[0]._id);
    });
  }, []);

  async function reserve() {
    setMsg({ text: "", ok: true });
    setLoading(true);
    try {
      const payload = { roomId, startAt, endAt, guest, paymentRequired: paymentOption === "stripe" };
      const { data } = await api.post("/api/reservations", payload);
      if (data.waitlisted) setMsg({ text: `✅ Waitlisted! Reference: ${data.reservation.referenceNo}`, ok: true });
      else {
        if (paymentOption === "stripe") {
          setMsg({ text: "Redirecting to secure payment portal...", ok: true });
          const session = await api.post("/api/payments/checkout", { kind: "reservation", id: data.reservation._id });
          const url = session?.data?.url;
          if (!url) throw new Error("Payment session did not return a redirect URL");
          window.location.href = url;
          return;
        }
        setMsg({ text: `✅ Reserved! Reference: ${data.reservation.referenceNo}`, ok: true });
      }
    } catch (err) {
      setMsg({ text: err.response?.data?.error || "Reservation failed. Please try again.", ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <HeroCarousel
        className="mb-8"
        eyebrow="Accommodation"
        title="Find the right space"
        subtitle="Browse available rooms and reserve in minutes."
        primaryAction={{ to: "/track", label: "Track Reservation" }}
        secondaryAction={{ to: "/contact", label: "Need Assistance?" }}
      />

      {/* Room cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {rooms.map(r => {
          const photos = r.photos || [];
          const idx = photoIndex[r._id] || 0;
          return (
            <div key={r._id} className="card-premium overflow-hidden group flex flex-col">
              {/* Photo carousel */}
              <div className="relative h-52 bg-stone-100 overflow-hidden flex-shrink-0">
                {photos.length > 0 ? (
                  <>
                    <img
                      src={photos[idx]}
                      alt={r.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setPhotoIndex(p => ({...p, [r._id]: (idx - 1 + photos.length) % photos.length }))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/60"
                        >‹</button>
                        <button
                          onClick={() => setPhotoIndex(p => ({...p, [r._id]: (idx + 1) % photos.length }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/60"
                        >›</button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {photos.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/50"}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-stone-300">🏨</div>
                )}
                <div className="absolute top-3 right-3">
                  <span className={`badge text-xs ${r.status === "available" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {r.status}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="font-semibold text-stone-900 text-base">{r.name}</div>
                <div className="text-xs text-stone-400 font-medium mb-1">{r.code}</div>
                <div className="text-xs text-stone-500 line-clamp-2 flex-1">{r.description}</div>

                <div className="mt-3 flex items-center justify-between text-xs text-stone-600">
                  <span>👤 Capacity: {r.capacity}</span>
                  {Number.isFinite(r.basePricePerHour) && (
                    <span className="font-semibold text-stone-900">${Number(r.basePricePerHour).toFixed(2)}<span className="font-normal text-stone-400">/hr</span></span>
                  )}
                </div>

                {(r.amenities || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.amenities.slice(0, 4).map(a => (
                      <span key={a} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                    {r.amenities.length > 4 && <span className="text-xs text-stone-400">+{r.amenities.length - 4}</span>}
                  </div>
                )}

                <button
                  onClick={() => setRoomId(r._id)}
                  className={`mt-3 w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                    roomId === r._id
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  {roomId === r._id ? "✓ Selected" : "Select Room"}
                </button>
                <Link
                  to={`/rooms/${r._id}`}
                  className="mt-2 w-full py-1.5 rounded-xl text-xs font-medium text-center text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors block"
                >
                  View details →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {rooms.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <div className="text-4xl mb-2">🏨</div>
          <div className="text-sm">No rooms available</div>
        </div>
      )}

      {/* Reservation form */}
      <div className="card-premium p-6 max-w-2xl">
        <div className="section-label mb-1">Make a Reservation</div>
        <h2 className="font-display text-xl font-semibold text-stone-900 mb-5">Book your space</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Room</label>
              <select className="input text-sm" value={roomId} onChange={e => setRoomId(e.target.value)}>
                {rooms.map(r => <option key={r._id} value={r._id}>{r.code} — {r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Check-in</label>
              <input className="input text-sm" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Check-out</label>
              <input className="input text-sm" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Your Details</label>
              <input className="input text-sm" placeholder="Full name" value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} />
            </div>
            <div>
              <input className="input text-sm" placeholder="Email" type="email" value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} />
            </div>
            <div>
              <input className="input text-sm" placeholder="Phone" value={guest.phone} onChange={e => setGuest({ ...guest, phone: e.target.value })} />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Payment</label>
              <select className="input text-sm" value={paymentOption} onChange={(e) => setPaymentOption(e.target.value)}>
                <option value="later">Pay later (cash/card)</option>
                <option value="stripe">Pay now (Stripe)</option>
              </select>
            </div>

            <button onClick={reserve} disabled={loading} className="btn-primary w-full py-2.5 text-sm rounded-xl mt-4">
              {loading ? (paymentOption === "stripe" ? "Starting payment…" : "Reserving…") : (paymentOption === "stripe" ? "Pay with Stripe" : "Confirm Reservation")}
            </button>

            {msg.text && (
              <p className={`text-xs rounded-lg px-3 py-2 ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {msg.text}
              </p>
            )}
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-3">Double-booking prevention and automatic waitlisting included.</p>
      </div>
    </div>
  );
}
