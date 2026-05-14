import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FeatureListingButton } from '@/components/listings/FeatureListingButton'

const FEATURE_COST = 5

export function ListingFeaturePanel({
  listingId,
  tier,
  credits,
  featuredUntil,
}: {
  listingId: string
  tier: string
  credits: number
  featuredUntil: string | null
}) {
  if (tier !== 'premium') return null

  const isFeatured = Boolean(featuredUntil && new Date(featuredUntil) > new Date())

  return (
    <Card className="border-amber-200 bg-amber-50/70">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-xl font-bold">Promotion</h2>
          {isFeatured ? (
            <Badge className="border-amber-500 bg-amber-500 text-amber-950">
              Featured
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Spend {FEATURE_COST} credits to pin this listing higher in browse surfaces for 7 days.
        </p>
        <p className="text-sm text-muted-foreground">You currently have {credits} credits.</p>
        <FeatureListingButton
          listingId={listingId}
          isFeatured={isFeatured}
          credits={credits}
        />
      </CardContent>
    </Card>
  )
}
