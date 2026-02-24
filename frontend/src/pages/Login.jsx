import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("Admin@123");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const u = await login(email, password);
      if (u.role === "admin") nav("/admin");
      else if (u.role === "staff") nav("/staff");
      else nav("/menu");
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    }
  }

  const [showHint, setShowHint] = useState(false);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-stone-900 text-white font-display font-extrabold text-xl mb-3">R</div>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Welcome back</h1>
          <p className="text-stone-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="card-premium p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2 text-xs">{err}</div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5 rounded-xl">
              Sign In
            </button>
          </form>

          {/* Register link */}
          <div className="mt-4 border-t border-stone-100 pt-4 text-center text-xs text-stone-500">
            Don’t have an account?{" "}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">Sign up</Link>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-4 border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={() => setShowHint(h => !h)}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              {showHint ? "▲ Hide" : "▼ Show"} demo credentials
            </button>
            {showHint && (
              <div className="mt-2 bg-stone-50 rounded-xl p-3 text-xs text-stone-500 space-y-1">
                <div>admin@demo.com / Admin@123</div>
                <div>staff@demo.com / Staff@123</div>
                <div>customer@demo.com / Customer@123</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
