import Link from 'next/link'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/utils/logger'
import { getMyListings, getListings } from '@/lib/data/listings'
import { getDiscoverFeed } from '@/lib/data/discover'
import { getConversations, getStartedConversationCount } from '@/lib/data/messaging'
import { getStaleListingReminder, getUnreadMessageReminder, getDigestOptOutReminder, getFirstTradeProgressReminder, getOnboardingReturnReminder, getZeroListingLaunchReminder, getSecondListingExpansionReminder, getFirstContactLaunchReminder, getFreshListingReminder, getViewedListingRevisitReminder, getListingShareReminder } from '@/lib/data/dashboard-reminders'
import { getContactLimitStatus } from '@/lib/data/contact-limit'
import { getOwnedListingSaveCounts } from '@/lib/data/owned-listing-save-counts'
import { buildReferralLink } from '@/lib/referrals'
import { hasSkippedOnboarding, ONBOARDING_SKIP_COOKIE_NAME } from '@/lib/onboarding-skip'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, ShoppingBag, MessageSquare, Star, Ticket, User, Heart } from 'lucide-react'
import { ProfileCompletionBar } from '@/components/profile/ProfileCompletionBar'
import { ReferralInviteCard } from '@/components/dashboard/ReferralInviteCard'
import { FoundingMemberNudge } from '@/components/dashboard/FoundingMemberNudge'
import { DiscoverFeedTabs } from '@/components/dashboard/DiscoverFeedTabs'
import { QuestCard } from '@/components/dashboard/QuestCard'
import { UnreadMessageReminder } from '@/components/dashboard/UnreadMessageReminder'
import { ContactLimitUpsell } from '@/components/dashboard/ContactLimitUpsell'
import { ListingCapUpsell } from '@/components/dashboard/ListingCapUpsell'
import { StaleListingReminder } from '@/components/dashboard/StaleListingReminder'
import { DigestOptOutReminder } from '@/components/dashboard/DigestOptOutReminder'
import { FirstTradeProgressReminder } from '@/components/dashboard/FirstTradeProgressReminder'
import { ContactLimitComparisonCard } from '@/components/dashboard/ContactLimitComparisonCard'
import { ProfileViewsSnapshotCard } from '@/components/dashboard/ProfileViewsSnapshotCard'
import { OnboardingReturnReminder } from '@/components/dashboard/OnboardingReturnReminder'
import { ZeroListingLaunchReminder } from '@/components/dashboard/ZeroListingLaunchReminder'
import { SecondListingExpansionReminder } from '@/components/dashboard/SecondListingExpansionReminder'
import { FirstContactLaunchReminder } from '@/components/dashboard/FirstContactLaunchReminder'
import { AnnualUpgradeSavingsCard } from '@/components/dashboard/AnnualUpgradeSavingsCard'
import { FreshListingReminder } from '@/components/dashboard/FreshListingReminder'
import { ViewedListingRevisitReminder } from '@/components/dashboard/ViewedListingRevisitReminder'
import { ListingShareReminder } from '@/components/dashboard/ListingShareReminder'
import { toProfileCompletenessInput } from '@/lib/schemas/profile'
import { STRIPE_FOUNDING_MEMBER_LIMIT } from '@/lib/stripe/config'
import { QUESTS, isUtcDateToday } from '@/lib/quests'
import { updateLoginStreak } from '@/lib/actions/quests'
import { getProfileViewsSnapshot } from '@/lib/data/profile-views'
import { getDashboardListingCapUpsellProps } from '@/lib/dashboard-listing-cap-upsell'
import { getPremiumAnnualSavings, formatUsdFromCents, BILLING_PLAN_AMOUNTS } from '@/lib/stripe/config'
import { getPremiumBillingInterval } from '@/lib/data/billing'
import { getDashboardAnnualUpgradeSavingsProps } from '@/lib/dashboard-annual-upgrade-savings'

