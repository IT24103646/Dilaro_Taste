import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
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
    isVeg: false,
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
        isVeg: !!form.isVeg,
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
      setForm({ name: "", category: "", description: "", price: "", imageUrl: "", photos: [], isVeg: false, dietaryTags: "", allergens: "" });
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
      isActive: item.isActive !== false,
      isVeg: !!item.isVeg
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
        isVeg: !!editForm.isVeg,
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
    <div className="space-y-5 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu</h1>
          <p className="page-subtitle">Create and manage menu items</p>
        </div>
        <button onClick={load} className="btn-outline text-xs flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {error ? <div className="alert-error text-sm">{error}</div> : null}

      <div className="admin-card p-5">
        <div className="font-semibold text-stone-800 mb-4">Add Item</div>
        <form onSubmit={createItem} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="label">Name</div>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="label">Category</div>
            <input className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} required />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="label">Description</div>
            <input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <label className="text-sm">
            <div className="label">Price</div>
            <input type="number" step="0.01" className="input" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
          </label>
          <label className="text-sm">
            <div className="label">Image URL</div>
            <input className="input" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          </label>
          <label className="text-sm">
            <div className="label">Upload image</div>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
              disabled={uploading}
              onChange={(e) => onPickCreateImage(e.target.files?.[0])}
            />
            <div className="text-xs text-stone-400 mt-1">{uploading ? "Uploading…" : ""}</div>
          </label>
          <div className="md:col-span-2">
            {form.imageUrl ? (
              <div className="flex items-center gap-3 border border-stone-200 rounded-xl p-3">
                <img src={form.imageUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-stone-200" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-stone-500">Cover image preview</div>
                  <a className="text-brand-600 hover:underline text-sm truncate block" href={form.imageUrl} target="_blank" rel="noreferrer">
                    {form.imageUrl}
                  </a>
                </div>
                <button type="button" className="btn-danger text-xs" disabled={uploading} onClick={removeCreateImage}>
                  Remove
                </button>
              </div>
            ) : (
              <div className="text-sm text-stone-400">No cover image</div>
            )}
          </div>

          {/* Additional photos */}
          <div className="md:col-span-2">
            <div className="label mb-1">Gallery Photos <span className="text-stone-400 font-normal">(optional)</span></div>
            <label className="block">
              <input
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
                disabled={photosUploading}
                onChange={e => { Array.from(e.target.files || []).forEach(f => addCreatePhoto(f)); e.target.value = ""; }}
              />
              {photosUploading && <div className="text-xs text-stone-400 mt-1">Uploading…</div>}
            </label>
            {(form.photos || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.photos.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-20 h-16 object-cover rounded-lg border border-stone-200" />
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
          <label className="text-sm flex items-center gap-2 md:col-span-2 cursor-pointer">
            <input type="checkbox" checked={!!form.isVeg} onChange={(e) => setForm((f) => ({ ...f, isVeg: e.target.checked }))} className="w-4 h-4 accent-green-600" />
            <span className="font-medium text-green-700">Vegetarian item</span>
            <span className="text-xs text-stone-400">(leave unchecked for non-veg)</span>
          </label>
          <label className="text-sm md:col-span-2">
            <div className="label">Dietary tags (comma-separated)</div>
            <input className="input" value={form.dietaryTags} onChange={(e) => setForm((f) => ({ ...f, dietaryTags: e.target.value }))} placeholder="e.g. vegan, gluten-free" />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="label">Allergens (comma-separated)</div>
            <input className="input" value={form.allergens} onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))} placeholder="e.g. nuts, dairy" />
          </label>

          <div className="md:col-span-2">
            <div className="label mb-1">Recipe <span className="text-stone-400 font-normal">(ingredients per 1 item)</span></div>
            <div className="grid gap-2">
              {recipeRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_160px_120px] gap-2">
                  <select
                    className="input text-sm"
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
                    className="input text-sm"
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
                    className="btn-outline text-xs"
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
                  className="btn-outline text-xs"
                  onClick={() => setRecipeRows((rows) => [...rows, { ingredientId: "", quantity: "" }])}
                >
                  + Add ingredient
                </button>
              </div>

              <div className="text-xs text-stone-400">
                Stock is automatically reduced when an order is moved to <b>preparing</b> (Admin → Orders).
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <button className="btn-primary" type="submit">Create Item</button>
          </div>
        </form>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">Active Items <span className="text-stone-400 font-normal">({activeItems.length})</span></h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
        ) : activeItems.length === 0 ? (
          <div className="p-8 text-center text-stone-400">No active items</div>
        ) : (
          <div className="overflow-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-th">Image</th>
                  <th className="admin-th">Name</th>
                  <th className="admin-th">Category</th>
                  <th className="admin-th">Price</th>
                  <th className="admin-th">Type</th>
                  <th className="admin-th">Active</th>
                  <th className="admin-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeItems.map((i) => (
                  <tr key={i._id} className="admin-tr">
                    <td className="admin-td">
                      {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="h-10 w-10 object-cover rounded-lg border border-stone-200" /> : <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-stone-300"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A2.25 2.25 0 0023.25 18V6A2.25 2.25 0 0021 3.75H3A2.25 2.25 0 00.75 6v12A2.25 2.25 0 003 20.25z" /></svg></div>}
                    </td>
                    <td className="admin-td font-medium">{i.name}</td>
                    <td className="admin-td"><span className="badge-info">{i.category}</span></td>
                    <td className="admin-td font-medium">${Number(i.price).toFixed(2)}</td>
                    <td className="admin-td">
                      {i.isVeg
                        ? <span className="badge-success">Veg</span>
                        : <span className="badge-danger">Non-Veg</span>}
                    </td>
                    <td className="admin-td">{i.isActive ? <span className="badge-success">Yes</span> : <span className="badge-neutral">No</span>}</td>
                    <td className="admin-td">
                      <div className="flex gap-2">
                        <button className="btn-outline text-xs" onClick={() => openEdit(i)}>Edit</button>
                        <button className="btn-danger text-xs" onClick={() => setConfirmDeactivateId(i._id)}>Deactivate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Inactive Items</h3>
        </div>
        <div className="overflow-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-th">Name</th>
                <th className="admin-th">Category</th>
                <th className="admin-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.filter((i) => i.isActive === false).length === 0 ? (
                <tr><td colSpan="3" className="admin-td text-center text-stone-400">No inactive items</td></tr>
              ) : items.filter((i) => i.isActive === false).map((i) => (
                <tr key={i._id} className="admin-tr">
                  <td className="admin-td font-medium">{i.name}</td>
                  <td className="admin-td"><span className="badge-info">{i.category}</span></td>
                  <td className="admin-td">
                    <button className="btn-outline text-xs" onClick={() => activate(i._id)}>Activate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
            <button className="btn-outline" type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" type="button" disabled={savingEdit} onClick={saveEdit}>
              {savingEdit ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        {editForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="label">Name</div>
              <input className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="label">Category</div>
              <input className="input" value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="label">Description</div>
              <input className="input" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="label">Price</div>
              <input type="number" step="0.01" className="input" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} />
            </label>
            <label className="text-sm">
              <div className="label">Active</div>
              <select className="input" value={editForm.isActive ? "yes" : "no"} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.value === "yes" }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <div className="label">Image URL</div>
              <input className="input" value={editForm.imageUrl} onChange={(e) => setEditForm((f) => ({ ...f, imageUrl: e.target.value }))} />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="label">Upload new image</div>
              <input type="file" accept="image/*" className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer" disabled={editUploading} onChange={(e) => onPickEditImage(e.target.files?.[0])} />
              <div className="text-xs text-stone-400 mt-1">{editUploading ? "Uploading…" : ""}</div>
            </label>
            <div className="md:col-span-2">
              {editForm.imageUrl ? (
                <div className="flex items-center gap-3 border border-stone-200 rounded-xl p-3">
                  <img src={editForm.imageUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-stone-200" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-stone-500">Cover image</div>
                    <a className="text-brand-600 hover:underline text-sm truncate block" href={editForm.imageUrl} target="_blank" rel="noreferrer">
                      {editForm.imageUrl}
                    </a>
                  </div>
                  <button type="button" className="btn-danger text-xs" disabled={editUploading} onClick={removeEditImage}>
                    Remove
                  </button>
                </div>
              ) : (
                <div className="text-sm text-stone-400">No cover image</div>
              )}
            </div>

            {/* Gallery photos in edit */}
            <div className="md:col-span-2">
              <div className="label mb-1">Gallery Photos <span className="text-stone-400 font-normal">(multiple)</span></div>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
                  disabled={editPhotosUploading}
                  onChange={e => { Array.from(e.target.files || []).forEach(f => addEditPhoto(f)); e.target.value = ""; }}
                />
                {editPhotosUploading && <div className="text-xs text-stone-400 mt-1">Uploading…</div>}
              </label>
              {(editForm.photos || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editForm.photos.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-20 h-16 object-cover rounded-lg border border-stone-200" />
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

            <label className="text-sm flex items-center gap-2 md:col-span-2 cursor-pointer">
              <input type="checkbox" checked={!!editForm.isVeg} onChange={(e) => setEditForm((f) => ({ ...f, isVeg: e.target.checked }))} className="w-4 h-4 accent-green-600" />
              <span className="font-medium text-green-700">Vegetarian item</span>
              <span className="text-xs text-stone-400">(leave unchecked for non-veg)</span>
            </label>
            <label className="text-sm md:col-span-2">
              <div className="label">Dietary tags (comma-separated)</div>
              <input className="input" value={editForm.dietaryTags} onChange={(e) => setEditForm((f) => ({ ...f, dietaryTags: e.target.value }))} />
            </label>
            <label className="text-sm md:col-span-2">
              <div className="label">Allergens (comma-separated)</div>
              <input className="input" value={editForm.allergens} onChange={(e) => setEditForm((f) => ({ ...f, allergens: e.target.value }))} />
            </label>

            <div className="md:col-span-2">
              <div className="label mb-1">Recipe</div>
              <div className="grid gap-2">
                {editRecipeRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_160px_120px] gap-2">
                    <select
                      className="input text-sm"
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
                      className="input text-sm"
                      value={row.quantity}
                      onChange={(e) =>
                        setEditRecipeRows((rows) => rows.map((r, i) => (i === idx ? { ...r, quantity: e.target.value } : r)))
                      }
                      placeholder="Qty"
                    />
                    <button
                      type="button"
                      className="btn-outline text-xs"
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
                    className="btn-outline text-xs"
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
