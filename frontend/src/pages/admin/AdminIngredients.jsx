import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

const REASONS = ["manual_adjust", "stock_received", "waste", "expired", "damaged", "correction"];

const EMPTY_FORM = { name: "", unit: "", stock: "", minThreshold: "" };
const EMPTY_ADJUST = { open: false, id: "", name: "", delta: "", reason: "manual_adjust" };
const QUICK_RESTOCK_STORAGE_KEY = "admin.ingredients.quickRestockSteps";
const DEFAULT_QUICK_STEPS = [1, 5, 10];

function parseQuickSteps(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_QUICK_STEPS;
    const clean = parsed
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0)
      .map((v) => Math.round(v));
    const uniqueSorted = Array.from(new Set(clean)).sort((a, b) => a - b).slice(0, 6);
    return uniqueSorted.length ? uniqueSorted : DEFAULT_QUICK_STEPS;
  } catch {
    return DEFAULT_QUICK_STEPS;
  }
}

export default function AdminIngredients() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [quickUpdating, setQuickUpdating] = useState("");
  const [quickStepInput, setQuickStepInput] = useState("");
  const [quickSteps, setQuickSteps] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_QUICK_STEPS;
    return parseQuickSteps(window.localStorage.getItem(QUICK_RESTOCK_STORAGE_KEY));
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [adjust, setAdjust] = useState(EMPTY_ADJUST);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(QUICK_RESTOCK_STORAGE_KEY, JSON.stringify(quickSteps));
  }, [quickSteps]);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/inventory/kitchen");
      setItems(res.data?.ingredients || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load ingredients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/api/inventory/kitchen", {
        name: form.name.trim(),
        unit: form.unit.trim(),
        stock: Number(form.stock || 0),
        minThreshold: Number(form.minThreshold || 0),
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create ingredient");
    } finally {
      setSaving(false);
    }
  };

  const confirmAdjust = async () => {
    if (!adjust.delta || isNaN(Number(adjust.delta))) return;
    setSaving(true);
    setError("");
    try {
      await api.post(`/api/inventory/kitchen/${adjust.id}/adjust`, {
        delta: Number(adjust.delta),
        reason: adjust.reason,
      });
      setAdjust(EMPTY_ADJUST);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  };

  const lowStock = (item) => item.stock <= item.minThreshold;

  const quickAdjust = async (item, delta, reason = "stock_received") => {
    if (!delta || Number.isNaN(Number(delta))) return;
    const key = `${item._id}:${delta}:${reason}`;
    setQuickUpdating(key);
    setError("");
    try {
      await api.post(`/api/inventory/kitchen/${item._id}/adjust`, {
        delta: Number(delta),
        reason,
      });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to adjust stock");
    } finally {
      setQuickUpdating("");
    }
  };

  const topUpToMinimum = async (item) => {
    const needed = Math.max(0, Number(item.minThreshold || 0) - Number(item.stock || 0));
    if (needed <= 0) return;
    await quickAdjust(item, needed, "stock_received");
  };

  const addQuickStep = () => {
    const value = Number(quickStepInput);
    if (!Number.isFinite(value) || value <= 0) return;
    const next = Array.from(new Set([...quickSteps, Math.round(value)])).sort((a, b) => a - b).slice(0, 6);
    setQuickSteps(next);
    setQuickStepInput("");
  };

  const removeQuickStep = (step) => {
    const next = quickSteps.filter((s) => s !== step);
    if (!next.length) return;
    setQuickSteps(next);
  };

  const resetQuickSteps = () => setQuickSteps(DEFAULT_QUICK_STEPS);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ingredients</h1>
          <p className="page-subtitle">Kitchen inventory management</p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Add form */}
      <div className="admin-card p-5">
        <h2 className="font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Ingredient
        </h2>
        <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" placeholder="e.g. Tomatoes" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Unit *</label>
            <input className="input" placeholder="e.g. kg, pcs, L" value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Initial Stock</label>
            <input type="number" min="0" step="any" className="input" placeholder="0" value={form.stock}
              onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
          </div>
          <div>
            <label className="label">Min Threshold</label>
            <input type="number" min="0" step="any" className="input" placeholder="0" value={form.minThreshold}
              onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Create Ingredient"}
            </button>
          </div>
        </form>
      </div>

      {/* Ingredients table */}
      <div className="admin-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
          <span className="font-semibold text-stone-700 text-sm">Inventory</span>
          <div className="flex items-center gap-3">
            {items.filter(lowStock).length > 0 && (
              <span className="badge-danger">
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {items.filter(lowStock).length} low stock
              </span>
            )}
            <span className="badge-neutral">{items.length} items</span>
          </div>
        </div>

        <div className="px-5 py-3.5 border-b border-stone-100 bg-stone-50/70">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-stone-600">Quick Restock Settings</div>
              <div className="text-[11px] text-stone-500 mt-0.5">Configure one-tap amounts used in each row.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {quickSteps.map((step) => (
                <div key={step} className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2 py-1">
                  <span className="text-[11px] font-semibold text-stone-700">+{step}</span>
                  <button
                    type="button"
                    onClick={() => removeQuickStep(step)}
                    disabled={quickSteps.length <= 1}
                    className="text-stone-400 hover:text-red-500 disabled:opacity-40"
                    title="Remove step"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="w-16 border border-stone-200 rounded-lg px-2 py-1 text-[11px]"
                  placeholder="step"
                  value={quickStepInput}
                  onChange={(e) => setQuickStepInput(e.target.value)}
                />
                <button type="button" onClick={addQuickStep} className="text-[11px] px-2 py-1 rounded-md border border-stone-300 text-stone-700 hover:bg-white">Add</button>
                <button type="button" onClick={resetQuickSteps} className="text-[11px] px-2 py-1 rounded-md border border-stone-300 text-stone-500 hover:bg-white">Reset</button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </div>
            <p className="font-semibold text-stone-700">No ingredients added yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Name</th>
                  <th className="admin-th">Unit</th>
                  <th className="admin-th">Stock</th>
                  <th className="admin-th">Min Threshold</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Adjust Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map(item => (
                  <tr key={item._id} className={`admin-tr ${lowStock(item) ? "bg-red-50/40" : ""}`}>
                    <td className="admin-td font-medium text-stone-800">{item.name}</td>
                    <td className="admin-td text-stone-500">{item.unit}</td>
                    <td className="admin-td">
                      <span className={`font-semibold tabular-nums ${lowStock(item) ? "text-red-600" : "text-stone-800"}`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="admin-td text-stone-500">{item.minThreshold}</td>
                    <td className="admin-td">
                      {lowStock(item)
                        ? <span className="badge-danger">Low Stock</span>
                        : <span className="badge-success">OK</span>
                      }
                    </td>
                    <td className="admin-td">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {quickSteps.map((step) => (
                          <button
                            key={step}
                            type="button"
                            onClick={() => quickAdjust(item, step)}
                            disabled={!!quickUpdating}
                            className="text-[11px] px-2 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            title={`Add ${step} ${item.unit || "units"}`}
                          >
                            +{step}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => topUpToMinimum(item)}
                          disabled={!!quickUpdating || !lowStock(item)}
                          className="text-[11px] px-2 py-1 rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                          title="Top-up stock to the minimum threshold"
                        >
                          To Min
                        </button>
                        <button
                          onClick={() => setAdjust({ open: true, id: item._id, name: item.name, delta: "", reason: "manual_adjust" })}
                          className="btn-ghost text-xs px-2.5 py-1.5 border border-stone-200"
                          disabled={!!quickUpdating}
                          title="Advanced adjustment"
                        >
                          Adjust
                        </button>
                      </div>
                      {quickUpdating && quickUpdating.startsWith(`${item._id}:`) && (
                        <div className="text-[10px] text-stone-400 mt-1">Updating...</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {adjust.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-premium w-full max-w-sm animate-fadeUp">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">Adjust Stock</h3>
              <button onClick={() => setAdjust(EMPTY_ADJUST)} className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-stone-50 rounded-xl px-4 py-3 text-sm font-medium text-stone-700">
                {adjust.name}
              </div>
              <div>
                <label className="label">Delta (positive to add, negative to remove) *</label>
                <input
                  type="number"
                  step="any"
                  className="input"
                  placeholder="e.g. 10 or -5"
                  value={adjust.delta}
                  onChange={e => setAdjust(a => ({ ...a, delta: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Reason</label>
                <select
                  className="input"
                  value={adjust.reason}
                  onChange={e => setAdjust(a => ({ ...a, reason: e.target.value }))}
                >
                  {REASONS.map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-stone-100 flex justify-end gap-2">
              <button onClick={() => setAdjust(EMPTY_ADJUST)} className="btn-ghost border border-stone-200">Cancel</button>
              <button
                onClick={confirmAdjust}
                disabled={saving || !adjust.delta || isNaN(Number(adjust.delta))}
                className="btn-primary"
              >
                {saving ? "Saving…" : "Apply Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
