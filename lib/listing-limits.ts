export const FREE_LISTING_LIMIT = 3

export function countsTowardListingLimit(status: string): boolean {
  return status !== 'cancelled'
}
