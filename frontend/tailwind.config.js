/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#0D0D0F",
        cream: "#0D0D0F",
        foam: "#161B22",
        mist: "#1C2421",
        ink: "#F2F6F3",
        sage: "#87EDA8",
        moss: "#87EDA8",
        leaf: "#187E52",
        pale: "#DDF7E3",
        muted: "#8B958E",
        amber: "#E8B84A",
        rose: "#E86B6B",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "Manrope", "ui-sans-serif", "system-ui"],
        sans: ["Manrope", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        soft: "0 24px 60px -32px rgba(0, 0, 0, 0.7)",
        glow: "0 0 40px -12px rgba(135, 237, 168, 0.35)",
      },
    },
  },
  plugins: [],
};
