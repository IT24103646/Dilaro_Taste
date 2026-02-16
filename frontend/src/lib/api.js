import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:5000",
  withCredentials: true
});

export async function getMe() {
  const { data } = await api.get("/api/auth/me");
  return data.user;
}
