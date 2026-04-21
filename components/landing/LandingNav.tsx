import Link from 'next/link'
import { Sprout } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-40 h-16 border-b border-forest/30 bg-forest-deep">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-lg font-bold text-sage-bg"
        >
          <Sprout className="h-5 w-5" aria-hidden="true" />
          <span>Barterkin</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="#how"
            className="hidden text-sm text-sage-bg/80 hover:text-sage-bg sm:inline-block"
          >
            How it works
          </Link>
          <Link
            href="/directory"
            className="hidden text-sm text-sage-bg/80 hover:text-sage-bg sm:inline-block"
          >
            Directory
          </Link>
          <Button
            asChild
            size="sm"
            className="h-9 bg-clay hover:bg-clay/90 text-sage-bg"
          >
            <Link href="/signup">Join</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
