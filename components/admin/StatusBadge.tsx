import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  isPublished: boolean
  banned: boolean
}

export function StatusBadge({ isPublished, banned }: StatusBadgeProps) {
  if (banned) {
    return (
      <Badge className="bg-destructive/10 text-destructive border border-destructive/20">
        Banned
      </Badge>
    )
  }
  if (isPublished) {
    return <Badge className="bg-sage-light text-forest-deep">Published</Badge>
  }
  return <Badge variant="secondary">Unpublished</Badge>
}
