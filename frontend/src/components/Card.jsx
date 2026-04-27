import React from "react";

export function Card({ children, className = "", noPadding = false }) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-200/80 shadow-glass overflow-hidden ${
      noPadding ? "" : "p-5"
    } ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon, accent = "stone", trend }) {
  const accents = {
    stone:   { bg: "bg-stone-100",   text: "text-stone-600",   ring: "ring-stone-200" },
    brand:   { bg: "bg-brand-100",   text: "text-brand-600",   ring: "ring-brand-200" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600", ring: "ring-emerald-200" },
    amber:   { bg: "bg-amber-100",   text: "text-amber-600",   ring: "ring-amber-200" },
    blue:    { bg: "bg-blue-100",    text: "text-blue-600",    ring: "ring-blue-200" },
    violet:  { bg: "bg-violet-100",  text: "text-violet-600",  ring: "ring-violet-200" },
    red:     { bg: "bg-red-100",     text: "text-red-600",     ring: "ring-red-200" },
  };
  const a = accents[accent] || accents.stone;
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 shadow-glass p-5 flex items-start gap-4">
      {icon && (
        <div className={`w-11 h-11 rounded-2xl ${a.bg} ${a.text} flex items-center justify-center flex-shrink-0 ring-1 ${a.ring}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{title}</div>
        <div className="text-2xl font-bold text-stone-900 mt-0.5 leading-tight">{value ?? "—"}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {subtitle && <div className="text-xs text-stone-400">{subtitle}</div>}
            {trend !== undefined && (
              <span className={`text-xs font-semibold ${
                trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-500" : "text-stone-400"
              }`}>
                {trend > 0 ? "↑" : trend < 0 ? "↓" : ""} {Math.abs(trend)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
