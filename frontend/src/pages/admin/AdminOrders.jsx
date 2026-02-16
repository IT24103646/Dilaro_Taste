import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/orders/queue");
      setOrders(res.data?.orders || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id, status) => {
    setError("");
    try {
      await api.post(`/api/orders/${id}/status`, { status });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update order");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-gray-600">Queue and status updates</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="font-semibold mb-2">Orders ({orders.length})</div>
        {loading ? (
          <div>Loading...</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-600">No orders</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Order #</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Total</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b">
                    <td className="py-2 pr-3">{o.orderNumber || o._id.slice(-6)}</td>
                    <td className="py-2 pr-3">{o.type}</td>
                    <td className="py-2 pr-3">{o.status}</td>
                    <td className="py-2 pr-3">${Number(o?.totals?.grandTotal ?? 0).toFixed(2)}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(o._id, "confirmed")}>Confirmed</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(o._id, "preparing")}>Preparing</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(o._id, "ready")}>Ready</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(o._id, "dispatched")}>Dispatched</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(o._id, "completed")}>Completed</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(o._id, "cancelled")}>Cancelled</button>
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
