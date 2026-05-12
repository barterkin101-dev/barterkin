import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import { getMyListings } from '@/lib/data/listings'
import { buildReferralLink } from '@/lib/referrals'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag, MessageSquare, Star, Ticket, User } from 'lucide-react'
import { ProfileCompletionBar } from '@/components/profile/ProfileCompletionBar'
import { ReferralInviteCard } from '@/components/dashboard/ReferralInviteCard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Please sign in to view your dashboard.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, bio, rating_avg, rating_count, is_published, county_id, category_id, referral_code')
    .eq('owner_id', user.id)
    .maybeSingle()

  const [listings, messageCount, ticketCount] = profile ? await Promise.all([
    getMyListings(profile.id),
    supabase
      .from('conversation_participants')
      .select('conversation_id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .then(({ count, error }) => {
        if (error) {
          const log = createLogger('dashboard')
    log.error('message count error', { context: { code: error.code } })
        }

        return count ?? 0
      }),
    supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .then(({ count, error }) => {
        if (error) {
          const log = createLogger('dashboard')
    log.error('ticket count error', { context: { code: error.code } })
        }

        return count ?? 0
      }),
  ]) : [[], 0, 0]
  const activeListings = listings.filter((l) => l.status === 'active')
  const referralLink = profile?.referral_code
    ? buildReferralLink(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com', profile.referral_code)
    : null

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
          Dashboard
        </h1>
        <p className="text-base text-muted-foreground">
          Manage your listings, messages, reviews, and account settings.
        </p>
      </header>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeListings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.rating_avg ?? '—'}
              {profile?.rating_count ? (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  ({profile.rating_count} reviews)
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messageCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ticketCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/dashboard/listings">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">My Listings</h3>
                <p className="text-sm text-muted-foreground">
                  {listings.length} total · {activeListings.length} active
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/dashboard/messages">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Messages</h3>
                <p className="text-sm text-muted-foreground">View conversations</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/dashboard/reviews">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Reviews</h3>
                <p className="text-sm text-muted-foreground">
                  {profile?.rating_count ?? 0} reviews
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/dashboard/tickets">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Support Tickets</h3>
                <p className="text-sm text-muted-foreground">Get help with issues</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Link href="/profile/edit" className="block">
          <Card className="transition-colors hover:bg-muted/50 cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Edit Profile</h3>
                <p className="text-sm text-muted-foreground">Update your profile and settings</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Profile completion nudge */}
      {profile && (
        <Card className={profile.is_published ? 'border-border' : 'border-amber-200 bg-amber-50'}>
          <CardContent className="p-6">
            <ProfileCompletionBar
              input={{
                displayName: profile.display_name,
                avatarUrl: profile.avatar_url,
                countyId: profile.county_id,
                categoryId: profile.category_id,
                skillsOfferedCount: listings.length,
                bio: profile.bio,
              }}
              showSteps={true}
            />
          </CardContent>
        </Card>
      )}

      {profile?.referral_code && (
        <ReferralInviteCard
          referralCode={profile.referral_code}
          referralLink={referralLink ?? ''}
        />
      )}
    </div>
  )
}
