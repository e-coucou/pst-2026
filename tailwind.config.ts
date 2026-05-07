/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Tu peux ajouter ici tes couleurs PST si besoin
      // ex: colors: { pstRed: '#e11d48' }
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },  
  plugins: [
    require('@tailwindcss/typography'), // <--- INDISPENSABLE pour le style des fichiers .md
  ],
}