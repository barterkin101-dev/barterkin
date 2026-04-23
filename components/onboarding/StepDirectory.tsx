import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function StepDirectory() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold leading-tight text-forest-deep sm:text-3xl">
          Next, browse your neighbors.
        </h2>
        <p className="text-base leading-relaxed text-forest-deep">
          Filter by county and category. Search by keyword. Every profile you see is a real Georgian with an email-verified account.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-11">
          <Link href="/directory">
            <Compass className="mr-1 h-4 w-4" aria-hidden="true" /> Browse the directory <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild className="h-11 bg-clay hover:bg-clay/90 text-sage-bg">
          <Link href="/onboarding?step=3">
            Next: send your first hello <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
