import Image from 'next/image'
import Link from 'next/link'
import { Sprout } from 'lucide-react'

import { type LandingHeroVariant, LANDING_HERO_VARIANTS } from '@/lib/ab-testing-shared'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/fade-in'
import { WaitlistForm } from './WaitlistForm'

export interface HeroStats {
  totalProfiles: number
  distinctCounties: number
}

export interface HeroProps {
  stats: HeroStats
  isAuthed: boolean
  variant: LandingHeroVariant
}

const MOSAIC = [
  { src: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80', alt: 'Fresh-baked sourdough loaves', aspect: '4/3' },
  { src: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80', alt: 'Community garden harvest', aspect: '3/4' },
  { src: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80', alt: 'Woodworking craft', aspect: '3/4' },
  { src: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80', alt: 'Farmers market produce', aspect: '4/3' },
]

export function Hero({ stats, isAuthed, variant }: HeroProps) {
  const primaryHref = isAuthed ? '/profile' : '/signup'
  const primaryLabel = isAuthed ? 'Go to your profile' : 'Join the network'
  const signupHref = `/signup?abv=${encodeURIComponent(variant)}`
  const heroCopy = variant === LANDING_HERO_VARIANTS.control
    ? {
        heading: (
          <>
            Georgia&apos;s <em className="not-italic text-clay">community skills exchange</em>.
          </>
        ),
        body:
          'Find Georgians with skills to trade, from braiders to beekeepers to bakers. Offer what you make, swap for what you need, and keep the value local.',
      }
    : {
        heading: (
          <>
            Trade skills with your <em className="not-italic text-clay">neighbors</em>. No cash needed.
          </>
        ),
        body:
          'From sourdough to plumbing to tutoring, Barterkin helps nearby Georgians swap useful skills directly without money or middlemen.',
      }

  return (
    <section className="relative overflow-hidden bg-forest-deep">
      {/* Mobile background image */}
      <div className="absolute inset-0 md:hidden" aria-hidden="true">
        <Image
          src="/images/hero-mobile.jpg"
          alt=""
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
      </div>
      {/* Mobile dark overlay for text legibility */}
      <div
        className="absolute inset-0 md:hidden"
        aria-hidden="true"
        style={{ background: 'linear-gradient(180deg, rgba(30,68,32,0.88) 0%, rgba(30,68,32,0.82) 50%, rgba(30,68,32,0.92) 100%)' }}
      />

      {/* subtle grain */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.035]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}
      />

      <div className="relative z-20 mx-auto grid max-w-6xl grid-cols-1 px-6 py-20 sm:py-28 md:grid-cols-2 md:gap-14 md:items-center">

        {/* copy */}
        <div>
          <FadeIn delay={0}>
            <Badge className="mb-6 inline-flex bg-clay/20 text-clay ring-1 ring-clay/30 font-normal text-xs tracking-wide">
              Georgia residents only · Honor system
            </Badge>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="font-serif text-4xl font-bold text-sage-bg leading-[1.08] sm:text-5xl lg:text-[3.4rem]">
              {heroCopy.heading}
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="mt-6 max-w-md text-base text-sage-bg/75 leading-relaxed">
              {heroCopy.body}{' '}
              <span className="text-sage-bg/90 font-medium">No money. No middlemen.</span>
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="mt-8 flex flex-col gap-3">
              {isAuthed ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={primaryHref}
                    className={cn(
                      buttonVariants({ size: 'lg' }),
                      'h-12 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg font-semibold'
                    )}
                  >
                    <Sprout className="mr-2 h-4 w-4" aria-hidden="true" />
                    {primaryLabel}
                  </Link>
                  <Link
                    href="/directory"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'lg' }),
                      'h-12 min-w-[180px] border-sage-bg/30 text-sage-bg bg-transparent hover:bg-sage-bg/10'
                    )}
                  >
                    Browse the directory
                  </Link>
                </div>
              ) : (
                <>
                  <WaitlistForm heroVariant={variant} />
                  <p className="text-xs text-sage-bg/50">
                    Or{' '}
                    <Link href={signupHref} className="underline underline-offset-2 hover:text-sage-bg/75">
                      skip the line and sign up now
                    </Link>
                    {' '}· No spam, ever.
                  </p>
                </>
              )}
            </div>
          </FadeIn>

          <Stagger className="mt-12 flex gap-10 border-t border-sage-bg/10 pt-8" staggerDelay={0.1}>
            {[
              { value: `${stats.totalProfiles}+`, label: 'Georgians' },
              { value: `${stats.distinctCounties}+`, label: 'Counties' },
              { value: '10', label: 'Categories' },
            ].map(({ value, label }) => (
              <StaggerItem key={label}>
                <dd className="font-serif text-2xl font-bold text-sage-bg">{value}</dd>
                <dt className="mt-0.5 text-xs text-sage-bg/50 uppercase tracking-widest">{label}</dt>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        {/* Desktop image mosaic */}
        <Stagger className="hidden md:grid grid-cols-2 gap-3 mt-8 md:mt-0" aria-hidden="true" staggerDelay={0.15}>
          {MOSAIC.map(({ src, alt, aspect }, i) => (
            <StaggerItem key={i}>
              <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={{ aspectRatio: aspect }}>
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="280px"
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/40 to-transparent" />
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
