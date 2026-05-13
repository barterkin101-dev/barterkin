'use client'

import { useEffect, useRef } from 'react'
import { Package, UserPlus, Handshake } from 'lucide-react'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/fade-in'
import { captureClientEvent } from '@/lib/analytics-client'
import type { ActivityItem } from '@/lib/data/landing-activity'

interface RecentActivityProps {
  items: ActivityItem[]
}

const ICON_MAP = {
  new_listing: Package,
  new_member: UserPlus,
  trade_completed: Handshake,
} as const

const TYPE_LABEL: Record<string, string> = {
  new_listing: 'New listing',
  new_member: 'New member',
  trade_completed: 'Trade completed',
}

export function RecentActivity({ items }: RecentActivityProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    captureClientEvent('landing_social_proof_viewed', {
      item_count: items.length,
      has_activity: items.length > 0,
    })
  }, [items.length])

  if (items.length === 0) {
    return (
      <section className="bg-sage-bg py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-6">
          <FadeIn>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
                Live activity
              </p>
              <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
                Recent trades across Georgia
              </h2>
              <p className="mt-4 text-sm text-forest-mid">
                Be the first to make a trade today.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-sage-bg py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
              Live activity
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
              Recent trades across Georgia
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-4 text-base text-forest-mid leading-relaxed">
              Real activity from real Georgians in the last 24 hours.
            </p>
          </FadeIn>
        </div>

        <Stagger
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.08}
        >
          {items.map((item) => {
            const Icon = ICON_MAP[item.type]
            return (
              <StaggerItem key={item.id}>
                <div className="flex items-start gap-4 rounded-xl bg-sage-pale p-5 ring-1 ring-sage-light transition-colors hover:bg-white hover:ring-forest/10">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10">
                    <Icon className="h-5 w-5 text-forest-deep" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-forest-mid">
                      {TYPE_LABEL[item.type] ?? item.type}
                    </p>
                    <p className="mt-1 text-sm font-medium text-forest-deep leading-snug">
                      {item.subtitle}
                    </p>
                    <p className="mt-1 text-xs text-forest-mid/70">{item.timeAgo}</p>
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </section>
  )
}
