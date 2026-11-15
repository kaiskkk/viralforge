import type { Config } from "tailwindcss";

const withAlpha = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/components/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: withAlpha("--bg"),
        surface: withAlpha("--surface"),
        elevated: withAlpha("--elevated"),
        fg: withAlpha("--fg"),
        muted: withAlpha("--muted"),
        faint: withAlpha("--faint"),
        accent: withAlpha("--accent"),
        warn: withAlpha("--warn"),
        danger: withAlpha("--danger"),
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
        // Dérive lente des halos du hero.
        float: {
          "0%, 100%": { transform: "translate(-50%, 0) scale(1)" },
          "50%": { transform: "translate(-50%, -24px) scale(1.06)" },
        },
        // Léger va-et-vient vertical (icônes, puces).
        bob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        // Pulsation de lueur pour la carte Pro.
        "glow-pulse": {
          "0%, 100%": { opacity: "0.35" },
          "50%": { opacity: "0.7" },
        },
        // Dégradé qui défile (texte / bordure vivante).
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        float: "float 9s ease-in-out infinite",
        "float-slow": "float 14s ease-in-out infinite",
        bob: "bob 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        "gradient-pan": "gradient-pan 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
