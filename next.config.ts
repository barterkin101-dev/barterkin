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
  // Empty turbopack config silences Next 16's "webpack config with no turbopack config"
  // error that fires when withSerwist injects its webpack config for the build step.
  // Serwist is disabled in dev anyway (see disable: above), so dev runs clean on Turbopack.
  turbopack: {},
}

export default withSerwist(nextConfig)
