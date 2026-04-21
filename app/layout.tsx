import type { Metadata, Viewport } from 'next'
import { Inter, Lora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PostHogProvider } from './providers'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const lora = Lora({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'),
  title: 'Barterkin',
  description: "Georgia's community skills exchange.",
  appleWebApp: { capable: true, title: 'Barterkin', statusBarStyle: 'default' },
  applicationName: 'Barterkin',
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#2d5a27',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="font-sans bg-sage-bg text-forest-deep min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-forest focus:text-sage-bg focus:px-4 focus:py-2 focus:rounded"
        >
          Skip to content
        </a>
        <PostHogProvider>
          {children}
          <Footer />
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  )
}
