import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogoutButton } from '@/components/auth/LogoutButton'

export function AppNav({ displayName, avatarUrl }: { displayName?: string | null; avatarUrl?: string | null }) {
  const initial = (displayName ?? '?').charAt(0).toUpperCase()
  return (
    <nav className="border-b border-sage-light bg-sage-pale">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl font-bold text-forest-deep">Barterkin</Link>
        <div className="flex items-center gap-6">
          <Link href="/directory" className="text-sm text-forest-mid hover:text-forest-deep">Directory</Link>
          <Link href="/profile" className="flex items-center gap-2 text-sm text-forest-mid hover:text-forest-deep">
            <Avatar className="h-8 w-8 border border-sage-light">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? ''} />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <span>Your profile</span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    </nav>
  )
}
