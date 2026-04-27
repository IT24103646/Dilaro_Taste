import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { Modal, ConfirmDialog } from "../../components/Modal.jsx";

const EMPTY_FORM = {
  name: "",
  description: "",
  includes: "",
  price: "",
  discountType: "none",
  discountValue: "0",
  packCount: "0",
  availableFrom: "",
  availableTo: "",
  timeStart: "",
  timeEnd: "",
  isActive: true,
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseTimeToMinutes(value) {
  if (!value) return undefined;
  const str = String(value).trim();
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(str);
  if (!m) return undefined;
  return Number(m[1]) * 60 + Number(m[2]);
}

function validatePackageForm(form) {
  const errors = [];

  const name = String(form?.name || "").trim();
  if (!name) errors.push("Name is required");

  const price = toNumber(form?.price);
  if (!Number.isFinite(price) || price < 0) errors.push("Price must be a valid number");

  const packCount = toNumber(form?.packCount);
  if (!Number.isFinite(packCount) || packCount < 0) errors.push("Packs (stock) must be 0 or greater");

  const from = String(form?.availableFrom || "").trim();
  const to = String(form?.availableTo || "").trim();
  if (from && to && from > to) errors.push("Available From must be before Available To");

  const timeStart = String(form?.timeStart || "").trim();
  const timeEnd = String(form?.timeEnd || "").trim();
  const hasStart = !!timeStart;
  const hasEnd = !!timeEnd;
  if (hasStart !== hasEnd) errors.push("Provide both Time Start and Time End");
  if (hasStart && hasEnd) {
    const startMinutes = parseTimeToMinutes(timeStart);
    const endMinutes = parseTimeToMinutes(timeEnd);
    if (startMinutes == null || endMinutes == null) errors.push("Time must be in HH:MM format");
    else if (startMinutes >= endMinutes) errors.push("Time Start must be before Time End");
  }

  const discountType = String(form?.discountType || "none");
  const discountValue = toNumber(form?.discountValue);
  if (!Number.isFinite(discountValue) || discountValue < 0) errors.push("Discount Value must be 0 or greater");
  if (discountType === "none") {
    if (discountValue !== 0) errors.push("Discount Value must be 0 when Discount Type is none");
  } else if (price === 0) {
    if (discountValue !== 0) errors.push("Discount Value must be 0 when Price is 0");
  } else if (discountType === "percent") {
    if (discountValue > 100) errors.push("Percent discount cannot be greater than 100");
  } else if (discountType === "fixed") {
    if (discountValue > price) errors.push("Fixed discount cannot be greater than Price");
  }

  return errors;
}

export default function AdminPackages() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/packages/all");
      setItems(res.data?.packages || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    const copy = [...(items || [])];
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return copy;
  }, [items]);

  const create = async (e) => {
    e.preventDefault();
    const errors = validatePackageForm(form);
    if (errors.length) {
      setError(errors.join(". "));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/api/packages", {
        name: form.name.trim(),
        description: form.description,
        includes: form.includes,
        price: toNumber(form.price),
        discountType: form.discountType,
        discountValue: toNumber(form.discountValue),
        packCount: Math.max(0, Math.round(toNumber(form.packCount))),
        availableFrom: form.availableFrom || undefined,
        availableTo: form.availableTo || undefined,
        timeStart: form.timeStart,
        timeEnd: form.timeEnd,
        isActive: !!form.isActive,
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create package");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      name: item.name || "",
      description: item.description || "",
      includes: (item.includes || []).join(", "),
      price: String(item.price ?? ""),
      discountType: item.discount?.type || "none",
      discountValue: String(item.discount?.value ?? 0),
      packCount: String(item.packCount ?? 0),
      availableFrom: toInputDateTime(item.availableFrom),
      availableTo: toInputDateTime(item.availableTo),
      timeStart: item.timeStart || "",
      timeEnd: item.timeEnd || "",
      isActive: item.isActive !== false,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editItem || !editForm) return;
    const errors = validatePackageForm(editForm);
    if (errors.length) {
      setError(errors.join(". "));
      return;
    }
    setSavingEdit(true);
    setError("");
    try {
      await api.put(`/api/packages/${editItem._id}`, {
        name: editForm.name.trim(),
        description: editForm.description,
        includes: editForm.includes,
        price: toNumber(editForm.price),
        discountType: editForm.discountType,
        discountValue: toNumber(editForm.discountValue),
        packCount: Math.max(0, Math.round(toNumber(editForm.packCount))),
        availableFrom: editForm.availableFrom || undefined,
        availableTo: editForm.availableTo || undefined,
        timeStart: editForm.timeStart,
        timeEnd: editForm.timeEnd,
        isActive: !!editForm.isActive,
      });
      setEditOpen(false);
      setEditItem(null);
      setEditForm(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update package");
    } finally {
      setSavingEdit(false);
    }
  };

  const deletePackage = async (id) => {
    setError("");
    try {
      await api.delete(`/api/packages/${id}`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to delete package");
    }
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Packages</h1>
          <p className="page-subtitle">Party & event packages — pricing, discounts, availability and stock</p>
        </div>
        <button onClick={load} className="btn-outline text-xs gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {error ? <div className="alert-error text-sm">{error}</div> : null}

      <div className="admin-card p-5">
        <h3 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Package
        </h3>

        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm md:col-span-2">
            <div className="label">Name *</div>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>

          <label className="text-sm">
            <div className="label">Packs (stock)</div>
            <input type="number" min="0" step="1" className="input" value={form.packCount} onChange={(e) => setForm((f) => ({ ...f, packCount: e.target.value }))} />
          </label>

          <label className="text-sm md:col-span-3">
            <div className="label">Description</div>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>

          <label className="text-sm md:col-span-3">
            <div className="label">Includes (comma-separated)</div>
            <input className="input" value={form.includes} onChange={(e) => setForm((f) => ({ ...f, includes: e.target.value }))} placeholder="e.g. welcome drink, buffet, DJ" />
          </label>

          <label className="text-sm">
            <div className="label">Price *</div>
            <input type="number" min="0" step="0.01" className="input" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
          </label>

          <label className="text-sm">
            <div className="label">Discount Type</div>
            <select className="input" value={form.discountType} onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}>
              <option value="none">None</option>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="label">Discount Value</div>
            <input
              type="number"
              min="0"
              max={form.discountType === "percent" ? 100 : undefined}
              step="0.01"
              className="input"
              value={form.discountValue}
              onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
            />
          </label>

          <label className="text-sm">
            <div className="label">Available From</div>
            <input type="datetime-local" className="input" value={form.availableFrom} onChange={(e) => setForm((f) => ({ ...f, availableFrom: e.target.value }))} />
          </label>

          <label className="text-sm">
            <div className="label">Available To</div>
            <input type="datetime-local" className="input" value={form.availableTo} onChange={(e) => setForm((f) => ({ ...f, availableTo: e.target.value }))} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="label">Time Start</div>
              <input type="time" className="input" value={form.timeStart} onChange={(e) => setForm((f) => ({ ...f, timeStart: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="label">Time End</div>
              <input type="time" className="input" value={form.timeEnd} onChange={(e) => setForm((f) => ({ ...f, timeEnd: e.target.value }))} />
            </label>
          </div>

          <label className="text-sm flex items-center gap-2 md:col-span-3">
            <input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            <span className="text-stone-700">Active (visible to customers)</span>
          </label>

          <div className="md:col-span-3 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Create Package"}
            </button>
          </div>
        </form>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
          <span className="font-semibold text-stone-700 text-sm">All Packages</span>
          <span className="badge-neutral">{sorted.length} total</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">🎉</div>
            <p className="font-semibold text-stone-700">No packages created yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Name</th>
                  <th className="admin-th">Price</th>
                  <th className="admin-th">Discount</th>
                  <th className="admin-th">Final</th>
                  <th className="admin-th">Packs</th>
                  <th className="admin-th">Availability</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const discountText = p.discount?.type === "percent"
                    ? `${Number(p.discount?.value || 0)}%`
                    : p.discount?.type === "fixed"
                      ? formatMoney(p.discount?.value || 0)
                      : "—";

                  const dateText = [p.availableFrom, p.availableTo]
                    .filter(Boolean)
                    .map((d) => new Date(d).toLocaleDateString())
                    .join(" → ") || "—";

                  const timeText = [p.timeStart, p.timeEnd].filter(Boolean).join(" – ");

                  return (
                    <tr key={p._id} className="admin-tr">
                      <td className="admin-td">
                        <div className="font-semibold text-stone-800">{p.name}</div>
                        {p.description ? <div className="text-xs text-stone-400 line-clamp-1">{p.description}</div> : null}
                      </td>
                      <td className="admin-td">{formatMoney(p.price || 0)}</td>
                      <td className="admin-td">{discountText}</td>
                      <td className="admin-td font-semibold">{formatMoney(p.finalPrice ?? p.price ?? 0)}</td>
                      <td className="admin-td">{Number(p.packCount || 0)}</td>
                      <td className="admin-td">
                        <div className="text-xs text-stone-700">{dateText}</div>
                        {timeText ? <div className="text-[11px] text-stone-400">{timeText}</div> : null}
                      </td>
                      <td className="admin-td">
                        {p.isActive !== false ? <span className="badge-success">Active</span> : <span className="badge-neutral">Hidden</span>}
                      </td>
                      <td className="admin-td">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => openEdit(p)} className="btn-outline text-xs">Edit</button>
                          <button type="button" onClick={() => setConfirmDeleteId(p._id)} className="btn-outline text-xs text-red-600 border-red-200 hover:border-red-300">Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={editOpen}
        title={editItem ? `Edit Package — ${editItem.name}` : "Edit Package"}
        onClose={() => {
          if (savingEdit) return;
          setEditOpen(false);
          setEditItem(null);
          setEditForm(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-3 py-2 border rounded"
              onClick={() => {
                if (savingEdit) return;
                setEditOpen(false);
                setEditItem(null);
                setEditForm(null);
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={savingEdit} onClick={saveEdit}>
              {savingEdit ? "Saving…" : "Save Changes"}
            </button>
          </div>
        }
      >
        {editForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm md:col-span-2">
              <div className="label">Name *</div>
              <input className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </label>

            <label className="text-sm md:col-span-2">
              <div className="label">Description</div>
              <textarea className="input resize-none" rows={2} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </label>

            <label className="text-sm md:col-span-2">
              <div className="label">Includes (comma-separated)</div>
              <input className="input" value={editForm.includes} onChange={(e) => setEditForm((f) => ({ ...f, includes: e.target.value }))} />
            </label>

            <label className="text-sm">
              <div className="label">Price</div>
              <input type="number" min="0" step="0.01" className="input" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
            </label>

            <label className="text-sm">
              <div className="label">Packs (stock)</div>
              <input type="number" min="0" step="1" className="input" value={editForm.packCount} onChange={(e) => setEditForm((f) => ({ ...f, packCount: e.target.value }))} />
            </label>

            <label className="text-sm">
              <div className="label">Discount Type</div>
              <select className="input" value={editForm.discountType} onChange={(e) => setEditForm((f) => ({ ...f, discountType: e.target.value }))}>
                <option value="none">None</option>
                <option value="percent">Percent</option>
                <option value="fixed">Fixed</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="label">Discount Value</div>
              <input
                type="number"
                min="0"
                max={editForm.discountType === "percent" ? 100 : undefined}
                step="0.01"
                className="input"
                value={editForm.discountValue}
                onChange={(e) => setEditForm((f) => ({ ...f, discountValue: e.target.value }))}
              />
            </label>

            <label className="text-sm">
              <div className="label">Available From</div>
              <input type="datetime-local" className="input" value={editForm.availableFrom} onChange={(e) => setEditForm((f) => ({ ...f, availableFrom: e.target.value }))} />
            </label>

            <label className="text-sm">
              <div className="label">Available To</div>
              <input type="datetime-local" className="input" value={editForm.availableTo} onChange={(e) => setEditForm((f) => ({ ...f, availableTo: e.target.value }))} />
            </label>

            <label className="text-sm">
              <div className="label">Time Start</div>
              <input type="time" className="input" value={editForm.timeStart} onChange={(e) => setEditForm((f) => ({ ...f, timeStart: e.target.value }))} />
            </label>

            <label className="text-sm">
              <div className="label">Time End</div>
              <input type="time" className="input" value={editForm.timeEnd} onChange={(e) => setEditForm((f) => ({ ...f, timeEnd: e.target.value }))} />
            </label>

            <label className="text-sm flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={!!editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} />
              <span className="text-stone-700">Active (visible to customers)</span>
            </label>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete package"
        message="This will hide the package from customers (soft delete). You can re-enable it later by editing and setting Active. Continue?"
        confirmText="Delete"
        danger
        onCancel={() => setConfirmDeleteId("")}
        onConfirm={async () => {
          const id = confirmDeleteId;
          setConfirmDeleteId("");
          if (!id) return;
          await deletePackage(id);
        }}
      />
    </div>
  );
}
