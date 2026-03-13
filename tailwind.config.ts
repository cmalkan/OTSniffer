import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        malkan: {
          bg: "#061225",
          panel: "#0c1b31",
          accent: "#1ecad3",
          accent2: "#58e09d",
          muted: "#8aa2bd"
        }
      }
    }
  },
  plugins: []
};

export default config;
