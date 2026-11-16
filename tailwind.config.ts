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
        charcoal: {
          950: "#060807",
          900: "#0a0c0b",
          850: "#0f1311",
          800: "#141917",
          700: "#1d2421",
        },
        baize: {
          950: "#04140d",
          900: "#082217",
          800: "#0d3523",
          600: "#15603e",
          500: "#00d67d",
          400: "#34e89e",
        },
        silver: {
          100: "#f4f5f7",
          200: "#e2e4e9",
          300: "#c0c4ce",
          400: "#8c92a4",
          500: "#5a6072",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "radial-emerald": "radial-gradient(circle at center, rgba(0, 214, 125, 0.14) 0%, rgba(8, 34, 23, 0.05) 45%, transparent 75%)",
        "baize-mesh": "radial-gradient(ellipse at 50% 0%, rgba(16, 85, 54, 0.22) 0%, rgba(10, 12, 11, 0) 70%)",
      },
      boxShadow: {
        "emerald-glow": "0 0 35px -5px rgba(0, 214, 125, 0.25), 0 0 15px -3px rgba(0, 214, 125, 0.15)",
        "glass-inset": "inset 0 1px 0 0 rgba(255, 255, 255, 0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
