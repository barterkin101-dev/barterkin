import Link from 'next/link'
import { ArrowRight, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProfileViewsSnapshot } from '@/lib/data/profile-views'

export function ProfileViewsSnapshotCard({
  isPublished,
  snapshot,
}: {
  isPublished: boolean
  snapshot: ProfileViewsSnapshot
}) {
  if (!isPublished) {
    return null
  }

  const isDeclining = snapshot.trend === 'down'

  return (
    <Card className="border-sky-200 bg-sky-50/80">
      <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              {isDeclining ? <TrendingDown className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-semibold text-sky-950">Profile views snapshot</h2>
              <p className="text-sm text-sky-900/80">
                {snapshot.currentViews} in the last 7 days vs {snapshot.previousViews} in the prior 7 days
              </p>
            </div>
          </div>

          {snapshot.trend === 'empty' && (
            <p className="max-w-2xl text-sm text-sky-950/80">
              No one has viewed your profile in the last 14 days yet. Tighten your bio or refresh your photo to help members stop and click.
            </p>
          )}

          {snapshot.trend === 'up' && (
            <div className="flex items-center gap-2 text-sm text-emerald-900">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              <span>Up {snapshot.delta} from the prior week. Your profile is getting more traction.</span>
            </div>
          )}

          {snapshot.trend === 'down' && (
            <p className="max-w-2xl text-sm text-sky-950/80">
              Down {Math.abs(snapshot.delta)} from the prior week. Refresh your headline, avatar, or skills so more members stop on your profile again.
            </p>
          )}

          {snapshot.trend === 'flat' && (
            <p className="max-w-2xl text-sm text-sky-950/80">
              Your profile traffic is holding steady week over week. Keep your profile fresh to turn views into messages.
            </p>
          )}
        </div>

        {isDeclining && (
          <Link
            href="/profile/edit"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'shrink-0 bg-sky-700 text-white hover:bg-sky-800',
            )}
          >
            Refresh profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
