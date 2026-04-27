import React from "react";
import { Link } from "react-router-dom";
import HeroCarousel from "../components/HeroCarousel.jsx";

const values = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    accent: "bg-brand-100 text-brand-600",
    title: "Our Mission",
    desc: "Deliver a seamless guest experience from discovery to checkout while giving the team clear operational tools.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    accent: "bg-blue-100 text-blue-600",
    title: "What We Offer",
    desc: "Menu ordering with delivery and pickup, room reservations with live availability, and real-time status tracking.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    accent: "bg-emerald-100 text-emerald-600",
    title: "Quality & Security",
    desc: "JWT-secured auth, role-based access for admins, staff, and customers, plus a full operations console.",
  },
];

const stats = [
  { label: "Menu items", value: "120+" },
  { label: "Guest rooms", value: "24" },
  { label: "Orders placed", value: "5,000+" },
  { label: "Average rating", value: "4.9 ★" },
];

export default function About() {
  return (
    <div className="space-y-8 animate-fadeUp">
      <HeroCarousel
        className="mb-8"
        eyebrow="About us"
        title="Hospitality, streamlined."
        subtitle="Food ordering, room reservations, and real-time guest updates in one seamless experience."
        primaryAction={{ to: "/menu", label: "Browse Menu" }}
        secondaryAction={{ to: "/rooms", label: "Reserve a Room" }}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card-premium p-5 text-center">
            <div className="font-display text-2xl font-bold text-stone-900">{s.value}</div>
            <div className="text-xs text-stone-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Value cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {values.map((v) => (
          <div key={v.title} className="card-premium p-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${v.accent}`}>
              {v.icon}
            </div>
            <div className="font-semibold text-stone-900 mb-2">{v.title}</div>
            <p className="text-sm text-stone-500 leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>

      {/* Hours + Contact */}
      <div className="card-premium p-6 grid md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="section-label">Opening Hours</div>
          </div>
          <div className="space-y-2.5 text-sm text-stone-600">
            <div className="flex justify-between items-center border-b border-stone-100 pb-2">
              <span>Monday – Friday</span><span className="font-semibold text-stone-800">8:00 – 22:00</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Saturday – Sunday</span><span className="font-semibold text-stone-800">9:00 – 22:00</span>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <div className="section-label">Get in Touch</div>
          </div>
          <div className="space-y-2.5 text-sm text-stone-600">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
              support@restaurant.local
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              +1 (555) 010-2000
            </div>
            <div className="mt-2 pt-2 border-t border-stone-100">
              <Link to="/contact" className="text-brand-500 hover:text-brand-600 font-medium text-sm flex items-center gap-1.5">
                Send us a message
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}