import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import { AdminNav } from '@/components/admin/AdminNav'

export const metadata: Metadata = {
  title: { default: 'Admin — Barterkin', template: '%s — Barterkin Admin' },
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sage-bg">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
