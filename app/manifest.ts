import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PST 2026 — Paris Saint-Tropez',
    short_name: 'PST 2026',
    description: 'Tournoi officiel de pétanque de la Résidence Paris Saint-Tropez.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#e31e24', // Le rouge St-Tropez
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
