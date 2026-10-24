import type { Config } from "tailwindcss";

export default {
  theme: {
    extend: {
      colors: {
        brand: "var(--tn-brand)",
        action: "var(--tn-action)",
        canvas: "var(--tn-canvas)",
        soft: "var(--tn-soft)",
        ink: "var(--tn-ink)",
        muted: "var(--tn-muted)",
        accent: "var(--tn-accent)",
      },
      fontFamily: { sans: ["Poppins", "system-ui", "sans-serif"] },
      borderRadius: { panel: "20px" },
    },
  },
} satisfies Partial<Config>;
