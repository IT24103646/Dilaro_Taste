import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/api/reports/overview");
        if (mounted) setOverview(res.data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div>Loading...</div>;

  const stats = overview?.stats || {};

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Operational overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <div className="text-sm text-gray-600">Today Orders</div>
          <div className="text-3xl font-semibold">{stats.todayOrders ?? "—"}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Pending Reservations</div>
          <div className="text-3xl font-semibold">{stats.pendingReservations ?? "—"}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Low Stock Items</div>
          <div className="text-3xl font-semibold">{stats.lowStockItems ?? "—"}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Active Rooms</div>
          <div className="text-3xl font-semibold">{stats.activeRooms ?? "—"}</div>
        </Card>
      </div>

      <Card>
        <div className="font-semibold mb-1">Notes</div>
        <div className="text-sm text-gray-600">
          Use the sidebar to manage orders, reservations, menu, inventory, rooms, laundry, users, and reports.
        </div>
      </Card>
    </div>
  );
}
