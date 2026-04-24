'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { cn } from '@/lib/utils'

export function NavLinks({
  displayName,
  avatarUrl,
  unseenContactCount = 0,
  showFinishSetup,
}: {
  displayName?: string | null
  avatarUrl?: string | null
  unseenContactCount?: number
  showFinishSetup?: boolean
}) {
  const pathname = usePathname()
  const isDirectory = pathname.startsWith('/directory')
  const initial = (displayName ?? '?').charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-6">
      {showFinishSetup && (
        <Link
          href="/onboarding"
          className="flex items-center gap-1 text-sm font-bold text-clay hover:text-forest-deep"
          aria-label="Finish setup"
        >
          Finish setup <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
      <Link
        href="/directory"
        className={cn(
          'text-sm',
          isDirectory
            ? 'text-forest-deep border-b-2 border-clay pb-1'
            : 'text-forest-mid hover:text-forest-deep',
        )}
      >
        Directory
      </Link>
      <Link
        href="/profile"
        className="flex items-center gap-2 text-sm text-forest-mid hover:text-forest-deep"
      >
        <div className="relative">
          <Avatar className="h-8 w-8 border border-sage-light">
            <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? ''} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          {unseenContactCount > 0 && (
            <span
              aria-hidden="true"
              className={
                unseenContactCount === 1
                  ? 'absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sage-bg'
                  : 'absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white ring-2 ring-sage-bg'
              }
            >
              {unseenContactCount >= 2 ? (unseenContactCount > 9 ? '9+' : unseenContactCount) : null}
            </span>
          )}
        </div>
        <span>Your profile</span>
        {unseenContactCount > 0 && (
          <span className="sr-only">
            , {unseenContactCount} new contact{unseenContactCount === 1 ? '' : 's'}
          </span>
        )}
      </Link>
      <LogoutButton />
    </div>
  )
}
