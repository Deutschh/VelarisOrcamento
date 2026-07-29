/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        velaris: {
          black: "#0B0B0D",
          graphite: "#151618",
          smoke: "#2B2D31",
          white: "#F2F2F4",
        },
      },
    },
  },
  plugins: [],
};
