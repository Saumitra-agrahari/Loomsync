import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F7F7F5",
        surfaceHover: "#EFEFEA",
        border: "#E2E2DE",
        textPrimary: "#161616",
        textSecondary: "#6B6B66",
        accent: {
          DEFAULT: "#2B3A67",
          hover: "#202C4E",
          subtle: "#EAEFF9",
        },
        status: {
          green: "#2E7D32",
          greenLight: "#E8F5E9",
          amber: "#B7791F",
          amberLight: "#FEF3C7",
          red: "#C62828",
          redLight: "#FFEBEE",
          grey: "#757575",
          greyLight: "#F0F0F0",
        },
      },
      borderRadius: {
        DEFAULT: "8px",
        md: "8px",
        lg: "8px",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Noto Sans Tamil'",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
