import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api.js";

function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function discountLabel(p) {
  const t = p?.discount?.type || "none";
  const v = Number(p?.discount?.value || 0);
  if (t === "percent" && v > 0) return `${v}% off`;
  if (t === "fixed" && v > 0) return `${formatMoney(v)} off`;
  return "";
}

export default function PackageDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setError("");

    api.get(`/api/packages/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setItem(data?.package || null);
      })
      .catch((e) => {
        if (!active) return;
        if (e?.response?.status === 404) {
          setNotFound(true);
          return;
        }
        setError(e?.response?.data?.message || e?.response?.data?.error || e.message || "Failed to load package");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const pricing = useMemo(() => {
    const base = Number(item?.price || 0);
    const final = Number(item?.finalPrice ?? base);
    return { base, final };
  }, [item]);

  if (loading) {
    return (
      <div className="py-20 text-center text-stone-400">
        <div className="text-3xl mb-2">🎉</div>
        <div className="text-sm">Loading…</div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="py-24 text-center">
        <div className="text-5xl mb-4">🎁</div>
        <h2 className="font-display text-2xl text-stone-800 mb-2">Package not found</h2>
        <Link to="/packages" className="btn-primary px-6 py-2 rounded-xl mt-4 inline-flex">← Back to Packages</Link>
      </div>
    );
  }

  const label = discountLabel(item);
  const from = formatDate(item.availableFrom);
  const to = formatDate(item.availableTo);
  const time = [item.timeStart, item.timeEnd].filter(Boolean).join(" – ");

  return (
    <div className="max-w-5xl mx-auto">
      <nav className="text-xs text-stone-400 mb-6 flex items-center gap-1.5">
        <Link to="/" className="hover:text-stone-600">Home</Link>
        <span>/</span>
        <Link to="/packages" className="hover:text-stone-600">Packages</Link>
        <span>/</span>
        <span className="text-stone-700">{item.name}</span>
      </nav>

      {error ? <div className="alert-error mb-4">{error}</div> : null}

      <div className="grid md:grid-cols-[1fr,360px] gap-8 items-start">
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="section-label">Parties & Events</div>
              {label ? (
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">{label}</span>
              ) : null}
            </div>
            <h1 className="font-display text-3xl font-semibold text-stone-900 leading-tight">{item.name}</h1>

            <div className="mt-3 flex items-end gap-3">
              {pricing.final !== pricing.base && pricing.base > 0 ? (
                <div className="text-sm text-stone-400 line-through">{formatMoney(pricing.base)}</div>
              ) : null}
              <div className="text-2xl font-bold text-stone-900">{formatMoney(pricing.final)}</div>
            </div>
          </div>

          {item.description ? (
            <p className="text-stone-600 leading-relaxed text-sm">{item.description}</p>
          ) : (
            <p className="text-stone-500 text-sm">No description provided.</p>
          )}

          {(item.includes || []).length > 0 ? (
            <div>
              <div className="text-sm font-semibold text-stone-800 mb-2">What’s included</div>
              <div className="flex flex-wrap gap-2">
                {item.includes.map((x) => (
                  <span key={x} className="badge bg-stone-100 text-stone-700">{x}</span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="admin-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-stone-500">Available packs</span>
            <span className="font-semibold text-stone-800">{Number(item.packCount || 0)}</span>
          </div>

          {(from || to) ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-stone-500">Date</span>
              <span className="text-sm font-medium text-stone-800">{from || "—"}{to ? ` → ${to}` : ""}</span>
            </div>
          ) : null}

          {time ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-stone-500">Time</span>
              <span className="text-sm font-medium text-stone-800">{time}</span>
            </div>
          ) : null}

          <div className="pt-3 border-t border-stone-100 space-y-2">
            <div className="text-xs text-stone-500">To book this package, contact us with the package name.</div>
            <Link to="/contact" className="btn-primary w-full justify-center">Contact Us</Link>
            <Link to="/packages" className="btn-outline w-full justify-center">← Back</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
