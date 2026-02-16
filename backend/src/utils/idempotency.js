import crypto from "crypto";

export function getIdempotencyKey(req) {
  // Client should send x-idempotency-key; fallback to session+payload hash.
  const key = req.headers["x-idempotency-key"];
  if (key) return String(key);

  const base = `${req.ip}:${JSON.stringify(req.body || {})}`;
  return crypto.createHash("sha256").update(base).digest("hex");
}
