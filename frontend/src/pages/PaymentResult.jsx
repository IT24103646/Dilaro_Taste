import React from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Card } from "../components/Card.jsx";

export default function PaymentResult() {
  const { result } = useParams();
  const [params] = useSearchParams();
  const kind = params.get("kind");
  const id = params.get("id");

  return (
    <Card>
      <h1 className="text-lg font-semibold">Payment {result}</h1>
      <p className="text-sm text-slate-600 mt-2">
        Kind: {kind} | ID: {id}
      </p>
      <Link to="/" className="inline-block mt-3 px-3 py-2 rounded bg-slate-900 text-white">Go Home</Link>
    </Card>
  );
}
