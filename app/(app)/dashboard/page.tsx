import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMyListings } from '@/lib/data/listings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag, MessageSquare, Star, Ticket, User } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Please sign in to view your dashboard.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, bio, rating_avg, rating_count, is_published')
    .eq('owner_id', user.id)
    .maybeSingle()

  const listings = profile ? await getMyListings(profile.id) : []
  const activeListings = listings.filter((l) => l.status === 'active')

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">
          Dashboard
        </h1>
        <p className="text-base text-muted-foreground">
          Manage your listings, messages, reviews, and account settings.
        </p>
      </header>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeListings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.rating_avg ?? '—'}
              {profile?.rating_count ? (
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  ({profile.rating_count} reviews)
                </span>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/dashboard/listings">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">My Listings</h3>
                <p className="text-sm text-muted-foreground">
                  {listings.length} total · {activeListings.length} active
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/dashboard/messages">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Messages</h3>
                <p className="text-sm text-muted-foreground">View conversations</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/dashboard/reviews">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Reviews</h3>
                <p className="text-sm text-muted-foreground">
                  {profile?.rating_count ?? 0} reviews
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/dashboard/tickets">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Support Tickets</h3>
                <p className="text-sm text-muted-foreground">Get help with issues</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="transition-colors hover:bg-muted/50">
          <Link href="/profile/edit">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Edit Profile</h3>
                <p className="text-sm text-muted-foreground">Update your profile and settings</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Profile completeness nudge */}
      {profile && (!profile.bio || !profile.is_published) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-amber-900">Complete your profile</h3>
            <p className="mt-1 text-sm text-amber-800">
              A complete profile with a bio helps others trust you and improves your visibility.
            </p>
            <Button asChild variant="outline" className="mt-3 border-amber-300">
              <Link href="/profile/edit">Finish your profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
