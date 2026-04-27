import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

export default function HeroCarousel({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  preferSlideText = false,
  children,
  className = "",
}) {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    api.get("/api/hero")
      .then(({ data }) => {
        if (Array.isArray(data) && data.length) setSlides(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setCurrent((idx) => (idx + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((idx) => (idx - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const next = useCallback(() => {
    setCurrent((idx) => (idx + 1) % slides.length);
  }, [slides.length]);

  const activeSlide = slides[current];
  const displayTitle = preferSlideText && activeSlide?.title ? activeSlide.title : title;
  const displaySubtitle = preferSlideText && activeSlide?.subtitle ? activeSlide.subtitle : subtitle;

  return (
    <section className={`full-bleed relative overflow-hidden text-white bg-hero-pattern h-[300px] md:h-[430px] ${className}`}>
      {slides.map((slide, i) => (
        <div
          key={slide._id || `${slide.imageUrl}-${i}`}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
        >
          <img src={slide.imageUrl} alt={slide.title || `hero-${i + 1}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-stone-950/55" />
        </div>
      ))}

      {slides.length === 0 && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800" />
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_10%,#f59e0b,transparent_45%),radial-gradient(circle_at_80%_0%,#fb923c,transparent_35%)]" />
        </>
      )}

      <div className="relative z-10 max-w-6xl mx-auto h-full px-4 flex items-center">
        <div className="w-full max-w-3xl">
          {eyebrow ? <div className="section-label text-brand-400 mb-3">{eyebrow}</div> : null}
          {displayTitle ? <h1 className="font-display text-3xl md:text-5xl font-semibold leading-tight text-white">{displayTitle}</h1> : null}
          {displaySubtitle ? <p className="mt-3 text-stone-200 text-base md:text-lg leading-relaxed max-w-2xl">{displaySubtitle}</p> : null}

          {(primaryAction || secondaryAction) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {primaryAction ? (
                <Link to={primaryAction.to} className="btn-brand">
                  {primaryAction.label}
                </Link>
              ) : null}
              {secondaryAction ? (
                <Link to={secondaryAction.to} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-colors">
                  {secondaryAction.label}
                </Link>
              ) : null}
            </div>
          )}

          {children ? <div className="mt-6">{children}</div> : null}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
  );
}
