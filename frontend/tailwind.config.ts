import type { Config } from "tailwindcss";

// A escala "cyan" foi remapeada para o lado azul da identidade Transmissao,
// para que as classes cyan-* ja usadas no app herdem a nova cor.
const sideA = {
  50: "#eaf2ff",
  100: "#d3e4ff",
  200: "#a9caff",
  300: "#78acff",
  400: "#3d8bff",
  500: "#2f74e0",
  600: "#245cb6",
  700: "#1c478c",
  800: "#153668",
  900: "#0b2a57",
  950: "#071a37"
};

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Barlow", "ui-sans-serif", "system-ui"],
        display: ["Chakra Petch", "Barlow", "ui-sans-serif"],
        accent: ["Chakra Petch", "Barlow", "ui-sans-serif"]
      },
      colors: {
        cyan: sideA,
        arena: {
          bg: "rgb(var(--arena-bg) / <alpha-value>)",
          panel: "rgb(var(--arena-panel) / <alpha-value>)",
          panel2: "rgb(var(--arena-panel-2) / <alpha-value>)",
          line: "rgb(var(--arena-line) / <alpha-value>)",
          text: "rgb(var(--arena-text) / <alpha-value>)",
          muted: "rgb(var(--arena-muted) / <alpha-value>)",
          blue: "#3d8bff",
          cyan: "#3d8bff",
          amber: "#ffb020",
          purple: "#8b5cf6",
          success: "#3ccf8e",
          warning: "#ffb020",
          danger: "#ff4d5e",
          live: "#ff4d5e",
          ink: "#08111f"
        }
      },
      boxShadow: {
        glow: "none",
        panel: "none"
      },
      borderRadius: {
        arena: "2px"
      }
    }
  },
  plugins: []
} satisfies Config;
