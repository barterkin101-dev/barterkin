import Link from 'next/link'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { BanUnbanButton } from '@/components/admin/BanUnbanButton'
import type { AdminMemberDetail } from '@/lib/data/admin'

interface MemberDetailViewProps {
  profile: AdminMemberDetail
}

function formatJoined(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function initial(name: string | null): string {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

export function MemberDetailView({ profile }: MemberDetailViewProps) {
  const displayName = profile.display_name ?? 'Unnamed member'
  const sortedOffered = [...profile.skills_offered].sort((a, b) => a.sort_order - b.sort_order)
  const sortedWanted = [...profile.skills_wanted].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/admin/members"
        className="inline-block text-sm text-forest-mid hover:text-forest-deep"
      >
        ← Back to members
      </Link>

      <header className="flex items-start gap-6">
        <Avatar className="h-16 w-16">
          {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
          <AvatarFallback className="text-xl">{initial(profile.display_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
            {displayName}
          </h1>
          <div className="flex items-center gap-3 text-sm text-forest-mid">
            <span>@{profile.username ?? '—'}</span>
            <span aria-hidden="true">·</span>
            <span>{profile.county_name ?? 'Unknown county'}</span>
            <span aria-hidden="true">·</span>
            <span>Joined {formatJoined(profile.created_at)}</span>
          </div>
          <div>
            <StatusBadge isPublished={profile.is_published} banned={profile.banned} />
          </div>
        </div>
      </header>

      <Separator className="bg-sage-light" />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest-mid">Category</h2>
            <p className="text-base text-forest-deep">{profile.category_name ?? '—'}</p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest-mid">Bio</h2>
            <p className="text-base text-forest-deep whitespace-pre-wrap">
              {profile.bio ?? '—'}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest-mid">Availability</h2>
            <p className="text-base text-forest-deep whitespace-pre-wrap">
              {profile.availability ?? '—'}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest-mid">TikTok</h2>
            <p className="text-base text-forest-deep">{profile.tiktok_handle ?? '—'}</p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest-mid">Accepting contact</h2>
            <p className="text-base text-forest-deep">{profile.accepting_contact ? 'Yes' : 'No'}</p>
          </div>
          {profile.founding_member && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-forest-mid">Founding member</h2>
              <p className="text-base text-forest-deep">Yes</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest-mid">Skills offered</h2>
            {sortedOffered.length === 0 ? (
              <p className="text-base text-forest-deep">—</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {sortedOffered.map((s, i) => (
                  <li
                    key={i}
                    className="px-3 py-1 text-sm bg-sage-light text-forest-deep rounded-full"
                  >
                    {s.skill_text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-forest-mid">Skills wanted</h2>
            {sortedWanted.length === 0 ? (
              <p className="text-base text-forest-deep">—</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {sortedWanted.map((s, i) => (
                  <li
                    key={i}
                    className="px-3 py-1 text-sm bg-sage-pale ring-1 ring-sage-light text-forest-deep rounded-full"
                  >
                    {s.skill_text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <Separator className="bg-sage-light" />

      <footer className="flex items-center justify-between">
        <StatusBadge isPublished={profile.is_published} banned={profile.banned} />
        <BanUnbanButton
          profileId={profile.id}
          displayName={displayName}
          isBanned={profile.banned}
        />
      </footer>
    </div>
  )
}
