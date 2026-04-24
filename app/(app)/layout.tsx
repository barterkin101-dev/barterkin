import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { AppNav } from '@/components/layout/AppNav'

export const metadata: Metadata = {
  title: { default: 'Barterkin', template: '%s -- Barterkin' },
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  // M-01 fix: getUser() revalidates the JWT against Supabase Auth — not spoofable via cookie.
  // CLAUDE.md bans getClaims()/getSession() for trust decisions; nav identity is a trust decision
  // because it gates the profile lookup and unseen-contact badge.
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null
  const email = user?.email ?? null

  // Fetch display_name + avatar_url + id + onboarding_completed_at for nav (separate query -- cheap, cached per-request)
  let displayName: string | null = null
  let avatarUrl: string | null = null
  let unseenContactCount = 0
  let showFinishSetup = false
  if (userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, onboarding_completed_at')
      .eq('owner_id', userId)
      .maybeSingle()
    displayName = profile?.display_name ?? email
    avatarUrl = profile?.avatar_url ?? null
    // D-04 + D-12: show the "Finish setup" nav link when the user has NOT completed onboarding.
    // profile === null (new user, no profile row yet) → show the link (wizard is the right next step).
    // profile.onboarding_completed_at === null → show the link.
    // profile.onboarding_completed_at is a timestamp → hide the link.
    showFinishSetup = !profile || profile.onboarding_completed_at === null

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
      <AppNav
        displayName={displayName}
        avatarUrl={avatarUrl}
        unseenContactCount={unseenContactCount}
        showFinishSetup={showFinishSetup}
      />
      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
