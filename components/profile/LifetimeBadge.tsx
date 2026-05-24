/**
 * Lifetime badge — violet chip for one-time lifetime members.
 *
 * Shared component used by:
 *   - components/directory/DirectoryCard.tsx (absolute top-right)
 *   - components/profile/ProfileCard.tsx (inline in header flex row)
 *
 * Styling:
 *   - variant="secondary" (shadcn Badge primitive base)
 *   - bg-violet-100 text-violet-800 ring-1 ring-violet-200 font-normal
 *   - Text: "Lifetime" (sentence case)
 *
 * Anti-patterns forbidden:
 *   - No emoji or lucide icon leading the text
 *   - No animation (pulse, shimmer, breathe)
 *   - No onClick / hover states
 *   - No alternative copy
 */
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LifetimeBadgeProps {
  className?: string
}

export function LifetimeBadge({ className }: LifetimeBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'bg-violet-100 text-violet-800 ring-1 ring-violet-200 font-normal',
        className,
      )}
    >
      Lifetime
    </Badge>
  )
}
