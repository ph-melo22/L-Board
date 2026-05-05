import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'L Board',
    short_name: 'L Board',
    description: 'Hub Operacional — Gestão de clientes, financeiro e demandas',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b',
    theme_color: '#0f172a',
    icons: [
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      { src: '/icon', sizes: '32x32', type: 'image/png' },
    ],
  }
}
