import React from "react";
import { Link } from "react-router-dom";

const footerLinks = {
  "Explore": [
    { label: "Menu", to: "/menu" },
    { label: "Rooms", to: "/rooms" },
    { label: "Track Order", to: "/track" },
  ],
  "Company": [
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-stone-950 text-stone-400 mt-12">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-display font-extrabold text-sm">R</div>
              <span className="font-display text-white font-semibold text-lg">Restaurant</span>
            </div>
            <p className="text-sm leading-relaxed text-stone-500">
              Bringing together food ordering, room reservations, and real-time tracking for a seamless guest experience.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <div className="text-xs font-semibold tracking-widest uppercase text-stone-300 mb-3">{group}</div>
              <ul className="space-y-2">
                {links.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-stone-500 hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-stone-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-600">© {new Date().getFullYear()} Restaurant. All rights reserved.</div>
          <div className="text-xs text-stone-600 flex gap-4">
            <span>support@restaurant.local</span>
            <span>+1 (555) 010-2000</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
