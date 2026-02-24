import React from "react";
import { Link } from "react-router-dom";

const values = [
  { icon: String.fromCodePoint(0x1F3AF), title: "Our Mission", desc: "Deliver a seamless guest experience from discovery to checkout while giving the team clear operational tools." },
  { icon: String.fromCodePoint(0x1F37D,0xFE0F), title: "What We Offer", desc: "Menu ordering with delivery and pickup, room reservations with live availability, and real-time status tracking." },
  { icon: String.fromCodePoint(0x1F512), title: "Quality & Security", desc: "JWT-secured auth, role-based access for admins, staff, and customers, plus a full operations console." },
];

export default function About() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-hero-pattern text-white px-8 py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,#d4891a,transparent)]" />
        <div className="relative z-10 max-w-2xl">
          <div className="section-label text-brand-400 mb-3">About us</div>
          <h1 className="font-display text-4xl font-bold text-white leading-tight">Hospitality, streamlined.</h1>
          <p className="text-stone-300 mt-4 text-base leading-relaxed">
            This platform brings together food ordering, room reservations, and real-time tracking in one
            seamless experience. Built to be fast for guests and operationally reliable for staff.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/menu" className="btn-brand px-6 py-3 rounded-xl text-sm">Browse Menu</Link>
            <Link to="/rooms" className="px-6 py-3 rounded-xl border border-white/30 text-white text-sm hover:bg-white/10 transition-colors">Reserve a Room</Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {values.map((v) => (
          <div key={v.title} className="card-premium p-6">
            <div className="text-3xl mb-4">{v.icon}</div>
            <div className="font-semibold text-stone-900 mb-2">{v.title}</div>
            <p className="text-sm text-stone-500 leading-relaxed">{v.desc}</p>
          </div>
        ))}
      </div>

      <div className="card-premium p-6 grid md:grid-cols-2 gap-6">
        <div>
          <div className="section-label mb-3">Opening Hours</div>
          <div className="space-y-2 text-sm text-stone-600">
            <div className="flex justify-between"><span>Monday - Friday</span><span className="font-medium text-stone-800">8:00 - 22:00</span></div>
            <div className="flex justify-between"><span>Saturday - Sunday</span><span className="font-medium text-stone-800">9:00 - 22:00</span></div>
          </div>
        </div>
        <div>
          <div className="section-label mb-3">Get in Touch</div>
          <div className="space-y-2 text-sm text-stone-600">
            <div>Email: support@restaurant.local</div>
            <div>Phone: +1 (555) 010-2000</div>
            <div className="mt-2"><Link to="/contact" className="text-brand-500 hover:underline font-medium">Send us a message</Link></div>
          </div>
        </div>
      </div>
    </div>
  );
}