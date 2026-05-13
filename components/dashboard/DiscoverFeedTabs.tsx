'use client'

import * as React from 'react'
import posthog from 'posthog-js'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ListingGrid } from '@/components/listings/ListingGrid'
import type { ListingRow } from '@/lib/data/listings.types'

interface DiscoverFeedTabsProps {
  forYouListings: ListingRow[]
  latestListings: ListingRow[]
  forYouError: string | null
  latestError: string | null
}

export function DiscoverFeedTabs({
  forYouListings,
  latestListings,
  forYouError,
  latestError,
}: DiscoverFeedTabsProps) {
  const trackedRef = React.useRef<Set<string>>(new Set())

  const handleValueChange = (value: string) => {
    if (!trackedRef.current.has(value)) {
      trackedRef.current.add(value)
      posthog.capture('discover_tab_switched', {
        tab: value,
        for_you_count: forYouListings.length,
        latest_count: latestListings.length,
      })
    }
  }

  const defaultTab = forYouListings.length > 0 ? 'for-you' : 'latest'

  return (
    <Tabs defaultValue={defaultTab} onValueChange={handleValueChange}>
      <TabsList>
        <TabsTrigger value="for-you">
          For You {forYouListings.length > 0 && `(${forYouListings.length})`}
        </TabsTrigger>
        <TabsTrigger value="latest">
          Latest {latestListings.length > 0 && `(${latestListings.length})`}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="for-you" className="pt-4">
        {forYouError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
            Something went wrong loading personalized recommendations. Showing latest listings instead.
          </div>
        ) : forYouListings.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">
              No personalized recommendations yet. Complete your profile or check out the latest listings.
            </p>
          </div>
        ) : (
          <ListingGrid listings={forYouListings} />
        )}
      </TabsContent>

      <TabsContent value="latest" className="pt-4">
        {latestError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
            Something went wrong loading listings. Please try again.
          </div>
        ) : latestListings.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No listings yet. Be the first to list something!</p>
          </div>
        ) : (
          <ListingGrid listings={latestListings} />
        )}
      </TabsContent>
    </Tabs>
  )
}
