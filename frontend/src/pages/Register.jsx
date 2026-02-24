import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (form.password !== form.confirm) {
      return setErr("Passwords do not match");
    }
    if (form.password.length < 6) {
      return setErr("Password must be at least 6 characters");
    }
    setLoading(true);
    try {
      const u = await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      nav(u.role === "admin" ? "/admin" : u.role === "staff" ? "/staff" : "/menu");
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-stone-900 text-white font-display font-extrabold text-xl mb-3">R</div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Create an account</h1>
          <p className="text-stone-500 text-sm mt-1">Join us to track your orders and reservations</p>
        </div>

        <div className="card-premium p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Full Name</label>
              <input
                className="input"
                placeholder="Jane Smith"
                value={form.name}
                onChange={set("name")}
                autoComplete="name"
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Phone <span className="text-stone-400 font-normal">(optional)</span></label>
              <input
                className="input"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={set("phone")}
                autoComplete="tel"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={set("password")}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Confirm Password</label>
              <input
                className="input"
                type="password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={set("confirm")}
                autoComplete="new-password"
                required
              />
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2 text-xs">{err}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 rounded-xl mt-1">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-5 border-t border-stone-100 pt-4 text-center text-xs text-stone-500">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          You can also order and reserve rooms as a guest without an account.
        </p>
      </div>
    </div>
  );
}