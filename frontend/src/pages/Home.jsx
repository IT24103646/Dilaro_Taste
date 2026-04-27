import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useCart } from "../lib/cart.jsx";
import HeroCarousel from "../components/HeroCarousel.jsx";

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
  const [popular, setPopular] = useState([]);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
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

  return (
    <div>
      <HeroCarousel
        className="mb-8"
        eyebrow="Welcome to Restaurant"
        title="Dine Well. Stay Comfortable. Live Simply."
        subtitle="Order food from our curated menu, book a room, and track everything in real time from one place."
        primaryAction={{ to: "/menu", label: "Explore Menu" }}
        secondaryAction={{ to: "/rooms", label: "Reserve a Room" }}
        preferSlideText={true}
      />

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
