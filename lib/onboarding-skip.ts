export const ONBOARDING_SKIP_COOKIE_NAME = 'barterkin_onboarding_skipped'
export const ONBOARDING_SKIP_COOKIE_VALUE = '1'
export const ONBOARDING_SKIP_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function hasSkippedOnboarding(cookieValue: string | null | undefined): boolean {
  return cookieValue === ONBOARDING_SKIP_COOKIE_VALUE
}
