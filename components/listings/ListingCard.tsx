'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ListingRow } from '@/lib/data/listings.types'

const conditionLabels: Record<string, string> = {
  new: 'New',
  'like-new': 'Like New',
  good: 'Good',
  fair: 'Fair',
  'for-parts': 'For Parts',
}

export function ListingCard({ listing }: { listing: ListingRow }) {
  const firstImage = listing.images[0]
  const profile = listing.profiles

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          {firstImage ? (
            <Image
              src={firstImage.url}
              alt={listing.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          {listing.condition && (
            <Badge
              variant="secondary"
              className="absolute left-3 top-3 bg-background/80 backdrop-blur-sm"
            >
              {conditionLabels[listing.condition] ?? listing.condition}
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-1 font-semibold leading-tight group-hover:underline">
            {listing.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {listing.description}
          </p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {listing.counties?.name ?? 'Georgia'}
            </span>
            {listing.price_estimate && (
              <span className="font-medium text-foreground">
                {listing.price_estimate}
              </span>
            )}
          </div>
          {profile && (
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name ?? ''}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-muted" />
              )}
              <span className="text-sm text-muted-foreground">
                {profile.display_name ?? profile.username ?? 'Member'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
