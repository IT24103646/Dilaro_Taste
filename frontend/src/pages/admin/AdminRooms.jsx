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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Rooms</h1>
        <p className="text-gray-600">Manage rooms and statuses</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="font-semibold mb-2">Add Room</div>
        <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Code</div>
            <input className="border rounded w-full p-2" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Name</div>
            <input className="border rounded w-full p-2" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Capacity</div>
            <input type="number" className="border rounded w-full p-2" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} required />
          </label>
          <label className="text-sm md:col-span-3">
            <div className="text-gray-600 mb-1">Description</div>
            <textarea className="border rounded w-full p-2" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Base price/hour</div>
            <input type="number" step="0.01" className="border rounded w-full p-2" value={form.basePricePerHour} onChange={(e) => setForm((f) => ({ ...f, basePricePerHour: e.target.value }))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Status</div>
            <select className="border rounded w-full p-2" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Out-of-Service">Out-of-Service</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Amenities (comma-separated)</div>
            <input className="border rounded w-full p-2" value={form.amenities} onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))} placeholder="e.g. projector, whiteboard" />
          </label>
          <div className="md:col-span-3">
            <div className="text-sm text-gray-600 mb-1">Upload photos</div>
            <input
              type="file"
              accept="image/*"
              className="border rounded w-full p-2 text-sm"
              disabled={createUploading}
              onChange={(e) => onPickCreatePhoto(e.target.files?.[0])}
            />
            <div className="text-xs text-gray-500 mt-1">{createUploading ? "Uploading…" : ""}</div>
            {form.photos?.length ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {form.photos.map((url, idx) => (
                  <div key={url + idx} className="border rounded p-2 grid gap-2">
                    <img src={url} alt="Room" className="w-full h-24 object-cover rounded" />
                    <button type="button" className="px-2 py-1 border rounded text-sm" disabled={createUploading} onClick={() => removeCreatePhoto(url, idx)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-3">
            <button className="px-4 py-2 rounded bg-black text-white" type="submit">Create</button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Rooms ({rooms.length})</div>
        {loading ? (
          <div>Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="text-gray-600">No rooms</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Photo</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Capacity</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r._id} className="border-b">
                    <td className="py-2 pr-3">
                      {r.photos?.[0] ? (
                        <img src={r.photos[0]} alt={r.name} className="h-10 w-10 object-cover rounded border" />
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{r.code} — {r.name}</td>
                    <td className="py-2 pr-3">{r.capacity}</td>
                    <td className="py-2 pr-3">{r.status}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <button className="px-2 py-1 border rounded" onClick={() => openEdit(r)}>Edit</button>
                        <button className="px-2 py-1 border rounded text-red-700" onClick={() => setConfirmDeleteId(r._id)}>Delete</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Available")}>Available</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Occupied")}>Occupied</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Cleaning")}>Cleaning</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Maintenance")}>Maintenance</button>
                        <button className="px-2 py-1 border rounded" onClick={() => setStatus(r._id, "Out-of-Service")}>Out-of-Service</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
            <button className="px-3 py-2 border rounded" type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button className="px-3 py-2 rounded bg-black text-white" type="button" disabled={savingEdit} onClick={saveEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        {editForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Code</div>
              <input className="border rounded w-full p-2" value={editForm.code} onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Name</div>
              <input className="border rounded w-full p-2" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Description</div>
              <textarea className="border rounded w-full p-2" rows={3} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Capacity</div>
              <input type="number" className="border rounded w-full p-2" value={editForm.capacity} onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Base price/hour</div>
              <input type="number" step="0.01" className="border rounded w-full p-2" value={editForm.basePricePerHour} onChange={(e) => setEditForm((f) => ({ ...f, basePricePerHour: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Status</div>
              <select className="border rounded w-full p-2" value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Out-of-Service">Out-of-Service</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Amenities (comma-separated)</div>
              <input className="border rounded w-full p-2" value={editForm.amenities} onChange={(e) => setEditForm((f) => ({ ...f, amenities: e.target.value }))} />
            </label>

            <div className="md:col-span-2">
              <div className="text-sm text-gray-600 mb-1">Photos</div>
              <div className="grid gap-2">
                <input type="file" accept="image/*" className="border rounded w-full p-2 text-sm" disabled={editUploading} onChange={(e) => onPickEditPhoto(e.target.files?.[0])} />
                <div className="text-xs text-gray-500">{editUploading ? "Uploading…" : ""}</div>
                {editForm.photos?.length ? (
                  <div className="grid gap-2">
                    {editForm.photos.map((url, idx) => (
                          <div key={url + idx} className="flex items-center justify-between gap-3 border rounded p-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={url} alt="Room" className="h-12 w-12 object-cover rounded border" />
                              <a className="underline text-sm truncate" href={url} target="_blank" rel="noreferrer">{url}</a>
                            </div>
                        <button
                          type="button"
                          className="px-2 py-1 border rounded text-sm"
                          disabled={editUploading}
                          onClick={() => removeEditPhoto(url, idx)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">No photos</div>
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
