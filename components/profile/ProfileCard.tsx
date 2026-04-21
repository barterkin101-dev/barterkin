// Server component — no 'use client' directive. Renders data passed in as props.
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import type { ProfileWithRelations } from '@/lib/actions/profile.types'
import { ContactButton } from '@/components/profile/ContactButton'
import { OverflowMenu } from '@/components/profile/OverflowMenu'
import { FoundingMemberBadge } from '@/components/profile/FoundingMemberBadge'

interface ProfileCardProps {
  profile: ProfileWithRelations
  /** ID of the viewing auth user. null = anonymous viewer. */
  viewerOwnerId?: string | null
  /** owner_id of the profile being viewed. */
  profileOwnerId?: string
  /** ID (row PK) of the profile being viewed — needed for reportMember. */
  profileId?: string
  /** profiles.accepting_contact value. */
  acceptingContact?: boolean
}

export function ProfileCard({
  profile,
  viewerOwnerId,
  profileOwnerId,
  profileId,
  acceptingContact,
}: ProfileCardProps) {
  const initial = (profile.display_name ?? '?').charAt(0).toUpperCase()
  const county = profile.counties?.name ?? null
  const category = profile.categories?.name ?? null
  const handle = profile.tiktok_handle?.startsWith('@')
    ? profile.tiktok_handle.slice(1)
    : profile.tiktok_handle

  // Viewer context: show contact/overflow only when authenticated viewer is NOT the profile owner
  const showViewerActions =
    viewerOwnerId != null &&
    profileOwnerId != null &&
    profileId != null &&
    viewerOwnerId !== profileOwnerId

  return (
    <Card className="bg-sage-pale border-sage-light">
      <CardHeader className="flex flex-row items-start gap-6 p-6 lg:p-8">
        <Avatar className="h-40 w-40 shrink-0 border border-sage-light">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name ?? ''} />
          <AvatarFallback className="text-4xl">{initial}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-serif text-2xl font-bold leading-[1.2] text-forest-deep">
              {profile.display_name ?? 'Member'}
            </h1>
            {profile.founding_member && <FoundingMemberBadge />}
            {/* 3-dot overflow menu (Block + Report) — hidden on own profile */}
            {showViewerActions && (
              <OverflowMenu
                viewerOwnerId={viewerOwnerId}
                profileOwnerId={profileOwnerId!}
                profileId={profileId!}
                displayName={profile.display_name ?? 'Member'}
                username={profile.username ?? ''}
              />
            )}
          </div>
          {(county || category) && (
            <p className="text-base text-forest-mid">
              {[county, category].filter(Boolean).join(' \u00b7 ')}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-8 p-6 pt-0 lg:p-8 lg:pt-0">
        {/* Contact CTA slot — shown to authenticated non-owners only */}
        {showViewerActions && acceptingContact != null && (
          <ContactButton
            recipientProfileId={profileId!}
            recipientDisplayName={profile.display_name ?? 'Member'}
            recipientAcceptingContact={acceptingContact}
          />
        )}

        {profile.bio && (
          <p className="text-base leading-[1.5] text-forest-deep">{profile.bio}</p>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold leading-[1.2] text-forest-deep">
              Skills I offer
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills_offered?.length ? (
                profile.skills_offered.map((s) => (
                  <Badge
                    key={s.id}
                    variant="secondary"
                    className="h-8 bg-sage-bg px-3 text-forest-deep"
                  >
                    {s.skill_text}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">None listed yet.</p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-bold leading-[1.2] text-forest-deep">
              Skills I want
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills_wanted?.length ? (
                profile.skills_wanted.map((s) => (
                  <Badge
                    key={s.id}
                    variant="secondary"
                    className="h-8 bg-sage-bg px-3 text-forest-deep"
                  >
                    {s.skill_text}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">None listed yet.</p>
              )}
            </div>
          </div>
        </div>

        {profile.availability && (
          <p className="text-sm text-forest-mid">
            <em className="not-italic font-medium italic">Availability:</em>{' '}
            <span>{profile.availability}</span>
          </p>
        )}

        {handle && (
          <p className="text-sm text-forest-mid">
            Follow on TikTok:{' '}
            <a
              href={`https://tiktok.com/@${handle}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 underline hover:text-forest-deep"
            >
              @{handle}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
