import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

const STATUS_CFG = {
  pending:   { cls: "badge-warning", label: "Pending" },
  confirmed: { cls: "badge-success", label: "Confirmed" },
  cancelled: { cls: "badge-danger",  label: "Cancelled" },
  completed: { cls: "badge-neutral", label: "Completed" },
};

const fmt = (iso) => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function AdminReservations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState("all");

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

  useEffect(() => { load(); }, []);

  const confirm = async (id) => {
    setUpdating(id + "confirm");
    try {
      await api.put(`/api/reservations/${id}`, { status: "confirmed" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to confirm");
    } finally { setUpdating(null); }
  };

  const cancel = async (id) => {
    setUpdating(id + "cancel");
    try {
      await api.post(`/api/reservations/${id}/cancel`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to cancel");
    } finally { setUpdating(null); }
  };

  const filters = ["all", "pending", "confirmed", "cancelled"];
  const visible = filter === "all" ? items : items.filter(r => r.status === filter);

  const counts = filters.reduce((acc, f) => {
    acc[f] = f === "all" ? items.length : items.filter(r => r.status === f).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reservations</h1>
          <p className="page-subtitle">Manage room booking requests</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-outline text-xs px-3.5 py-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === f
                ? "bg-stone-800 text-white border-stone-800"
                : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1.5 ${filter === f ? "text-stone-300" : "text-stone-400"}`}>({counts[f]})</span>
          </button>
        ))}
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <p className="font-semibold text-stone-700">No {filter !== "all" ? filter : ""} reservations</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Reference</th>
                  <th className="admin-th">Guest</th>
                  <th className="admin-th">Room</th>
                  <th className="admin-th">Check-in</th>
                  <th className="admin-th">Check-out</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map(r => (
                  <tr key={r._id} className="admin-tr">
                    <td className="admin-td">
                      <span className="font-mono text-xs text-stone-500">{r.referenceNo || r._id?.slice(-6)}</span>
                    </td>
                    <td className="admin-td">
                      <div className="font-medium text-stone-800">{r.guest?.name || "Guest"}</div>
                      <div className="text-xs text-stone-400">{r.guest?.email}</div>
                    </td>
                    <td className="admin-td">
                      <div className="font-medium text-stone-700">{r.room?.name || "—"}</div>
                      {r.room?.code && <div className="text-xs text-stone-400">{r.room.code}</div>}
                    </td>
                    <td className="admin-td text-stone-600 text-xs">{fmtDate(r.startAt)}</td>
                    <td className="admin-td text-stone-600 text-xs">{fmtDate(r.endAt)}</td>
                    <td className="admin-td">
                      <span className={STATUS_CFG[r.status]?.cls || "badge-neutral"}>
                        {STATUS_CFG[r.status]?.label || r.status}
                      </span>
                    </td>
                    <td className="admin-td">
                      <div className="flex gap-2">
                        {r.status === "pending" && (
                          <button
                            disabled={updating === r._id + "confirm"}
                            onClick={() => confirm(r._id)}
                            className="btn-success text-xs px-3 py-1.5"
                          >
                            {updating === r._id + "confirm" ? "…" : "Confirm"}
                          </button>
                        )}
                        {r.status !== "cancelled" && r.status !== "completed" && (
                          <button
                            disabled={updating === r._id + "cancel"}
                            onClick={() => cancel(r._id)}
                            className="btn-danger text-xs px-3 py-1.5"
                          >
                            {updating === r._id + "cancel" ? "…" : "Cancel"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
