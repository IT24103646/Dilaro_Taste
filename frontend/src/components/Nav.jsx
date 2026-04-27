import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { useCart } from "../lib/cart.jsx";

// SVG Icon components
const MenuBookIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const RoomIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const AboutIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ContactIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const TrackIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);
const PackageIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10m0-10L4 7v10l8 4" />
  </svg>
);
const CartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);
const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const ProfileIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-1.5 text-sm font-medium transition-all duration-150 px-2.5 py-1.5 rounded-lg ${
    isActive
      ? "text-stone-900 bg-stone-100"
      : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
  }`;

export default function Nav() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { pathname } = useLocation();
  const isAdmin = user?.role === "admin";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-glass border-b border-stone-100"
          : "bg-white border-b border-stone-100"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-15 md:h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <span className="w-9 h-9 rounded-xl bg-stone-900 flex items-center justify-center text-white text-sm font-bold font-display group-hover:bg-brand-500 transition-colors shadow-sm">
            R
          </span>
          <span className="font-display font-semibold tracking-tight text-stone-900 text-base hidden sm:inline">
            Restaurant
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {!isAdmin && (
            <>
              <NavLink to="/menu" className={navLinkClass}><MenuBookIcon />Menu</NavLink>
              <NavLink to="/rooms" className={navLinkClass}><RoomIcon />Rooms</NavLink>
              <NavLink to="/packages" className={navLinkClass}><PackageIcon />Packages</NavLink>
              <NavLink to="/about" className={navLinkClass}><AboutIcon />About</NavLink>
              <NavLink to="/contact" className={navLinkClass}><ContactIcon />Contact</NavLink>
              <NavLink to="/track" className={navLinkClass}><TrackIcon />Track</NavLink>
            </>
          )}
          {(user?.role === "staff" || user?.role === "admin") && (
            <NavLink to="/staff" className={navLinkClass}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Staff
            </NavLink>
          )}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Cart badge (guests + customers) */}
          {!isAdmin && (
            <Link
              to="/menu"
              className="relative p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              aria-label="Cart"
            >
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          )}

          {!user ? (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/register" className="btn-outline px-4 py-2 text-sm">Sign up</Link>
              <Link to="/login" className="btn-primary px-4 py-2 text-sm">Sign in</Link>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link to="/profile" className="btn-outline px-3 py-2 text-xs inline-flex items-center gap-1.5">
                <ProfileIcon />
                My Profile
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                  {user.name?.[0] || user.email?.[0]}
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-stone-800 leading-tight">{user.name?.split(" ")[0] || "User"}</div>
                  <div className="text-stone-400 capitalize leading-tight">{user.role}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="btn-ghost px-3 py-2 text-xs gap-1.5"
                title="Sign out"
              >
                <LogoutIcon />
                Sign out
              </button>
            </div>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-xl hover:bg-stone-100 transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span className={`block h-0.5 w-5 bg-stone-700 transition-all duration-200 ${open ? "rotate-45 translate-y-[7px]" : ""}`} />
            <span className={`block h-0.5 w-5 bg-stone-700 transition-all duration-200 ${open ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-stone-700 transition-all duration-200 ${open ? "-rotate-45 -translate-y-[7px]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-stone-100 bg-white px-4 py-4 space-y-1 shadow-glass">
          {!isAdmin && (
            <>
              <Link to="/menu" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50" onClick={() => setOpen(false)}><MenuBookIcon />Menu</Link>
              <Link to="/rooms" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50" onClick={() => setOpen(false)}><RoomIcon />Rooms</Link>
              <Link to="/packages" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50" onClick={() => setOpen(false)}><PackageIcon />Packages</Link>
              <Link to="/about" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50" onClick={() => setOpen(false)}><AboutIcon />About</Link>
              <Link to="/contact" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50" onClick={() => setOpen(false)}><ContactIcon />Contact</Link>
              <Link to="/track" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50" onClick={() => setOpen(false)}><TrackIcon />Track Order</Link>
            </>
          )}
          {(user?.role === "staff" || user?.role === "admin") && (
            <Link to="/staff" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 hover:bg-stone-50" onClick={() => setOpen(false)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Staff Dashboard
            </Link>
          )}
          <div className="border-t border-stone-100 mt-2 pt-3 space-y-2">
            {!user ? (
              <>
                <Link to="/register" className="btn-outline w-full justify-center" onClick={() => setOpen(false)}>Sign up</Link>
                <Link to="/login" className="btn-primary w-full justify-center" onClick={() => setOpen(false)}>Sign in</Link>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                    {user.name?.[0] || user.email?.[0]}
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-stone-800">{user.name || user.email}</div>
                    <div className="text-stone-400 capitalize">{user.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/profile" className="btn-outline text-xs px-3 py-1.5" onClick={() => setOpen(false)}>
                    <ProfileIcon />Profile
                  </Link>
                  <button onClick={() => { logout(); setOpen(false); }} className="btn-ghost text-xs px-3 py-1.5">
                    <LogoutIcon />Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
