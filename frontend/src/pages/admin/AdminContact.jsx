import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Modal } from "../../components/Modal.jsx";

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
};

const STATUS_CFG = {
  new:        { cls: "badge-info",    label: "New" },
  open:       { cls: "badge-warning", label: "Open" },
  resolved:   { cls: "badge-success", label: "Resolved" },
  spam:       { cls: "badge-danger",  label: "Spam" },
};

export default function AdminContact() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedOpen, setSelectedOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/contact", { params: { limit: 100 } });
      setMessages(res.data?.messages || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openMessage = async (id) => {
    setError("");
    try {
      const res = await api.get(`/api/contact/${id}`);
      setSelected(res.data?.message || null);
      setSelectedOpen(true);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load message");
    }
  };

  const setStatus = async (id, status) => {
    setError("");
    setUpdating(true);
    try {
      await api.put(`/api/contact/${id}`, { status });
      setSelected(m => m ? { ...m, status } : m);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  const filters = ["all", "new", "open", "resolved"];
  const counts = filters.reduce((a, f) => {
    a[f] = f === "all" ? messages.length : messages.filter(m => m.status === f).length;
    return a;
  }, {});
  const visible = filter === "all" ? messages : messages.filter(m => m.status === filter);

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contact Messages</h1>
          <p className="page-subtitle">Guest inquiries submitted via the website</p>
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
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 skeleton rounded-xl" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <p className="font-semibold text-stone-700">No messages</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Date</th>
                  <th className="admin-th">From</th>
                  <th className="admin-th">Subject</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Email</th>
                  <th className="admin-th">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map(m => (
                  <tr key={m._id} className="admin-tr">
                    <td className="admin-td text-stone-400 text-xs whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                    <td className="admin-td">
                      <div className="font-medium text-stone-800">{m.name}</div>
                      <div className="text-xs text-stone-400">{m.email}</div>
                    </td>
                    <td className="admin-td text-stone-600 max-w-[200px] truncate">{m.subject || <span className="text-stone-300 italic">No subject</span>}</td>
                    <td className="admin-td">
                      <span className={STATUS_CFG[m.status]?.cls || "badge-neutral"}>
                        {STATUS_CFG[m.status]?.label || m.status}
                      </span>
                    </td>
                    <td className="admin-td">
                      <span className={m.emailStatus === "sent" ? "badge-success" : "badge-neutral"}>
                        {m.emailStatus || "—"}
                      </span>
                    </td>
                    <td className="admin-td">
                      <button
                        onClick={() => openMessage(m._id)}
                        className="btn-ghost text-xs px-3 py-1.5 border border-stone-200"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={selectedOpen}
        title={selected ? `Message from ${selected.name}` : "Message"}
        onClose={() => { setSelectedOpen(false); setSelected(null); }}
        footer={
          selected ? (
            <div className="flex items-center justify-between gap-2">
              <code className="text-[10px] text-stone-400">{selected._id}</code>
              <div className="flex gap-2">
                <button className="btn-ghost border border-stone-200 text-xs px-3 py-2" onClick={() => setSelectedOpen(false)}>Close</button>
                {selected.status !== "resolved" && (
                  <button
                    className="btn-success text-xs px-3 py-2"
                    disabled={updating}
                    onClick={() => setStatus(selected._id, "resolved")}
                  >
                    {updating ? "Saving…" : "Mark Resolved"}
                  </button>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {selected && (
          <div className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-stone-50 rounded-xl p-4 text-sm">
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">From</div>
                <div className="font-semibold text-stone-800">{selected.name}</div>
                <a href={`mailto:${selected.email}`} className="text-brand-600 hover:underline text-sm">{selected.email}</a>
              </div>
              <div className="bg-stone-50 rounded-xl p-4 text-sm">
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Received</div>
                <div className="font-medium text-stone-700">{fmtDate(selected.createdAt)}</div>
                <div className="flex gap-2 mt-1.5">
                  <span className={STATUS_CFG[selected.status]?.cls || "badge-neutral"}>{STATUS_CFG[selected.status]?.label || selected.status}</span>
                  {selected.emailStatus && <span className="badge-neutral">{selected.emailStatus}</span>}
                </div>
              </div>
            </div>

            {selected.subject && (
              <div>
                <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Subject</div>
                <div className="font-medium text-stone-800">{selected.subject}</div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Message</div>
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
                {selected.message}
              </div>
            </div>

            {selected.emailError && (
              <div className="alert-warning">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div><div className="font-semibold text-xs">Email delivery error</div><div className="mt-0.5">{selected.emailError}</div></div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
