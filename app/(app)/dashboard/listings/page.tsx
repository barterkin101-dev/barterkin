import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getMyListings } from '@/lib/data/listings'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Pause, Play, Trash2, Pencil } from 'lucide-react'
import { deleteListingForm, toggleListingStatusForm } from '@/lib/actions/listings'

export default async function DashboardListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Please sign in to view your listings.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Complete your profile to create listings.</p>
        <Link href="/onboarding" className={cn(buttonVariants(), 'mt-4')}>
          Finish setup
        </Link>
      </div>
    )
  }

  const listings = await getMyListings(profile.id)

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
          My Listings
        </h1>
        <Link href="/dashboard/listings/new" className={cn(buttonVariants())}>
          <Plus className="mr-2 h-4 w-4" />
          New Listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-lg text-muted-foreground">You haven&apos;t created any listings yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              List something you want to trade and start connecting with other Georgians.
            </p>
            <Link href="/dashboard/listings/new" className={cn(buttonVariants(), 'mt-6')}>
              Create your first listing
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                  {listing.images[0] ? (
                    <Image
                      src={listing.images[0].url}
                      alt={listing.title}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold">
                      <Link href={`/listings/${listing.id}`} className="hover:underline">
                        {listing.title}
                      </Link>
                    </h3>
                    <Badge className={statusColors[listing.status] ?? ''}>
                      {listing.status}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {listing.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {listing.status === 'active' ? (
                      <form action={toggleListingStatusForm}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <input type="hidden" name="status" value="paused" />
                        <Button type="submit" variant="ghost" size="sm">
                          <Pause className="mr-1 h-3 w-3" />
                          Pause
                        </Button>
                      </form>
                    ) : listing.status === 'paused' ? (
                      <form action={toggleListingStatusForm}>
                        <input type="hidden" name="listingId" value={listing.id} />
                        <input type="hidden" name="status" value="active" />
                        <Button type="submit" variant="ghost" size="sm">
                          <Play className="mr-1 h-3 w-3" />
                          Resume
                        </Button>
                      </form>
                    ) : null}
                    <Link
                      href={`/dashboard/listings/${listing.id}/edit`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Link>
                    <form action={deleteListingForm}>
                      <input type="hidden" name="listingId" value={listing.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete
                      </Button>
                    </form>
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
