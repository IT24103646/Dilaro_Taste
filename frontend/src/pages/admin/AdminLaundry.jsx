import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

const STATUS_CONFIG = {
  soiled:       { label: "Soiled",      color: "bg-rose-100 text-rose-700 border-rose-200" },
  queued:       { label: "Queued",      color: "bg-amber-100 text-amber-700 border-amber-200" },
  "in-progress":{ label: "In Progress", color: "bg-blue-100 text-blue-700 border-blue-200" },
  cleaned:      { label: "Cleaned",     color: "bg-teal-100 text-teal-700 border-teal-200" },
  ready:        { label: "Ready",       color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const NEXT_STATUS = {
  soiled:       "queued",
  queued:       "in-progress",
  "in-progress":"cleaned",
  cleaned:      "ready",
};

const TYPE_ICONS = { linens: "🛏️", towels: "🏃", uniforms: "👔" };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-stone-100 text-stone-600 border-stone-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function AdminLaundry() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    type: "linens",
    quantity: "",
    assignedTo: "",
    dueAt: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/laundry");
      setItems(res.data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load laundry tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/api/laundry", {
        type: form.type,
        quantity: Number(form.quantity || 0),
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        assignedTo: form.assignedTo.trim(),
        dueAt: form.dueAt || undefined,
      });
      setForm({ customerName: "", customerPhone: "", type: "linens", quantity: "", assignedTo: "", dueAt: "" });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create laundry task");
    } finally {
      setSaving(false);
    }
  };

  const advance = async (item) => {
    const next = NEXT_STATUS[item.status];
    if (!next) return;
    setActionLoading(item._id);
    setError("");
    try {
      await api.post(`/api/laundry/${item._id}/status`, { status: next, verify: next === "ready" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update status");
    } finally {
      setActionLoading("");
    }
  };

  const setStatus = async (id, status) => {
    setActionLoading(id);
    setError("");
    try {
      await api.post(`/api/laundry/${id}/status`, { status, verify: status === "ready" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update status");
    } finally {
      setActionLoading("");
    }
  };

  const filtered = items.filter(i => {
    const matchStatus = filterStatus === "all" || i.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q
      || (i.customerName || "").toLowerCase().includes(q)
      || (i.customerPhone || "").toLowerCase().includes(q)
      || i.type.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = items.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Laundry Management</h1>
          <p className="text-stone-500 text-sm mt-0.5">Track laundry tasks and customer pickups</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary"
        >
          {showForm ? "✕ Cancel" : "+ New Task"}
        </button>
      </div>

      {error && (
        <div className="alert-error text-sm">{error}</div>
      )}

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterStatus === "all" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
        >
          All ({items.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterStatus === key ? `${cfg.color} border-current` : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
          >
            {cfg.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-stone-800 mb-5">New Laundry Task</h2>
          <form onSubmit={create} className="space-y-5">

            {/* Customer block */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Customer Information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 rounded-xl p-4 border border-stone-100">
                <label className="block">
                  <span className="text-xs font-medium text-stone-600 block mb-1.5">Customer Name <span className="text-red-500">*</span></span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Smith"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                    value={form.customerName}
                    onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-stone-600 block mb-1.5">Phone Number <span className="text-red-500">*</span></span>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 555 000 1234"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                    value={form.customerPhone}
                    onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            {/* Task details block */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Task Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-medium text-stone-600 block mb-1.5">Type</span>
                  <select
                    className="input"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="linens">🛏️ Linens</option>
                    <option value="towels">🏃 Towels</option>
                    <option value="uniforms">👔 Uniforms</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-stone-600 block mb-1.5">Quantity <span className="text-red-500">*</span></span>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 5"
                    className="input"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-stone-600 block mb-1.5">Assigned To <span className="text-stone-400">(optional)</span></span>
                  <input
                    type="text"
                    placeholder="Staff or vendor name"
                    className="input"
                    value={form.assignedTo}
                    onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-stone-600 block mb-1.5">Due By <span className="text-stone-400">(optional)</span></span>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.dueAt}
                    onChange={e => setForm(f => ({ ...f, dueAt: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "Creating…" : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm pointer-events-none">🔍</span>
        <input
          type="search"
          placeholder="Search by customer name, phone, or type…"
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Task list */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <span className="font-semibold text-stone-800">Tasks</span>
          <span className="text-xs text-stone-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-stone-400 text-sm">Loading tasks…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-2">👔</div>
            <div className="text-stone-400 text-sm">No laundry tasks found</div>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filtered.map(item => (
              <div key={item._id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{TYPE_ICONS[item.type] || "🧺"}</span>
                    <span className="font-semibold text-stone-900 capitalize">{item.type}</span>
                    <span className="text-stone-400 text-xs bg-stone-100 px-2 py-0.5 rounded-full">×{item.quantity}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {item.customerName ? (
                      <span className="text-sm text-stone-800 font-medium flex items-center gap-1.5">
                        <span className="text-xs">👤</span>{item.customerName}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-400 italic">No customer name</span>
                    )}
                    {item.customerPhone && (
                      <a href={`tel:${item.customerPhone}`} className="text-sm text-stone-500 hover:text-stone-800 flex items-center gap-1.5 transition-colors">
                        <span className="text-xs">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 inline"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                        </span>{item.customerPhone}
                      </a>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-stone-400">
                    {item.assignedTo && <span>Assigned: <span className="text-stone-600">{item.assignedTo}</span></span>}
                    {item.dueAt && <span>Due: <span className="text-stone-600">{new Date(item.dueAt).toLocaleString()}</span></span>}
                    <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  {NEXT_STATUS[item.status] && (
                    <button
                      onClick={() => advance(item)}
                      disabled={actionLoading === item._id}
                      className="btn-primary text-xs"
                    >
                      {actionLoading === item._id ? "Updating…" : `→ ${STATUS_CONFIG[NEXT_STATUS[item.status]]?.label}`}
                    </button>
                  )}
                  <select
                    disabled={actionLoading === item._id}
                    className="border border-stone-200 rounded-lg text-xs px-2 py-1.5 text-stone-600 cursor-pointer focus:outline-none hover:border-stone-400 transition-colors"
                    value={item.status}
                    onChange={e => setStatus(item._id, e.target.value)}
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

