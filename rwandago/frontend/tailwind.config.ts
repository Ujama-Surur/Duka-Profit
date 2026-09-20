import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rwanda: {
          green: "#0D5C3A",
          "green-light": "#15803D",
          "green-dark": "#0A462C",
          yellow: "#FAD02C",
          "yellow-hover": "#E5BE27",
          blue: "#00A3E0",
          "blue-dark": "#0082B3",
          clay: "#C85A32",
          sand: "#FAF7F2",
          dark: "#111827",
          gray: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
