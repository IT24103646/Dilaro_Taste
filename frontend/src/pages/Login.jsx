import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card.jsx";
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

  return (
    <Card>
      <h1 className="text-lg font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="mt-3 grid gap-3 max-w-md">
        <input className="border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input className="border rounded px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" />
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
        <button className="px-3 py-2 rounded bg-slate-900 text-white">Login</button>

        <div className="text-xs text-slate-600">
          Demo users after seeding:
          <ul className="list-disc ml-5 mt-1">
            <li>admin@demo.com / Admin@123</li>
            <li>staff@demo.com / Staff@123</li>
            <li>customer@demo.com / Customer@123</li>
          </ul>
        </div>
      </form>
    </Card>
  );
}
