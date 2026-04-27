import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import HeroCarousel from "../components/HeroCarousel.jsx";

function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function discountLabel(p) {
  const t = p?.discount?.type || "none";
  const v = Number(p?.discount?.value || 0);
  if (t === "percent" && v > 0) return `${v}% off`;
  if (t === "fixed" && v > 0) return `${formatMoney(v)} off`;
  return "";
}

export default function Packages() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.get("/api/packages")
      .then(({ data }) => {
        if (!active) return;
        setItems(data?.packages || []);
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.response?.data?.message || e?.response?.data?.error || e.message || "Failed to load packages");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => (items || []).filter((p) => p?.isActive !== false), [items]);

  return (
    <div className="space-y-8">
      <HeroCarousel
        className="mb-8"
        eyebrow="Parties & Events"
        title="Packages"
        subtitle="Choose a package that fits your celebration."
        primaryAction={{ to: "/contact", label: "Contact Us" }}
        secondaryAction={{ to: "/rooms", label: "Reserve a Room" }}
      />

      <div className="max-w-6xl mx-auto">
        {error && <div className="alert-error mb-4">{error}</div>}

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-premium p-5">
                <div className="h-6 w-1/2 skeleton rounded mb-3" />
                <div className="h-4 w-full skeleton rounded mb-2" />
                <div className="h-4 w-4/5 skeleton rounded mb-5" />
                <div className="h-10 w-full skeleton rounded" />
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <div className="text-5xl mb-3">🎉</div>
            <div className="font-semibold text-stone-800">No packages available yet</div>
            <div className="text-sm text-stone-500 mt-1">Please check back soon.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((p) => {
              const base = Number(p.price || 0);
              const final = Number(p.finalPrice ?? base);
              const label = discountLabel(p);
              const from = formatDateTime(p.availableFrom);
              const to = formatDateTime(p.availableTo);
              const time = [p.timeStart, p.timeEnd].filter(Boolean).join(" – ");

              return (
                <Link
                  key={p._id}
                  to={`/packages/${p._id}`}
                  className="card-premium p-5 flex flex-col cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-stone-900 truncate">{p.name}</h3>
                      {label && (
                        <div className="mt-1">
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">{label}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {final !== base && base > 0 ? (
                        <div className="text-xs text-stone-400 line-through">{formatMoney(base)}</div>
                      ) : null}
                      <div className="text-xl font-bold text-stone-900">{formatMoney(final)}</div>
                    </div>
                  </div>

                  {p.description ? (
                    <p className="text-sm text-stone-600 mt-3 leading-relaxed line-clamp-3">{p.description}</p>
                  ) : (
                    <p className="text-sm text-stone-500 mt-3">No description provided.</p>
                  )}

                  {(p.includes || []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.includes.slice(0, 8).map((x) => (
                        <span key={x} className="badge bg-stone-100 text-stone-700">{x}</span>
                      ))}
                      {p.includes.length > 8 && (
                        <span className="text-xs text-stone-400">+{p.includes.length - 8} more</span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 space-y-1 text-xs text-stone-500">
                    <div className="flex items-center justify-between gap-3">
                      <span>Available packs</span>
                      <span className="font-semibold text-stone-700">{Number(p.packCount || 0)}</span>
                    </div>
                    {(from || to) && (
                      <div className="flex items-center justify-between gap-3">
                        <span>Date</span>
                        <span className="font-medium text-stone-700">{from || "—"}{to ? ` → ${to}` : ""}</span>
                      </div>
                    )}
                    {time && (
                      <div className="flex items-center justify-between gap-3">
                        <span>Time</span>
                        <span className="font-medium text-stone-700">{time}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <div className="text-xs text-stone-500">
                      Click to view full details.
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
