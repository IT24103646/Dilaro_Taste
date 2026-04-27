import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

function InputIcon({ d }) {
  return (
    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("Admin@123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await login(email, password);
      if (u.role === "admin") nav("/admin");
      else if (u.role === "staff") nav("/staff");
      else nav("/menu");
    } catch (e) {
      setErr(e?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10">
      <div className="w-full max-w-[420px]">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gradient shadow-lg text-white font-display font-extrabold text-2xl mb-4">
            R
          </div>
          <h1 className="font-display text-3xl font-bold text-stone-900">Welcome back</h1>
          <p className="text-stone-500 text-sm mt-1.5">Sign in to your account to continue</p>
        </div>

        <div className="card-premium p-7">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <InputIcon d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                <input
                  className="input pl-10"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <InputIcon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                <input
                  className="input pl-10 pr-10"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            {err && <div className="alert-error text-xs">{err}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Signing in…</>
              ) : "Sign In"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-stone-100 text-center text-xs text-stone-500">
            Don’t have an account?{" "}
            <Link to="/register" className="text-brand-600 font-semibold hover:underline">Create one</Link>
          </div>

          {/* Demo credentials */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowHint(h => !h)}
              className="w-full text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {showHint ? "Hide" : "Show"} demo credentials
            </button>
            {showHint && (
              <div className="mt-2 bg-stone-50 border border-stone-100 rounded-xl p-3 text-xs text-stone-500 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="badge-neutral">admin</span>
                  <span>admin@demo.com / Admin@123</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-info">staff</span>
                  <span>staff@demo.com / Staff@123</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-success">guest</span>
                  <span>customer@demo.com / Customer@123</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
