'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { cn } from '@/lib/utils'

export function NavLinks({
  displayName,
  avatarUrl,
}: {
  displayName?: string | null
  avatarUrl?: string | null
}) {
  const pathname = usePathname()
  const isDirectory = pathname.startsWith('/directory')
  const initial = (displayName ?? '?').charAt(0).toUpperCase()

  return (
    <div className="flex items-center gap-6">
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
        <Avatar className="h-8 w-8 border border-sage-light">
          <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? ''} />
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <span>Your profile</span>
      </Link>
      <LogoutButton />
    </div>
  )
}
