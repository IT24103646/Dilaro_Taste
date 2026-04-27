import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { useCart } from "../lib/cart.jsx";

export default function MenuItemDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { addToCart } = useCart();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/menu/${id}`)
      .then(({ data }) => setItem(data.item))
      .catch(err => { if (err?.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="py-20 text-center text-stone-400">
      <div className="text-3xl mb-2">🍴</div>
      <div className="text-sm">Loading…</div>
    </div>
  );

  if (notFound || !item) return (
    <div className="py-24 text-center">
      <div className="text-5xl mb-4">🍽️</div>
      <h2 className="font-display text-2xl text-stone-800 mb-2">Item not found</h2>
      <Link to="/menu" className="btn-primary px-6 py-2 rounded-xl mt-4 inline-flex">← Back to Menu</Link>
    </div>
  );

  // Build ordered photo list: imageUrl first, then extras
  const allPhotos = [
    ...(item.imageUrl ? [item.imageUrl] : []),
    ...(item.photos || []).filter(p => p !== item.imageUrl),
  ];

  function handleAdd() {
    addToCart(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-stone-400 mb-6 flex items-center gap-1.5">
        <Link to="/" className="hover:text-stone-600">Home</Link>
        <span>/</span>
        <Link to="/menu" className="hover:text-stone-600">Menu</Link>
        <span>/</span>
        <span className="text-stone-700">{item.name}</span>
      </nav>

      <div className="grid md:grid-cols-[1fr,420px] gap-8 items-start">
        {/* Gallery */}
        <div>
          {/* Main photo */}
          <div className="relative rounded-2xl overflow-hidden bg-stone-100 aspect-[4/3]">
            {allPhotos.length > 0 ? (
              <>
                <img
                  src={allPhotos[photoIdx]}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {allPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIdx(i => (i - 1 + allPhotos.length) % allPhotos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                    >&#8592;</button>
                    <button
                      onClick={() => setPhotoIdx(i => (i + 1) % allPhotos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
                    >&#8594;</button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allPhotos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPhotoIdx(i)}
                          className={`rounded-full transition-all ${i === photoIdx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/80"}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-stone-200">🍴</div>
            )}
            {!item.isActive && (
              <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
                <span className="text-white font-semibold bg-stone-900/80 px-4 py-2 rounded-full">Currently Unavailable</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {allPhotos.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {allPhotos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPhotoIdx(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${i === photoIdx ? "border-stone-900" : "border-transparent hover:border-stone-300"}`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="section-label">{item.category}</div>
              {item.isVeg
                ? <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-green-50 text-green-700 border border-green-400 rounded px-1.5 py-0.5"><span className="w-2.5 h-2.5 rounded-sm border-2 border-green-600 flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-green-600 block"/></span>VEG</span>
                : <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-50 text-red-700 border border-red-400 rounded px-1.5 py-0.5"><span className="w-2.5 h-2.5 rounded-sm border-2 border-red-600 flex items-center justify-center flex-shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-red-600 block"/></span>NON-VEG</span>
              }
            </div>
            <h1 className="font-display text-3xl font-semibold text-stone-900 leading-tight">{item.name}</h1>
            <div className="mt-3 text-2xl font-bold text-stone-900">${Number(item.price).toFixed(2)}</div>
          </div>

          {item.description && (
            <p className="text-stone-600 leading-relaxed text-sm">{item.description}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {(item.dietaryTags || []).map(tag => (
              <span key={tag} className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">{tag}</span>
            ))}
            {(item.allergens || []).map(a => (
              <span key={a} className="badge bg-amber-50 text-amber-700 border border-amber-200">⚠ {a}</span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleAdd}
              disabled={!item.isActive}
              className={`btn-primary py-3 rounded-xl text-base font-semibold transition-all ${added ? "bg-emerald-600" : ""}`}
            >
              {added ? "✓ Added to Cart" : "+ Add to Cart"}
            </button>
            <Link to="/menu" className="btn-outline py-3 rounded-xl text-base font-medium text-center">
              ← View Full Menu
            </Link>
          </div>

          {/* Popularity hint */}
          {item.orderCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
              <span>🔥</span>
              <span>Ordered <span className="font-semibold text-stone-700">{item.orderCount}</span> times</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
