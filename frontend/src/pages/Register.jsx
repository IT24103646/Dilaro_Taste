import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

function FieldIcon({ d }) {
  return (
    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (form.password !== form.confirm) return setErr("Passwords do not match");
    if (form.password.length < 6) return setErr("Password must be at least 6 characters");
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
    <div className="min-h-[80vh] flex items-center justify-center py-10">
      <div className="w-full max-w-[420px]">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gradient shadow-lg text-white font-display font-extrabold text-2xl mb-4">R</div>
          <h1 className="font-display text-3xl font-bold text-stone-900">Create an account</h1>
          <p className="text-stone-500 text-sm mt-1.5">Join us to track orders &amp; reservations</p>
        </div>

        <div className="card-premium p-7">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <FieldIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                <input className="input pl-10" placeholder="Jane Smith" value={form.name} onChange={set("name")} autoComplete="name" required minLength={2} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <FieldIcon d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                <input className="input pl-10" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} autoComplete="email" required />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="label">Phone <span className="text-stone-400 font-normal">(optional)</span></label>
              <div className="relative">
                <FieldIcon d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                <input className="input pl-10" type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={set("phone")} autoComplete="tel" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <FieldIcon d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                <input
                  className="input pl-10 pr-10"
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                  required minLength={6}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                  {showPass
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <FieldIcon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                <input
                  className="input pl-10"
                  type={showPass ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={set("confirm")}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {err && <div className="alert-error text-xs">{err}</div>}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Creating account…</>
              ) : "Create Account"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-stone-100 text-center text-xs text-stone-500">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
