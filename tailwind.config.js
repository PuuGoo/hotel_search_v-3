/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode surfaces (existing)
        dusk: "#242526",
        lightgray: "#3a3b3c",
        // Legacy accent: the app historically used `sky-*` as its primary
        // accent. We remap the sky scale onto the reference design's brand blue
        // (#007aff) so every existing `sky-400/500/600` usage across ~50 files
        // adopts the new Messenger-style accent without touching each file.
        sky: {
          50: "#e3f2fd",
          100: "#cfe6ff",
          200: "#a6d2ff",
          300: "#6db5ff",
          400: "#338fff",
          500: "#007aff",
          600: "#0051d5",
          700: "#0042ad",
          800: "#003585",
          900: "#002a6b",
        },
        // Messenger-style design system (from reference UI)
        canvas: "#e8ebf0",      // outer app background (pale blue-gray)
        panel: "#ffffff",        // white rounded panels
        brand: {
          DEFAULT: "#007aff",    // primary blue (sent messages, active icons, send btn)
          dark: "#0051d5",       // hover/pressed blue
          soft: "#e3f2fd",       // soft blue chip background
        },
        accent: {
          DEFAULT: "#5b5fc7",    // indigo (selected list item, primary avatars)
          dark: "#4a4eb0",
        },
        ink: {
          DEFAULT: "#1d1d1f",    // primary text (near-black)
          soft: "#636366",       // secondary text / timestamps — darkened from
                                  // #8e8e93 to clear WCAG AA (4.5:1) on white
        },
        hairline: "#e5e5ea",     // borders & dividers
        fill: "#f2f2f7",         // input / hover fill
        online: "#34c759",       // available / online green
        alert: "#ff3b30",        // red badge
        warn: "#ff9500",         // orange badge
      },
      borderRadius: {
        bubble: "18px",
        panel: "16px",
      },
      boxShadow: {
        bubble: "0 1px 2px rgba(0,0,0,0.05)",
        card: "0 2px 8px rgba(0,0,0,0.08)",
        float: "0 4px 12px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms")({
      strategy: "class",
    }),
  ],
  darkMode: "class",
};
