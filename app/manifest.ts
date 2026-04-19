import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Barterkin',
    short_name: 'Barterkin',
    description: "Georgia's community skills exchange.",
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#eef3e8', // --color-sage-bg
    theme_color: '#2d5a27', // --color-forest
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
