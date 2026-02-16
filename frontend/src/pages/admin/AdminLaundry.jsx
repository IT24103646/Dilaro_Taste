import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";

export default function AdminLaundry() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ type: "linens", quantity: "" });

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/laundry");
      setItems(res.data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load laundry");
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
      await api.post("/api/laundry", {
        type: form.type.trim(),
        quantity: Number(form.quantity || 0),
      });
      setForm({ type: "linens", quantity: "" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create laundry item");
    }
  };

  const setStatus = async (id, status) => {
    setError("");
    try {
      await api.post(`/api/laundry/${id}/status`, { status, verify: status === "ready" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Laundry</h1>
        <p className="text-gray-600">Track laundry tasks</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="font-semibold mb-2">Add Laundry Task</div>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Type</div>
            <select className="border rounded w-full p-2" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="linens">linens</option>
              <option value="towels">towels</option>
              <option value="uniforms">uniforms</option>
            </select>
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Quantity</div>
            <input type="number" className="border rounded w-full p-2" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} required />
          </label>
          <div className="md:col-span-3">
            <button className="px-4 py-2 rounded bg-black text-white" type="submit">Create</button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Laundry Tasks ({items.length})</div>
        {loading ? (
          <div>Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No laundry tasks</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i._id} className="border-b">
                    <td className="py-2 pr-3">{i.type}</td>
                    <td className="py-2 pr-3">{i.quantity}</td>
                    <td className="py-2 pr-3">{i.status}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(i._id, "soiled")}>Soiled</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(i._id, "queued")}>Queued</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(i._id, "in-progress")}>In-progress</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(i._id, "cleaned")}>Cleaned</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(i._id, "ready")}>Ready (verify)</button>
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
