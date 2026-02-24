import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors duration-150 ${isActive ? "text-brand-500" : "text-stone-600 hover:text-stone-900"}`;

export default function Nav() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-shadow duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-stone-100" : "bg-white border-b border-stone-100"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white text-sm font-bold group-hover:bg-brand-500 transition-colors">R</span>
          <span className="font-display font-semibold tracking-tight text-stone-900">Restaurant</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {!isAdmin ? (
            <>
              <NavLink to="/menu" className={navLinkClass}>Menu</NavLink>
              <NavLink to="/rooms" className={navLinkClass}>Rooms</NavLink>
              <NavLink to="/about" className={navLinkClass}>About</NavLink>
              <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
              <NavLink to="/track" className={navLinkClass}>Track Order</NavLink>
            </>
          ) : null}
          {user?.role === "staff" || user?.role === "admin" ? (
            <NavLink to="/staff" className={navLinkClass}>Staff</NavLink>
          ) : null}
          {user?.role === "admin" ? (
            <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>
          ) : null}
        </nav>

        {/* Auth + mobile toggle */}
        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <Link to="/register" className="btn-outline hidden md:inline-flex text-sm">Sign up</Link>
              <Link to="/login" className="btn-primary hidden md:inline-flex">Sign in</Link>
            </>
          ) : (
            <button
              onClick={logout}
              className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-xs uppercase">
                {user.name?.[0] || user.email?.[0]}
              </span>
              Sign out
            </button>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-5 bg-stone-700 transition-all ${open ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 w-5 bg-stone-700 transition-all ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-stone-700 transition-all ${open ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open ? (
        <div className="md:hidden border-t border-stone-100 bg-white px-4 py-4 grid gap-3">
          {!isAdmin ? (
            <>
              <Link to="/menu" className="text-sm font-medium text-stone-700" onClick={() => setOpen(false)}>Menu</Link>
              <Link to="/rooms" className="text-sm font-medium text-stone-700" onClick={() => setOpen(false)}>Rooms</Link>
              <Link to="/about" className="text-sm font-medium text-stone-700" onClick={() => setOpen(false)}>About</Link>
              <Link to="/contact" className="text-sm font-medium text-stone-700" onClick={() => setOpen(false)}>Contact</Link>
              <Link to="/track" className="text-sm font-medium text-stone-700" onClick={() => setOpen(false)}>Track Order</Link>
            </>
          ) : null}
          {user?.role === "staff" || user?.role === "admin" ? (
            <Link to="/staff" className="text-sm font-medium text-stone-700" onClick={() => setOpen(false)}>Staff</Link>
          ) : null}
          {user?.role === "admin" ? (
            <Link to="/admin" className="text-sm font-medium text-stone-700" onClick={() => setOpen(false)}>Admin</Link>
          ) : null}
          <div className="border-t border-stone-100 pt-3 flex flex-col gap-2">
            {!user ? (
              <>
                <Link to="/register" className="btn-outline w-full justify-center" onClick={() => setOpen(false)}>Sign up</Link>
                <Link to="/login" className="btn-primary w-full justify-center" onClick={() => setOpen(false)}>Sign in</Link>
              </>
            ) : (
              <button onClick={() => { logout(); setOpen(false); }} className="text-sm font-medium text-stone-600 w-full text-left">
                Sign out ({user.name || user.email})
              </button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
