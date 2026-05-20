import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Home,
  UtensilsCrossed,
  Palette,
  Music,
  Laptop,
  Heart,
  GraduationCap,
  Wrench,
  TreePine,
  Users,
  ArrowRight,
  MapPin,
} from 'lucide-react'
import { getCategoryStats } from '@/lib/data/categories-public'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { captureEvent } from '@/lib/analytics'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/fade-in'

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'home-garden': Home,
  'food-kitchen': UtensilsCrossed,
  'arts-crafts': Palette,
  'music-performance': Music,
  'tech-digital': Laptop,
  'wellness-bodywork': Heart,
  'teaching-tutoring': GraduationCap,
  'trades-repair': Wrench,
  'outdoors-animals': TreePine,
  'community-events': Users,
}

export const metadata: Metadata = {
  title: 'Categories',
  description:
    'Browse Barterkin by category — find members offering skills in Home & Garden, Food & Kitchen, Arts & Crafts, Tech & Digital, and more across Georgia.',
  alternates: { canonical: '/categories' },
  openGraph: {
    title: 'Browse Categories — Barterkin',
    description:
      'Find Georgia residents offering skills to trade — browse by category and discover your next barter.',
    url: '/categories',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse Categories — Barterkin',
    description:
      'Find Georgia residents offering skills to trade — browse by category and discover your next barter.',
  },
}

export default async function CategoriesPage() {
  const { categories, totalMembers, totalListings, error } = await getCategoryStats()

  // Track page view server-side
  captureEvent('anonymous', 'category_page_viewed', {
    total_categories: categories.length,
    total_members: totalMembers,
    total_listings: totalListings,
  })

  return (
    <main id="main" className="mx-auto max-w-6xl px-6 py-12 md:py-20">
      {/* Hero */}
      <section className="mx-auto max-w-3xl text-center">
        <FadeIn>
          <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
            Browse by Category
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mt-4 font-serif text-3xl font-bold text-forest-deep sm:text-4xl md:text-5xl leading-[1.1]">
            What do you{' '}
            <em className="not-italic text-clay">need?</em>
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mt-6 text-lg text-forest-mid leading-relaxed">
            Browse {totalMembers.toLocaleString()} members and {totalListings.toLocaleString()} listings
            across {categories.length} skill categories — all in Georgia.
          </p>
        </FadeIn>
      </section>

      {/* Category grid */}
      <section className="mt-16 md:mt-24">
        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-forest-deep">Something went wrong loading categories.</p>
            <p className="mt-2 text-sm text-forest-mid">Please try again later.</p>
          </div>
        ) : (
          <Stagger>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const Icon = CATEGORY_ICONS[category.slug] ?? Users
                const hasMembers = category.memberCount > 0
                const hasListings = category.listingCount > 0

                return (
                  <StaggerItem key={category.id}>
                    <Link
                      href={`/directory?category=${category.slug}`}
                      className="group block h-full"
                      onClick={() => {
                        // Client-side tracking for interactive analytics
                        if (typeof window !== 'undefined') {
                          import('@/lib/analytics-client').then(({ captureClientEvent }) => {
                            captureClientEvent('category_cta_clicked', {
                              category_id: category.id,
                              category_slug: category.slug,
                              category_name: category.name,
                              member_count: category.memberCount,
                              listing_count: category.listingCount,
                            })
                          })
                        }
                      }}
                    >
                      <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                            </div>
                            <CardTitle className="text-base font-semibold text-forest-deep group-hover:text-primary transition-colors">
                              {category.name}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center gap-4 text-sm text-forest-mid">
                            {hasMembers && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                                {category.memberCount} member{category.memberCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {hasListings && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                {category.listingCount} listing{category.listingCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {!hasMembers && !hasListings && (
                              <span className="text-forest-mid/60 italic">Be the first to join</span>
                            )}
                          </div>

                          {category.topSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {category.topSkills.map((skill) => (
                                <span
                                  key={skill}
                                  className="inline-flex items-center rounded-full bg-sage-pale px-2.5 py-0.5 text-xs font-medium text-forest-mid"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-sm font-medium text-primary">
                            <span>Browse {category.name}</span>
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
  )
}
