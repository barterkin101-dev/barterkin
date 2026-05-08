import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getListingById } from '@/lib/data/listings'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, MapPin, ArrowLeft } from 'lucide-react'

interface ListingDetailPageProps {
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

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params
  const listing = await getListingById(id)
  if (!listing) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isOwn = user
    ? listing.profiles?.id
      ? await isOwnListing(supabase, listing.profiles.id)
      : false
    : false

  return (
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

          <div className="flex items-center gap-4">
            {isOwn ? (
              <Link
                href={`/dashboard/listings/${listing.id}/edit`}
                className={cn(buttonVariants({ variant: 'outline' }))}
              >
                Edit Listing
              </Link>
            ) : listing.profiles ? (
              <Link
                href={`/m/${listing.profiles.username}`}
                className={cn(buttonVariants())}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Contact Seller
              </Link>
            ) : null}
          </div>

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
  )
}

async function isOwnListing(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  return profile?.id === profileId
}
