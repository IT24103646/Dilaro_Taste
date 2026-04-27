import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";
import { Modal, ConfirmDialog } from "../../components/Modal.jsx";
import { getCloudinaryPublicIdFromUrl, uploadImageToCloudinary } from "../../lib/cloudinary.js";

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    capacity: "",
    basePricePerHour: "",
    status: "Available",
    amenities: "",
    photos: []
  });
  const [createUploading, setCreateUploading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editUploading, setEditUploading] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/rooms");
      setRooms(res.data?.rooms || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/rooms", {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description,
        photos: form.photos,
        capacity: Number(form.capacity || 1),
        amenities: form.amenities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        basePricePerHour: Number(form.basePricePerHour || 0),
        status: form.status,
      });
      setForm({ code: "", name: "", description: "", capacity: "", basePricePerHour: "", status: "Available", amenities: "", photos: [] });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create room");
    }
  };

  const setStatus = async (id, status) => {
    setError("");
    try {
      await api.post(`/api/rooms/${id}/status`, { to: status });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update room");
    }
  };

  const openEdit = (room) => {
    setEditRoom(room);
    setEditForm({
      code: room.code || "",
      name: room.name || "",
      description: room.description || "",
      capacity: String(room.capacity ?? 1),
      basePricePerHour: String(room.basePricePerHour ?? 0),
      status: room.status || "Available",
      photos: Array.isArray(room.photos) ? room.photos : [],
      amenities: (room.amenities || []).join(", ")
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editRoom || !editForm) return;
    setError("");
    setSavingEdit(true);
    try {
      await api.put(`/api/rooms/${editRoom._id}`, {
        code: editForm.code.trim(),
        name: editForm.name.trim(),
        description: editForm.description,
        capacity: Number(editForm.capacity || 1),
        basePricePerHour: Number(editForm.basePricePerHour || 0),
        status: editForm.status,
        photos: editForm.photos,
        amenities: editForm.amenities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      });
      setEditOpen(false);
      setEditRoom(null);
      setEditForm(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update room");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteRoom = async (id) => {
    setError("");
    try {
      await api.delete(`/api/rooms/${id}`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to delete room");
    }
  };

  const onPickEditPhoto = async (file) => {
    if (!file) return;
    setError("");
    setEditUploading(true);
    try {
      const uploaded = await uploadImageToCloudinary(file, { folder: "restaurant-mern/rooms" });
      setEditForm((f) => ({ ...f, photos: [...(f.photos || []), uploaded.url] }));
    } catch (e) {
      setError(e?.message || "Image upload failed");
    } finally {
      setEditUploading(false);
    }
  };

  const onPickCreatePhoto = async (file) => {
    if (!file) return;
    setError("");
    setCreateUploading(true);
    try {
      const uploaded = await uploadImageToCloudinary(file, { folder: "restaurant-mern/rooms" });
      setForm((f) => ({ ...f, photos: [...(f.photos || []), uploaded.url] }));
    } catch (e) {
      setError(e?.message || "Image upload failed");
    } finally {
      setCreateUploading(false);
    }
  };

  const removeCreatePhoto = async (url, idx) => {
    setError("");
    setCreateUploading(true);
    try {
      const publicId = getCloudinaryPublicIdFromUrl(url);
      if (publicId) {
        await api.post("/api/uploads/cloudinary/delete", { publicId, resourceType: "image" });
      }
      setForm((f) => ({ ...f, photos: (f.photos || []).filter((_, i) => i !== idx) }));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to delete image");
    } finally {
      setCreateUploading(false);
    }
  };

  const removeEditPhoto = async (url, idx) => {
    if (!editForm) return;
    setError("");
    setEditUploading(true);
    try {
      const publicId = getCloudinaryPublicIdFromUrl(url);
      if (publicId) {
        await api.post("/api/uploads/cloudinary/delete", { publicId, resourceType: "image" });
      }
      setEditForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to delete image");
    } finally {
      setEditUploading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rooms</h1>
          <p className="page-subtitle">Manage rooms, pricing, photos and availability status</p>
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
          Add Room
        </h3>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className="label">Code</div>
            <input className="input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="label">Name</div>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="label">Capacity</div>
            <input type="number" className="input" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} required />
          </label>
          <label className="text-sm md:col-span-3">
            <div className="label">Description</div>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <label className="text-sm">
            <div className="label">Base price/hour</div>
            <input type="number" step="0.01" className="input" value={form.basePricePerHour} onChange={(e) => setForm((f) => ({ ...f, basePricePerHour: e.target.value }))} />
          </label>
          <label className="text-sm">
            <div className="label">Status</div>
            <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Out-of-Service">Out-of-Service</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <div className="label">Amenities (comma-separated)</div>
            <input className="input" value={form.amenities} onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))} placeholder="e.g. projector, whiteboard" />
          </label>
          <div className="md:col-span-3">
            <div className="text-sm text-gray-600 mb-1">Upload photos</div>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
              disabled={createUploading}
              onChange={(e) => onPickCreatePhoto(e.target.files?.[0])}
            />
            <div className="text-xs text-gray-500 mt-1">{createUploading ? "Uploading…" : ""}</div>
            {form.photos?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {form.photos.map((url, idx) => (
                  <div key={url + idx} className="border rounded p-2 grid gap-2">
                    <img src={url} alt="Room" className="w-full h-24 object-cover rounded" />
                    <button type="button" className="btn-danger text-xs" disabled={createUploading} onClick={() => removeCreatePhoto(url, idx)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-3">
            <button className="btn-primary" type="submit">Create Room</button>
          </div>
        </form>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <span className="font-semibold text-stone-800">Rooms <span className="text-stone-400 font-normal text-sm">({rooms.length})</span></span>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center text-stone-400 text-sm">Loading rooms…</div>
        ) : rooms.length === 0 ? (
          <div className="px-5 py-12 text-center text-stone-400 text-sm">No rooms found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Photo</th>
                  <th className="admin-th">Room</th>
                  <th className="admin-th">Capacity</th>
                  <th className="admin-th">Status</th>
                  <th className="admin-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r._id} className="admin-tr">
                    <td className="admin-td w-14">
                      {r.photos?.[0] ? (
                        <img src={r.photos[0]} alt={r.name} className="h-10 w-10 object-cover rounded-lg border border-stone-200" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" /></svg>
                        </div>
                      )}
                    </td>
                    <td className="admin-td">
                      <div className="font-medium text-stone-800">{r.name}</div>
                      <div className="text-xs text-stone-400">{r.code} · ${r.basePricePerHour}/hr</div>
                    </td>
                    <td className="admin-td text-stone-600">{r.capacity}</td>
                    <td className="admin-td">
                      <span className={`badge-neutral ${
                        r.status === "Available" ? "badge-success" :
                        r.status === "Occupied" ? "badge-info" :
                        r.status === "Cleaning" ? "badge-warning" :
                        r.status === "Maintenance" ? "badge-danger" : "badge-neutral"
                      }`}>{r.status}</span>
                    </td>
                    <td className="admin-td">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <button className="btn-outline text-xs" onClick={() => openEdit(r)}>Edit</button>
                        <button className="btn-danger text-xs" onClick={() => setConfirmDeleteId(r._id)}>Delete</button>
                        <button className="text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors" onClick={() => setStatus(r._id, "Available")}>Available</button>
                        <button className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors" onClick={() => setStatus(r._id, "Occupied")}>Occupied</button>
                        <button className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors" onClick={() => setStatus(r._id, "Cleaning")}>Cleaning</button>
                        <button className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors" onClick={() => setStatus(r._id, "Maintenance")}>Maintenance</button>
                        <button className="text-xs px-2 py-1 rounded-lg bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200 transition-colors" onClick={() => setStatus(r._id, "Out-of-Service")}>Out-of-Service</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={editOpen}
        title={`Edit Room${editRoom ? ` — ${editRoom.code}` : ""}`}
        onClose={() => {
          setEditOpen(false);
          setEditRoom(null);
          setEditForm(null);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-outline" type="button" onClick={() => setEditOpen(false)}>Cancel</button>
            <button className="btn-primary" type="button" disabled={savingEdit} onClick={saveEdit}>{savingEdit ? "Saving…" : "Save Changes"}</button>
          </div>
        }
      >
        {editForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="label">Code</div>
              <input className="input" value={editForm.code} onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="label">Name</div>
              <input className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="label">Description</div>
              <textarea className="input resize-none" rows={3} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="label">Capacity</div>
              <input type="number" className="input" value={editForm.capacity} onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="label">Base price/hour</div>
              <input type="number" step="0.01" className="input" value={editForm.basePricePerHour} onChange={(e) => setEditForm((f) => ({ ...f, basePricePerHour: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="label">Status</div>
              <select className="input" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Out-of-Service">Out-of-Service</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <div className="label">Amenities (comma-separated)</div>
              <input className="input" value={editForm.amenities} onChange={(e) => setEditForm((f) => ({ ...f, amenities: e.target.value }))} />
            </label>

            <div className="md:col-span-2">
              <div className="label mb-1">Photos</div>
              <div className="grid gap-2">
                <input type="file" accept="image/*" className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer" disabled={editUploading} onChange={(e) => onPickEditPhoto(e.target.files?.[0])} />
                <div className="text-xs text-stone-400">{editUploading ? "Uploading…" : ""}</div>
                {editForm.photos?.length ? (
                  <div className="grid gap-2">
                    {editForm.photos.map((url, idx) => (
                          <div key={url + idx} className="flex items-center justify-between gap-3 border border-stone-200 rounded-xl p-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={url} alt="Room" className="h-12 w-12 object-cover rounded-lg border border-stone-200" />
                              <a className="text-brand-600 hover:underline text-xs truncate" href={url} target="_blank" rel="noreferrer">{url}</a>
                            </div>
                        <button
                          type="button"
                          className="btn-danger text-xs"
                          disabled={editUploading}
                          onClick={() => removeEditPhoto(url, idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-stone-400">No photos yet</div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete Room"
        message="This will permanently delete the room. Existing reservations may reference it. Continue?"
        confirmText="Delete"
        danger
        onCancel={() => setConfirmDeleteId("")}
        onConfirm={async () => {
          const id = confirmDeleteId;
          setConfirmDeleteId("");
          await deleteRoom(id);
        }}
      />
    </div>
  );
}
