import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card.jsx";
import { api } from "../lib/api.js";

export default function Menu() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [type, setType] = useState("delivery");
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [delivery, setDelivery] = useState({ address: "", contactDetails: "", preferredWindow: "" });
  const [pickupSlotAt, setPickupSlotAt] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/api/menu").then(r => setItems(r.data.items));
  }, []);

  const grouped = useMemo(() => {
    const g = {};
    for (const it of items) (g[it.category] ||= []).push(it);
    return g;
  }, [items]);

  function addToCart(it) {
    setCart(prev => {
      const idx = prev.findIndex(x => x._id === it._id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { ...it, quantity: 1 }];
    });
  }

  function updateQty(id, q) {
    setCart(prev => prev.map(x => x._id === id ? { ...x, quantity: Math.max(1, q) } : x));
  }

  function remove(id) {
    setCart(prev => prev.filter(x => x._id !== id));
  }

  async function checkout() {
    setMessage("");
    if (cart.length === 0) return setMessage("Cart is empty");
    const payload = {
      type,
      items: cart.map(c => ({ menuItemId: c._id, quantity: c.quantity })),
      guest,
      delivery: type === "delivery" ? delivery : undefined,
      pickup: type === "pickup" ? { slotAt: pickupSlotAt } : undefined,
      paymentRequired: false
    };

    // idempotency key to prevent duplicates
    const key = cryptoRandomKey();
    const { data } = await api.post("/api/orders", payload, { headers: { "x-idempotency-key": key } });
    setMessage(`Order created: ${data.order.orderNo} (status: ${data.order.status})`);
    setCart([]);
  }

  function cryptoRandomKey() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  return (
    <div className="grid md:grid-cols-[2fr,1fr] gap-4">
      <Card>
        <h1 className="text-lg font-semibold">Menu</h1>
        <div className="mt-3 grid gap-6">
          {Object.keys(grouped).sort().map(cat => (
            <div key={cat}>
              <h2 className="font-semibold">{cat}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                {grouped[cat].map(it => (
                  <div key={it._id} className="border rounded p-3 bg-white">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-slate-600 mt-1">{it.description}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">${it.price.toFixed(2)}</span>
                      <button onClick={()=>addToCart(it)} className="px-2 py-1 rounded bg-slate-900 text-white text-xs">Add</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Cart</h2>
        <div className="mt-2 grid gap-2">
          {cart.map(c => (
            <div key={c._id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-slate-600">${c.price.toFixed(2)}</div>
              </div>
              <input className="border rounded px-2 py-1 w-16" type="number" value={c.quantity}
                onChange={e=>updateQty(c._id, Number(e.target.value))} />
              <button className="text-xs text-red-600" onClick={()=>remove(c._id)}>Remove</button>
            </div>
          ))}
          {cart.length === 0 ? <p className="text-sm text-slate-600">No items yet.</p> : null}
        </div>

        <hr className="my-3" />

        <div className="grid gap-2 text-sm">
          <label className="font-medium">Fulfillment Type</label>
          <select className="border rounded px-2 py-2" value={type} onChange={e=>setType(e.target.value)}>
            <option value="delivery">Delivery</option>
            <option value="pickup">Pickup (scheduled)</option>
          </select>

          <label className="font-medium mt-2">Guest Details (for guest checkout)</label>
          <input className="border rounded px-2 py-2" placeholder="Name" value={guest.name} onChange={e=>setGuest({...guest, name:e.target.value})} />
          <input className="border rounded px-2 py-2" placeholder="Email" value={guest.email} onChange={e=>setGuest({...guest, email:e.target.value})} />
          <input className="border rounded px-2 py-2" placeholder="Phone" value={guest.phone} onChange={e=>setGuest({...guest, phone:e.target.value})} />

          {type === "delivery" ? (
            <>
              <label className="font-medium mt-2">Delivery</label>
              <input className="border rounded px-2 py-2" placeholder="Address" value={delivery.address} onChange={e=>setDelivery({...delivery, address:e.target.value})} />
              <input className="border rounded px-2 py-2" placeholder="Contact details" value={delivery.contactDetails} onChange={e=>setDelivery({...delivery, contactDetails:e.target.value})} />
              <input className="border rounded px-2 py-2" placeholder="Preferred delivery window" value={delivery.preferredWindow} onChange={e=>setDelivery({...delivery, preferredWindow:e.target.value})} />
            </>
          ) : (
            <>
              <label className="font-medium mt-2">Pickup Slot</label>
              <input className="border rounded px-2 py-2" type="datetime-local" value={pickupSlotAt} onChange={e=>setPickupSlotAt(e.target.value)} />
              <p className="text-xs text-slate-600">Slot validation can be extended with capacity rules.</p>
            </>
          )}

          <button onClick={checkout} className="mt-2 px-3 py-2 rounded bg-emerald-600 text-white">
            Checkout
          </button>

          {message ? <p className="text-sm mt-2">{message}</p> : null}
        </div>
      </Card>
    </div>
  );
}
