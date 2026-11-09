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
        background: "var(--color-bg)",
        surface: {
          DEFAULT: "var(--color-surface)",
          raised: "var(--color-surface-raised)",
          hover: "var(--color-surface-hover)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          subtle: "var(--color-border-subtle)",
        },
        textPrimary: "var(--color-text)",
        textSecondary: "var(--color-text-muted)",
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          subtle: "var(--color-accent-subtle)",
          fg: "var(--color-accent-fg)",
        },
        status: {
          green: "var(--color-green)",
          greenLight: "var(--color-green-tint)",
          greenText: "var(--color-green-text)",
          amber: "var(--color-amber)",
          amberLight: "var(--color-amber-tint)",
          amberText: "var(--color-amber-text)",
          red: "var(--color-red)",
          redLight: "var(--color-red-tint)",
          redText: "var(--color-red-text)",
          grey: "var(--color-grey)",
          greyLight: "var(--color-grey-tint)",
          greyText: "var(--color-grey-text)",
        },
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "6px",
        md: "8px",
        lg: "8px",
        xl: "12px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Noto Sans Tamil'",
          "'Latha'",
          "system-ui",
          "sans-serif",
        ],
        tamil: [
          "'Noto Sans Tamil'",
          "'Latha'",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        raised: "0 2px 4px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
