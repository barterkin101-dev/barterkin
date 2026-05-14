import Link from 'next/link'
import { ArrowRight, MessageSquareMore } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FREE_CONTACT_LIMIT, PREMIUM_CONTACT_LIMIT } from '@/lib/contact-limits'
import { BILLING_PLAN_AMOUNTS, formatUsdFromCents } from '@/lib/stripe/config'

export function ContactLimitComparisonCard() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
              <MessageSquareMore className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Unlock more trade conversations</h2>
              <p className="text-sm text-muted-foreground">
                Free members can start {FREE_CONTACT_LIMIT} conversations per month. Premium raises that to {PREMIUM_CONTACT_LIMIT} contacts/mo.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-full border border-border bg-background px-3 py-1.5 text-foreground">
              Free: {FREE_CONTACT_LIMIT}/mo
            </div>
            <div className="rounded-full border border-primary/20 bg-background px-3 py-1.5 text-foreground">
              Premium: {PREMIUM_CONTACT_LIMIT}/mo
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-900">
              Premium from {formatUsdFromCents(BILLING_PLAN_AMOUNTS.premiumMonthlyCents)}/mo
            </div>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/dashboard/billing">
            Compare plans
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
