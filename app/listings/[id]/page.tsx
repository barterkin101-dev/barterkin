import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getListingById } from '@/lib/data/listings'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, ArrowLeft, MessageCircle } from 'lucide-react'
import { ListingJsonLd } from '@/components/seo/ListingJsonLd'
import { ListingShareActions } from '@/components/listings/ListingShareActions'

interface PublicListingPageProps {
  params: Promise<{ id: string }>
}

const conditionLabels: Record<string, string> = {
  new: 'New',
  'like-new': 'Like New',
  good: 'Good',
  fair: 'Fair',
  'for-parts': 'For Parts',
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: PublicListingPageProps): Promise<Metadata> {
  const { id } = await params
  const listing = await getListingById(id)
  if (!listing) {
    return {
      title: 'Listing not found — Barterkin',
      robots: { index: false, follow: false },
    }
  }

  const title = listing.title
  const category = listing.categories?.name ?? ''
  const county = listing.counties?.name ?? 'Georgia'
  const description = listing.description
    ? `${listing.description.slice(0, 150)}${listing.description.length > 150 ? '…' : ''} — ${county}`
    : `${title} — available for trade on Barterkin in ${county}.`

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'

  return {
    title: `${title} — Barterkin`,
    description,
    alternates: { canonical: `/listings/${id}` },
    openGraph: {
      title: `${title} — Barterkin`,
      description,
      url: `${siteUrl}/listings/${id}`,
      siteName: 'Barterkin',
      type: 'website',
      locale: 'en_US',
      images: [`${siteUrl}/listings/${id}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} — Barterkin`,
      description,
      images: [`${siteUrl}/listings/${id}/opengraph-image`],
    },
    robots: { index: true, follow: true },
  }
}

export default async function PublicListingPage({ params }: PublicListingPageProps) {
  const { id } = await params
  const listing = await getListingById(id)
  if (!listing) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barterkin.com'
  const shareUrl = new URL(`/listings/${listing.id}`, siteUrl).toString()

  return (
    <>
      <ListingJsonLd listing={listing} />
      <div className="min-h-screen bg-sage-bg">
        {/* Simple public header */}
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-serif text-xl font-bold text-foreground">
              Barterkin
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/listings"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Browse listings
              </Link>
              <Link
                href="/login"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Log in
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <div className="space-y-6">
            <Link
              href="/listings"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to listings
            </Link>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Images */}
              <div className="space-y-4">
                {listing.images[0] ? (
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={listing.images[0].url}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    No images
                  </div>
                )}
                {listing.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {listing.images.slice(1).map((img) => (
                      <div
                        key={img.id}
                        className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted"
                      >
                        <Image
                          src={img.url}
                          alt={listing.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {listing.condition && (
                      <Badge variant="secondary">
                        {conditionLabels[listing.condition] ?? listing.condition}
                      </Badge>
                    )}
                    {listing.categories?.name && (
                      <Badge variant="outline">{listing.categories.name}</Badge>
                    )}
                  </div>
                  <h1 className="font-serif text-3xl font-bold leading-[1.15]">
                    {listing.title}
                  </h1>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {listing.counties?.name ?? 'Georgia'}
                  </div>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <h2 className="font-semibold">Description</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {listing.description}
                    </p>
                  </CardContent>
                </Card>

                {listing.trade_terms && (
                  <Card>
                    <CardContent className="p-4">
                      <h2 className="font-semibold">Trade Terms</h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {listing.trade_terms}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {listing.price_estimate && (
                  <p className="text-lg font-medium">
                    Estimated value: {listing.price_estimate}
                  </p>
                )}

                {/* CTA for unauthenticated visitors */}
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-sm text-muted-foreground">
                    Want to trade for this? Log in to message the seller.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Log in to message
                    </Link>
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>

                <ListingShareActions
                  listingId={listing.id}
                  title={listing.title}
                  shareUrl={shareUrl}
                />

                {listing.profiles && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {listing.profiles.avatar_url ? (
                          <Image
                            src={listing.profiles.avatar_url}
                            alt={listing.profiles.display_name ?? ''}
                            width={48}
                            height={48}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-muted" />
                        )}
                        <div>
                          <p className="font-medium">
                            {listing.profiles.display_name ?? listing.profiles.username}
                          </p>
                          <Link
                            href={`/m/${listing.profiles.username}`}
                            className="text-sm text-muted-foreground hover:underline"
                          >
                            View profile
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
