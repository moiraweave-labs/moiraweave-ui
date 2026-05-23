import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f1f5f9",         // slate-100 (for body text in dark mode)
        "ink-muted": "#94a3b8",   // slate-400
        panel: "#0e1322",       // deep dark navy panel background
        line: "#1e293b",        // slate-800 border line
        forest: "#10b981",      // emerald-500 (primary action/success glow)
        "forest-hover": "#059669",
        steel: "#38bdf8",       // sky-400 (secondary blue accent)
        signal: "#f59e0b"       // amber-500 (warnings/queued status)
      },
      boxShadow: {
        glow: "0 0 15px rgba(16, 185, 129, 0.15)",
        "glow-blue": "0 0 15px rgba(56, 189, 248, 0.15)",
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.3)"
      }
    }
  },
  plugins: []
} satisfies Config;
