import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProfileCompletenessInput } from '@/lib/schemas/profile'

const REQUIREMENTS: Array<{ key: string; label: string; test: (i: ProfileCompletenessInput) => boolean }> = [
  { key: 'displayName', label: 'Display name', test: (i) => Boolean(i.displayName) },
  { key: 'countyId', label: 'County', test: (i) => typeof i.countyId === 'number' && i.countyId > 0 },
  { key: 'categoryId', label: 'Primary category', test: (i) => typeof i.categoryId === 'number' && i.categoryId > 0 },
  { key: 'skillsOffered', label: 'At least one skill offered', test: (i) => i.skillsOfferedCount >= 1 },
  { key: 'avatarUrl', label: 'Avatar', test: (i) => Boolean(i.avatarUrl) },
]

export function ProfileCompletenessChecklist(input: ProfileCompletenessInput) {
  return (
    <ul className="space-y-2 text-sm">
      <li className="font-medium">Profile must be complete to publish:</li>
      {REQUIREMENTS.map((r) => {
        const ok = r.test(input)
        return (
          <li key={r.key} className="flex items-center gap-2">
            {ok ? <Check className="h-4 w-4 text-forest-mid" /> : <X className="h-4 w-4 text-destructive" />}
            <span className={cn(ok ? 'text-forest-mid' : 'text-destructive')}>{r.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
