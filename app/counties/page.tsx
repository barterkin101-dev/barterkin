import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Users, ArrowRight } from 'lucide-react'
import { getCountyStats } from '@/lib/data/counties-public'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { captureEvent } from '@/lib/analytics'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/fade-in'
import { CountiesJsonLd } from '@/components/seo/CountiesJsonLd'

export const metadata: Metadata = {
  title: 'Counties',
  description:
    'Browse Barterkin by Georgia county — find members and listings in your area. From Appling to Worth, discover local barter opportunities.',
  alternates: { canonical: '/counties' },
  openGraph: {
    title: 'Browse Counties — Barterkin',
    description:
      'Find Georgia residents offering skills to trade — browse by county and discover local barter opportunities.',
    url: '/counties',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Counties — Barterkin',
    description:
      'Find Georgia residents offering skills to trade — browse by county and discover local barter opportunities.',
  },
}

export default async function CountiesPage() {
  const { counties, totalMembers, totalListings, error } = await getCountyStats()

  // Track page view server-side
  captureEvent('anonymous', 'county_page_viewed', {
    total_counties: counties.length,
    total_members: totalMembers,
    total_listings: totalListings,
  })

  // Sort counties with activity first, then alphabetically
  const sortedCounties = [...counties].sort((a, b) => {
    const aActive = a.memberCount > 0 || a.listingCount > 0
    const bActive = b.memberCount > 0 || b.listingCount > 0
    if (aActive && !bActive) return -1
    if (!aActive && bActive) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <>
      <CountiesJsonLd counties={sortedCounties} totalMembers={totalMembers} totalListings={totalListings} />
      <main id="main" className="mx-auto max-w-6xl px-6 py-12 md:py-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <FadeIn>
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
            Browse by County
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mt-4 font-serif text-3xl font-bold text-forest-deep sm:text-4xl md:text-5xl leading-[1.1]">
            Find barter near{' '}
            <em className="not-italic text-clay">you</em>
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-6 text-lg text-forest-mid leading-relaxed">
            Browse {totalMembers.toLocaleString()} members and {totalListings.toLocaleString()} listings
            across {counties.length} Georgia counties.
          </p>
        </FadeIn>
      </section>

      {/* County grid */}
      <section className="mt-16 md:mt-24">
        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-forest-deep">Something went wrong loading counties.</p>
            <p className="mt-2 text-sm text-forest-mid">Please try again later.</p>
          </div>
        ) : (
          <Stagger>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCounties.map((county) => {
                const hasMembers = county.memberCount > 0
                const hasListings = county.listingCount > 0

                return (
                  <StaggerItem key={county.fips}>
                    <Link
                      href={`/directory?county=${county.fips}`}
                      className="group block h-full"
                      onClick={() => {
                        // Client-side tracking for interactive analytics
                        if (typeof window !== 'undefined') {
                          import('@/lib/analytics-client').then(({ captureClientEvent }) => {
                            captureClientEvent('county_cta_clicked', {
                              county_fips: county.fips,
                              county_name: county.name,
                              member_count: county.memberCount,
                              listing_count: county.listingCount,
                            })
                          })
                        }
                      }}
                    >
                      <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-base font-semibold text-forest-deep group-hover:text-primary transition-colors">
                              {county.name}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center gap-4 text-sm text-forest-mid">
                            {hasMembers && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                                {county.memberCount} member{county.memberCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {hasListings && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                {county.listingCount} listing{county.listingCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {!hasMembers && !hasListings && (
                              <span className="text-forest-mid/60 italic">Be the first to join</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <span>Browse {county.name}</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </StaggerItem>
                )
              })}
            </div>
          </Stagger>
        )}
      </section>

      {/* CTA */}
      <section className="mt-16 md:mt-24">
        <FadeIn>
          <div className="mx-auto max-w-2xl rounded-2xl bg-sage-pale p-10 text-center ring-1 ring-sage-light md:p-14">
            <h2 className="font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
              Have a skill to share?
            </h2>
            <p className="mt-4 text-base text-forest-mid leading-relaxed">
              Join {totalMembers.toLocaleString()} members already trading across Georgia.
              List what you offer and find what you need — no money required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-12 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg font-semibold',
                )}
              >
                Get started free
              </Link>
              <Link
                href="/directory"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-12 min-w-[180px]',
                )}
              >
                Browse all members
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </main>
  </>
  )
}
