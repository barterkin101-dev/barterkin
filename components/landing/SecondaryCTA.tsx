import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/ui/fade-in'

export function SecondaryCTA() {
  return (
    <section className="bg-sage-pale py-16 sm:py-20 md:py-24 text-center">
      <div className="mx-auto max-w-xl px-6 space-y-6">
        <FadeIn>
          <h2 className="font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
            Ready to trade?
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="text-base text-forest-mid leading-[1.5]">
            Takes two minutes. Email-verify, fill in what you offer, and you&apos;re in the directory.
          </p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-14 min-w-[200px] bg-clay hover:bg-clay/90 text-sage-bg'
              )}
            >
              Join Barterkin
            </Link>
            <Link
              href="/legal/guidelines"
              className="text-sm text-forest-deep underline-offset-4 hover:underline"
            >
              Read the community guidelines
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
