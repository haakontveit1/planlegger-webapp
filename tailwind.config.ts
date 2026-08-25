import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        surfaceElevated: "var(--color-surface-elevated)",
        border: "var(--color-border)",
        accent: "#7B72FF",
        accentLight: "#9D96FF",
        success: "#3DDBD2",
        danger: "#FF6B6B",
        textPrimary: "var(--color-text-primary)",
        textSecondary: "var(--color-text-secondary)",
        textMuted: "var(--color-text-muted)",
        categoryWork: "#54A0FF",
        categoryMeals: "#FF9F43",
        categoryWorkout: "#5F27CD",
        categoryRemember: "#FECA57",
        categoryPlans: "#1DD1A1",
        categoryDeadlines: "#FF6B6B",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        full: "9999px",
      },
      fontSize: {
        "2xs": ["11px", "1.4"],
        xs: ["13px", "1.4"],
        sm: ["15px", "1.5"],
        base: ["17px", "1.5"],
        lg: ["20px", "1.4"],
        xl: ["24px", "1.3"],
        "2xl": ["30px", "1.2"],
        "3xl": ["36px", "1.1"],
        title: ["42px", "1.1"],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
      },
      transitionDuration: {
        instant: "100ms",
        fast: "200ms",
        normal: "300ms",
        slow: "500ms",
        celebration: "800ms",
      },
      animation: {
        "pop-in": "pop-in 200ms ease-out",
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 250ms ease-out",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.94)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
