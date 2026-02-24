import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useCart } from "../lib/cart.jsx";

const features = [
  {
    icon: "🍽️",
    title: "Fresh Menu Daily",
    desc: "Explore dishes curated by our chefs, filtered by category, with full ingredient details and allergen information.",
  },
  {
    icon: "🏨",
    title: "Room Reservations",
    desc: "Browse beautifully equipped rooms, check live availability, and reserve instantly — with or without an account.",
  },
  {
    icon: "📍",
    title: "Real-Time Tracking",
    desc: "Every order and reservation update reaches you instantly. No more refreshing or waiting in uncertainty.",
  },
];

const stats = [
  { value: "50+", label: "Menu Items" },
  { value: "12", label: "Rooms Available" },
  { value: "24/7", label: "Online Booking" },
  { value: "100%", label: "Guest-First" },
];

export default function Home() {
  const { addToCart } = useCart();
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [popular, setPopular] = useState([]);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    api.get("/api/hero")
      .then(({ data }) => { if (data.length) setSlides(data); })
      .catch(() => {});
    api.get("/api/menu/popular?limit=6")
      .then(({ data }) => setPopular(data.items || []))
      .catch(() => {});
  }, []);

  function handleAdd(item, e) {
    e.preventDefault();
    addToCart(item);
    setAddedId(item._id);
    setTimeout(() => setAddedId(null), 1400);
  }

  // Auto-advance every 5 s
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), [slides.length]);
  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), [slides.length]);

  const hasSlides = slides.length > 0;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl text-white mb-8 mt-2 min-h-[340px] md:min-h-[420px] bg-hero-pattern">
        {/* Carousel images */}
        {hasSlides && slides.map((slide, i) => (
          <div
            key={slide._id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100 z-0" : "opacity-0 z-0"}`}
          >
            <img
              src={slide.imageUrl}
              alt={slide.title || `slide ${i + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Dark overlay so text is always readable */}
            <div className="absolute inset-0 bg-stone-950/55" />
          </div>
        ))}

        {/* Default dark gradient when no slides */}
        {!hasSlides && (
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,#d4891a,transparent)]" />
        )}

        {/* Content */}
        <div className="relative z-10 px-8 py-20 md:py-28 max-w-3xl">
          {hasSlides && slides[current]?.title ? (
            <>
              <div className="section-label text-brand-400 mb-4">Welcome to Restaurant</div>
              <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight text-white">
                {slides[current].title}
              </h1>
              {slides[current].subtitle && (
                <p className="mt-4 text-stone-200 text-lg leading-relaxed max-w-lg">{slides[current].subtitle}</p>
              )}
            </>
          ) : (
            <>
              <div className="section-label text-brand-400 mb-4">Welcome to Restaurant</div>
              <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight text-white">
                Dine Well.<br />Stay Comfortable.<br />
                <span className="text-brand-400">Live Simply.</span>
              </h1>
              <p className="mt-6 text-stone-300 text-lg leading-relaxed max-w-lg">
                Order food from our curated menu, book a room, and track everything in real time — all from one place.
              </p>
            </>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/menu" className="btn-brand text-base px-7 py-3 rounded-xl">Explore Menu</Link>
            <Link to="/rooms" className="inline-flex items-center gap-2 px-7 py-3 rounded-xl border border-white/30 text-white text-base font-medium hover:bg-white/10 transition-colors">
              Reserve a Room
            </Link>
          </div>
        </div>

        {/* Carousel controls — only shown when 2+ slides */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            >
              &#8592;
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
            >
              &#8594;
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`w-2 h-2 rounded-full transition-all ${i === current ? "bg-white w-5" : "bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card-premium p-6 text-center">
            <div className="text-3xl font-bold text-stone-900">{s.value}</div>
            <div className="text-xs text-stone-500 mt-1 font-medium tracking-wide">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Popular Picks */}
      {popular.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="section-label mb-1">Fast Going Picks</div>
              <h2 className="font-display text-2xl font-semibold text-stone-900">Most Ordered</h2>
            </div>
            <Link to="/menu" className="text-sm font-medium text-brand-600 hover:underline">View full menu →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {popular.map(item => (
              <Link
                key={item._id}
                to={`/menu/${item._id}`}
                className="card-premium overflow-hidden group flex flex-col hover:shadow-lift transition-shadow"
              >
                <div className="relative h-28 bg-stone-100 overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-stone-200">🍴</div>
                  )}
                  {item.orderCount > 0 && (
                    <div className="absolute top-1.5 right-1.5 bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      🔥 {item.orderCount}
                    </div>
                  )}
                </div>
                <div className="p-2.5 flex-1 flex flex-col">
                  <div className="text-xs font-semibold text-stone-900 leading-snug line-clamp-2">{item.name}</div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-stone-900">${Number(item.price).toFixed(2)}</span>
                    <button
                      onClick={(e) => handleAdd(item, e)}
                      disabled={!item.isActive}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${addedId === item._id ? "bg-emerald-500 text-white" : "bg-stone-900 text-white hover:bg-stone-700"} disabled:opacity-40`}
                    >
                      {addedId === item._id ? "✓" : "+"}
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="mb-8">
        <div className="text-center mb-8">
          <div className="section-label mb-2">Why choose us</div>
          <h2 className="font-display text-3xl font-semibold text-stone-900">Everything in one place</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="card-premium p-6 group hover:shadow-lift transition-shadow duration-200">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-stone-900 text-lg mb-2">{f.title}</h3>
              <p className="text-stone-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Band */}
      <section className="rounded-2xl bg-brand-500 px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="font-display text-2xl font-semibold text-white">Ready to order or book a room?</h2>
          <p className="text-brand-100 mt-1 text-sm">No account required for browsing and ordering.</p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link to="/menu" className="px-6 py-3 rounded-xl bg-white text-brand-600 font-semibold text-sm hover:bg-brand-50 transition-colors shadow-sm">
            View Menu
          </Link>
          <Link to="/contact" className="px-6 py-3 rounded-xl border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors">
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
