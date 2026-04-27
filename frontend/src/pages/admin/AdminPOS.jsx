import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";

function currency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function dayStr(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

const EMPTY_GUEST = { name: "", phone: "", email: "" };
const EMPTY_SPLIT = { cash: "", card: "", stripe: "" };

export default function AdminPOS() {
  const [tab, setTab] = useState("sale");

  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const [guest, setGuest] = useState(EMPTY_GUEST);
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [paymentProvider, setPaymentProvider] = useState("cash");
  const [paymentMode, setPaymentMode] = useState("single");
  const [cashReceived, setCashReceived] = useState("");
  const [split, setSplit] = useState(EMPTY_SPLIT);
  const [autoPreparing, setAutoPreparing] = useState(true);

  const [heldTickets, setHeldTickets] = useState([]);
  const [heldLoading, setHeldLoading] = useState(false);
  const [activeHoldId, setActiveHoldId] = useState("");

  const [lastReceipt, setLastReceipt] = useState(null);

  const [closingDate, setClosingDate] = useState(dayStr());
  const [closingSummary, setClosingSummary] = useState(null);
  const [closingOrders, setClosingOrders] = useState([]);
  const [auditFrom, setAuditFrom] = useState(dayStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [auditTo, setAuditTo] = useState(dayStr());
  const [auditReport, setAuditReport] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get("/api/menu/all")
      .then(({ data }) => {
        if (!active) return;
        const activeItems = (data.items || []).filter((i) => i.isActive !== false);
        setMenuItems(activeItems);
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.response?.data?.message || e.message || "Failed to load menu");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    loadHeldTickets();
    loadClosingSummary(closingDate);
    loadAuditReport(auditFrom, auditTo);
  }, []);

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((i) => i.category).filter(Boolean));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [menuItems]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menuItems.filter((i) => {
      const matchCategory = category === "All" || i.category === category;
      const matchSearch = !q
        || (i.name || "").toLowerCase().includes(q)
        || (i.category || "").toLowerCase().includes(q)
        || (i.description || "").toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [menuItems, search, category]);

  const cartSummary = useMemo(() => {
    const subTotal = cart.reduce((sum, row) => sum + (Number(row.price) * Number(row.quantity)), 0);
    const tax = 0;
    return {
      itemsCount: cart.reduce((sum, row) => sum + Number(row.quantity), 0),
      subTotal,
      tax,
      grandTotal: subTotal + tax,
    };
  }, [cart]);

  const splitTotal = useMemo(() => {
    return Number(split.cash || 0) + Number(split.card || 0) + Number(split.stripe || 0);
  }, [split]);

  const splitDifference = useMemo(() => Number((cartSummary.grandTotal - splitTotal).toFixed(2)), [cartSummary.grandTotal, splitTotal]);

  const cashDueSingle = paymentMode === "single" && paymentProvider === "cash" && paymentStatus === "paid"
    ? cartSummary.grandTotal : 0;
  const cashDueSplit = paymentMode === "split" ? Number(split.cash || 0) : 0;
  const cashDue = cashDueSingle || cashDueSplit;
  const changeDue = Math.max(0, Number(cashReceived || 0) - Number(cashDue || 0));

  const addToCart = (item) => {
    setSuccess("");
    setCart((prev) => {
      const idx = prev.findIndex((p) => String(p._id) === String(item._id));
      if (idx === -1) {
        return [...prev, { _id: item._id, name: item.name, price: item.price, quantity: 1 }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
      return next;
    });
  };

  const setQty = (_id, quantity) => {
    setCart((prev) => prev
      .map((row) => (String(row._id) === String(_id) ? { ...row, quantity: Math.max(1, Number(quantity) || 1) } : row))
      .filter((row) => row.quantity > 0));
  };

  const removeItem = (_id) => setCart((prev) => prev.filter((row) => String(row._id) !== String(_id)));

  const resetSale = () => {
    setCart([]);
    setGuest(EMPTY_GUEST);
    setCashReceived("");
    setSplit(EMPTY_SPLIT);
    setActiveHoldId("");
  };

  const clearCart = () => {
    resetSale();
    setSuccess("");
    setError("");
  };

  const loadHeldTickets = async () => {
    setHeldLoading(true);
    try {
      const { data } = await api.get("/api/orders/pos/held");
      setHeldTickets(data?.tickets || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load held tickets");
    } finally {
      setHeldLoading(false);
    }
  };

  const holdCurrentTicket = async () => {
    if (cart.length === 0) {
      setError("Add items before holding a ticket.");
      return;
    }
    setHolding(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        ticketId: activeHoldId || undefined,
        guest,
        items: cart.map((row) => ({ menuItemId: row._id, quantity: row.quantity })),
      };
      const { data } = await api.post("/api/orders/pos/hold", payload);
      const t = data?.ticket;
      setSuccess(`Ticket held: ${t?.ticketNo || "-"}`);
      resetSale();
      await loadHeldTickets();
      setTab("held");
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to hold ticket");
    } finally {
      setHolding(false);
    }
  };

  const resumeTicket = async (ticketId) => {
    setError("");
    setSuccess("");
    try {
      const { data } = await api.get(`/api/orders/pos/hold/${ticketId}`);
      const ticket = data?.ticket;
      if (!ticket) return;
      setActiveHoldId(ticket._id);
      setGuest(ticket.guest || EMPTY_GUEST);
      setCart((ticket.items || []).map((it) => ({
        _id: it.menuItem,
        name: it.nameSnapshot,
        price: it.priceSnapshot,
        quantity: it.quantity,
      })));
      setTab("sale");
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to resume ticket");
    }
  };

  const voidTicket = async (ticketId) => {
    setError("");
    try {
      await api.post(`/api/orders/pos/hold/${ticketId}/void`);
      await loadHeldTickets();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to void ticket");
    }
  };

  const loadClosingSummary = async (date) => {
    try {
      const { data } = await api.get("/api/orders/pos/closing-summary", { params: { date } });
      setClosingSummary(data?.summary || null);
      setClosingOrders(data?.orders || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load closing summary");
    }
  };

  const loadAuditReport = async (from, to) => {
    try {
      const { data } = await api.get("/api/orders/pos/cashier-audit", { params: { from, to } });
      setAuditReport(data || null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load audit report");
    }
  };

  const placePOSOrder = async () => {
    if (cart.length === 0) {
      setError("Add at least one item to place an order.");
      return;
    }

    if (paymentMode === "split" && Math.abs(splitDifference) > 0.01) {
      setError("Split payment total must match the grand total.");
      return;
    }

    if (cashDue > 0 && Number(cashReceived || 0) < cashDue) {
      setError("Cash received cannot be less than cash due.");
      return;
    }

    setPlacing(true);
    setError("");
    setSuccess("");

    try {
      const paymentPayload = paymentMode === "split"
        ? {
          provider: "split",
          status: "paid",
          cashReceived: Number(cashReceived || 0),
          splits: [
            { method: "cash", amount: Number(split.cash || 0) },
            { method: "card", amount: Number(split.card || 0) },
            { method: "stripe", amount: Number(split.stripe || 0) },
          ].filter((s) => s.amount > 0),
        }
        : {
          provider: paymentProvider,
          status: paymentStatus,
          cashReceived: paymentProvider === "cash" ? Number(cashReceived || 0) : 0,
          splits: [],
        };

      const payload = {
        items: cart.map((row) => ({ menuItemId: row._id, quantity: row.quantity })),
        guest,
        heldTicketId: activeHoldId || undefined,
        payment: paymentPayload,
      };

      const { data } = await api.post("/api/orders/pos", payload);
      const created = data?.order;

      if (autoPreparing && created?._id) {
        await api.post(`/api/orders/${created._id}/status`, { status: "preparing" });
      }

      setLastReceipt(created);
      setSuccess(`POS order placed successfully: ${created?.orderNo || "-"}`);
      resetSale();
      await loadHeldTickets();
      await loadClosingSummary(closingDate);
      await loadAuditReport(auditFrom, auditTo);
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e.message || "Failed to place POS order");
    } finally {
      setPlacing(false);
    }
  };

  const printReceipt = () => {
    if (!lastReceipt) return;
    window.print();
  };

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Point of Sale (POS)</h1>
          <p className="page-subtitle">Professional counter ordering with direct kitchen flow.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 no-print">
        <button onClick={() => setTab("sale")} className={tab === "sale" ? "btn-primary text-xs px-3 py-1.5" : "btn-outline text-xs px-3 py-1.5"}>Sale</button>
        <button onClick={() => setTab("held")} className={tab === "held" ? "btn-primary text-xs px-3 py-1.5" : "btn-outline text-xs px-3 py-1.5"}>Held Tickets</button>
        <button onClick={() => setTab("closing")} className={tab === "closing" ? "btn-primary text-xs px-3 py-1.5" : "btn-outline text-xs px-3 py-1.5"}>Closing & Audit</button>
      </div>

      {error && <div className="alert-error no-print">{error}</div>}
      {success && <div className="alert-success no-print">{success}</div>}

      {tab === "sale" && (
        <div className="grid xl:grid-cols-[1fr_430px] gap-5 no-print">
          <section className="admin-card overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <input className="input" placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="input md:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
              </div>
            ) : (
              <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[72vh] overflow-auto">
                {visibleItems.map((item) => (
                  <button key={item._id} type="button" onClick={() => addToCart(item)} className="text-left border border-stone-200 rounded-xl p-3 hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                    <div className="font-semibold text-stone-800 text-sm truncate">{item.name}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-2">{item.description || "No description"}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="badge-info text-[10px]">{item.category}</span>
                      <span className="font-semibold text-stone-900">{currency(item.price)}</span>
                    </div>
                  </button>
                ))}
                {visibleItems.length === 0 && <div className="col-span-full text-center py-12 text-stone-400 text-sm">No menu items found.</div>}
              </div>
            )}
          </section>

          <aside className="admin-card overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">Current Sale</h2>
              <p className="text-xs text-stone-500 mt-0.5">{cartSummary.itemsCount} item(s) in cart {activeHoldId ? "• resumed ticket" : ""}</p>
            </div>

            <div className="p-4 space-y-4">
              <div className="max-h-56 overflow-auto space-y-2">
                {cart.length === 0 ? (
                  <div className="text-center text-stone-400 text-sm py-8">Cart is empty. Tap an item to add.</div>
                ) : cart.map((row) => (
                  <div key={row._id} className="border border-stone-100 rounded-xl p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm text-stone-800 truncate">{row.name}</div>
                      <button onClick={() => removeItem(row._id)} className="text-xs text-red-600 hover:underline">Remove</button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button type="button" className="w-6 h-6 rounded border border-stone-300" onClick={() => setQty(row._id, row.quantity - 1)}>-</button>
                        <input type="number" min="1" value={row.quantity} onChange={(e) => setQty(row._id, Number(e.target.value))} className="w-14 border border-stone-300 rounded text-center text-xs py-1" />
                        <button type="button" className="w-6 h-6 rounded border border-stone-300" onClick={() => setQty(row._id, row.quantity + 1)}>+</button>
                      </div>
                      <div className="text-sm font-semibold text-stone-900">{currency(row.price * row.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="label">Customer Name</label>
                  <input className="input" value={guest.name} onChange={(e) => setGuest((g) => ({ ...g, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={guest.phone} onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Email</label>
                  <input className="input" type="email" value={guest.email} onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Payment Mode</label>
                  <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                    <option value="single">Single Method</option>
                    <option value="split">Split Payment</option>
                  </select>
                </div>
                {paymentMode === "single" ? (
                  <>
                    <div>
                      <label className="label">Payment Status</label>
                      <select className="input" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Payment Method</label>
                      <select className="input" value={paymentProvider} onChange={(e) => setPaymentProvider(e.target.value)}>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="stripe">Stripe</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 grid grid-cols-3 gap-2">
                    <div>
                      <label className="label">Cash</label>
                      <input type="number" min="0" step="0.01" className="input" value={split.cash} onChange={(e) => setSplit((s) => ({ ...s, cash: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Card</label>
                      <input type="number" min="0" step="0.01" className="input" value={split.card} onChange={(e) => setSplit((s) => ({ ...s, card: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Stripe</label>
                      <input type="number" min="0" step="0.01" className="input" value={split.stripe} onChange={(e) => setSplit((s) => ({ ...s, stripe: e.target.value }))} />
                    </div>
                    <div className="col-span-3 text-[11px] text-stone-500">
                      Split total: <span className="font-semibold text-stone-700">{currency(splitTotal)}</span> • Difference: <span className={Math.abs(splitDifference) < 0.01 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>{currency(splitDifference)}</span>
                    </div>
                  </div>
                )}
              </div>

              {(cashDue > 0 || Number(cashReceived || 0) > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Cash Received</label>
                    <input type="number" min="0" step="0.01" className="input" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} />
                  </div>
                  <div className="text-xs text-stone-600 flex flex-col justify-end pb-2">
                    <div>Cash Due: <span className="font-semibold">{currency(cashDue)}</span></div>
                    <div>Change: <span className="font-semibold text-emerald-700">{currency(changeDue)}</span></div>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-stone-600">
                <input type="checkbox" checked={autoPreparing} onChange={(e) => setAutoPreparing(e.target.checked)} className="w-4 h-4 accent-brand-500" />
                Send directly to preparing after order creation
              </label>

              <div className="rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span className="font-medium">{currency(cartSummary.subTotal)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">Tax</span><span className="font-medium">{currency(cartSummary.tax)}</span></div>
                <div className="flex justify-between border-t border-stone-200 pt-2"><span className="font-semibold text-stone-800">Total</span><span className="font-bold text-stone-900">{currency(cartSummary.grandTotal)}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={clearCart} className="btn-outline w-full">Clear</button>
                <button type="button" onClick={holdCurrentTicket} disabled={holding || cart.length === 0} className="btn-outline w-full disabled:opacity-50">
                  {holding ? "Holding..." : (activeHoldId ? "Update Hold" : "Hold Ticket")}
                </button>
                <button type="button" onClick={placePOSOrder} disabled={placing || cart.length === 0} className="btn-primary col-span-2 w-full disabled:opacity-50">
                  {placing ? "Placing..." : "Place POS Order"}
                </button>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={printReceipt} disabled={!lastReceipt} className="btn-outline w-full disabled:opacity-40">Print Last Receipt</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {tab === "held" && (
        <div className="admin-card overflow-hidden no-print">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-semibold text-stone-800">Held Tickets</h2>
            <button type="button" onClick={loadHeldTickets} className="btn-outline text-xs px-3 py-1.5">Refresh</button>
          </div>
          <div className="p-4 space-y-2">
            {heldLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-xl" />)}</div>
            ) : heldTickets.length === 0 ? (
              <div className="text-center text-stone-400 text-sm py-12">No held tickets.</div>
            ) : heldTickets.map((t) => (
              <div key={t._id} className="border border-stone-100 rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-stone-800 text-sm">{t.ticketNo}</div>
                  <div className="text-xs text-stone-500">
                    {t.guest?.name || "Walk-in"} • {t.items?.length || 0} item(s) • {currency(t.totals?.grandTotal)} • Cashier: {t.cashier?.name || t.cashier?.email || "-"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => resumeTicket(t._id)} className="btn-primary text-xs px-3 py-1.5">Resume</button>
                  <button type="button" onClick={() => voidTicket(t._id)} className="btn-danger text-xs px-3 py-1.5">Void</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "closing" && (
        <div className="space-y-4 no-print">
          <div className="admin-card p-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div>
                <label className="label">Closing Date</label>
                <input type="date" className="input" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
              </div>
              <button type="button" className="btn-primary" onClick={() => loadClosingSummary(closingDate)}>Load Closing Summary</button>
            </div>
          </div>

          {closingSummary && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="admin-card p-4"><div className="text-xs text-stone-500">POS Orders</div><div className="text-2xl font-bold">{closingSummary.orderCount}</div></div>
              <div className="admin-card p-4"><div className="text-xs text-stone-500">Paid Sales</div><div className="text-2xl font-bold">{currency(closingSummary.paidSales)}</div></div>
              <div className="admin-card p-4"><div className="text-xs text-stone-500">Gross Sales</div><div className="text-2xl font-bold">{currency(closingSummary.grossSales)}</div></div>
              <div className="admin-card p-4"><div className="text-xs text-stone-500">Expected Cash</div><div className="text-2xl font-bold">{currency(closingSummary.cashExpected)}</div></div>
            </div>
          )}

          {closingSummary && (
            <div className="admin-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-100 font-semibold text-stone-800">Method Breakdown</div>
              <div className="p-4 grid sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-stone-100 p-3">Cash: <b>{currency(closingSummary.byMethod?.cash)}</b></div>
                <div className="rounded-lg border border-stone-100 p-3">Card: <b>{currency(closingSummary.byMethod?.card)}</b></div>
                <div className="rounded-lg border border-stone-100 p-3">Stripe: <b>{currency(closingSummary.byMethod?.stripe)}</b></div>
              </div>
            </div>
          )}

          <div className="admin-card p-4">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div>
                <label className="label">Audit From</label>
                <input type="date" className="input" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">Audit To</label>
                <input type="date" className="input" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} />
              </div>
              <button type="button" className="btn-primary" onClick={() => loadAuditReport(auditFrom, auditTo)}>Load Cashier Audit</button>
            </div>
          </div>

          {auditReport?.byCashier?.length > 0 && (
            <div className="admin-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-100 font-semibold text-stone-800">Cashier Audit Report</div>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="admin-th">Cashier</th>
                      <th className="admin-th">Orders</th>
                      <th className="admin-th">Paid Sales</th>
                      <th className="admin-th">Unpaid Sales</th>
                      <th className="admin-th">Expected Cash</th>
                      <th className="admin-th">Card Sales</th>
                      <th className="admin-th">Stripe Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditReport.byCashier.map((row) => (
                      <tr key={row.cashierId} className="admin-tr">
                        <td className="admin-td">{row.cashierName}</td>
                        <td className="admin-td">{row.orders}</td>
                        <td className="admin-td">{currency(row.paidSales)}</td>
                        <td className="admin-td">{currency(row.unpaidSales)}</td>
                        <td className="admin-td">{currency(row.cashExpected)}</td>
                        <td className="admin-td">{currency(row.cardSales)}</td>
                        <td className="admin-td">{currency(row.stripeSales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {lastReceipt && (
        <section className="print-only pos-receipt">
          <div className="pos-receipt-title">Restaurant POS Receipt</div>
          <div>Order: <b>{lastReceipt.orderNo}</b></div>
          <div>Date: {new Date(lastReceipt.createdAt || Date.now()).toLocaleString()}</div>
          <div>Cashier: {lastReceipt.pos?.cashier || "-"}</div>
          <hr />
          <div>Customer: {lastReceipt.guest?.name || "Walk-in"}</div>
          <div>Phone: {lastReceipt.guest?.phone || "-"}</div>
          <hr />
          {(lastReceipt.items || []).map((it, idx) => (
            <div key={idx} className="pos-receipt-row">
              <span>{it.nameSnapshot} x{it.quantity}</span>
              <span>{currency(Number(it.priceSnapshot) * Number(it.quantity))}</span>
            </div>
          ))}
          <hr />
          <div className="pos-receipt-row"><span>Subtotal</span><span>{currency(lastReceipt.totals?.subTotal)}</span></div>
          <div className="pos-receipt-row"><span>Tax</span><span>{currency(lastReceipt.totals?.tax)}</span></div>
          <div className="pos-receipt-row pos-receipt-total"><span>Total</span><span>{currency(lastReceipt.totals?.grandTotal)}</span></div>
          <hr />
          <div>Payment: {lastReceipt.payment?.provider || "-"} ({lastReceipt.payment?.status || "-"})</div>
          {Array.isArray(lastReceipt.payment?.splits) && lastReceipt.payment.splits.length > 0 && (
            <div>
              {lastReceipt.payment.splits.map((s, i) => (
                <div className="pos-receipt-row" key={i}><span>{s.method}</span><span>{currency(s.amount)}</span></div>
              ))}
            </div>
          )}
          <div>Cash Received: {currency(lastReceipt.payment?.cashReceived || 0)}</div>
          <div>Change Due: {currency(lastReceipt.payment?.changeDue || 0)}</div>
          <hr />
          <div className="pos-receipt-foot">Thank you. Please come again.</div>
        </section>
      )}
    </div>
  );
}
