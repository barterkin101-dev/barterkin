import type { Metadata, Viewport } from 'next'
import { Inter, Lora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { PostHogProvider } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const lora = Lora({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })

export const metadata: Metadata = {
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
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  )
}
