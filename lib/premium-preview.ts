/**
 * Premium preview helper for listing detail pages.
 * Returns props for the preview toggle when the viewer is on the free tier.
 */

export interface PremiumPreviewProps {
  showToggle: boolean
}

export function getPremiumPreviewProps(tier: string | null | undefined): PremiumPreviewProps {
  return {
    showToggle: tier === 'free',
  }
}
