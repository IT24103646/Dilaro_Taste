import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";
import { Modal, ConfirmDialog } from "../../components/Modal.jsx";
import { getCloudinaryPublicIdFromUrl, uploadImageToCloudinary } from "../../lib/cloudinary.js";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    imageUrl: "",
    photos: [],
    dietaryTags: "",
    allergens: "",
  });

  const [recipeRows, setRecipeRows] = useState([{ ingredientId: "", quantity: "" }]);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editRecipeRows, setEditRecipeRows] = useState([{ ingredientId: "", quantity: "" }]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmDeactivateId, setConfirmDeactivateId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [editPhotosUploading, setEditPhotosUploading] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [menuRes, ingRes] = await Promise.all([
        api.get("/api/menu/all"),
        api.get("/api/inventory/kitchen")
      ]);
      setItems(menuRes.data?.items || []);
      setIngredients(ingRes.data?.ingredients || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeItems = useMemo(() => items.filter((i) => i.isActive !== false), [items]);

  const createItem = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const recipe = recipeRows
        .map((r) => ({ ingredient: r.ingredientId, quantity: Number(r.quantity) }))
        .filter((r) => r.ingredient && Number.isFinite(r.quantity) && r.quantity > 0);

      const uniq = new Set();
      for (const r of recipe) {
        if (uniq.has(r.ingredient)) {
          throw new Error("Recipe has duplicate ingredients. Please merge quantities.");
        }
        uniq.add(r.ingredient);
      }

      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        price: toNumber(form.price),
        imageUrl: form.imageUrl.trim(),
        photos: form.photos || [],
        dietaryTags: form.dietaryTags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        allergens: form.allergens
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        recipe,
      };

      await api.post("/api/menu", payload);
      setForm({ name: "", category: "", description: "", price: "", imageUrl: "", photos: [], dietaryTags: "", allergens: "" });
      setRecipeRows([{ ingredientId: "", quantity: "" }]);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create item");
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      name: item.name || "",
      category: item.category || "",
      description: item.description || "",
      price: String(item.price ?? ""),
      imageUrl: item.imageUrl || "",
      photos: item.photos || [],
      dietaryTags: (item.dietaryTags || []).join(", "),
      allergens: (item.allergens || []).join(", "),
      isActive: item.isActive !== false
    });
    const rows = (item.recipe || []).map((r) => ({ ingredientId: String(r.ingredient?._id || r.ingredient), quantity: String(r.quantity ?? "") }));
    setEditRecipeRows(rows.length ? rows : [{ ingredientId: "", quantity: "" }]);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editItem || !editForm) return;
    setError("");
    setSavingEdit(true);
    try {
      const recipe = editRecipeRows
        .map((r) => ({ ingredient: r.ingredientId, quantity: Number(r.quantity) }))
        .filter((r) => r.ingredient && Number.isFinite(r.quantity) && r.quantity > 0);

      const uniq = new Set();
      for (const r of recipe) {
        if (uniq.has(r.ingredient)) throw new Error("Recipe has duplicate ingredients.");
        uniq.add(r.ingredient);
      }

      await api.put(`/api/menu/${editItem._id}`, {
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        description: editForm.description.trim(),
        price: toNumber(editForm.price),
        imageUrl: editForm.imageUrl.trim(),
        photos: editForm.photos || [],
        dietaryTags: editForm.dietaryTags.split(",").map((s) => s.trim()).filter(Boolean),
        allergens: editForm.allergens.split(",").map((s) => s.trim()).filter(Boolean),
        isActive: !!editForm.isActive,
        recipe
      });

      setEditOpen(false);
      setEditItem(null);
      setEditForm(null);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to update item");
    } finally {
      setSavingEdit(false);
    }
  };

  const activate = async (id) => {
    setError("");
    try {
      await api.put(`/api/menu/${id}`, { isActive: true });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to activate item");
    }
  };

  const deactivate = async (id) => {
    setError("");
    try {
      await api.delete(`/api/menu/${id}`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to deactivate item");
    }
  };

  const onPickCreateImage = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const uploaded = await uploadImageToCloudinary(file, { folder: "restaurant-mern/menu" });
      setForm((f) => ({ ...f, imageUrl: uploaded.url }));
    } catch (e) {
      setError(e?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onPickEditImage = async (file) => {
    if (!file) return;
    setError("");
    setEditUploading(true);
    try {
      const uploaded = await uploadImageToCloudinary(file, { folder: "restaurant-mern/menu" });
      setEditForm((f) => ({ ...f, imageUrl: uploaded.url }));
    } catch (e) {
      setError(e?.message || "Image upload failed");
    } finally {
      setEditUploading(false);
    }
  };

  const removeCreateImage = async () => {
    if (!form.imageUrl) return;
    setError("");
    setUploading(true);
    try {
      const publicId = getCloudinaryPublicIdFromUrl(form.imageUrl);
      if (publicId) {
        await api.post("/api/uploads/cloudinary/delete", { publicId, resourceType: "image" });
      }
      setForm((f) => ({ ...f, imageUrl: "" }));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to delete image");
    } finally {
      setUploading(false);
    }
  };

  const removeEditImage = async () => {
    if (!editForm?.imageUrl) return;
    setError("");
    setEditUploading(true);
    try {
      const publicId = getCloudinaryPublicIdFromUrl(editForm.imageUrl);
      if (publicId) {
        await api.post("/api/uploads/cloudinary/delete", { publicId, resourceType: "image" });
      }
      setEditForm((f) => ({ ...f, imageUrl: "" }));
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to delete image");
    } finally {
      setEditUploading(false);
    }
  };

  // --- Multi-photo handlers ---
  const addCreatePhoto = async (file) => {
    if (!file) return;
    setPhotosUploading(true);
    try {
      const uploaded = await uploadImageToCloudinary(file, { folder: "restaurant-mern/menu" });
      setForm((f) => ({ ...f, photos: [...(f.photos || []), uploaded.url] }));
    } catch (e) {
      setError(e?.message || "Photo upload failed");
    } finally {
      setPhotosUploading(false);
    }
  };

  const removeCreatePhoto = async (url) => {
    setPhotosUploading(true);
    try {
      const publicId = getCloudinaryPublicIdFromUrl(url);
      if (publicId) await api.post("/api/uploads/cloudinary/delete", { publicId, resourceType: "image" });
      setForm((f) => ({ ...f, photos: (f.photos || []).filter((p) => p !== url) }));
    } catch (e) {
      setError(e?.message || "Failed to remove photo");
    } finally {
      setPhotosUploading(false);
    }
  };

  const addEditPhoto = async (file) => {
    if (!file) return;
    setEditPhotosUploading(true);
    try {
      const uploaded = await uploadImageToCloudinary(file, { folder: "restaurant-mern/menu" });
      setEditForm((f) => ({ ...f, photos: [...(f.photos || []), uploaded.url] }));
    } catch (e) {
      setError(e?.message || "Photo upload failed");
    } finally {
      setEditPhotosUploading(false);
    }
  };

  const removeEditPhoto = async (url) => {
    setEditPhotosUploading(true);
    try {
      const publicId = getCloudinaryPublicIdFromUrl(url);
      if (publicId) await api.post("/api/uploads/cloudinary/delete", { publicId, resourceType: "image" });
      setEditForm((f) => ({ ...f, photos: (f.photos || []).filter((p) => p !== url) }));
    } catch (e) {
      setError(e?.message || "Failed to remove photo");
    } finally {
      setEditPhotosUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Menu</h1>
        <p className="text-gray-600">Create and manage menu items</p>
      </div>

      {error ? <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3">{error}</div> : null}

      <Card>
        <div className="font-semibold mb-2">Add Item</div>
        <form onSubmit={createItem} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Name</div>
            <input className="border rounded w-full p-2" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Category</div>
            <input className="border rounded w-full p-2" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} required />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Description</div>
            <input className="border rounded w-full p-2" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Price</div>
            <input type="number" step="0.01" className="border rounded w-full p-2" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Image URL</div>
            <input className="border rounded w-full p-2" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Upload image</div>
            <input
              type="file"
              accept="image/*"
              className="border rounded w-full p-2 text-sm"
              disabled={uploading}
              onChange={(e) => onPickCreateImage(e.target.files?.[0])}
            />
            <div className="text-xs text-gray-500 mt-1">{uploading ? "Uploading…" : ""}</div>
          </label>
          <div className="md:col-span-2">
            {form.imageUrl ? (
              <div className="flex items-center gap-3 border rounded p-2">
                <img src={form.imageUrl} alt="Preview" className="h-16 w-16 object-cover rounded border" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-600">Cover image preview</div>
                  <a className="underline text-sm truncate block" href={form.imageUrl} target="_blank" rel="noreferrer">
                    {form.imageUrl}
                  </a>
                </div>
                <button type="button" className="px-3 py-2 border rounded text-sm" disabled={uploading} onClick={removeCreateImage}>
                  Remove
                </button>
              </div>
            ) : (
              <div className="text-sm text-gray-600">No cover image</div>
            )}
          </div>

          {/* Additional photos */}
          <div className="md:col-span-2">
            <div className="text-gray-600 text-sm mb-1 font-medium">Gallery Photos (optional — multiple)</div>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                className="border rounded w-full p-2 text-sm"
                disabled={photosUploading}
                onChange={e => { Array.from(e.target.files || []).forEach(f => addCreatePhoto(f)); e.target.value = ""; }}
              />
              {photosUploading && <div className="text-xs text-gray-500 mt-1">Uploading…</div>}
            </label>
            {(form.photos || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.photos.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-20 h-16 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => removeCreatePhoto(url)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Dietary tags (comma-separated)</div>
            <input className="border rounded w-full p-2" value={form.dietaryTags} onChange={(e) => setForm((f) => ({ ...f, dietaryTags: e.target.value }))} placeholder="e.g. vegan, gluten-free" />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Allergens (comma-separated)</div>
            <input className="border rounded w-full p-2" value={form.allergens} onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))} placeholder="e.g. nuts, dairy" />
          </label>

          <div className="md:col-span-2">
            <div className="text-sm text-gray-600 mb-1">Recipe (ingredients used per 1 item)</div>
            <div className="grid gap-2">
              {recipeRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_160px_120px] gap-2">
                  <select
                    className="border rounded w-full p-2 text-sm"
                    value={row.ingredientId}
                    onChange={(e) =>
                      setRecipeRows((rows) =>
                        rows.map((r, i) => (i === idx ? { ...r, ingredientId: e.target.value } : r))
                      )
                    }
                  >
                    <option value="">Select ingredient…</option>
                    {ingredients.map((ing) => (
                      <option key={ing._id} value={ing._id}>
                        {ing.name} ({ing.unit}) — stock {ing.stock}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="border rounded w-full p-2 text-sm"
                    value={row.quantity}
                    onChange={(e) =>
                      setRecipeRows((rows) =>
                        rows.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r))
                      )
                    }
                    placeholder="Qty"
                  />

                  <button
                    type="button"
                    className="px-3 py-2 border rounded text-sm"
                    onClick={() => setRecipeRows((rows) => rows.filter((_, i) => i !== idx))}
                    disabled={recipeRows.length === 1}
                    title={recipeRows.length === 1 ? "At least one row" : "Remove"}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div>
                <button
                  type="button"
                  className="px-3 py-2 border rounded text-sm"
                  onClick={() => setRecipeRows((rows) => [...rows, { ingredientId: "", quantity: "" }])}
                >
                  + Add ingredient
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Stock is automatically reduced when an order is moved to <b>preparing</b> (Admin → Orders).
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <button className="px-4 py-2 rounded bg-black text-white" type="submit">Create</button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="font-semibold mb-2">Active Items ({activeItems.length})</div>
        {loading ? (
          <div>Loading...</div>
        ) : activeItems.length === 0 ? (
          <div className="text-gray-600">No items</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Image</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Available</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeItems.map((i) => (
                  <tr key={i._id} className="border-b">
                    <td className="py-2 pr-3">
                      {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="h-10 w-10 object-cover rounded border" /> : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-2 pr-3">{i.name}</td>
                    <td className="py-2 pr-3">{i.category}</td>
                    <td className="py-2 pr-3">${Number(i.price).toFixed(2)}</td>
                    <td className="py-2 pr-3">{i.isActive ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3 flex gap-2">
                      <button className="underline" onClick={() => openEdit(i)}>
                        Edit
                      </button>
                      <button className="underline text-red-700" onClick={() => setConfirmDeactivateId(i._id)}>
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="font-semibold mb-2">Inactive Items</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.filter((i) => i.isActive === false).map((i) => (
                <tr key={i._id} className="border-b">
                  <td className="py-2 pr-3">{i.name}</td>
                  <td className="py-2 pr-3">{i.category}</td>
                  <td className="py-2 pr-3">
                    <button className="underline" onClick={() => activate(i._id)}>Activate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={editOpen}
        title={`Edit Menu Item${editItem ? ` — ${editItem.name}` : ""}`}
        onClose={() => {
          setEditOpen(false);
          setEditItem(null);
          setEditForm(null);
          setEditRecipeRows([{ ingredientId: "", quantity: "" }]);
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
              <div className="text-gray-600 mb-1">Name</div>
              <input className="border rounded w-full p-2" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Category</div>
              <input className="border rounded w-full p-2" value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Description</div>
              <input className="border rounded w-full p-2" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Price</div>
              <input type="number" step="0.01" className="border rounded w-full p-2" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="text-gray-600 mb-1">Active</div>
              <select className="border rounded w-full p-2" value={editForm.isActive ? "yes" : "no"} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === "yes" }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Image URL</div>
              <input className="border rounded w-full p-2" value={editForm.imageUrl} onChange={(e) => setEditForm((f) => ({ ...f, imageUrl: e.target.value }))} />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Upload new image</div>
              <input type="file" accept="image/*" className="border rounded w-full p-2 text-sm" disabled={editUploading} onChange={(e) => onPickEditImage(e.target.files?.[0])} />
              <div className="text-xs text-gray-500 mt-1">{editUploading ? "Uploading…" : ""}</div>
            </label>
            <div className="md:col-span-2">
              {editForm.imageUrl ? (
                <div className="flex items-center gap-3 border rounded p-2">
                  <img src={editForm.imageUrl} alt="Preview" className="h-16 w-16 object-cover rounded border" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-600">Cover image</div>
                    <a className="underline text-sm truncate block" href={editForm.imageUrl} target="_blank" rel="noreferrer">
                      {editForm.imageUrl}
                    </a>
                  </div>
                  <button type="button" className="px-3 py-2 border rounded text-sm" disabled={editUploading} onClick={removeEditImage}>
                    Remove
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No cover image</div>
              )}
            </div>

            {/* Gallery photos in edit */}
            <div className="md:col-span-2">
              <div className="text-gray-600 text-sm mb-1 font-medium">Gallery Photos (multiple)</div>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="border rounded w-full p-2 text-sm"
                  disabled={editPhotosUploading}
                  onChange={e => { Array.from(e.target.files || []).forEach(f => addEditPhoto(f)); e.target.value = ""; }}
                />
                {editPhotosUploading && <div className="text-xs text-gray-500 mt-1">Uploading…</div>}
              </label>
              {(editForm.photos || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editForm.photos.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-20 h-16 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => removeEditPhoto(url)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Dietary tags (comma-separated)</div>
              <input className="border rounded w-full p-2" value={editForm.dietaryTags} onChange={(e) => setEditForm((f) => ({ ...f, dietaryTags: e.target.value }))} />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="text-gray-600 mb-1">Allergens (comma-separated)</div>
              <input className="border rounded w-full p-2" value={editForm.allergens} onChange={(e) => setEditForm((f) => ({ ...f, allergens: e.target.value }))} />
            </label>

            <div className="md:col-span-2">
              <div className="text-sm text-gray-600 mb-1">Recipe</div>
              <div className="grid gap-2">
                {editRecipeRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_160px_120px] gap-2">
                    <select
                      className="border rounded w-full p-2 text-sm"
                      value={row.ingredientId}
                      onChange={(e) =>
                        setEditRecipeRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ingredientId: e.target.value } : r)))
                      }
                    >
                      <option value="">Select ingredient…</option>
                      {ingredients.map((ing) => (
                        <option key={ing._id} value={ing._id}>
                          {ing.name} ({ing.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="border rounded w-full p-2 text-sm"
                      value={row.quantity}
                      onChange={(e) =>
                        setEditRecipeRows((rows) => rows.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)))
                      }
                      placeholder="Qty"
                    />
                    <button
                      type="button"
                      className="px-3 py-2 border rounded text-sm"
                      onClick={() => setEditRecipeRows((rows) => rows.filter((_, i) => i !== idx))}
                      disabled={editRecipeRows.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    className="px-3 py-2 border rounded text-sm"
                    onClick={() => setEditRecipeRows((rows) => [...rows, { ingredientId: "", quantity: "" }])}
                  >
                    + Add ingredient
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeactivateId}
        title="Deactivate Menu Item"
        message="This will hide the item from the public menu. You can re-activate it later."
        confirmText="Deactivate"
        danger
        onCancel={() => setConfirmDeactivateId("")}
        onConfirm={async () => {
          const id = confirmDeactivateId;
          setConfirmDeactivateId("");
          await deactivate(id);
        }}
      />
    </div>
  );
}
