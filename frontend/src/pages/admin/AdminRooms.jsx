import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ code: "", name: "", capacity: "", status: "Available" });

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/rooms");
      setRooms(res.data?.rooms || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load rooms");
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
      await api.post("/api/rooms", {
        code: form.code.trim(),
        name: form.name.trim(),
        capacity: Number(form.capacity || 1),
        status: form.status,
      });
      setForm({ code: "", name: "", capacity: "", status: "Available" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create room");
    }
  };

  const setStatus = async (id, status) => {
    setError("");
    try {
      await api.post(`/api/rooms/${id}/status`, { to: status });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update room");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Rooms</h1>
        <p className="text-gray-600">Manage rooms and statuses</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="font-semibold mb-2">Add Room</div>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Code</div>
            <input className="border rounded w-full p-2" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Name</div>
            <input className="border rounded w-full p-2" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Capacity</div>
            <input type="number" className="border rounded w-full p-2" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Status</div>
            <select className="border rounded w-full p-2" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Out-of-Service">Out-of-Service</option>
            </select>
          </label>
          <div className="md:col-span-3">
            <button className="px-4 py-2 rounded bg-black text-white" type="submit">Create</button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Rooms ({rooms.length})</div>
        {loading ? (
          <div>Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="text-gray-600">No rooms</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Capacity</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r._id} className="border-b">
                    <td className="py-2 pr-3">{r.code} — {r.name}</td>
                    <td className="py-2 pr-3">{r.capacity}</td>
                    <td className="py-2 pr-3">{r.status}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Available")}>Available</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Occupied")}>Occupied</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Cleaning")}>Cleaning</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Maintenance")}>Maintenance</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Out-of-Service")}>Out-of-Service</button>
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
