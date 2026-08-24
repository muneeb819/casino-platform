import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        casino: {
          bg: "#0a0e1a",
          panel: "#111827",
          card: "#1a2233",
          accent: "#f59e0b",
          accent2: "#d97706",
        },
      },
    },
  },
  plugins: [],
};
export default config;
