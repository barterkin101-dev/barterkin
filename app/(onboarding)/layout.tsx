import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: { default: 'Get started — Barterkin', template: '%s — Barterkin' },
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-12 sm:py-16 bg-sage-bg">
      {children}
      <Toaster position="bottom-right" />
    </main>
  )
}
