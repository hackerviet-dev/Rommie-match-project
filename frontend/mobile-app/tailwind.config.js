/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.js", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        paper: "#f8fafc",
        coral: "#f9735b",
        mint: "#14b8a6",
        violet: "#7c3aed",
      },
    },
  },
  plugins: [],
};
