import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";
import { Card } from "../../components/Card.jsx";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    imageUrl: "",
    dietaryTags: "",
    allergens: "",
  });

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.get("/api/menu/all");
      setItems(res.data?.items || []);
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
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        price: toNumber(form.price),
        imageUrl: form.imageUrl.trim(),
        dietaryTags: form.dietaryTags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        allergens: form.allergens
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      await api.post("/api/menu", payload);
      setForm({ name: "", category: "", description: "", price: "", imageUrl: "", dietaryTags: "", allergens: "" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to create item");
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
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Dietary tags (comma-separated)</div>
            <input className="border rounded w-full p-2" value={form.dietaryTags} onChange={(e) => setForm((f) => ({ ...f, dietaryTags: e.target.value }))} placeholder="e.g. vegan, gluten-free" />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-gray-600 mb-1">Allergens (comma-separated)</div>
            <input className="border rounded w-full p-2" value={form.allergens} onChange={(e) => setForm((f) => ({ ...f, allergens: e.target.value }))} placeholder="e.g. nuts, dairy" />
          </label>
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
                    <td className="py-2 pr-3">{i.name}</td>
                    <td className="py-2 pr-3">{i.category}</td>
                    <td className="py-2 pr-3">${Number(i.price).toFixed(2)}</td>
                    <td className="py-2 pr-3">{i.isActive ? "Yes" : "No"}</td>
                    <td className="py-2 pr-3 flex gap-2">
                      <button className="underline text-red-700" onClick={() => deactivate(i._id)}>
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
    </div>
  );
}
