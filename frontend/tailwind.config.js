/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#F4EFE6",
        ink: "#1C2A24",
        sage: "#3F6F5E",
        moss: "#24473C",
        mist: "#D8E3DC",
        foam: "#FBF8F2",
        amber: "#C4922A",
        rose: "#B55252",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Manrope", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(36, 71, 60, 0.45)",
      },
    },
  },
  plugins: [],
};
