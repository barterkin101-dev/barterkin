import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { LandingFounderCard } from '@/lib/data/landing'

import { FoundingMemberCard } from './FoundingMemberCard'

export function FoundingMemberStrip({ profiles }: { profiles: LandingFounderCard[] }) {
  if (profiles.length === 0) {
    return (
      <section className="bg-sage-bg py-16 sm:py-20 md:py-24">
        <div className="mx-auto max-w-2xl px-6">
          <Card className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-8 md:p-12 space-y-6 text-center border-0">
            <h2 className="font-serif text-xl font-bold text-forest-deep">
              Be a founding member.
            </h2>
            <p className="text-base text-forest-mid leading-[1.5] max-w-md mx-auto">
              Barterkin is brand new. The first members shape everything. Join now and your profile goes at the top of the directory.
            </p>
            <Button
              asChild
              size="lg"
              className="h-12 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg"
            >
              <Link href="/signup">Claim your spot</Link>
            </Button>
          </Card>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-sage-bg py-16 sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.15em] font-bold text-forest-mid">
            Founding members
          </p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
            Meet the first Georgians on Barterkin
          </h2>
          <p className="mt-4 text-base text-forest-deep leading-[1.5]">
            These neighbors joined early and shaped how Barterkin works. See what they offer and say hello.
          </p>
        </div>

        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
          role="list"
          aria-label="Founding members on Barterkin"
        >
          {profiles.map((p) => (
            <div key={p.id} role="listitem">
              <FoundingMemberCard profile={p} />
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-11 min-w-[200px] border-forest text-forest-deep hover:bg-forest/5"
          >
            <Link href="/directory">Browse all members</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
