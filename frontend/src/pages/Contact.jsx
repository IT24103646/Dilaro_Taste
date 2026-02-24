import React, { useState } from "react";
import { api } from "../lib/api.js";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

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
    <div className="space-y-6">
      <div>
        <div className="section-label mb-1">Contact</div>
        <h1 className="font-display text-3xl font-semibold text-stone-900">We're here to help</h1>
        <p className="text-stone-500 mt-1 text-sm">Send us a message - we'll get back to you within 24 hours.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="rounded-2xl bg-stone-900 text-white p-6 space-y-6">
          <div>
            <div className="text-xs font-semibold tracking-widest text-brand-400 uppercase mb-4">Contact Info</div>
            <div className="space-y-4 text-sm">
              <div className="flex gap-3 items-start">
                <span className="text-stone-400 text-xs mt-1">EMAIL</span>
                <span className="text-stone-200">support@restaurant.local</span>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-stone-400 text-xs mt-1">PHONE</span>
                <span className="text-stone-200">+1 (555) 010-2000</span>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-stone-400 text-xs mt-1">HOURS</span>
                <span className="text-stone-200">Mon-Sun, 8:00-22:00</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5">
            <div className="text-xs text-stone-500">For urgent matters, please call directly. This form is monitored during business hours.</div>
          </div>
        </div>

        <div className="md:col-span-2 card-premium p-6">
          <div className="font-semibold text-stone-900 mb-5">Send a message</div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {status === "sent" ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-5 text-sm">
              <div className="font-semibold text-base">Message received!</div>
              <div className="mt-1 text-stone-500">We'll be in touch shortly.</div>
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
                  <label className="text-xs font-medium text-stone-600 block mb-1">Name *</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 block mb-1">Email *</label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">Subject</label>
                <input
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Reservation inquiry, order issue, feedback..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1">Message *</label>
                <textarea
                  className="input resize-none"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="How can we help you?"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={status === "sending"} className="btn-primary px-8 py-2.5 rounded-xl text-sm">
                  {status === "sending" ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}