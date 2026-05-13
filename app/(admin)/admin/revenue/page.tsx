import type { Metadata } from 'next'
import { ArrowUpRight, BadgeDollarSign, TrendingUp, Users, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getRevenueStats, type RevenueEvent } from '@/lib/data/admin'

export const metadata: Metadata = {
  title: 'Revenue',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown date'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

function eventLabel(event: RevenueEvent): string {
  if (event.event_type === 'cancel') return 'Cancelled'
  if (event.tier === 'founding') return 'Founding upgrade'
  return 'Premium upgrade'
}

function eventBadgeClassName(event: RevenueEvent): string {
  return event.event_type === 'cancel'
    ? 'border-destructive/30 bg-destructive/10 text-destructive'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

export default async function AdminRevenuePage() {
  const stats = await getRevenueStats()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-[32px] font-bold leading-[1.15] text-forest-deep">
            Revenue
          </h1>
          <Badge variant="outline">{stats.payingMembers} paying members</Badge>
        </div>
        <p className="max-w-3xl text-base text-forest-mid">
          Subscription health for the member base: current MRR, conversion, founding inventory,
          and the most recent Stripe-synced subscription changes.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-forest-mid">
              Monthly recurring revenue
            </CardTitle>
            <BadgeDollarSign className="h-4 w-4 text-forest-mid" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-sans text-[32px] font-bold leading-[1.15] text-clay">
              {formatCurrency(stats.mrr)}
            </p>
            <CardDescription className="text-sm text-forest-mid">
              Estimated from active tiers: Premium $9, Founding $5
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-forest-mid">
              Free to paid conversion
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-forest-mid" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-sans text-[32px] font-bold leading-[1.15] text-clay">
              {formatPercent(stats.conversionRate)}
            </p>
            <Progress value={stats.conversionRate} aria-label="Free to paid conversion rate" />
            <CardDescription className="text-sm text-forest-mid">
              Published profiles on a paid tier divided by all published profiles
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-forest-mid">
              Paying members by tier
            </CardTitle>
            <Users className="h-4 w-4 text-forest-mid" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-forest-mid">
            <div className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2">
              <span>Premium</span>
              <span className="font-semibold text-forest-deep">{stats.premiumCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2">
              <span>Founding</span>
              <span className="font-semibold text-forest-deep">{stats.foundingCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-background/70 px-3 py-2">
              <span>Free</span>
              <span className="font-semibold text-forest-deep">{stats.freeCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-forest-mid">
              Founding slots remaining
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-forest-mid" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-sans text-[32px] font-bold leading-[1.15] text-clay">
              {stats.foundingSlotsRemaining}
            </p>
            <Progress
              value={Math.max(0, Math.min(100, 100 - stats.foundingSlotsRemaining))}
              aria-label="Founding slots claimed"
            />
            <CardDescription className="text-sm text-forest-mid">
              Out of 100 total founding memberships
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr,0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent subscription events</CardTitle>
            <CardDescription>
              Latest subscription changes from Stripe-synced profile state.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-sage-light px-4 py-8 text-sm text-forest-mid">
                No subscription activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentEvents.map((event) => (
                  <div
                    key={`${event.id}-${event.occurred_at}`}
                    className="flex flex-col gap-3 rounded-xl border border-sage-light px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-forest-deep">
                          {event.display_name ?? 'Member'}
                        </p>
                        <Badge className={eventBadgeClassName(event)}>
                          {eventLabel(event)}
                        </Badge>
                      </div>
                      <p className="text-sm text-forest-mid">
                        {event.event_type === 'cancel'
                          ? 'Member is no longer on a paid tier.'
                          : `Current paid tier: ${event.tier}.`}
                      </p>
                    </div>
                    <p className="text-sm text-forest-mid">{formatDate(event.occurred_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next actions</CardTitle>
            <CardDescription>
              Revenue levers to push next based on current subscription mix.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-forest-mid">
            <div className="rounded-xl border border-sage-light bg-sage-pale/60 p-4">
              <p className="font-medium text-forest-deep">Close more paid conversions</p>
              <p className="mt-1">
                Current conversion is {formatPercent(stats.conversionRate)} across published
                members. Tighten upgrade prompts around listing caps and message limits.
              </p>
            </div>
            <div className="rounded-xl border border-sage-light bg-sage-pale/60 p-4">
              <p className="font-medium text-forest-deep">Protect founding scarcity</p>
              <p className="mt-1">
                {stats.foundingSlotsRemaining} founding slots remain. Keep the scarcity strip live
                while inventory is available.
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 font-medium text-forest-deep hover:text-clay"
            >
              Review the member-facing billing page
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
