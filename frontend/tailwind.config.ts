import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        "muted-foreground": "var(--text-secondary)",
        primary: "#3b82f6", // tailwind blue-500
        secondary: "#10b981", // tailwind emerald-500
      },
    },
  },
  plugins: [],
};
export default config;
