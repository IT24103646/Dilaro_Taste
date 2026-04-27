import React, { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api.js";
import { uploadImageToCloudinary } from "../../lib/cloudinary.js";

export default function AdminHero() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", order: 0 });
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const fileRef = useRef();

  async function load() {
    try {
      const { data } = await api.get("/api/hero/all");
      setSlides(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(e) {
    e.preventDefault();
    setErr("");
    const file = fileRef.current?.files?.[0];
    if (!file) return setErr("Please select an image file");
    setUploading(true);
    try {
      const uploaded = await uploadImageToCloudinary(file, { folder: "restaurant-mern/hero" });
      await api.post("/api/hero", {
        imageUrl: uploaded.url,
        cloudinaryPublicId: uploaded.publicId,
        title: form.title,
        subtitle: form.subtitle,
        order: Number(form.order) || 0,
      });
      setForm({ title: "", subtitle: "", order: 0 });
      fileRef.current.value = "";
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(slide) {
    try {
      await api.put(`/api/hero/${slide._id}`, { active: !slide.active });
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  }

  async function deleteSlide(id) {
    if (!window.confirm("Delete this slide? The image will also be removed from Cloudinary.")) return;
    try {
      await api.delete(`/api/hero/${id}`);
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  }

  async function saveEdit(id) {
    try {
      await api.put(`/api/hero/${id}`, {
        title: editForm.title,
        subtitle: editForm.subtitle,
        order: Number(editForm.order) || 0,
      });
      setEditId(null);
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || e.message);
    }
  }

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hero Carousel</h1>
          <p className="page-subtitle">Manage the homepage hero slideshow images and text</p>
        </div>
        <button onClick={load} className="btn-outline text-xs gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
      </div>

      {err && <div className="alert-error text-sm">{err}</div>}

      {/* Upload form */}
      <form onSubmit={handleUpload} className="card-premium p-5 mb-6 space-y-3">
        <h3 className="font-medium text-stone-800">Add New Slide</h3>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Title <span className="text-stone-400">(optional)</span></label>
            <input
              className="input"
              placeholder="e.g. Welcome to Restaurant"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Subtitle <span className="text-stone-400">(optional)</span></label>
            <input
              className="input"
              placeholder="e.g. Fine dining & comfortable rooms"
              value={form.subtitle}
              onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Display Order</label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.order}
              onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">Image</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="block w-full text-sm text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-100 file:text-stone-700 hover:file:bg-stone-200 cursor-pointer"
              required
            />
          </div>
        </div>

        <button type="submit" disabled={uploading} className="btn-primary px-6 py-2 rounded-xl">
          {uploading ? "Uploading…" : "Upload & Add Slide"}
        </button>
      </form>

      {/* Slides list */}
      {loading ? (
        <p className="text-stone-500 text-sm">Loading slides…</p>
      ) : slides.length === 0 ? (
        <p className="text-stone-500 text-sm">No slides yet. Upload the first image above.</p>
      ) : (
        <div className="space-y-3">
          {slides.map(slide => (
            <div key={slide._id} className="card-premium p-4 flex flex-col sm:flex-row gap-4">
              {/* Thumbnail */}
              <img
                src={slide.imageUrl}
                alt={slide.title || "slide"}
                className="w-full sm:w-36 h-24 object-cover rounded-xl flex-shrink-0 bg-stone-100"
              />

              {/* Info / edit */}
              <div className="flex-1 min-w-0">
                {editId === slide._id ? (
                  <div className="space-y-2">
                    <input
                      className="input text-sm"
                      placeholder="Title"
                      value={editForm.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    />
                    <input
                      className="input text-sm"
                      placeholder="Subtitle"
                      value={editForm.subtitle}
                      onChange={e => setEditForm(f => ({ ...f, subtitle: e.target.value }))}
                    />
                    <input
                      className="input text-sm w-28"
                      type="number"
                      min={0}
                      placeholder="Order"
                      value={editForm.order}
                      onChange={e => setEditForm(f => ({ ...f, order: e.target.value }))}
                    />
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => saveEdit(slide._id)} className="btn-primary text-xs px-4 py-1.5 rounded-lg">Save</button>
                      <button onClick={() => setEditId(null)} className="btn-outline text-xs px-4 py-1.5 rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-stone-800 truncate">{slide.title || <span className="text-stone-400 italic">No title</span>}</p>
                    <p className="text-sm text-stone-500 truncate">{slide.subtitle || <span className="italic">No subtitle</span>}</p>
                    <p className="text-xs text-stone-400 mt-1">Order: {slide.order}</p>
                  </>
                )}
              </div>

              {/* Actions */}
              {editId !== slide._id && (
                <div className="flex sm:flex-col gap-2 flex-shrink-0 items-start">
                  <button
                    onClick={() => { setEditId(slide._id); setEditForm({ title: slide.title, subtitle: slide.subtitle, order: slide.order }); }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(slide)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${slide.active ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : "border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100"}`}
                  >
                    {slide.active ? "Active" : "Hidden"}
                  </button>
                  <button
                    onClick={() => deleteSlide(slide._id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
