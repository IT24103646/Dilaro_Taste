import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";

export default function AdminIngredients() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    unit: "",
    stock: "",
    minThreshold: "",
  });

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/inventory/kitchen");
      setItems(res.data?.ingredients || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load ingredients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/inventory/kitchen", {
        name: form.name.trim(),
        unit: form.unit.trim(),
        stock: Number(form.stock || 0),
        minThreshold: Number(form.minThreshold || 0),
      });
      setForm({ name: "", unit: "", stock: "", minThreshold: "" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create ingredient");
    }
  };

  const adjust = async (id, delta) => {
    setError("");
    try {
      const reason = window.prompt("Reason for stock adjustment?", "manual_adjust") || "manual_adjust";
      await api.post(`/api/inventory/kitchen/${id}/adjust`, { delta: Number(delta), reason });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to adjust stock");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ingredients</h1>
        <p className="text-gray-600">Kitchen inventory</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="font-semibold mb-2">Add Ingredient</div>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Name</div>
            <input className="border rounded w-full p-2" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Unit</div>
            <input className="border rounded w-full p-2" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="e.g. kg, pcs" required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Stock</div>
            <input type="number" className="border rounded w-full p-2" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Min threshold</div>
            <input type="number" className="border rounded w-full p-2" value={form.minThreshold} onChange={(e) => setForm((f) => ({ ...f, minThreshold: e.target.value }))} />
          </label>
          <div className="md:col-span-2">
            <button className="px-4 py-2 rounded bg-black text-white" type="submit">Create</button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Ingredients ({items.length})</div>
        {loading ? (
          <div>Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No ingredients</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Unit</th>
                  <th className="py-2 pr-3">Stock</th>
                  <th className="py-2 pr-3">Min Threshold</th>
                  <th className="py-2 pr-3">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i._id} className="border-b">
                    <td className="py-2 pr-3">{i.name}</td>
                    <td className="py-2 pr-3">{i.unit}</td>
                    <td className="py-2 pr-3">{i.stock}</td>
                    <td className="py-2 pr-3">{i.minThreshold}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 border rounded" onClick={() => adjust(i._id, 1)}>+1</button>
                        <button className="px-2 py-1 border rounded" onClick={() => adjust(i._id, -1)}>-1</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
