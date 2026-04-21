import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { LandingFounderCard as LandingFounderCardData } from '@/lib/data/landing'

export function FoundingMemberCard({ profile }: { profile: LandingFounderCardData }) {
  const displayName = profile.display_name || 'Unnamed member'
  const initial = displayName.charAt(0).toUpperCase()
  const county = profile.county_name || 'Unknown County'
  const category = profile.category_name || ''
  const skills = profile.top_skills.slice(0, 3)

  const ariaLabel = [
    `View ${displayName}'s profile`,
    `${county} County`,
    category,
    skills.length > 0 ? `offers ${skills.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' — ')

  return (
    <Link
      href={`/m/${profile.username}`}
      aria-label={ariaLabel}
      className="block"
    >
      <Card className="relative bg-sage-pale ring-1 ring-sage-light rounded-lg p-6 min-h-[220px] hover:ring-1 hover:ring-sage-light hover:shadow-sm hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:transition-none transition-all border-0">
        <Badge
          className="absolute right-4 top-4 bg-clay/10 text-clay ring-1 ring-clay/20 font-normal"
          variant="secondary"
        >
          Founding member
        </Badge>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border border-sage-light flex-shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-xl font-bold text-forest-deep truncate">
              {displayName}
            </h3>
            <p className="mt-1 text-sm text-forest-mid">
              {county} County {category ? `· ${category}` : ''}
            </p>
          </div>
        </div>
        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="h-7 px-2 bg-sage-bg text-forest-deep font-normal"
              >
                {skill.length > 24 ? `${skill.slice(0, 24)}\u2026` : skill}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </Link>
  )
}
