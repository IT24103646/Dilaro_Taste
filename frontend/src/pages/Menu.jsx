import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useCart } from "../lib/cart.jsx";
import HeroCarousel from "../components/HeroCarousel.jsx";

const DeliveryLocationPickerMap = lazy(() => import("../components/DeliveryLocationPickerMap.jsx"));

function cryptoRandomKey() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const CATEGORY_ICONS = { Starters: "🥗", Mains: "🍛", Desserts: "🍮", Beverages: "🥤", Sides: "🍟" };

export default function Menu() {
  const { cart, addToCart, updateQty, removeFromCart, clearCart, total, count } = useCart();
  const [items, setItems] = useState([]);
  const [type, setType] = useState("delivery");
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [delivery, setDelivery] = useState({ address: "", contactDetails: "", preferredWindow: "", location: null });
  const [pickupSlotAt, setPickupSlotAt] = useState("");
  const [paymentOption, setPaymentOption] = useState("later");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [message, setMessage] = useState({ text: "", ok: true });
  const [successOrderNo, setSuccessOrderNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    api.get("/api/menu").then(r => {
      setItems(r.data.items);
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
    if (type === "delivery" && !delivery.location) {
      return setMessage({ text: "Please choose a delivery location on the map.", ok: false });
    }
    setLoading(true);
    try {
      const payload = {
        type,
        items: cart.map(c => ({ menuItemId: c._id, quantity: c.quantity })),
        guest,
        delivery: type === "delivery" ? {
          ...delivery,
          location: delivery.location
            ? {
                lat: delivery.location.lat,
                lng: delivery.location.lng,
                label: `Pinned by customer (${delivery.location.lat.toFixed(4)}, ${delivery.location.lng.toFixed(4)})`,
              }
            : undefined,
        } : undefined,
        pickup: type === "pickup" ? { slotAt: pickupSlotAt } : undefined,
        paymentRequired: paymentOption === "stripe",
      };
      const key = cryptoRandomKey();
      const { data } = await api.post("/api/orders", payload, { headers: { "x-idempotency-key": key } });

      const created = data?.order;
      if (!created?._id) throw new Error("Order was created but missing id");

      if (paymentOption === "stripe") {
        setMessage({ text: "Redirecting to secure payment portal...", ok: true });
        setSuccessOrderNo(created.orderNo);
        clearCart();

        const session = await api.post("/api/payments/checkout", { kind: "order", id: created._id });
        const url = session?.data?.url;
        if (!url) throw new Error("Payment session did not return a redirect URL");
        window.location.href = url;
        return;
      }

      setMessage({ text: `✅ Order placed! Reference: ${created.orderNo}`, ok: true });
      setSuccessOrderNo(created.orderNo);
      clearCart();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || "Order failed. Please try again.", ok: false });
    } finally {
      setLoading(false);
    }
  }

  const displayItems = activeCategory === "All" ? items : (grouped[activeCategory] || []);
  const cartSubtotal = total;

  async function resolveAddressFromCoords(coords) {
    if (!coords) return;
    setResolvingAddress(true);
    try {
      const { data } = await api.get("/api/orders/geocode/reverse", {
        params: { lat: coords.lat, lng: coords.lng },
      });
      if (data?.address) {
        setDelivery((prev) => ({ ...prev, address: data.address, location: coords }));
      }
    } catch {
      setMessage({ text: "Location selected. Address lookup failed, please enter address manually.", ok: false });
    } finally {
      setResolvingAddress(false);
    }
  }

  async function resolveCoordsFromAddress() {
    const address = String(delivery.address || "").trim();
    if (address.length < 3) {
      setMessage({ text: "Enter a more detailed delivery address first.", ok: false });
      return;
    }

    setLocatingAddress(true);
    try {
      const { data } = await api.get("/api/orders/geocode/forward", {
        params: { address },
      });

      if (data?.lat != null && data?.lng != null) {
        setDelivery((prev) => ({
          ...prev,
          address: data.address || prev.address,
          location: { lat: data.lat, lng: data.lng },
        }));
        setShowLocationPicker(true);
      }
    } catch {
      setMessage({ text: "Could not locate that address on the map. Try a more specific address.", ok: false });
    } finally {
      setLocatingAddress(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage({ text: "Geolocation is not supported by your browser.", ok: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: +position.coords.latitude.toFixed(6),
          lng: +position.coords.longitude.toFixed(6),
        };
        resolveAddressFromCoords(next);
        setShowLocationPicker(true);
      },
      () => setMessage({ text: "Unable to read your current location. Please pick on map.", ok: false }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-8">
      <HeroCarousel
        className="mb-2"
        eyebrow="Our Menu"
        title="Choose your favorites"
        subtitle="Fresh ingredients, crafted daily by our kitchen team."
        primaryAction={{ to: "/track", label: "Track Order" }}
        secondaryAction={{ to: "/contact", label: "Contact Us" }}
      />

      <div className="grid lg:grid-cols-[1fr,360px] gap-6 items-start">
        <section className="space-y-5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="section-label mb-1">Menu Catalog</div>
              <h2 className="font-display text-2xl font-semibold text-stone-900">Explore Dishes</h2>
              <p className="text-stone-500 text-sm mt-0.5">{displayItems.length} items {activeCategory !== "All" ? `in ${activeCategory}` : "available today"}</p>
            </div>
            <div className="text-xs text-stone-500 bg-stone-100 rounded-lg px-3 py-1.5 w-fit">
              Cart: <span className="font-semibold text-stone-800">{count}</span> item{count !== 1 ? "s" : ""}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="card-premium p-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory("All")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeCategory === "All"
                      ? "bg-stone-900 text-white shadow-sm"
                      : "bg-white border border-stone-200 text-stone-600 hover:border-stone-400"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activeCategory === cat
                        ? "bg-stone-900 text-white shadow-sm"
                        : "bg-white border border-stone-200 text-stone-600 hover:border-stone-400"
                    }`}
                  >
                    {CATEGORY_ICONS[cat] || "•"} {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayItems.map((it) => (
              <Link key={it._id} to={`/menu/${it._id}`} className="card-premium overflow-hidden group flex flex-col hover:shadow-lift transition-shadow">
                <div className="relative h-44 bg-stone-100 overflow-hidden flex-shrink-0">
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-stone-300">•</div>
                  )}
                  <div className="absolute top-2 left-2">
                    {it.isVeg ? (
                      <span className="badge-success text-[11px]">VEG</span>
                    ) : (
                      <span className="badge-danger text-[11px]">NON-VEG</span>
                    )}
                  </div>
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
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart(it);
                      }}
                      disabled={!it.isActive}
                      className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {displayItems.length === 0 && (
            <div className="text-center py-14 text-stone-400 card-premium">
              <div className="text-sm">No items found in this category.</div>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 space-y-4">
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-stone-900 text-base">Cart Summary</h3>
              {count > 0 && <span className="badge-neutral">{count} items</span>}
            </div>

            {cart.length === 0 ? (
              <div className="py-8 text-center text-stone-400">
                <div className="text-xs">Your cart is empty</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cart.map((c) => (
                  <div key={c._id} className="flex items-center gap-2 text-sm border border-stone-100 rounded-lg px-2 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-800 truncate">{c.name}</div>
                      <div className="text-xs text-stone-500">${(c.price * c.quantity).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQty(c._id, c.quantity - 1)}
                        className="w-6 h-6 rounded border border-stone-300 text-stone-700 hover:bg-stone-100"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="w-7 text-center text-xs font-semibold">{c.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(c._id, c.quantity + 1)}
                        className="w-6 h-6 rounded border border-stone-300 text-stone-700 hover:bg-stone-100"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(c._id)}
                      className="text-stone-400 hover:text-red-500 transition-colors"
                      aria-label="Remove item"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-100 flex justify-between text-sm font-semibold text-stone-900">
                <span>Subtotal</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="card-premium p-5 space-y-3">
            <h3 className="font-semibold text-stone-900 text-sm">Checkout Details</h3>

            <div>
              <label className="label">Fulfillment</label>
              <select className="input text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="delivery">Delivery</option>
                <option value="pickup">Scheduled Pickup</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="label">Guest Details</label>
              <input className="input text-sm" placeholder="Full name" value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
              <input className="input text-sm" placeholder="Email" type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
              <input className="input text-sm" placeholder="Phone" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
            </div>

            {type === "delivery" ? (
              <div className="space-y-2">
                <label className="label">Delivery Info</label>
                <div className="flex items-center gap-2">
                  <input className="input text-sm" placeholder="Delivery address" value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} />
                  <button
                    type="button"
                    onClick={resolveCoordsFromAddress}
                    disabled={locatingAddress || !delivery.address.trim()}
                    className="text-xs px-2.5 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-white disabled:opacity-50"
                  >
                    {locatingAddress ? "Locating..." : "Locate"}
                  </button>
                </div>
                <input className="input text-sm" placeholder="Contact details" value={delivery.contactDetails} onChange={(e) => setDelivery({ ...delivery, contactDetails: e.target.value })} />
                <input className="input text-sm" placeholder="Preferred time window" value={delivery.preferredWindow} onChange={(e) => setDelivery({ ...delivery, preferredWindow: e.target.value })} />

                <div className="rounded-xl border border-stone-200 p-2.5 bg-stone-50 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-stone-700">Delivery Location Pin</span>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker((v) => !v)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-stone-300 text-stone-700 hover:bg-white"
                    >
                      {showLocationPicker ? "Hide Map" : "View Map"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-stone-500">
                      {delivery.location
                        ? `Selected: ${delivery.location.lat.toFixed(5)}, ${delivery.location.lng.toFixed(5)}`
                        : "No location selected yet"}
                    </div>
                    <button
                      type="button"
                      onClick={useCurrentLocation}
                      className="text-[11px] px-2 py-1 rounded-lg border border-stone-300 text-stone-600 hover:bg-white"
                    >
                      Use Current
                    </button>
                  </div>
                  {resolvingAddress && <div className="text-[11px] text-stone-500">Resolving address from selected location...</div>}

                  {showLocationPicker && (
                    <div className="rounded-xl overflow-hidden border border-stone-200">
                      <Suspense fallback={<div className="h-64 w-full skeleton" />}>
                        <DeliveryLocationPickerMap
                          value={delivery.location}
                          onChange={(coords) => resolveAddressFromCoords(coords)}
                        />
                      </Suspense>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="label">Pickup Slot</label>
                <input className="input text-sm" type="datetime-local" value={pickupSlotAt} onChange={(e) => setPickupSlotAt(e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <label className="label">Payment</label>
              <select className="input text-sm" value={paymentOption} onChange={(e) => setPaymentOption(e.target.value)}>
                <option value="later">Pay later (cash/card)</option>
                <option value="stripe">Pay now (Stripe)</option>
              </select>
              {paymentOption === "stripe" && (
                <div className="text-[11px] text-stone-500">
                  You will be redirected to Stripe’s secure payment portal.
                </div>
              )}
            </div>

            <button onClick={checkout} disabled={loading || cart.length === 0} className="btn-primary w-full py-2.5 text-sm mt-2 disabled:opacity-50">
              {loading
                ? (paymentOption === "stripe" ? "Starting payment..." : "Placing order...")
                : (paymentOption === "stripe" ? "Pay with Stripe" : "Place Order")}
            </button>

            {message.text && (
              <div className={`mt-2 rounded-xl px-3 py-2.5 text-xs ${message.ok ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                <p className={message.ok ? "text-emerald-700" : "text-red-600"}>{message.text}</p>
                {message.ok && successOrderNo && (
                  <Link
                    to={`/track?ref=${successOrderNo}`}
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-900 underline-offset-2 hover:underline transition-colors"
                  >
                    Track your order
                  </Link>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
