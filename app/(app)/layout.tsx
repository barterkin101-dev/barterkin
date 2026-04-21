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

  // Fetch display_name + avatar_url + id for nav (separate query -- cheap, cached per-request)
  let displayName: string | null = null
  let avatarUrl: string | null = null
  let unseenContactCount = 0
  if (claims?.sub) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('owner_id', claims.sub as string)
      .maybeSingle()
    displayName = profile?.display_name ?? email
    avatarUrl = profile?.avatar_url ?? null

    // Count unseen contact requests for badge (graceful degradation on error)
    if (profile?.id) {
      const { count } = await supabase
        .from('contact_requests')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .is('seen_at', null)
      unseenContactCount = count ?? 0
    }
  }

  return (
    <div className="min-h-screen bg-sage-bg">
      <AppNav displayName={displayName} avatarUrl={avatarUrl} unseenContactCount={unseenContactCount} />
      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
