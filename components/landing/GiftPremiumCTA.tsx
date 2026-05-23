'use client'

import Link from 'next/link'
import { Gift, Crown, Infinity, BadgeCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FadeIn } from '@/components/ui/fade-in'
import { captureClientEvent } from '@/lib/analytics-client'

interface GiftPremiumCTAProps {
  isAuthed: boolean
}

export function GiftPremiumCTA({ isAuthed }: GiftPremiumCTAProps) {
  const ctaHref = '/gift/redeem?source=landing'

  return (
    <section className="bg-sage-bg py-16 sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <FadeIn>
          <Card className="relative overflow-hidden rounded-2xl bg-sage-pale ring-1 ring-sage-light p-8 sm:p-12 md:p-14">
            {/* Decorative gift icon background */}
            <Gift
              className="absolute -right-6 -top-6 h-40 w-40 text-forest/5 rotate-12 pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 mx-auto max-w-2xl text-center space-y-6">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-clay/10 text-clay mx-auto">
                <Gift className="h-7 w-7" aria-hidden="true" />
              </div>

              <div className="space-y-3">
                <h2 className="font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
                  Give the gift of Premium
                </h2>
                <p className="text-base text-forest-mid leading-relaxed max-w-lg mx-auto">
                  Know someone who&apos;d love Barterkin? Gift them Premium access and help grow the network.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-forest-mid">
                <span className="inline-flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-clay" aria-hidden="true" />
                  100 contacts
                </span>
                <span className="hidden sm:inline text-sage-light">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Infinity className="h-4 w-4 text-clay" aria-hidden="true" />
                  Unlimited listings
                </span>
                <span className="hidden sm:inline text-sage-light">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-clay" aria-hidden="true" />
                  Verified badge
                </span>
              </div>

              <div className="pt-2">
                <Link
                  href={ctaHref}
                  onClick={() =>
                    captureClientEvent('landing_gift_premium_cta_clicked', {
                      is_authed: isAuthed,
                    })
                  }
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'h-12 min-w-[220px] bg-clay hover:bg-clay/90 text-sage-bg font-semibold'
                  )}
                >
                  <Gift className="mr-2 h-4 w-4" aria-hidden="true" />
                  Gift Premium
                </Link>
              </div>
            </div>
          </Card>
        </FadeIn>
      </div>
    </section>
  )
}
