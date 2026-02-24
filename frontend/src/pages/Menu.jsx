import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useCart } from "../lib/cart.jsx";

function cryptoRandomKey() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const CATEGORY_ICONS = { Starters: "🥗", Mains: "🍛", Desserts: "🍮", Beverages: "🥤", Sides: "🍟" };

export default function Menu() {
  const { cart, addToCart, updateQty, removeFromCart, clearCart, total, count } = useCart();
  const [items, setItems] = useState([]);
  const [type, setType] = useState("delivery");
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [delivery, setDelivery] = useState({ address: "", contactDetails: "", preferredWindow: "" });
  const [pickupSlotAt, setPickupSlotAt] = useState("");
  const [message, setMessage] = useState({ text: "", ok: true });
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    api.get("/api/menu").then(r => {
      setItems(r.data.items);
      const cats = [...new Set(r.data.items.map(i => i.category))].sort();
      if (cats[0]) setActiveCategory(cats[0]);
    });
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    for (const it of items) (g[it.category] ||= []).push(it);
    return g;
  }, [items]);

  const categories = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  async function checkout() {
    setMessage({ text: "", ok: true });
    if (cart.length === 0) return setMessage({ text: "Your cart is empty.", ok: false });
    setLoading(true);
    try {
      const payload = {
        type,
        items: cart.map(c => ({ menuItemId: c._id, quantity: c.quantity })),
        guest,
        delivery: type === "delivery" ? delivery : undefined,
        pickup: type === "pickup" ? { slotAt: pickupSlotAt } : undefined,
        paymentRequired: false,
      };
      const key = cryptoRandomKey();
      const { data } = await api.post("/api/orders", payload, { headers: { "x-idempotency-key": key } });
      setMessage({ text: `✅ Order placed! Reference: ${data.order.orderNo}`, ok: true });
      clearCart();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || "Order failed. Please try again.", ok: false });
    } finally {
      setLoading(false);
    }
  }

  const displayItems = activeCategory ? (grouped[activeCategory] || []) : items;

  return (
    <div className="grid lg:grid-cols-[1fr,340px] gap-6 items-start">
      {/* Left: menu catalog */}
      <div>
        <div className="mb-6">
          <div className="section-label mb-1">Our Menu</div>
          <h1 className="font-display text-3xl font-semibold text-stone-900">Choose your favorites</h1>
          <p className="text-stone-500 mt-1 text-sm">Fresh ingredients, crafted daily by our kitchen team.</p>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white border border-stone-200 text-stone-600 hover:border-stone-400"
                }`}
              >
                {CATEGORY_ICONS[cat] || "🍴"} {cat}
              </button>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayItems.map(it => (
            <Link key={it._id} to={`/menu/${it._id}`} className="card-premium overflow-hidden group flex flex-col hover:shadow-lift transition-shadow">
              <div className="relative h-44 bg-stone-100 overflow-hidden flex-shrink-0">
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-stone-300">🍴</div>
                )}
                {!it.isActive && (
                  <div className="absolute inset-0 bg-stone-900/50 flex items-center justify-center">
                    <span className="text-white text-xs font-medium bg-stone-900/80 px-3 py-1 rounded-full">Unavailable</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="font-semibold text-stone-900 truncate" title={it.name}>{it.name}</div>
                <div className="text-xs text-stone-500 mt-1 line-clamp-2 flex-1">{it.description}</div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-stone-900">${Number(it.price).toFixed(2)}</span>
                  <button
                    onClick={e => { e.preventDefault(); addToCart(it); }}
                    disabled={!it.isActive}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {displayItems.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <div className="text-4xl mb-2">🍽️</div>
            <div className="text-sm">No items in this category</div>
          </div>
        )}
      </div>

      {/* Right: cart + checkout */}
      <div className="lg:sticky lg:top-24 space-y-4">
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-900 text-base">Cart</h2>
            {cart.length > 0 && (
              <span className="badge">{count} items</span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-8 text-center text-stone-400">
              <div className="text-3xl mb-2">🛒</div>
              <div className="text-xs">Your cart is empty</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {cart.map(c => (
                <div key={c._id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-800 truncate">{c.name}</div>
                    <div className="text-xs text-stone-500">${(c.price * c.quantity).toFixed(2)}</div>
                  </div>
                  <input
                    type="number" min={1} value={c.quantity}
                    onChange={e => updateQty(c._id, Number(e.target.value))}
                    className="border border-stone-200 rounded-lg px-2 py-1 w-14 text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
          <button onClick={() => removeFromCart(c._id)} className="text-stone-400 hover:text-red-500 transition-colors">✕</button>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-100 flex justify-between text-sm font-semibold text-stone-900">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="card-premium p-5 space-y-3">
          <h3 className="font-semibold text-stone-900 text-sm">Order Details</h3>

          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Fulfillment</label>
            <select className="input text-sm" value={type} onChange={e => setType(e.target.value)}>
              <option value="delivery">Delivery</option>
              <option value="pickup">Scheduled Pickup</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-stone-600 block">Guest Details</label>
            <input className="input text-sm" placeholder="Full name" value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} />
            <input className="input text-sm" placeholder="Email" type="email" value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} />
            <input className="input text-sm" placeholder="Phone" value={guest.phone} onChange={e => setGuest({ ...guest, phone: e.target.value })} />
          </div>

          {type === "delivery" ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-stone-600 block">Delivery Info</label>
              <input className="input text-sm" placeholder="Delivery address" value={delivery.address} onChange={e => setDelivery({ ...delivery, address: e.target.value })} />
              <input className="input text-sm" placeholder="Contact details" value={delivery.contactDetails} onChange={e => setDelivery({ ...delivery, contactDetails: e.target.value })} />
              <input className="input text-sm" placeholder="Preferred time window" value={delivery.preferredWindow} onChange={e => setDelivery({ ...delivery, preferredWindow: e.target.value })} />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-stone-600 block">Pickup Slot</label>
              <input className="input text-sm" type="datetime-local" value={pickupSlotAt} onChange={e => setPickupSlotAt(e.target.value)} />
            </div>
          )}

          <button onClick={checkout} disabled={loading} className="btn-primary w-full py-2.5 text-sm rounded-xl mt-2">
            {loading ? "Placing order…" : "Place Order"}
          </button>

          {message.text && (
            <p className={`text-xs mt-2 rounded-lg px-3 py-2 ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
