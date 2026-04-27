import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { api } from "../lib/api.js";

export default function PaymentResult() {
  const { result } = useParams();
  const [params] = useSearchParams();
  const kind = params.get("kind");
  const id = params.get("id");

  const [loading, setLoading] = useState(false);
  const [entity, setEntity] = useState(null);
  const [statusError, setStatusError] = useState("");

  const isSuccess = result === "success";

  useEffect(() => {
    let active = true;
    if (!kind || !id) return;
    setLoading(true);
    setStatusError("");
    api.get("/api/payments/status", { params: { kind, id } })
      .then(({ data }) => {
        if (!active) return;
        setEntity(data?.entity || null);
      })
      .catch((e) => {
        if (!active) return;
        setStatusError(e?.response?.data?.message || e?.response?.data?.error || e.message || "Failed to load payment status");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [kind, id]);

  const paymentStatus = entity?.payment?.status;
  const ref = entity?.orderNo || entity?.referenceNo;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card-premium p-10 max-w-md w-full text-center">
        <div className={`text-6xl mb-4 ${isSuccess ? "" : "grayscale"}`}>
          {isSuccess ? "✅" : "❌"}
        </div>
        <h1 className={`font-display text-2xl font-semibold mb-2 ${isSuccess ? "text-emerald-700" : "text-red-600"}`}>
          {isSuccess ? "Payment Successful" : `Payment ${result || "Failed"}`}
        </h1>
        <p className="text-stone-500 text-sm">
          {isSuccess
            ? "Your transaction has been processed. You'll receive a confirmation shortly."
            : "Something went wrong with your payment. Please try again or contact support."}
        </p>

        {loading && (
          <div className="mt-3 text-xs text-stone-400">Checking payment status...</div>
        )}
        {statusError && (
          <div className="mt-3 text-xs text-red-600">{statusError}</div>
        )}
        {entity && (
          <div className="mt-4 bg-stone-50 rounded-xl px-4 py-3 text-xs text-stone-500 text-left space-y-1">
            {ref && <div>Reference: <span className="font-medium text-stone-700">{ref}</span></div>}
            {paymentStatus && <div>Payment Status: <span className="font-medium text-stone-700">{paymentStatus}</span></div>}
            {entity?.status && <div>Order/Reservation Status: <span className="font-medium text-stone-700">{entity.status}</span></div>}
          </div>
        )}
        {!entity && (kind || id) && (
          <div className="mt-4 bg-stone-50 rounded-xl px-4 py-3 text-xs text-stone-500 text-left space-y-1">
            {kind && <div>Type: <span className="font-medium text-stone-700">{kind}</span></div>}
            {id && <div>Reference: <span className="font-medium text-stone-700">{id}</span></div>}
          </div>
        )}
        <div className="mt-6 flex gap-3 justify-center">
          <Link to="/" className="btn-primary px-5 py-2.5 rounded-xl text-sm">Go Home</Link>
          <Link to="/track" className="btn-outline px-5 py-2.5 rounded-xl text-sm">Track Orders</Link>
        </div>
      </div>
    </div>
  );
}