export default async function DashboardPage() {
  const cookieStore = await cookies()
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
    .select('id, display_name, username, avatar_url, bio, rating_avg, rating_count, is_published, email_digest_enabled, county_id, category_id, referral_code, tier, billing_interval, last_login_at, login_streak, onboarding_completed_at, skills_offered(id)')
    .eq('owner_id', user.id)
    .maybeSingle()

  const needsDailyLoginSync = profile ? !isUtcDateToday(profile.last_login_at) : false
  const streakResult = needsDailyLoginSync ? await updateLoginStreak() : null

  const [listings, messageCount, , referralRows, creditBalance, foundingCountResult, discoverResult, latestResult, questCompletions, conversations, startedConversationCount] = profile ? await Promise.all([
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
    supabase
      .from('referrals')
      .select('id, credited_at')
      .eq('inviter_id', profile.id)
      .then(({ data, error }) => {
        if (error) {
          const log = createLogger('dashboard')
          log.error('referral rows error', { context: { code: error.code } })
        }
        return data ?? []
      }),
    supabase
      .from('credit_ledger')
      .select('amount')
      .eq('profile_id', profile.id)
      .then(({ data, error }) => {
        if (error) {
          const log = createLogger('dashboard')
          log.error('credit balance error', { context: { code: error.code } })
          return 0
        }
        return (data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0)
      }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tier', 'founding')
      .then(({ count, error }) => {
        if (error) {
          const log = createLogger('dashboard')
          log.error('founding count error', { context: { code: error.code } })
        }
        return count ?? 0
      }),
    getDiscoverFeed(profile.id),
    getListings({ categoryId: undefined, countyId: undefined, condition: undefined, page: 1 }),
    supabase
      .from('quest_completions')
      .select('quest_key')
      .eq('profile_id', profile.id),
    getConversations(profile.id),
    getStartedConversationCount(profile.id),
  ]) : [[], 0, 0, [], 0, 0, { listings: [], error: null }, { listings: [], totalCount: 0, error: null }, { data: [], error: null }, [], 0]
  const activeListings = listings.filter((l) => l.status === 'active')
  const referralLink = profile?.referral_code
    ? buildReferralLink(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com', profile.referral_code)
    : null
  const foundingSlotsRemaining = Math.max(0, STRIPE_FOUNDING_MEMBER_LIMIT - foundingCountResult)
  const showFoundingNudge = profile?.tier === 'free' && foundingSlotsRemaining > 0
  const contactLimitStatus = profile && profile.tier === 'free'
    ? await getContactLimitStatus(profile.id, profile.tier)
    : null
  const showContactLimitUpsell = contactLimitStatus?.isNearLimit || contactLimitStatus?.isAtLimit || false
  const listingCapUpsell = getDashboardListingCapUpsellProps(profile?.tier, listings)
  const premiumBillingInterval = getPremiumBillingInterval(
    profile?.tier,
    profile?.billing_interval,
  )
  const annualUpgradeSavingsCard = getDashboardAnnualUpgradeSavingsProps(
    profile?.tier,
    premiumBillingInterval,
  )
  const completedQuests = new Set((questCompletions.data ?? []).map((row) => row.quest_key))
  const convertedReferralCount = referralRows.filter((row) => Boolean(row.credited_at)).length
  const pendingReferralCount = referralRows.length - convertedReferralCount
  const checkedInToday = Boolean(
    profile && (
      isUtcDateToday(profile.last_login_at)
      || (needsDailyLoginSync && streakResult?.ok)
    ),
  )
  if (checkedInToday) {
    completedQuests.add('quest_daily_login')
  }
  if (convertedReferralCount > 0) {
    completedQuests.add('quest_referral_converted')
  }
  const questStatuses = QUESTS.map((quest) => ({
    key: quest.key,
    credits: quest.credits,
    completed: completedQuests.has(quest.key),
  }))
  const questStreak = streakResult?.ok ? (streakResult.streak ?? profile?.login_streak ?? 0) : (profile?.login_streak ?? 0)
  const unreadMessageReminder = profile
    ? getUnreadMessageReminder(conversations, profile.id)
    : null
  const firstTradeProgressReminder = profile
    ? getFirstTradeProgressReminder(
      conversations,
      profile.id,
      completedQuests.has('quest_first_trade'),
    )
    : null
  const listingSaveCounts = profile && listings.length > 0
    ? await getOwnedListingSaveCounts(
      profile.id,
      listings.map((listing) => listing.id),
    )
    : {}
  const staleListingReminder = getStaleListingReminder(listings, listingSaveCounts)
  const digestOptOutReminder = getDigestOptOutReminder(
    profile?.email_digest_enabled,
    profile?.is_published,
  )
  const onboardingReturnReminder = getOnboardingReturnReminder(
    profile?.onboarding_completed_at,
    hasSkippedOnboarding(cookieStore.get(ONBOARDING_SKIP_COOKIE_NAME)?.value),
  )
  const zeroListingLaunchReminder = profile
    ? getZeroListingLaunchReminder(
      profile.onboarding_completed_at,
      listings,
      completedQuests.has('quest_first_listing'),
      profile.referral_code,
      referralLink,
    )
    : null
  const secondListingExpansionReminder = profile
    ? getSecondListingExpansionReminder(
      profile.onboarding_completed_at,
      listings,
      startedConversationCount,
    )
    : null
  const firstContactLaunchReminder = profile
    ? getFirstContactLaunchReminder(
      profile.onboarding_completed_at,
      listings,
      startedConversationCount,
      profile.referral_code,
      referralLink,
      convertedReferralCount,
      creditBalance,
    )
    : null
  const freshListingReminder = profile
    ? getFreshListingReminder(
      profile.onboarding_completed_at,
      listings,
    )
    : null
  const profileViewsSnapshot = profile?.is_published
    ? await getProfileViewsSnapshot(profile.id)
    : null
  const viewedListingRevisitReminder = getViewedListingRevisitReminder(
    listings,
    listingSaveCounts,
    profileViewsSnapshot,
  )
  const listingShareReminder = getListingShareReminder(
    listings,
    listingSaveCounts,
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com',
  )

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditBalance}</div>
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
          <Link href="/dashboard/saved">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Saved Listings</h3>
                <p className="text-sm text-muted-foreground">View your saved items</p>
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

        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/dashboard/billing">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Billing</h3>
                <p className="text-sm text-muted-foreground">
                  {profile?.tier === 'founding' ? 'Founding member' : profile?.tier === 'premium' ? 'Premium active' : 'Upgrade to premium'}
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {showContactLimitUpsell && contactLimitStatus && (
        <ContactLimitUpsell
          used={contactLimitStatus.used}
          limit={contactLimitStatus.limit}
          remaining={contactLimitStatus.remaining}
          isAtLimit={contactLimitStatus.isAtLimit}
          premiumMonthlyPrice={formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents)}
          premiumAnnualSavings={formatUsdFromCents(getPremiumAnnualSavings().totalSavingsCents)}
        />
      )}

      {listingCapUpsell && (
        <ListingCapUpsell {...listingCapUpsell} />
      )}

      {annualUpgradeSavingsCard && (
        <AnnualUpgradeSavingsCard {...annualUpgradeSavingsCard} />
      )}

      {profile?.tier === 'free' && (
        <ContactLimitComparisonCard />
      )}

      {/* Founding member nudge for free users */}
      {showFoundingNudge && (
        <FoundingMemberNudge
          slotsRemaining={foundingSlotsRemaining}
          foundingMonthlyCents={BILLING_PLAN_AMOUNTS.foundingMonthlyCents}
          premiumMonthlyCents={BILLING_PLAN_AMOUNTS.premiumMonthlyCents}
          premiumAnnualCents={BILLING_PLAN_AMOUNTS.premiumAnnualCents}
        />
      )}

      {unreadMessageReminder && (
        <UnreadMessageReminder reminder={unreadMessageReminder} />
      )}

      {firstTradeProgressReminder && (
        <FirstTradeProgressReminder reminder={firstTradeProgressReminder} />
      )}

      {staleListingReminder && (
        <StaleListingReminder reminder={staleListingReminder} />
      )}

      {digestOptOutReminder && (
        <DigestOptOutReminder href={digestOptOutReminder.href} />
      )}

      {onboardingReturnReminder && (
        <OnboardingReturnReminder reminder={onboardingReturnReminder} />
      )}

      {zeroListingLaunchReminder && (
        <ZeroListingLaunchReminder reminder={zeroListingLaunchReminder} />
      )}

      {secondListingExpansionReminder && (
        <SecondListingExpansionReminder reminder={secondListingExpansionReminder} />
      )}

      {firstContactLaunchReminder && (
        <FirstContactLaunchReminder reminder={firstContactLaunchReminder} />
      )}

      {freshListingReminder && (
        <FreshListingReminder reminder={freshListingReminder} />
      )}

      {viewedListingRevisitReminder && (
        <ViewedListingRevisitReminder reminder={viewedListingRevisitReminder} />
      )}

      {listingShareReminder && (
        <ListingShareReminder reminder={listingShareReminder} />
      )}

      {profile && profileViewsSnapshot && (
        <ProfileViewsSnapshotCard
          isPublished={profile.is_published}
          snapshot={profileViewsSnapshot}
        />
      )}

      {/* Profile completion nudge */}
      {profile && (
        <Card className={profile.is_published ? 'border-border' : 'border-amber-200 bg-amber-50'}>
          <CardContent className="p-6">
            <ProfileCompletionBar
              input={{
                ...toProfileCompletenessInput(profile),
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
          credits={creditBalance}
          convertedReferralCount={convertedReferralCount}
          pendingReferralCount={pendingReferralCount}
        />
      )}

      {/* Quests card */}
      {profile && (
        <QuestCard
          quests={questStatuses}
          streak={questStreak}
          credits={creditBalance}
        />
      )}

      {/* Discover feed — For You + Latest */}
      {profile && (
        <section className="space-y-4">
          <header className="space-y-1">
            <h2 className="font-serif text-2xl font-bold">Discover</h2>
            <p className="text-sm text-muted-foreground">
              Listings tailored for you and the freshest trades on Barterkin.
            </p>
          </header>
          <DiscoverFeedTabs
            forYouListings={discoverResult?.listings ?? []}
            latestListings={latestResult?.listings ?? []}
            forYouError={discoverResult?.error ?? null}
            latestError={latestResult?.error ?? null}
          />
        </section>
      )}
    </div>
  )
}
