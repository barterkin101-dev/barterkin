export const FREE_CONTACT_LIMIT = 10
export const PREMIUM_CONTACT_LIMIT = 100
export const WARNING_THRESHOLD = 7

export function getPremiumContactLimitDelta() {
  return PREMIUM_CONTACT_LIMIT - FREE_CONTACT_LIMIT
}
