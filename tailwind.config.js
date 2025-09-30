import { defineConfig } from '@tailwindcss/postcss'

export default defineConfig({
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
})