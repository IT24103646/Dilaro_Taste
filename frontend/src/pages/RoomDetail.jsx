import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";

const STATUS_COLORS = {
  Available: "bg-emerald-100 text-emerald-700",
  Occupied: "bg-red-100 text-red-700",
  Cleaning: "bg-amber-100 text-amber-700",
  Maintenance: "bg-orange-100 text-orange-700",
  "Out-of-Service": "bg-stone-200 text-stone-500",
};

export default function RoomDetail() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  // Reservation form
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [purpose, setPurpose] = useState("");
  const [msg, setMsg] = useState({ text: "", ok: true });
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/rooms/${id}`)
      .then(({ data }) => setRoom(data.room))
      .catch(err => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  async function reserve(e) {
    e.preventDefault();
    setMsg({ text: "", ok: true });
    setReserving(true);
    try {
      const { data } = await api.post("/api/reservations", {
        roomId: id, startAt, endAt, purpose, guest, paymentRequired: false,
      });
      setMsg({
        text: data.waitlisted
          ? `✅ Waitlisted! Reference: ${data.reservation.referenceNo}`
          : `✅ Reserved! Reference: ${data.reservation.referenceNo}`,
        ok: true,
      });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || "Reservation failed. Please try again.", ok: false });
    } finally {
      setReserving(false);
    }
  }

  if (loading) return (
    <div className="py-20 text-center text-stone-400">
      <div className="text-3xl mb-2">🏨</div>
      <div className="text-sm">Loading…</div>
    </div>
  );

  if (notFound || !room) return (
    <div className="py-24 text-center">
      <div className="text-5xl mb-4">🏨</div>
      <h2 className="font-display text-2xl text-stone-800 mb-2">Room not found</h2>
      <Link to="/rooms" className="btn-primary px-6 py-2 rounded-xl mt-4 inline-flex">← Back to Rooms</Link>
    </div>
  );

  const photos = room.photos || [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-stone-400 mb-6 flex items-center gap-1.5">
        <Link to="/" className="hover:text-stone-600">Home</Link>
        <span>/</span>
        <Link to="/rooms" className="hover:text-stone-600">Rooms</Link>
        <span>/</span>
        <span className="text-stone-700">{room.name}</span>
      </nav>

      {/* Gallery */}
      <div className="relative rounded-2xl overflow-hidden bg-stone-100 aspect-[16/7] mb-3">
        {photos.length > 0 ? (
          <>
            <img
              src={photos[photoIdx]}
              alt={room.name}
              className="w-full h-full object-cover"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors text-lg"
                >&#8592;</button>
                <button
                  onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors text-lg"
                >&#8594;</button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`rounded-full transition-all ${i === photoIdx ? "w-6 h-2.5 bg-white" : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"}`}
                    />
                  ))}
                </div>
              </>
            )}
            {/* Status badge */}
            <div className="absolute top-4 left-4">
              <span className={`badge text-xs font-semibold ${STATUS_COLORS[room.status] || "bg-stone-100 text-stone-500"}`}>
                {room.status}
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl text-stone-200">🏨</div>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <button
              key={i}
              onClick={() => setPhotoIdx(i)}
              className={`flex-shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 transition-colors ${i === photoIdx ? "border-stone-900" : "border-transparent hover:border-stone-300"}`}
            >
              <img src={p} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-[1fr,380px] gap-8 items-start">
        {/* Left: detail */}
        <div className="space-y-5">
          <div>
            <div className="section-label mb-1">{room.code}</div>
            <h1 className="font-display text-3xl font-semibold text-stone-900">{room.name}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm text-stone-600">
              <span>👤 Up to {room.capacity} guest{room.capacity !== 1 ? "s" : ""}</span>
              {Number.isFinite(room.basePricePerHour) && room.basePricePerHour > 0 && (
                <span className="font-semibold text-stone-900">
                  ${Number(room.basePricePerHour).toFixed(2)}<span className="font-normal text-stone-400">/hr</span>
                </span>
              )}
            </div>
          </div>

          {room.description && (
            <p className="text-stone-600 leading-relaxed">{room.description}</p>
          )}

          {(room.amenities || []).length > 0 && (
            <div>
              <div className="section-label mb-2">Amenities</div>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map(a => (
                  <span key={a} className="badge bg-stone-100 text-stone-700">{a}</span>
                ))}
              </div>
            </div>
          )}

          <Link to="/rooms" className="btn-outline py-2.5 px-6 rounded-xl text-sm inline-flex">
            ← View All Rooms
          </Link>
        </div>

        {/* Right: reservation form */}
        <div className="card-premium p-6">
          <div className="section-label mb-1">Make a Reservation</div>
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-4">Book this room</h2>
          <form onSubmit={reserve} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Check-in</label>
              <input className="input text-sm" type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Check-out</label>
              <input className="input text-sm" type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Purpose</label>
              <input className="input text-sm" placeholder="Meeting, stay, event…" value={purpose} onChange={e => setPurpose(e.target.value)} />
            </div>
            <div className="border-t border-stone-100 pt-3 space-y-2">
              <label className="text-xs font-medium text-stone-600 block">Your Details</label>
              <input className="input text-sm" placeholder="Full name" value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} required />
              <input className="input text-sm" type="email" placeholder="Email" value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} required />
              <input className="input text-sm" placeholder="Phone" value={guest.phone} onChange={e => setGuest({ ...guest, phone: e.target.value })} />
            </div>

            <button type="submit" disabled={reserving || room.status !== "Available"} className="btn-primary w-full py-2.5 rounded-xl">
              {reserving ? "Reserving…" : room.status !== "Available" ? "Not Available" : "Confirm Reservation"}
            </button>

            {msg.text && (
              <p className={`text-xs rounded-lg px-3 py-2 ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {msg.text}
              </p>
            )}
          </form>
          <p className="text-xs text-stone-400 mt-3">Automatic waitlisting if the slot is taken.</p>
        </div>
      </div>
    </div>
  );
}
