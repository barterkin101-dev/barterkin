import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function PhoneVerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'inline-flex items-center gap-1 bg-forest-deep/8 text-forest-deep ring-1 ring-forest-deep/15',
        className,
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Phone verified
    </Badge>
  )
}
