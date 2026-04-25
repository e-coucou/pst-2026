/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
	"./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // <--- Indispensable pour tes halos et tes zooms !
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
