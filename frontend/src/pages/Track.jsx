import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { createSocket } from "../lib/socket.js";
import { useAuth } from "../lib/auth.jsx";
import HeroCarousel from "../components/HeroCarousel.jsx";

const DeliveryLiveMap = lazy(() => import("../components/DeliveryLiveMap.jsx"));

// ─── Status config ────────────────────────────────────────────────────────────
const ORDER_STATUSES = ["confirmed", "preparing", "ready", "dispatched", "completed"];

function normalizeOrderRef(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // If a user pastes a whole sentence (e.g. "Reference: ORD-XXXXXX-1234"), extract the ref.
  const match = raw.match(/ORD-[A-Z0-9]+-\d{4}/i);
  return (match ? match[0] : raw).toUpperCase();
}

const STATUS_META = {
  pending_payment: { label: "Pending Payment", icon: "💳", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-400" },
  confirmed:       { label: "Order Confirmed", icon: "✅", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  preparing:       { label: "Preparing",        icon: "👨‍🍳", color: "text-blue-600",  bg: "bg-blue-50 border-blue-200",     dot: "bg-blue-500"    },
  ready:           { label: "Ready",            icon: "🔔", color: "text-purple-600", bg: "bg-purple-50 border-purple-200", dot: "bg-purple-500"  },
  dispatched:      { label: "On the Way",       icon: "🛵", color: "text-orange-600", bg: "bg-orange-50 border-orange-200", dot: "bg-orange-500"  },
  completed:       { label: "Delivered",        icon: "🎉", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  cancelled:       { label: "Cancelled",        icon: "✕",  color: "text-red-500",   bg: "bg-red-50 border-red-200",       dot: "bg-red-400"     },
};

const RES_STATUS_META = {
  confirmed:       { label: "Confirmed",    bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending_payment: { label: "Pend. Payment", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  waitlisted:      { label: "Waitlisted",   bg: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelled:       { label: "Cancelled",    bg: "bg-red-50 text-red-600 border-red-200" },
  completed:       { label: "Completed",    bg: "bg-stone-100 text-stone-500 border-stone-200" },
};

// ─── Timeline component ───────────────────────────────────────────────────────
function OrderTimeline({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 py-3 px-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
        <span>✕</span> This order has been cancelled.
      </div>
    );
  }
  const activeIdx = ORDER_STATUSES.indexOf(status);
  return (
    <div className="relative flex items-start gap-0 mt-1">
      {ORDER_STATUSES.map((s, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        const future = i > activeIdx;
        const meta = STATUS_META[s];
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                active  ? "border-stone-900 bg-stone-900 text-white shadow-lg scale-110" :
                done    ? "border-emerald-500 bg-emerald-500 text-white" :
                          "border-stone-200 bg-white text-stone-300"
              }`}>
                {done ? "✓" : active ? meta.icon : <span className="text-xs">{i + 1}</span>}
              </div>
              <div className={`mt-1.5 text-center text-[11px] font-medium leading-tight max-w-[72px] ${
                active ? "text-stone-900" : done ? "text-emerald-600" : "text-stone-300"
              }`}>
                {meta.label}
              </div>
            </div>
            {i < ORDER_STATUSES.length - 1 && (
              <div className={`flex-1 h-0.5 mt-[18px] mx-1 rounded transition-all duration-300 ${
                done ? "bg-emerald-400" : "bg-stone-200"
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────
function OrderCard({ order, defaultExpanded = false }) {
  const [open, setOpen] = useState(defaultExpanded);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const meta = STATUS_META[order.status] || STATUS_META.confirmed;
  const isLive = ["confirmed", "preparing", "ready", "dispatched"].includes(order.status);

  const needsPayment = order?.status === "pending_payment" && order?.payment?.status !== "paid";

  const payNow = async () => {
    if (!order?._id) return;
    setPayError("");
    setPaying(true);
    try {
      const { data } = await api.post("/api/payments/checkout", { kind: "order", id: order._id });
      const url = data?.url;
      if (!url) throw new Error("Payment session did not return a redirect URL");
      window.location.href = url;
    } catch (e) {
      setPayError(e?.response?.data?.message || e?.response?.data?.error || e.message || "Failed to start payment");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md`}>
      {/* Card header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left px-5 py-4 flex items-start gap-4"
      >
        {/* Status icon circle */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl border ${meta.bg}`}>
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-stone-900 tracking-wide text-sm">{order.orderNo}</span>
            {isLive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse block"/> Live
              </span>
            )}
          </div>
          <div className={`text-sm font-semibold mt-0.5 ${meta.color}`}>{meta.label}</div>
          <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-2">
            <span className="capitalize">{order.type}</span>
            <span>•</span>
            <span>{order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}</span>
            {order.totals?.grandTotal != null && (
              <><span>•</span><span className="font-semibold text-stone-600">${Number(order.totals.grandTotal).toFixed(2)}</span></>
            )}
          </div>
          <div className="text-xs text-stone-300 mt-0.5">
            {new Date(order.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>

        <span className={`text-stone-400 mt-1 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4 space-y-4">
          {/* Timeline */}
          <OrderTimeline status={order.status} />

          {/* Items */}
          {(order.items || []).length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">Items Ordered</div>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-500 text-xs flex items-center justify-center font-semibold flex-shrink-0">{item.quantity}</span>
                      <span className="text-stone-700">{item.nameSnapshot}</span>
                    </div>
                    <span className="text-stone-500 font-medium">${(item.priceSnapshot * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {order.totals?.grandTotal != null && (
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-stone-100 text-sm font-bold text-stone-900">
                  <span>Total</span>
                  <span>${Number(order.totals.grandTotal).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Delivery / Pickup info */}
          {order.type === "delivery" && order.delivery?.address && (
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Delivery Address</div>
              <div className="text-sm text-stone-700">{order.delivery.address}</div>
              {order.delivery.preferredWindow && (
                <div className="text-xs text-stone-400 mt-1">Window: {order.delivery.preferredWindow}</div>
              )}
            </div>
          )}
          {order.type === "pickup" && order.pickup?.slotAt && (
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">Pickup Slot</div>
              <div className="text-sm text-stone-700">{new Date(order.pickup.slotAt).toLocaleString()}</div>
            </div>
          )}

          {needsPayment && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Payment Required</div>
                  <div className="text-sm text-amber-800 mt-0.5">This order is awaiting payment to be confirmed.</div>
                </div>
                <button
                  type="button"
                  onClick={payNow}
                  disabled={paying}
                  className="btn-primary text-xs px-3 py-2 disabled:opacity-60"
                >
                  {paying ? "Redirecting..." : "Pay Now"}
                </button>
              </div>
              {payError && <div className="mt-2 text-xs text-red-600">{payError}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LiveLocationCard({ live, order }) {
  if (!order || order.type !== "delivery") return null;
  const [showMap, setShowMap] = useState(false);
  const hasPinnedDestination = order.delivery?.location?.lat != null && order.delivery?.location?.lng != null;
  const mapLive = live || (hasPinnedDestination ? {
    origin: { lat: 6.9271, lng: 79.8612 },
    destination: {
      lat: order.delivery.location.lat,
      lng: order.delivery.location.lng,
    },
    currentLocation: {
      lat: order.delivery.location.lat,
      lng: order.delivery.location.lng,
    },
    progress: 0,
    etaMinutes: "--",
    orderNo: order.orderNo,
    updatedAt: new Date().toISOString(),
  } : null);

  if (!live) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Live Delivery</div>
            <div className="text-sm font-semibold text-stone-900 mt-0.5">Order {order.orderNo}</div>
          </div>
          <span className="badge-neutral capitalize">{order.status}</span>
        </div>
        <div className="mt-3 text-xs text-stone-500">
          {order.status === "dispatched"
            ? "Connecting to live rider simulation..."
            : "Live map appears once this delivery is marked as dispatched."}
        </div>

        {mapLive && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
            >
              {showMap ? "Hide Map" : "View Map"}
            </button>
            {showMap && (
              <div className="mt-2 rounded-xl overflow-hidden border border-stone-200">
                <Suspense fallback={<div className="h-52 w-full skeleton" />}>
                  <DeliveryLiveMap live={mapLive} />
                </Suspense>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">Live Delivery</div>
          <div className="text-sm font-semibold text-stone-900 mt-0.5">Order {live.orderNo}</div>
        </div>
        <span className="badge-info">ETA {live.etaMinutes} min</span>
      </div>

      <div className="relative h-16 rounded-xl border border-stone-200 bg-[linear-gradient(90deg,#fafaf9_0%,#f5f5f4_100%)] overflow-hidden">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 font-medium">Restaurant</div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-500 font-medium">Destination</div>
        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 bg-stone-200 rounded-full" />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-1 bg-brand-500 rounded-full" style={{ width: `${Math.max(4, Math.min(100, live.progress))}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-brand-600 border-2 border-white shadow"
          style={{ left: `calc(${Math.max(3, Math.min(97, live.progress))}% - 7px)` }}
        />
      </div>

      <div className="mt-3 rounded-xl overflow-hidden border border-stone-200">
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="mx-3 mt-3 text-xs px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
        >
          {showMap ? "Hide Map" : "View Map"}
        </button>
        {showMap && (
          <div className="mt-3 border-t border-stone-200">
            <Suspense fallback={<div className="h-52 w-full skeleton" />}>
              <DeliveryLiveMap live={live} />
            </Suspense>
          </div>
        )}
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs text-stone-600">
        <div className="rounded-lg border border-stone-100 bg-stone-50 p-2">
          <div className="text-stone-400">Current</div>
          <div className="font-medium text-stone-800">{live.currentLocation?.lat}, {live.currentLocation?.lng}</div>
        </div>
        <div className="rounded-lg border border-stone-100 bg-stone-50 p-2">
          <div className="text-stone-400">Progress</div>
          <div className="font-medium text-stone-800">{live.progress}%</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-stone-400">Updated: {new Date(live.updatedAt).toLocaleTimeString()}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Track() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRef = normalizeOrderRef(searchParams.get("ref") || "");

  const [searchRef, setSearchRef] = useState(initialRef);
  const [searchInput, setSearchInput] = useState(initialRef);
  const [searchResult, setSearchResult] = useState(null);
  const [searchLiveLocation, setSearchLiveLocation] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [orders, setOrders] = useState([]);
  const [orderLiveLocations, setOrderLiveLocations] = useState({});
  const [reservations, setReservations] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [liveFlash, setLiveFlash] = useState(false);

  const inputRef = useRef();

  // ── Socket live updates ──
  useEffect(() => {
    const s = createSocket();
    s.emit("join", "customer");
    s.emit("join", "reservations");
    s.on("order:status", () => {
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2000);
      if (user) fetchHistory();
      if (searchRef) fetchByRef(searchRef, false);
    });
    s.on("delivery:location", (payload) => {
      if (!payload?.orderId) return;
      setOrderLiveLocations((prev) => ({ ...prev, [String(payload.orderId)]: payload }));
      if (searchResult && String(searchResult._id) === String(payload.orderId)) {
        setSearchLiveLocation(payload);
      }
    });
    s.on("reservation:new", () => {
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2000);
      if (user) fetchHistory();
    });
    s.on("reservation:updated", () => {
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2000);
      if (user) fetchHistory();
    });
    s.on("reservation:cancelled", () => {
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 2000);
      if (user) fetchHistory();
    });
    return () => s.disconnect();
  }, [user, searchRef, searchResult]);

  // ── Auth history ──
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const [o, r] = await Promise.all([
        api.get("/api/orders/my"),
        api.get("/api/reservations/my"),
      ]);
      setOrders(o.data.orders || []);
      setReservations(r.data.reservations || []);
      setLastRefresh(new Date());
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Public search ──
  const fetchByRef = useCallback(async (ref, showLoading = true) => {
    const normalized = normalizeOrderRef(ref);
    if (!normalized) return;
    setSearchError("");
    if (showLoading) setSearchLoading(true);
    try {
      const { data } = await api.get(`/api/orders/track/${normalized}`);
      setSearchResult(data.order);
      if (data.order?.type === "delivery") {
        try {
          const location = await api.get(`/api/orders/track/${normalized}/location`);
          setSearchLiveLocation(location.data?.liveLocation || null);
        } catch {
          setSearchLiveLocation(null);
        }
      } else {
        setSearchLiveLocation(null);
      }
    } catch (err) {
      setSearchResult(null);
      setSearchLiveLocation(null);
      setSearchError(err?.response?.status === 404 ? "No order found with that reference number." : "Something went wrong. Please try again.");
    } finally {
      if (showLoading) setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!searchResult?.orderNo || searchResult.type !== "delivery") return;
    if (!["dispatched", "ready", "preparing", "confirmed"].includes(searchResult.status)) return;

    const timer = setInterval(async () => {
      try {
        const location = await api.get(`/api/orders/track/${searchResult.orderNo}/location`);
        setSearchLiveLocation(location.data?.liveLocation || null);
      } catch {
        // ignore transient polling errors
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [searchResult]);

  useEffect(() => {
    const dispatchedOrders = orders.filter((o) => o.type === "delivery" && o.status === "dispatched" && o.orderNo);
    if (dispatchedOrders.length === 0) return;

    let active = true;

    async function syncLiveLocations() {
      const entries = await Promise.all(
        dispatchedOrders.map(async (o) => {
          try {
            const { data } = await api.get(`/api/orders/track/${o.orderNo}/location`);
            return [String(o._id), data?.liveLocation || null];
          } catch {
            return [String(o._id), null];
          }
        })
      );

      if (!active) return;
      setOrderLiveLocations((prev) => {
        const next = { ...prev };
        for (const [orderId, live] of entries) {
          next[orderId] = live;
        }
        return next;
      });
    }

    syncLiveLocations();
    const timer = setInterval(syncLiveLocations, 3500);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orders]);

  // Auto-trigger if ?ref= in URL
  useEffect(() => {
    if (initialRef) fetchByRef(initialRef);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    const val = normalizeOrderRef(searchInput);
    if (!val) return;
    setSearchRef(val);
    setSearchParams({ ref: val });
    fetchByRef(val);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">

      <HeroCarousel
        className="mb-8"
        eyebrow="Live Tracking"
        title="Track Your Order"
        subtitle="Enter your reference number to follow the latest status updates in real time."
      >
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
          <input
            ref={inputRef}
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value.toUpperCase())}
            placeholder="e.g. ORD-ABC123-4567"
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono tracking-wide"
          />
          <button
            type="submit"
            disabled={searchLoading || !searchInput.trim()}
            className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {searchLoading ? "..." : "Track"}
          </button>
        </form>

        {liveFlash && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse block" />
            Live update received
          </div>
        )}
      </HeroCarousel>

      {/* ── Search result ── */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span>⚠️</span> {searchError}
        </div>
      )}

      {searchResult && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">Search Result</div>
          {searchResult.type === "delivery" ? (
            <div className="mb-3">
              <LiveLocationCard live={searchLiveLocation} order={searchResult} />
            </div>
          ) : null}
          <OrderCard order={searchResult} defaultExpanded={true} />
        </div>
      )}

      {/* ── Logged-in history ── */}
      {user ? (
        <>
          {/* Orders history */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold text-stone-900 text-lg">My Orders</h2>
                {lastRefresh && (
                  <div className="text-xs text-stone-400 mt-0.5">
                    Updated {lastRefresh.toLocaleTimeString()}
                  </div>
                )}
              </div>
              <button
                onClick={fetchHistory}
                disabled={historyLoading}
                className="flex items-center gap-1.5 text-xs text-stone-500 border border-stone-200 px-3 py-1.5 rounded-lg hover:border-stone-400 transition-colors disabled:opacity-50"
              >
                <span className={historyLoading ? "animate-spin inline-block" : ""}>↻</span>
                Refresh
              </button>
            </div>

            {historyLoading && orders.length === 0 ? (
              <div className="text-center py-10 text-stone-400 text-sm">Loading orders…</div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
                <div className="text-4xl mb-3">🛒</div>
                <div className="text-stone-500 text-sm">No orders yet.</div>
                <Link to="/menu" className="inline-flex items-center gap-1 text-sm text-brand-500 font-semibold mt-2 hover:underline">
                  Browse the menu →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o._id} className="space-y-2">
                    {o.type === "delivery" && o.status === "dispatched" ? (
                      <LiveLocationCard live={orderLiveLocations[String(o._id)] || null} order={o} />
                    ) : null}
                    <OrderCard order={o} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reservations */}
          <div>
            <h2 className="font-semibold text-stone-900 text-lg mb-3">My Reservations</h2>
            {reservations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
                <div className="text-4xl mb-3">🏨</div>
                <div className="text-stone-500 text-sm">No reservations yet.</div>
                <Link to="/rooms" className="inline-flex items-center gap-1 text-sm text-brand-500 font-semibold mt-2 hover:underline">
                  Browse rooms →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reservations.map(r => {
                  const smeta = RES_STATUS_META[r.status] || { label: r.status, bg: "bg-stone-100 text-stone-600 border-stone-200" };
                  return (
                    <div key={r._id} className="bg-white rounded-2xl border border-stone-200 shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-2xl flex-shrink-0">🏨</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-stone-900 text-sm tracking-wide">{r.referenceNo}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${smeta.bg}`}>{smeta.label}</span>
                        </div>
                        <div className="text-sm text-stone-600 mt-0.5">{r.room?.name || "—"}</div>
                        {r.startAt && (
                          <div className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                            <span>📅</span>
                            {new Date(r.startAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {r.endAt && <> — {new Date(r.endAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</>}
                          </div>
                        )}
                      </div>
                      {r.payment?.amount > 0 && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-base font-bold text-stone-900">${Number(r.payment.amount).toFixed(2)}</div>
                          <div className="text-xs text-stone-400">{r.payment.status}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Not logged in — prompt */
        !searchResult && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm px-6 py-10 text-center">
            <div className="text-4xl mb-3">🔐</div>
            <h2 className="font-semibold text-stone-900 text-lg mb-1">Sign in for full history</h2>
            <p className="text-stone-500 text-sm max-w-xs mx-auto">
              View all your past orders and reservations in one place by signing in.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 mt-5 px-6 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-700 transition-colors">
              Sign In →
            </Link>
          </div>
        )
      )}
    </div>
  );
}

