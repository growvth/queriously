import type { Config } from "tailwindcss";

/**
 * Theme tokens are exposed as CSS custom properties so the active theme
 * (Queriously Dark / Scholar Light) can be swapped at runtime by toggling a
 * class on <html>. Every token is referenced via `rgb(var(--x) / <alpha>)`
 * so Tailwind opacity modifiers still work (`bg-surface-raised/80`).
 */
const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          base: rgb("--surface-base"),
          raised: rgb("--surface-raised"),
          overlay: rgb("--surface-overlay"),
          border: rgb("--surface-border"),
        },
        text: {
          primary: rgb("--text-primary"),
          secondary: rgb("--text-secondary"),
          muted: rgb("--text-muted"),
          accent: rgb("--accent-primary"),
        },
        accent: {
          primary: rgb("--accent-primary"),
          secondary: rgb("--accent-secondary"),
          success: rgb("--accent-success"),
          warning: rgb("--accent-warning"),
          error: rgb("--accent-error"),
        },
        annotation: {
          yellow: "#FEF08A",
          green: "#BBF7D0",
          blue: "#BAE6FD",
          pink: "#FBCFE8",
          orange: "#FED7AA",
        },
        marginalia: {
          restatement: rgb("--text-secondary"),
          assumption: "#FBBF24",
          contradiction: rgb("--accent-primary"),
          connection: "#60A5FA",
          limitation: "#FB923C",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        base: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
