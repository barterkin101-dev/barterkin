'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { captureClientEvent } from '@/lib/analytics-client'
import type { RecentViewRow } from '@/lib/data/listing-views'

interface RecentlyViewedCardProps {
  views: RecentViewRow[]
}

export function RecentlyViewedCard({ views }: RecentlyViewedCardProps) {
  if (views.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Recently Viewed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {views.map((view) => {
          const listing = view.listings
          if (!listing) return null

          const imageUrl = listing.listing_images?.[0]?.url
          const county = listing.counties?.name
          const category = listing.categories?.name
          const href = `/listings/${listing.id}`

          return (
            <Link
              key={view.id}
              href={href}
              onClick={() =>
                captureClientEvent('listing_revisited_from_dashboard', {
                  listing_id: listing.id,
                  viewed_at: view.viewed_at,
                })
              }
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              {imageUrl ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={imageUrl}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted">
                  <span className="text-xs text-muted-foreground">No img</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{listing.title}</p>
                <p className="text-xs text-muted-foreground">
                  {category ?? 'Listing'}
                  {county ? ` · ${county}` : ''}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
