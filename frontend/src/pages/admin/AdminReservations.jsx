import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";

export default function AdminReservations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/reservations/calendar");
      setItems(res.data?.reservations || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirm = async (id) => {
    setError("");
    try {
      await api.put(`/api/reservations/${id}`, { status: "confirmed" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update reservation");
    }
  };

  const cancel = async (id) => {
    setError("");
    try {
      await api.post(`/api/reservations/${id}/cancel`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to cancel reservation");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Reservations</h1>
        <p className="text-gray-600">Approve, cancel, manage</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="font-semibold mb-2">Reservations ({items.length})</div>
        {loading ? (
          <div>Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No reservations</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Guest</th>
                  <th className="py-2 pr-3">Room</th>
                  <th className="py-2 pr-3">Start</th>
                  <th className="py-2 pr-3">End</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r._id} className="border-b">
                    <td className="py-2 pr-3">{r.guest?.name || r.guest?.email || "—"}</td>
                    <td className="py-2 pr-3">{r.room?.name || "—"}</td>
                    <td className="py-2 pr-3">{r.startAt ? new Date(r.startAt).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-3">{r.endAt ? new Date(r.endAt).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-3">{r.status}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="px-2 py-1 border rounded" onClick={() => confirm(r._id)}>Confirm</button>
                        <button className="px-2 py-1 border rounded" onClick={() => cancel(r._id)}>Cancel</button>
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
