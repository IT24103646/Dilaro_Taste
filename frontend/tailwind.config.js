/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf8f0",
          100: "#faefd9",
          200: "#f4dba8",
          300: "#ecc46d",
          400: "#e3a83a",
          500: "#d4891a",
          600: "#b86d12",
          700: "#91520f",
          800: "#744211",
          900: "#5f3813",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.25rem", "3xl": "1.75rem" },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.05)",
        lift: "0 4px 24px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.06)",
        hero: "0 20px 60px rgba(0,0,0,.18)",
        admin: "0 0 0 1px rgba(255,255,255,.06)",
        glass: "0 8px 32px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
        premium: "0 20px 60px -10px rgba(0,0,0,.2), 0 4px 16px -4px rgba(0,0,0,.1)",
        sidebar: "4px 0 24px rgba(0,0,0,.25)",
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.4' } },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
        fadeUp: 'fadeUp 0.35s ease-out both',
        slideIn: 'slideIn 0.25s ease-out both',
        pulse2: 'pulse2 2s cubic-bezier(.4,0,.6,1) infinite',
      },
      backgroundImage: {
        "hero-pattern": "linear-gradient(135deg, #0f0f0f 0%, #1a1209 60%, #2d1f08 100%)",
        "admin-sidebar": "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        "brand-gradient": "linear-gradient(135deg, #d4891a 0%, #b86d12 100%)",
      },
    }
  },
  plugins: []
};
