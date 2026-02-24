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
        neutral: {
          950: "#0a0a0a",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.25rem" },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.05)",
        lift: "0 4px 24px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.06)",
        hero: "0 20px 60px rgba(0,0,0,.18)",
      },
      backgroundImage: {
        "hero-pattern": "linear-gradient(135deg, #0f0f0f 0%, #1a1209 60%, #2d1f08 100%)",
      },
    }
  },
  plugins: []
};
