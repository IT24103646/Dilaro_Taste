import React, { useEffect, useState } from "react";
import { Card } from "../components/Card.jsx";
import { api } from "../lib/api.js";

export default function Admin() {
  const [overview, setOverview] = useState(null);
  const [menu, setMenu] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [newItem, setNewItem] = useState({ name:"", price:0, category:"Mains", description:"" });

  async function refresh() {
    const [o, m, r, rec] = await Promise.all([
      api.get("/api/reports/overview"),
      api.get("/api/menu/all"),
      api.get("/api/rooms"),
      api.get("/api/inventory/kitchen/recommendations")
    ]);
    setOverview(o.data);
    setMenu(m.data.items);
    setRooms(r.data.rooms);
    setRecommendations(rec.data.recommendations);
  }

  useEffect(() => { refresh(); }, []);

  async function addMenuItem() {
    await api.post("/api/menu", { ...newItem, dietaryTags: [], allergens: [], recipe: [] });
    setNewItem({ name:"", price:0, category:"Mains", description:"" });
    await refresh();
  }

  return (
    <div className="grid gap-4">
      <Card>
        <h1 className="text-lg font-semibold">Admin Dashboard</h1>
        {overview ? (
          <div className="grid md:grid-cols-5 gap-3 mt-3 text-sm">
            {Object.entries(overview).map(([k,v]) => (
              <div key={k} className="border rounded p-3">
                <div className="text-slate-600">{k}</div>
                <div className="text-xl font-semibold">{v}</div>
              </div>
            ))}
          </div>
        ) : <p>Loading...</p>}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold">Menu Management</h2>
          <div className="grid gap-2 mt-2 text-sm">
            <div className="grid md:grid-cols-2 gap-2">
              <input className="border rounded px-2 py-2" placeholder="Name" value={newItem.name} onChange={e=>setNewItem({...newItem, name:e.target.value})} />
              <input className="border rounded px-2 py-2" type="number" placeholder="Price" value={newItem.price} onChange={e=>setNewItem({...newItem, price:Number(e.target.value)})} />
              <input className="border rounded px-2 py-2" placeholder="Category" value={newItem.category} onChange={e=>setNewItem({...newItem, category:e.target.value})} />
              <input className="border rounded px-2 py-2" placeholder="Description" value={newItem.description} onChange={e=>setNewItem({...newItem, description:e.target.value})} />
            </div>
            <button onClick={addMenuItem} className="px-3 py-2 rounded bg-slate-900 text-white">Add Item</button>
          </div>

          <div className="mt-3 grid gap-2 text-sm max-h-72 overflow-auto">
            {menu.map(it => (
              <div key={it._id} className="border rounded p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-slate-600">{it.category} — ${it.price.toFixed(2)} — {it.isActive ? "active":"inactive"}</div>
                </div>
                <button
                  className="text-xs px-2 py-1 rounded border"
                  onClick={async()=>{ await api.delete(`/api/menu/${it._id}`); await refresh(); }}
                >
                  Deactivate
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Kitchen Restock Recommendations</h2>
          <div className="mt-3 grid gap-2 text-sm">
            {recommendations.map(r => (
              <div key={r.ingredientId} className="border rounded p-2">
                <div className="font-medium">{r.name}</div>
                <div className="text-slate-600">Need: {r.recommendQty}{r.unit} | Stock: {r.stock}{r.unit} | Avg/day: {r.avgPerDay}{r.unit}</div>
              </div>
            ))}
            {recommendations.length === 0 ? <p className="text-sm text-slate-600">No recommendations.</p> : null}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">Rooms</h2>
        <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
          {rooms.map(r => (
            <div key={r._id} className="border rounded p-3">
              <div className="font-medium">{r.code} — {r.name}</div>
              <div className="text-slate-600">Status: {r.status} | Capacity: {r.capacity}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
