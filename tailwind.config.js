/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#3B6E96",
        "slate-soft": "#64748B",
        "slate-deep": "#1E293B",
        "border-light": "#E2E8F0",
        "background-light": "#F9F8F6",
        "background-dark": "#101522",
        "surface": "#FFFFFE",
        "text-main": "#2C2C2A",
        "text-muted": "#6B6B66",
        "border-subtle": "#E5E7EB",
        "accent-sand": "#D8Cbbd",
        "accent-sage": "#5D7A68",
        "paper": "#F9FAFB",
        "ink": "#1A1A1A",
        "graphite": "#6B7280",
        "rule": "#E5E7EB",
      },
      fontFamily: {
        "sans": ["Inter", "sans-serif"],
        "serif": ["Playfair Display", "serif"],
        "display": ["Fraunces", "serif"],
        "body": ["Outfit", "sans-serif"],
      },
      maxWidth: {
        "article": "800px",
      },
      borderRadius: {
        "card": "16px",
        "btn": "32px",
      },
      boxShadow: {
        "soft": "0 20px 40px -10px rgba(44, 44, 42, 0.05)",
        "hover": "0 25px 50px -12px rgba(59, 110, 150, 0.15)",
      }
    },
  },
  plugins: [],
}
