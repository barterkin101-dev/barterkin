import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isProfileComplete, type ProfileCompletenessInput } from '@/lib/schemas/profile'
import { WizardLayout } from '@/components/onboarding/WizardLayout'
import { StepProfile } from '@/components/onboarding/StepProfile'
import { StepDirectory } from '@/components/onboarding/StepDirectory'
import { StepContact } from '@/components/onboarding/StepContact'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Get started' }

/**
 * Onboarding wizard page.
 *
 * D-01: lives under route group (onboarding) so it inherits a distraction-free layout with no AppNav.
 * D-13: 3 linear steps (Profile / Directory / Contact) — no welcome screen.
 * D-14: progress indicator (rendered in WizardLayout) shows Step N of 3.
 * D-15: only Step 1 has a hard gate (profile must be complete).
 *
 * searchParams.step determines which step renders:
 *   - missing/invalid → step 1
 *   - "1" → StepProfile (gated by profileComplete)
 *   - "2" → StepDirectory
 *   - "3" → StepContact (calls markOnboardingComplete at render per D-11)
 *
 * If onboarding_completed_at is already set, redirect to /directory — the wizard is done
 * and the middleware should not have routed the user here, but belt-and-braces.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile + skill count in a single query. maybeSingle() allows null (new user with no profile row yet — RESEARCH OQ2).
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, county_id, category_id, onboarding_completed_at, skills_offered(id)')
    .eq('owner_id', user.id)
    .maybeSingle()

  // Already completed — middleware should have skipped redirect, but guard here too.
  if (profile?.onboarding_completed_at) redirect('/directory')

  const { step: rawStep } = await searchParams
  const parsed = parseInt(rawStep ?? '1', 10)
  const step = Math.max(1, Math.min(3, Number.isFinite(parsed) && parsed > 0 ? parsed : 1))

  const completenessInput: ProfileCompletenessInput = {
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    countyId: profile?.county_id ?? null,
    categoryId: profile?.category_id ?? null,
    skillsOfferedCount: profile?.skills_offered?.length ?? 0,
  }
  const profileComplete = isProfileComplete(completenessInput)

  return (
    <WizardLayout currentStep={step}>
      {step === 1 && (
        <StepProfile completenessInput={completenessInput} profileComplete={profileComplete} />
      )}
      {step === 2 && <StepDirectory />}
      {step === 3 && <StepContact />}
    </WizardLayout>
  )
}
