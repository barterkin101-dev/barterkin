import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function DigestOptOutReminder({ href }: { href: string }) {
  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-900">
            <Mail className="h-5 w-5 text-amber-700" />
            <h2 className="font-semibold">Weekly digest is turned off</h2>
          </div>
          <p className="max-w-2xl text-sm text-amber-900/80">
            You&apos;re missing new listings and trade opportunities in your county.
            Re-enable your weekly digest to stay in the loop without opening the app.
          </p>
        </div>

        <Link
          href={href}
          className={cn(
            buttonVariants({ size: 'lg' }),
            'shrink-0 bg-amber-700 text-white hover:bg-amber-800',
          )}
        >
          Re-enable digest
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
