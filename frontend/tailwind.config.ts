import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Space Grotesk", "Inter", "ui-sans-serif"],
        accent: ["Poppins", "Inter", "ui-sans-serif"]
      },
      colors: {
        arena: {
          bg: "#05070c",
          panel: "#0b0f18",
          panel2: "#111827",
          line: "#20283a",
          text: "#f7fbff",
          muted: "#9aa6b8",
          blue: "#1f8bff",
          cyan: "#22d3ee",
          purple: "#8b5cf6",
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444"
        }
      },
      boxShadow: {
        glow: "0 0 32px rgba(31, 139, 255, .22)",
        panel: "0 18px 70px rgba(0, 0, 0, .45)"
      },
      borderRadius: {
        arena: "8px"
      }
    }
  },
  plugins: []
} satisfies Config;
