import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'L Board — Hub Operacional',
    short_name: 'L Board',
    description: 'Hub operacional para gestores e equipes de agências e startups',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#0f172a',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      { src: '/apple-icon', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
