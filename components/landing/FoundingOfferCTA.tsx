import Link from 'next/link'
import { Zap, Users, Crown, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/ui/fade-in'
import { STRIPE_FOUNDING_MEMBER_LIMIT } from '@/lib/stripe/config'

interface FoundingOfferCTAProps {
  slotsRemaining: number
  isAuthed: boolean
}

export function FoundingOfferCTA({ slotsRemaining, isAuthed }: FoundingOfferCTAProps) {
  const hasSlots = slotsRemaining > 0
  const ctaHref = isAuthed ? '/dashboard/billing' : '/signup'
  const ctaLabel = isAuthed ? 'Claim your slot' : 'Join + claim founding member'
  const slotsTaken = STRIPE_FOUNDING_MEMBER_LIMIT - slotsRemaining
  const percentFilled = Math.round((slotsTaken / STRIPE_FOUNDING_MEMBER_LIMIT) * 100)
  const isUrgent = slotsRemaining <= 10

  return (
    <section className="bg-forest-deep py-16 sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.15em] font-bold text-clay">
              Limited offer
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="mt-3 font-serif text-2xl font-bold text-sage-bg sm:text-3xl md:text-4xl">
              Be a founding member.
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-4 text-base text-sage-bg/75 leading-relaxed max-w-xl mx-auto">
              The first 100 members get Premium forever at{' '}
              <span className="text-sage-bg font-semibold">$5/month</span>{' '}
              — locked-in price, even when Premium goes to $9.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.3}>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card className="bg-forest-mid/20 border-forest-mid/30 p-6 text-center">
              <Zap className="mx-auto h-6 w-6 text-clay" />
              <h3 className="mt-3 font-semibold text-sage-bg">Everything Premium</h3>
              <p className="mt-1 text-sm text-sage-bg/60">
                Unlimited listings, featured placement, verified badge
              </p>
            </Card>
            <Card className="bg-forest-mid/20 border-forest-mid/30 p-6 text-center">
              <Crown className="mx-auto h-6 w-6 text-clay" />
              <h3 className="mt-3 font-semibold text-sage-bg">Locked-in price</h3>
              <p className="mt-1 text-sm text-sage-bg/60">
                $5/month forever. Never increases, even for new features.
              </p>
            </Card>
            <Card className="bg-forest-mid/20 border-forest-mid/30 p-6 text-center">
              <Users className="mx-auto h-6 w-6 text-clay" />
              <h3 className="mt-3 font-semibold text-sage-bg">Founding badge</h3>
              <p className="mt-1 text-sm text-sage-bg/60">
                Exclusive badge on your profile and directory card.
              </p>
            </Card>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-10 flex flex-col items-center gap-4">
            {hasSlots ? (
              <>
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex justify-between text-xs text-sage-bg/60">
                    <span>{slotsTaken} claimed</span>
                    <span>{STRIPE_FOUNDING_MEMBER_LIMIT} total</span>
                  </div>
                  <Progress
                    value={percentFilled}
                    className="h-2 bg-forest-mid/30"
                  />
                </div>
                <Link
                  href={ctaHref}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-14 min-w-[260px] bg-clay hover:bg-clay/90 text-sage-bg font-semibold'
                  )}
                >
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <p className={cn(
                  'text-sm',
                  isUrgent ? 'text-amber-300 font-medium' : 'text-sage-bg/50'
                )}>
                  {isUrgent ? '⏰ ' : ''}
                  {slotsRemaining} of {STRIPE_FOUNDING_MEMBER_LIMIT} slots remaining
                </p>
              </>
            ) : (
              <>
                <Link
                  href={ctaHref}
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-14 min-w-[260px] bg-clay hover:bg-clay/90 text-sage-bg font-semibold'
                  )}
                >
                  Get Premium — $9/mo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <p className="text-sm text-sage-bg/50">
                  Founding slots sold out — Premium still available
                </p>
              </>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
