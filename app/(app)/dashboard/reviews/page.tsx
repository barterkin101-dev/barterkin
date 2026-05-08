import { createClient } from '@/lib/supabase/server'
import { getMyRatings } from '@/lib/data/ratings'
import { RatingCard } from '@/components/ratings/RatingCard'
import { RatingSummary } from '@/components/ratings/RatingSummary'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Please sign in to view your reviews.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, rating_avg, rating_count')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Complete your profile to view reviews.</p>
      </div>
    )
  }

  const { given, received } = await getMyRatings(profile.id)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">Reviews</h1>
        <RatingSummary avg={profile.rating_avg} count={profile.rating_count} />
      </div>

      <Tabs defaultValue="received">
        <TabsList>
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
          <TabsTrigger value="given">Given ({given.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="received" className="space-y-4">
          {received.length === 0 ? (
            <p className="text-muted-foreground">No reviews received yet.</p>
          ) : (
            received.map((rating) => <RatingCard key={rating.id} rating={rating} />)
          )}
        </TabsContent>
        <TabsContent value="given" className="space-y-4">
          {given.length === 0 ? (
            <p className="text-muted-foreground">No reviews given yet.</p>
          ) : (
            given.map((rating) => <RatingCard key={rating.id} rating={rating} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
