'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { Quote } from 'lucide-react'
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/fade-in'
import { captureClientEvent } from '@/lib/analytics-client'
import type { TestimonialRow } from '@/lib/data/testimonials'

interface TestimonialsProps {
  testimonials: TestimonialRow[]
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    captureClientEvent('testimonial_page_viewed', {
      count: testimonials.length,
      has_testimonials: testimonials.length > 0,
    })
  }, [testimonials.length])

  if (testimonials.length === 0) {
    return null
  }

  return (
    <section id="testimonials" className="bg-sage-bg py-16 sm:py-20 md:py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.18em] font-bold text-forest-mid">
              Member stories
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="mt-3 font-serif text-2xl font-bold text-forest-deep sm:text-3xl">
              What our community is saying
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mt-4 text-base text-forest-mid leading-relaxed">
              Real trades, real people, real Georgia.
            </p>
          </FadeIn>
        </div>

        <Stagger
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.1}
        >
          {testimonials.map((t) => (
            <StaggerItem key={t.id}>
              <div className="flex flex-col rounded-2xl bg-sage-pale p-6 ring-1 ring-sage-light h-full">
                <Quote className="h-6 w-6 text-forest/30 mb-3" aria-hidden="true" />
                <blockquote className="flex-1 text-sm text-forest-deep leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                {t.trade_context && (
                  <p className="mt-3 text-xs text-forest-mid/80 italic">
                    Trade: {t.trade_context}
                  </p>
                )}
                <div className="mt-5 flex items-center gap-3 pt-4 border-t border-sage-light">
                  {t.profile?.avatar_url ? (
                    <Image
                      src={t.profile.avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-forest/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-forest-deep">
                        {(t.profile?.display_name ?? 'M').charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-forest-deep truncate">
                      {t.profile?.display_name ?? 'Barterkin member'}
                    </p>
                    {t.profile?.county_name && (
                      <p className="text-xs text-forest-mid">
                        {t.profile.county_name}, GA
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
