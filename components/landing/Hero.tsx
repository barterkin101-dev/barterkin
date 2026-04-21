import Link from 'next/link'
import { Sprout } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface HeroStats {
  totalProfiles: number
  distinctCounties: number
}

export interface HeroProps {
  stats: HeroStats
  isAuthed: boolean
}

export function Hero({ stats, isAuthed }: HeroProps) {
  const primaryLabel = isAuthed ? 'Go to your dashboard' : 'Join the network'
  const primaryHref = isAuthed ? '/profile' : '/signup'
  const secondaryLabel = 'Browse the directory'
  const secondaryHref = '/directory'

  return (
    <section
      className="relative bg-gradient-to-b from-forest-deep via-forest to-forest-mid pt-20 pb-24 sm:pt-28 sm:pb-32"
    >
      <div className="mx-auto max-w-5xl px-6 text-center md:text-left">
        <Badge
          className="mb-6 inline-flex bg-sage-bg/10 text-sage-bg ring-1 ring-sage-bg/20 font-normal"
          role="note"
        >
          Georgia residents only · Honor system
        </Badge>

        <h1 className="max-w-3xl md:max-w-4xl font-serif text-4xl font-bold text-sage-bg leading-[1.1] sm:text-5xl md:text-6xl">
          <span className="italic text-clay">Trade</span> skills with your Georgia neighbors.
        </h1>

        <p className="mt-6 max-w-lg text-base text-sage-bg/80 leading-[1.5] mx-auto md:mx-0">
          Bakers, plumbers, braiders, beekeepers — find people near you offering what you need, and offer back what you make. No money. No middlemen.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4 sm:justify-center md:justify-start">
          <Button
            asChild
            size="lg"
            className="h-14 sm:h-12 min-w-[200px] bg-clay hover:bg-clay/90 text-sage-bg"
          >
            <Link href={primaryHref}>
              <Sprout className="mr-2 h-5 w-5" aria-hidden="true" />
              {primaryLabel}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-14 sm:h-12 min-w-[200px] border-sage-bg text-sage-bg bg-transparent hover:bg-sage-bg/10"
          >
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>

        <dl className="mt-12 pt-10 border-t border-sage-bg/15 flex flex-col gap-6 sm:flex-row sm:gap-10 lg:gap-14 sm:justify-center md:justify-start">
          <div className="flex flex-col">
            <dd className="font-serif text-3xl font-bold text-sage-bg">
              {stats.totalProfiles}+
            </dd>
            <dt className="text-sm text-sage-bg/70">Georgians signed up</dt>
          </div>
          <div className="flex flex-col">
            <dd className="font-serif text-3xl font-bold text-sage-bg">
              {stats.distinctCounties}+
            </dd>
            <dt className="text-sm text-sage-bg/70">Counties covered</dt>
          </div>
          <div className="flex flex-col">
            <dd className="font-serif text-3xl font-bold text-sage-bg">10</dd>
            <dt className="text-sm text-sage-bg/70">Skill categories</dt>
          </div>
        </dl>
      </div>
    </section>
  )
}
