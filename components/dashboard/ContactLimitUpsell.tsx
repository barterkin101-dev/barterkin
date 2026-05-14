import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Zap } from 'lucide-react'

export function ContactLimitUpsell({
  used,
  limit,
  remaining,
  isAtLimit,
}: {
  used: number
  limit: number
  remaining: number
  isAtLimit: boolean
}) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            {isAtLimit ? (
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            ) : (
              <Zap className="h-5 w-5 text-amber-700" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-amber-900">
              {isAtLimit
                ? 'You\'ve reached your monthly contact limit'
                : `You're approaching your monthly contact limit (${used}/${limit})`}
            </h3>
            <p className="text-sm text-amber-800">
              {isAtLimit
                ? `Free members can start ${limit} conversations per month. Upgrade to Premium to unlock ${limit * 10} contacts/mo and reach more traders.`
                : `You have ${remaining} conversation${remaining === 1 ? '' : 's'} left this month. Upgrade to Premium for ${limit * 10} contacts/mo.`}
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/dashboard/billing">Upgrade to Premium</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
