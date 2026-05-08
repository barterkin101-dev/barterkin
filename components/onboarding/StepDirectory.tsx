import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Compass } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function StepDirectory() {
  return (
    <div className="space-y-6">
      <Image
        src="/images/onboarding/step-2.svg"
        alt=""
        width={200}
        height={160}
        className="mx-auto h-auto w-full max-w-[200px]"
        aria-hidden="true"
      />
      <div className="space-y-2">
        <h2 className="font-serif text-2xl font-bold leading-tight text-forest-deep sm:text-3xl">
          Next, browse your neighbors.
        </h2>
        <p className="text-base leading-relaxed text-forest-deep">
          Filter by county and category. Search by keyword. Every profile you see is a real Georgian with an email-verified account.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/directory"
          className={cn(buttonVariants({ variant: 'outline' }), 'h-11')}
        >
          <Compass className="mr-1 h-4 w-4" aria-hidden="true" /> Browse the directory <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/onboarding?step=3"
          className={cn(buttonVariants(), 'h-11 bg-clay hover:bg-clay/90 text-sage-bg')}
        >
          Next: send your first hello <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}
