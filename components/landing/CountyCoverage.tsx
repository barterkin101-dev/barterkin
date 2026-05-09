import Link from 'next/link'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/fade-in'
import type { LandingCoverageCounty } from '@/lib/data/landing'

export function CountyCoverage({ counties }: { counties: LandingCoverageCounty[] }) {
  if (counties.length === 0) {
    return (
      <section className="bg-sage-bg py-16 sm:py-20 md:py-24">
        <div className="mx-auto max-w-2xl px-6">
          <FadeIn>
            <Card className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-8 md:p-12 space-y-6 text-center border-0">
              <p className="text-base text-forest-mid leading-[1.5]">
                No counties yet. Yours could be first.
              </p>
              <p className="text-sm italic text-forest-mid leading-[1.5]">
                Georgia residents only. We trust the honor system — misuse gets profiles removed.
              </p>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: 'lg' }), 'h-12 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg')}
              >
                Claim your spot
              </Link>
            </Card>
          </FadeIn>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-sage-bg py-16 sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.15em] font-bold text-forest-mid">
              Where we&apos;re growing
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
              Counties on the map so far
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-4 text-base text-forest-deep leading-[1.5]">
              Barterkin is Georgia-only. Every member lives here. If your county isn&apos;t listed, be the one who puts it there.
            </p>
          </FadeIn>
        </div>

        <Stagger
          className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto"
          role="list"
          aria-label="Counties with members on Barterkin"
          staggerDelay={0.04}
        >
          {counties.map((county) => (
            <StaggerItem key={county.name} role="listitem">
              <span className="inline-flex items-center h-9 px-4 rounded-full bg-sage-pale ring-1 ring-sage-light text-sm text-forest-deep hover:bg-forest/5 hover:ring-forest/20 transition-colors cursor-default">
                {county.name}
              </span>
            </StaggerItem>
          ))}
        </Stagger>

        <FadeIn className="mt-8 text-center" delay={0.3}>
          <p className="text-sm italic text-forest-mid leading-[1.5]">
            Georgia residents only. We trust the honor system — misuse gets profiles removed.
          </p>
        </FadeIn>

        <FadeIn className="mt-10 text-center" delay={0.4}>
          <Link
            href="/directory"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'h-11 min-w-[200px] border-forest text-forest-deep hover:bg-forest/5'
            )}
          >
            See the full directory
          </Link>
        </FadeIn>
      </div>
    </section>
  )
}
