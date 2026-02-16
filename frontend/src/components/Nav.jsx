import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

export default function Nav() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold">🍽️ Restaurant System</Link>

        <nav className="flex gap-3 text-sm">
          {!isAdmin ? (
            <>
              <Link to="/menu" className="hover:underline">Menu</Link>
              <Link to="/rooms" className="hover:underline">Rooms</Link>
              <Link to="/track" className="hover:underline">Track</Link>
            </>
          ) : null}

          {user?.role === "staff" || user?.role === "admin" ? (
            <Link to="/staff" className="hover:underline">Staff</Link>
          ) : null}

          {user?.role === "admin" ? (
            <Link to="/admin" className="hover:underline">Admin</Link>
          ) : null}

          {!user ? (
            <Link to="/login" className="px-3 py-1 rounded bg-slate-900 text-white">Login</Link>
          ) : (
            <button onClick={logout} className="px-3 py-1 rounded bg-slate-900 text-white">
              Logout ({user.name})
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
