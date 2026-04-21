/**
 * SEED-04 — Subtle "Founding member" chip.
 *
 * Shared component used by:
 *   - components/directory/DirectoryCard.tsx (absolute top-right)
 *   - components/profile/ProfileCard.tsx (inline in header flex row)
 *   - components/landing/FoundingMemberCard.tsx (existing; may refactor to use this)
 *
 * Styling locked by 07-UI-SPEC.md §Color, §Typography, §Copywriting. Do not drift:
 *   - variant="secondary" (shadcn Badge primitive base)
 *   - bg-clay/10 text-clay ring-1 ring-clay/20 font-normal (extracted from FoundingMemberCard.tsx lines 31-36)
 *   - Text: "Founding member" (sentence case — matches Phase 6 landing strip verbatim)
 *
 * Anti-patterns forbidden (UI-SPEC.md §Out-of-Spec Guardrails):
 *   - No leaf/plant/star emoji
 *   - No lucide icon leading the text
 *   - No animation (pulse, shimmer, breathe)
 *   - No onClick / hover states
 *   - No alternative copy ("Founder", "OG Member", etc.)
 */
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FoundingMemberBadgeProps {
  className?: string
}

export function FoundingMemberBadge({ className }: FoundingMemberBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'bg-clay/10 text-clay ring-1 ring-clay/20 font-normal',
        className,
      )}
    >
      Founding member
    </Badge>
  )
}
