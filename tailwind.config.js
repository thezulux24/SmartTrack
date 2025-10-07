import { defineConfig } from '@tailwindcss/postcss'

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        brand: "var(--brand)",     // teal
        heading: "var(--heading)", // azul oscuro
        accent: "var(--accent)",   // lima
      },
  fontFamily: {
    neo: ["Neo Sans", "ui-sans-serif", "system-ui"],
    sans: ["Neo Sans", "ui-sans-serif", "system-ui"]
  },
      borderRadius: {
        '2xl': '14px' // redondeado como en el mock
      },
      boxShadow: {
        card: "0 4px 18px rgba(0,0,0,0.08)"
      }
    }
  },
  plugins: []
}
