/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.js", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: "#0B3B6E",
        teal: "#15A9B8",
        mint: "#8FD3C1",
        ink: "#17243A",
        paper: "#F7FBFC",
      },
    },
  },
  plugins: [],
};
