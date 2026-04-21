import Link from 'next/link'
import { NavLinks } from './NavLinks'

export function AppNav({
  displayName,
  avatarUrl,
}: {
  displayName?: string | null
  avatarUrl?: string | null
}) {
  return (
    <nav className="border-b border-sage-light bg-sage-pale">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl font-bold text-forest-deep">
          Barterkin
        </Link>
        <NavLinks displayName={displayName} avatarUrl={avatarUrl} />
      </div>
    </nav>
  )
}
