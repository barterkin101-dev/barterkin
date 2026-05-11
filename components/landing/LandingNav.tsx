'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: '#how', label: 'How it works' },
    { href: '/directory', label: 'Directory' },
    { href: '/login', label: 'Sign in' },
  ]

  return (
    <nav className="sticky top-0 z-40 h-16 border-b border-forest/30 bg-forest-deep">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-lg font-bold text-sage-bg"
        >
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

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-4 sm:gap-6">
          <Link
            href="#how"
            className="text-sm text-sage-bg/80 hover:text-sage-bg"
          >
            How it works
          </Link>
          <Link
            href="/directory"
            className="text-sm text-sage-bg/80 hover:text-sage-bg"
          >
            Directory
          </Link>
          <Link
            href="/login"
            className="text-sm text-sage-bg/80 hover:text-sage-bg"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: 'sm' }), 'h-9 bg-clay hover:bg-clay/90 text-sage-bg')}
          >
            Join
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="flex sm:hidden items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-sage-bg hover:bg-white/10"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-out menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-[280px] bg-forest-deep shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <span className="font-serif text-lg font-bold text-sage-bg">Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-sage-bg hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center rounded-lg px-4 py-3 text-sm font-medium text-sage-bg/80 hover:bg-white/10 hover:text-sage-bg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-white/10">
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'w-full h-10 bg-clay hover:bg-clay/90 text-sage-bg justify-center'
                  )}
                >
                  Join
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
