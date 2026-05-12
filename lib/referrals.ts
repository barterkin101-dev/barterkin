const REFERRAL_CODE_LENGTH = 8
const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{8}$/

export const REFERRAL_COOKIE_NAME = 'barterkin_referral'
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function normalizeReferralCode(code: string | null | undefined): string | null {
  if (!code) return null

  const normalized = code.trim().toUpperCase()
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null
}

export function buildReferralLink(siteUrl: string, referralCode: string): string {
  const normalized = normalizeReferralCode(referralCode)
  if (!normalized) {
    throw new Error(`Referral codes must be ${REFERRAL_CODE_LENGTH} uppercase letters or digits.`)
  }

  const baseUrl = siteUrl.trim().replace(/\/+$/, '')
  return `${baseUrl}/r/${normalized}`
}
