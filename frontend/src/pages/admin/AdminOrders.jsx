import { Fragment, useEffect, useState } from "react";
import { api } from "../../lib/api.js";

const ORDER_STATUSES = ["confirmed", "preparing", "ready", "dispatched", "completed", "cancelled"];

const STATUS_CFG = {
  pending:    { cls: "badge-warning",  label: "Pending" },
  confirmed:  { cls: "badge-info",     label: "Confirmed" },
  preparing:  { cls: "badge-info",     label: "Preparing" },
  ready:      { cls: "badge-success",  label: "Ready" },
  dispatched: { cls: "badge-purple",   label: "Dispatched" },
  completed:  { cls: "badge-neutral",  label: "Completed" },
  cancelled:  { cls: "badge-danger",   label: "Cancelled" },
};

const BTN_CFG = {
  confirmed:  "border-blue-200 text-blue-700 hover:bg-blue-50",
  preparing:  "border-amber-200 text-amber-700 hover:bg-amber-50",
  ready:      "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
  dispatched: "border-violet-200 text-violet-700 hover:bg-violet-50",
  completed:  "border-stone-200 text-stone-600 hover:bg-stone-50",
  cancelled:  "border-red-200 text-red-600 hover:bg-red-50",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [speedByOrder, setSpeedByOrder] = useState({});

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

  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    setUpdating(id + status);
    try {
      await api.post(`/api/orders/${id}/status`, { status });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update order");
    } finally {
      setUpdating(null);
    }
  };

  const controlLive = async (id, action, body = {}) => {
    setUpdating(id + action);
    setError("");
    try {
      await api.post(`/api/orders/${id}/live-tracking/${action}`, body);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update live tracking");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Kitchen queue and real-time status management</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-outline text-xs px-3.5 py-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="admin-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
          <span className="font-semibold text-stone-700 text-sm">Orders</span>
          <span className="badge-neutral">{orders.length} total</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
            <p className="font-semibold text-stone-700">No orders in queue</p>
            <p className="text-sm text-stone-400 mt-1">New orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Order #</th>
                  <th className="admin-th">Type</th>
                  <th className="admin-th">Items</th>
                  <th className="admin-th">Total</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map(o => (
                  <Fragment key={o._id}>
                    <tr
                      className="admin-tr cursor-pointer"
                      onClick={() => setExpandedId(expandedId === o._id ? null : o._id)}
                    >
                      <td className="admin-td">
                        <span className="font-mono text-xs text-stone-500">{o.orderNumber || o._id.slice(-6)}</span>
                      </td>
                      <td className="admin-td">
                        <span className="capitalize font-medium text-stone-700">{o.type}</span>
                      </td>
                      <td className="admin-td text-stone-500">{o.items?.length ?? 0} item(s)</td>
                      <td className="admin-td font-semibold text-stone-800">${Number(o?.totals?.grandTotal ?? 0).toFixed(2)}</td>
                      <td className="admin-td">
                        <span className={STATUS_CFG[o.status]?.cls || "badge-neutral"}>
                          {STATUS_CFG[o.status]?.label || o.status}
                        </span>
                      </td>
                      <td className="admin-td" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-wrap gap-1.5">
                          {ORDER_STATUSES.map(s => (
                            <button
                              key={s}
                              disabled={o.status === s || updating === o._id + s}
                              onClick={() => setStatus(o._id, s)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${BTN_CFG[s]}`}
                            >
                              {updating === o._id + s ? "…" : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {expandedId === o._id && (
                      <tr key={o._id + "-exp"} className="bg-stone-50/80">
                        <td colSpan={6} className="px-5 py-3">
                          {o.type === "delivery" && (
                            <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="text-xs font-semibold text-violet-700 uppercase tracking-wider">Demo Live Tracking Controls</div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-violet-700 font-medium">Speed</label>
                                  <select
                                    className="border border-violet-200 bg-white rounded-lg px-2 py-1 text-xs"
                                    value={speedByOrder[o._id] || "normal"}
                                    onChange={(e) => setSpeedByOrder((s) => ({ ...s, [o._id]: e.target.value }))}
                                  >
                                    <option value="slow">Slow</option>
                                    <option value="normal">Normal</option>
                                    <option value="fast">Fast</option>
                                  </select>
                                  <button
                                    type="button"
                                    className="px-2.5 py-1 rounded-lg border border-violet-200 text-violet-700 text-[11px] font-semibold hover:bg-violet-100"
                                    disabled={updating === o._id + "speed"}
                                    onClick={() => controlLive(o._id, "speed", { speedProfile: speedByOrder[o._id] || "normal" })}
                                  >
                                    {updating === o._id + "speed" ? "..." : "Apply"}
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <button type="button" className="px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-50" disabled={updating === o._id + "start"} onClick={() => controlLive(o._id, "start", { speedProfile: speedByOrder[o._id] || "normal" })}>{updating === o._id + "start" ? "..." : "Start"}</button>
                                <button type="button" className="px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 text-[11px] font-semibold hover:bg-amber-50" disabled={updating === o._id + "pause"} onClick={() => controlLive(o._id, "pause")}>{updating === o._id + "pause" ? "..." : "Pause"}</button>
                                <button type="button" className="px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 text-[11px] font-semibold hover:bg-blue-50" disabled={updating === o._id + "resume"} onClick={() => controlLive(o._id, "resume")}>{updating === o._id + "resume" ? "..." : "Resume"}</button>
                                <button type="button" className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 text-[11px] font-semibold hover:bg-red-50" disabled={updating === o._id + "reset"} onClick={() => controlLive(o._id, "reset")}>{updating === o._id + "reset" ? "..." : "Reset"}</button>
                              </div>
                            </div>
                          )}

                          {o.items?.length > 0 && (
                            <>
                          <div className="text-xs font-semibold text-stone-500 mb-2">Order Items</div>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-white rounded-lg border border-stone-100 px-3 py-2">
                                <span className="text-stone-700 text-sm font-medium">{item.name || item.menuItem?.name}</span>
                                <span className="text-stone-400 text-xs ml-auto">×{item.qty}</span>
                                {item.price && <span className="text-stone-600 text-xs">${(item.price * item.qty).toFixed(2)}</span>}
                              </div>
                            ))}
                          </div>
                            </>
                          )}
                          {o.notes && (
                            <div className="mt-2 text-xs text-stone-500">
                              <span className="font-semibold">Notes:</span> {o.notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
