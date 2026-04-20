import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { AppNav } from '@/components/layout/AppNav'

export const metadata: Metadata = {
  title: { default: 'Barterkin', template: '%s -- Barterkin' },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  // getClaims() for display-only (nav header) per CLAUDE.md + RESEARCH Pitfall 4
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const email = (claims?.email as string | undefined) ?? null

  // Fetch display_name + avatar_url for nav (separate query -- cheap, cached per-request)
  let displayName: string | null = null
  let avatarUrl: string | null = null
  if (claims?.sub) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('owner_id', claims.sub as string)
      .maybeSingle()
    displayName = profile?.display_name ?? email
    avatarUrl = profile?.avatar_url ?? null
  }

  return (
    <div className="min-h-screen bg-sage-bg">
      <AppNav displayName={displayName} avatarUrl={avatarUrl} />
      <main className="mx-auto max-w-2xl px-6 py-12 md:py-16">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
