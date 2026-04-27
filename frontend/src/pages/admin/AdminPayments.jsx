import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";

const fmtMoney = (v) => `$${Number(v || 0).toFixed(2)}`;

function badgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "badge-success";
  if (s === "unpaid") return "badge-warning";
  if (s === "failed") return "badge-danger";
  if (s === "refunded") return "badge-neutral";
  return "badge-neutral";
}

export default function AdminPayments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);

  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState(200);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => {
      const hay = [
        p.kind,
        p.reference,
        p.provider,
        p.paymentStatus,
        p.customerName,
        p.customerEmail,
        p.roomName,
        p.stripeSessionId,
        p.stripePaymentIntentId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [payments, search]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/api/payments/admin", {
        params: { kind, status, limit },
      });
      setPayments(data?.payments || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Stripe and offline payments across orders and reservations</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-outline text-xs px-3.5 py-2">
          Refresh
        </button>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="admin-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">All</option>
              <option value="order">Orders</option>
              <option value="reservation">Reservations</option>
            </select>
          </div>
          <div>
            <label className="label">Payment Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label className="label">Limit</label>
            <input
              className="input"
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value || 200))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Search</label>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order #, email, session id..." />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button className="btn-primary" onClick={load} disabled={loading}>Apply</button>
          <button
            className="btn-outline"
            onClick={() => {
              setKind("all");
              setStatus("all");
              setLimit(200);
              setSearch("");
            }}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
          <div className="font-semibold text-stone-800">Payments</div>
          <div className="text-xs text-stone-400">{loading ? "Loading..." : `${filtered.length} item(s)`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-th">Type</th>
                <th className="admin-th">Reference</th>
                <th className="admin-th">Amount</th>
                <th className="admin-th">Payment</th>
                <th className="admin-th">Provider</th>
                <th className="admin-th">Customer</th>
                <th className="admin-th">Paid At</th>
                <th className="admin-th">Created</th>
                <th className="admin-th">Stripe Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="admin-tr">
                    <td className="admin-td" colSpan={9}><div className="h-6 skeleton rounded-lg" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr className="admin-tr">
                  <td className="admin-td text-stone-400" colSpan={9}>No payments found.</td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={`${p.kind}:${p.id}`} className="admin-tr">
                    <td className="admin-td capitalize">{p.kind}</td>
                    <td className="admin-td font-mono text-xs text-stone-500">{p.reference || String(p.id).slice(-6)}</td>
                    <td className="admin-td font-semibold text-stone-800">{fmtMoney(p.amount)}</td>
                    <td className="admin-td"><span className={badgeClass(p.paymentStatus)}>{p.paymentStatus}</span></td>
                    <td className="admin-td capitalize">{p.provider || "-"}</td>
                    <td className="admin-td">
                      <div className="text-sm text-stone-700">{p.customerName || "—"}</div>
                      <div className="text-[11px] text-stone-400">{p.customerEmail || (p.roomName ? `Room: ${p.roomName}` : "")}</div>
                    </td>
                    <td className="admin-td text-xs text-stone-500">{p.paidAt ? new Date(p.paidAt).toLocaleString() : "—"}</td>
                    <td className="admin-td text-xs text-stone-500">{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</td>
                    <td className="admin-td font-mono text-[11px] text-stone-400">{p.stripeSessionId || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
