import React, { createContext, useContext, useEffect, useState } from "react";
import { api, getMe } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { setUser(await getMe()); } catch { setUser(null); }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function login(email, password) {
    const { data } = await api.post("/api/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post("/api/auth/register", payload);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await api.post("/api/auth/logout");
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
