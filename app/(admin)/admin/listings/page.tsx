import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminListings } from '@/lib/data/admin-listings'
import { adminModerateListingForm } from '@/lib/actions/admin-listings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Listings',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export default async function AdminListingsPage() {
  const listings = await getAdminListings()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
          Listings
        </h1>
        <p className="text-base text-forest-mid">
          {listings.length} {listings.length === 1 ? 'listing' : 'listings'} across all members.
        </p>
      </header>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg text-forest-mid">No listings yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    {listing.image_count > 0 ? (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        {listing.image_count} img
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">
                        <Link
                          href={`/listings/${listing.id}`}
                          className="hover:underline"
                          target="_blank"
                        >
                          {listing.title}
                        </Link>
                      </h3>
                      <Badge className={statusColors[listing.status] ?? ''}>
                        {listing.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-forest-mid line-clamp-2">
                      {listing.description}
                    </p>
                    <p className="mt-1 text-sm text-forest-mid">
                      By {listing.profile_display_name ?? listing.profile_username ?? 'Unknown'}
                      {listing.county_name && ` · ${listing.county_name}`}
                      {listing.category_name && ` · ${listing.category_name}`}
                      {listing.condition && ` · ${listing.condition}`}
                      {' · '}
                      {new Date(listing.created_at).toLocaleDateString()}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <form action={adminModerateListingForm}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <input type="hidden" name="action" value="active" />
                        <Button type="submit" variant="ghost" size="sm">
                          Activate
                        </Button>
                      </form>
                      <form action={adminModerateListingForm}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <input type="hidden" name="action" value="paused" />
                        <Button type="submit" variant="ghost" size="sm">
                          Pause
                        </Button>
                      </form>
                      <form action={adminModerateListingForm}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <input type="hidden" name="action" value="cancelled" />
                        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                          Remove
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
