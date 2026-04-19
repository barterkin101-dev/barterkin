import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  // Serwist+Turbopack build incompat (PITFALLS Pitfall 2) → package.json build script uses --webpack.
  // Dev server (next dev) runs on Turbopack by default; disable PWA in dev to avoid friction.
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
}

export default withSerwist(nextConfig)
