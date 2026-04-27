import React from "react";
import { Link } from "react-router-dom";

const footerLinks = {
  Explore: [
    { label: "Menu", to: "/menu" },
    { label: "Rooms", to: "/rooms" },
    { label: "Track Order", to: "/track" },
  ],
  Company: [
    { label: "About Us", to: "/about" },
    { label: "Contact", to: "/contact" },
    { label: "Register", to: "/register" },
  ],
};

const EmailIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const PhoneIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const ClockIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const ArrowUpRight = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M7 7h10v10" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-stone-950 text-stone-400 mt-16">
      {/* Top wave */}
      <div className="h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 pt-14 pb-10">
        <div className="grid md:grid-cols-12 gap-10 mb-12">
          {/* Brand column */}
          <div className="md:col-span-5">
            <Link to="/" className="flex items-center gap-3 mb-5 group w-fit">
              <div className="w-9 h-9 bg-brand-gradient rounded-xl flex items-center justify-center text-white font-display font-extrabold text-sm shadow-sm group-hover:shadow-brand-500/30 transition-shadow">
                R
              </div>
              <span className="font-display text-white font-semibold text-xl">Restaurant</span>
            </Link>
            <p className="text-sm leading-relaxed text-stone-500 max-w-sm">
              A premium hospitality experience — fine dining, comfortable rooms, and real-time service tracking all from one elegant platform.
            </p>
            <div className="mt-6 space-y-2.5">
              <a href="mailto:support@restaurant.local" className="flex items-center gap-2.5 text-sm text-stone-500 hover:text-stone-200 transition-colors">
                <EmailIcon />support@restaurant.local
              </a>
              <a href="tel:+15550102000" className="flex items-center gap-2.5 text-sm text-stone-500 hover:text-stone-200 transition-colors">
                <PhoneIcon />+1 (555) 010-2000
              </a>
              <div className="flex items-center gap-2.5 text-sm text-stone-500">
                <ClockIcon />Mon – Sun &nbsp;&bull;&nbsp; 08:00 – 22:00
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group} className="md:col-span-2">
              <div className="text-xs font-bold tracking-widest uppercase text-stone-300 mb-4">{group}</div>
              <ul className="space-y-3">
                {links.map(l => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="flex items-center gap-1 text-sm text-stone-500 hover:text-white transition-colors group"
                    >
                      <span>{l.label}</span>
                      <ArrowUpRight />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* CTA column */}
          <div className="md:col-span-3">
            <div className="text-xs font-bold tracking-widest uppercase text-stone-300 mb-4">Quick Actions</div>
            <div className="space-y-3">
              <Link to="/menu" className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-stone-300 hover:bg-white/10 hover:text-white transition-all group">
                <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Browse Menu
              </Link>
              <Link to="/rooms" className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-stone-300 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Book a Room
              </Link>
              <Link to="/track" className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-stone-300 hover:bg-white/10 hover:text-white transition-all">
                <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                Track Order
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-stone-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-600">© {new Date().getFullYear()} Restaurant Inc. All rights reserved.</div>
          <div className="flex items-center gap-4 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse2" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
