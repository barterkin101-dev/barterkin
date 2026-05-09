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
  let unseenMessageCount = 0
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
      const { count: contactCount } = await supabase
        .from('contact_requests')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .is('seen_at', null)
      unseenContactCount = contactCount ?? 0

      // Count unread messages across all conversations
      const { data: unreadMessages } = await supabase
        .from('conversation_participants')
        .select(
          `conversation_id, last_read_at,
           conversations!inner(
             messages!inner(
               id, sender_profile_id, created_at
             )
           )`,
        )
        .eq('profile_id', profile.id)

      let messageCount = 0
      for (const row of (unreadMessages ?? [])) {
        const msgs = (row.conversations as unknown as { messages: Array<{ sender_profile_id: string; created_at: string }> }).messages ?? []
        const lastRead = row.last_read_at
        for (const m of msgs) {
          if (m.sender_profile_id === profile.id) continue
          if (!lastRead || new Date(m.created_at) > new Date(lastRead)) {
            messageCount++
          }
        }
      }
      unseenMessageCount = messageCount
    }
  }

  return (
    <div className="min-h-screen bg-sage-bg">
      <AppNav
        displayName={displayName}
        avatarUrl={avatarUrl}
        unseenContactCount={unseenContactCount}
        unseenMessageCount={unseenMessageCount}
        showFinishSetup={showFinishSetup}
      />
      <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        {children}
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
