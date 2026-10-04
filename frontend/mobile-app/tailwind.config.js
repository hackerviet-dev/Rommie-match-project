/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: "#0B3B6E",
        teal: "#087F8C",
        mint: "#8FD3C1",
        ink: "#17243A",
        paper: "#F7FBFC",
      },
    },
  },
  plugins: [],
};
