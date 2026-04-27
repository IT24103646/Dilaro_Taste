import React, { useState } from "react";
import { api } from "../lib/api.js";
import HeroCarousel from "../components/HeroCarousel.jsx";

function FieldIcon({ d }) {
  return (
    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const contactInfo = [
  {
    icon: "M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207",
    label: "Email",
    value: "support@restaurant.local",
  },
  {
    icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
    label: "Phone",
    value: "+1 (555) 010-2000",
  },
  {
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    label: "Hours",
    value: "Mon–Sun, 8:00–22:00",
  },
  {
    icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
    label: "Address",
    value: "123 Main St, Foodville",
  },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);
    setStatus("sending");
    try {
      const res = await api.post("/api/contact", form);
      setStatus("sent");
      setSuccess(res.data || { ok: true });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (e2) {
      setStatus("idle");
      setError(e2?.response?.data?.message || e2?.message || "Failed to send message");
    }
  }

  return (
    <div className="space-y-6 animate-fadeUp">
      <HeroCarousel
        className="mb-8"
        eyebrow="Contact"
        title="We're here to help"
        subtitle="Share your question and our team will get back to you within 24 hours."
        primaryAction={{ to: "/menu", label: "Browse Menu" }}
        secondaryAction={{ to: "/rooms", label: "Explore Rooms" }}
      />

      <div className="grid md:grid-cols-3 gap-5">
        {/* Contact Info Sidebar */}
        <div className="rounded-2xl bg-stone-900 text-white p-6 space-y-6">
          <div>
            <div className="text-xs font-semibold tracking-widest text-brand-400 uppercase mb-5">Contact Info</div>
            <div className="space-y-5">
              {contactInfo.map(ci => (
                <div key={ci.label} className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={ci.icon} />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-widest">{ci.label}</div>
                    <div className="text-sm text-stone-200 mt-0.5">{ci.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 pt-5">
            <div className="text-xs text-stone-500 leading-relaxed">For urgent matters, please call directly. This form is monitored during business hours.</div>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2 card-premium p-6">
          <div className="font-semibold text-stone-900 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            Send a message
          </div>

          {error && <div className="alert-error text-sm mb-4">{error}</div>}

          {status === "sent" ? (
            <div className="alert-success text-sm">
              <div className="font-semibold text-base mb-1">Message received!</div>
              <div className="text-stone-500 text-xs">We'll be in touch shortly.</div>
              {success?.ticketId && (
                <div className="mt-2 text-xs">Ticket reference: <span className="font-medium text-stone-700">{success.ticketId}</span></div>
              )}
              {success?.warning && (
                <div className="mt-1 text-amber-700 text-xs">{success.warning}</div>
              )}
              <button onClick={() => setStatus("idle")} className="mt-3 text-xs text-brand-600 hover:underline">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name *</label>
                  <div className="relative">
                    <FieldIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    <input className="input pl-10" value={form.name} onChange={set("name")} placeholder="Your full name" required />
                  </div>
                </div>
                <div>
                  <label className="label">Email *</label>
                  <div className="relative">
                    <FieldIcon d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    <input className="input pl-10" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Subject</label>
                <div className="relative">
                  <FieldIcon d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  <input className="input pl-10" value={form.subject} onChange={set("subject")} placeholder="Reservation inquiry, order issue, feedback…" />
                </div>
              </div>

              <div>
                <label className="label">Message *</label>
                <textarea
                  className="input resize-none"
                  rows={5}
                  value={form.message}
                  onChange={set("message")}
                  placeholder="How can we help you?"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={status === "sending"} className="btn-primary">
                  {status === "sending" ? (
                    <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Sending…</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
