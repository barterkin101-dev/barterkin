import type { Metadata } from 'next'

import {
  getCountyCoverage,
  getFoundingMembers,
  getStatCounts,
} from '@/lib/data/landing'
import { createClient } from '@/lib/supabase/server'

import { CountyCoverage } from '@/components/landing/CountyCoverage'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { FoundingMemberStrip } from '@/components/landing/FoundingMemberStrip'
import { FoundingOfferCTA } from '@/components/landing/FoundingOfferCTA'
import { LandingNav } from '@/components/landing/LandingNav'
import { SecondaryCTA } from '@/components/landing/SecondaryCTA'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Barterkin — Georgia's community skills exchange",
  description:
    'Find Georgians with skills to trade. Swap a haircut for sourdough, plumbing for produce, tutoring for tailoring — no money, just neighbors.',
  alternates: { canonical: '/' },
  openGraph: {
    title: "Barterkin — Georgia's community skills exchange",
    description:
      'Find Georgians with skills to trade. Swap a haircut for sourdough, plumbing for produce, tutoring for tailoring — no money, just neighbors.',
    url: '/',
    siteName: 'Barterkin',
    type: 'website',
    locale: 'en_US',
    // og:image is auto-emitted by app/opengraph-image.tsx (Plan 02 Task 3) — do NOT set
    // metadata.openGraph.images here per RESEARCH Pitfall 3 (file convention vs metadata conflict)
  },
  twitter: {
    card: 'summary_large_image',
    title: "Barterkin — Georgia's community skills exchange",
    description:
      'Find Georgians with skills to trade. Swap a haircut for sourdough, plumbing for produce, tutoring for tailoring — no money, just neighbors.',
  },
  robots: { index: true, follow: true },
}

export default async function LandingPage() {
  // Three parallel data reads + one auth-claim read for the CTA-swap.
  const supabase = await createClient()

  const [foundersResult, countyResult, statsResult, claimsResult, foundingCountResult] =
    await Promise.all([
      getFoundingMembers(),
      getCountyCoverage(),
      getStatCounts(),
      supabase.auth.getClaims(),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tier', 'founding'),
    ])

  const isAuthed = !!claimsResult.data?.claims?.sub
  const foundingSlotsRemaining = Math.max(0, 100 - (foundingCountResult.count ?? 0))

  return (
    <>
      <LandingNav />
      <main id="main">
        <Hero
          stats={{
            totalProfiles: statsResult.totalProfiles,
            distinctCounties: statsResult.distinctCounties,
          }}
          isAuthed={isAuthed}
        />
        <FoundingOfferCTA slotsRemaining={foundingSlotsRemaining} isAuthed={isAuthed} />
        <HowItWorks />
        <FoundingMemberStrip profiles={foundersResult.profiles} />
        <CountyCoverage counties={countyResult.counties} />
        <SecondaryCTA />
        {/* Footer is rendered by app/layout.tsx — do not duplicate here */}
      </main>
    </>
  )
}
