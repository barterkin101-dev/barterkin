import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Sign in — Barterkin', template: '%s — Barterkin' },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center py-16 px-6 bg-sage-bg">
      {children}
    </main>
  )
}
