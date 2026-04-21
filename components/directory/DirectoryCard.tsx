import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { DirectoryProfile } from '@/lib/data/directory.types'

export function DirectoryCard({ profile }: { profile: DirectoryProfile }) {
  const initial = (profile.display_name ?? '?').charAt(0).toUpperCase()
  const displayName = profile.display_name ?? 'Unnamed member'
  const county = profile.counties?.name ?? 'Unknown County'
  const category = profile.categories?.name ?? ''

  const skillNames = profile.skills_offered
    .slice(0, 3)
    .map((s) => s.skill_text)
  const ariaLabel = [
    `View ${displayName}'s profile`,
    `${county} County`,
    category,
    skillNames.length > 0 ? `offers ${skillNames.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' — ')

  return (
    <Link href={`/m/${profile.username}`} aria-label={ariaLabel} className="block">
      <Card className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-6 min-h-[220px] hover:ring-1 hover:ring-sage-light hover:shadow-sm hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none transition-all border-0">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border border-sage-light flex-shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="font-sans text-base font-bold text-forest-deep truncate">
              {displayName}
            </h2>
            <p className="text-sm text-forest-mid">
              {county} · {category}
            </p>
          </div>
        </div>
        <div className="mt-4">
          {profile.skills_offered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills listed yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.skills_offered.map((skill) => (
                <Badge
                  key={skill.skill_text}
                  variant="secondary"
                  className="h-7 px-2 bg-sage-bg text-forest-deep font-normal"
                >
                  {skill.skill_text.length > 24
                    ? `${skill.skill_text.slice(0, 24)}\u2026`
                    : skill.skill_text}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
