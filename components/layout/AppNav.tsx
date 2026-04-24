import Link from 'next/link'
import Image from 'next/image'
import { NavLinks } from './NavLinks'

export function AppNav({
  displayName,
  avatarUrl,
  unseenContactCount,
  showFinishSetup,
}: {
  displayName?: string | null
  avatarUrl?: string | null
  unseenContactCount?: number
  showFinishSetup?: boolean
}) {
  return (
    <nav className="border-b border-sage-light bg-sage-pale">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-forest-deep">
          <Image
            src="/logo-mark.svg"
            alt=""
            width={28}
            height={28}
            aria-hidden="true"
            className="h-7 w-7"
          />
          <span>Barterkin</span>
        </Link>
        <NavLinks
          displayName={displayName}
          avatarUrl={avatarUrl}
          unseenContactCount={unseenContactCount}
          showFinishSetup={showFinishSetup}
        />
      </div>
    </nav>
  )
}
