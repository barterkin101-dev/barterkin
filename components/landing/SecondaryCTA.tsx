import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function SecondaryCTA() {
  return (
    <section className="bg-sage-pale py-16 sm:py-20 md:py-24 text-center">
      <div className="mx-auto max-w-xl px-6 space-y-6">
        <h2 className="font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
          Ready to trade?
        </h2>
        <p className="text-base text-forest-mid leading-[1.5]">
          Takes two minutes. Email-verify, fill in what you offer, and you&apos;re in the directory.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="h-14 min-w-[200px] bg-clay hover:bg-clay/90 text-sage-bg"
          >
            <Link href="/signup">Join Barterkin</Link>
          </Button>
          <Link
            href="/legal/guidelines"
            className="text-sm text-forest-deep underline-offset-4 hover:underline"
          >
            Read the community guidelines
          </Link>
        </div>
      </div>
    </section>
  )
}
