'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { NotificationBell } from './NotificationBell'
import { SiteUpdateBell } from './SiteUpdateBell'
import { FeatureRequestButton } from './FeatureRequestButton'
import { cn } from '@/lib/utils'
import { captureClientEvent } from '@/lib/analytics-client'
import type { NotificationRow } from '@/lib/data/notifications'
import type { SiteUpdateRow } from '@/lib/data/site-updates'

export function NavLinks({
  displayName,
  avatarUrl,
  unseenMessageCount = 0,
  showFinishSetup,
  notifications,
  notificationUnreadCount = 0,
  siteUpdates,
  siteUpdateUnreadCount = 0,
}: {
  displayName?: string | null
  avatarUrl?: string | null
  unseenMessageCount?: number
  showFinishSetup?: boolean
  notifications?: NotificationRow[]
  notificationUnreadCount?: number
  siteUpdates?: SiteUpdateRow[]
  siteUpdateUnreadCount?: number
}) {
  const pathname = usePathname()
  const isDirectory = pathname.startsWith('/directory')
  const isListings = pathname.startsWith('/listings')
  const isDashboard = pathname.startsWith('/dashboard')
  const isProfile = pathname.startsWith('/profile')
  const isMessages = pathname.startsWith('/dashboard/messages')
  const initial = (displayName ?? '?').charAt(0).toUpperCase()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    {
      href: '/directory',
      label: 'Directory',
      isActive: isDirectory,
    },
    {
      href: '/listings',
      label: 'Listings',
      isActive: isListings,
    },
    {
      href: '/dashboard',
      label: 'Dashboard',
      isActive: isDashboard && !isMessages,
    },
    {
      href: '/dashboard/messages',
      label: 'Messages',
      isActive: isMessages,
      badge: unseenMessageCount > 0 ? (unseenMessageCount > 9 ? '9+' : unseenMessageCount) : null,
    },
    {
      href: '/profile',
      label: 'Your profile',
      isActive: isProfile,
      avatar: true,
    },
  ]

  function handleMessagesClick() {
    if (unseenMessageCount > 0) {
      captureClientEvent('message_notification_badge_seen', {
        unseen_count: unseenMessageCount,
        source: 'nav_click',
      })
    }
  }

  return (
    <>
      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-6">
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
          href="/listings"
          className={cn(
            'text-sm',
            isListings
              ? 'text-forest-deep border-b-2 border-clay pb-1'
              : 'text-forest-mid hover:text-forest-deep',
          )}
        >
          Listings
        </Link>
        <Link
          href="/dashboard"
          className={cn(
            'text-sm',
            isDashboard && !isMessages
              ? 'text-forest-deep border-b-2 border-clay pb-1'
              : 'text-forest-mid hover:text-forest-deep',
          )}
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/messages"
          onClick={handleMessagesClick}
          className={cn(
            'relative text-sm',
            isMessages
              ? 'text-forest-deep border-b-2 border-clay pb-1'
              : 'text-forest-mid hover:text-forest-deep',
          )}
        >
          Messages
          {unseenMessageCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-2.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white ring-2 ring-sage-bg"
            >
              {unseenMessageCount > 9 ? '9+' : unseenMessageCount}
            </span>
          )}
          {unseenMessageCount > 0 && (
            <span className="sr-only">
              , {unseenMessageCount} unread message{unseenMessageCount === 1 ? '' : 's'}
            </span>
          )}
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
          </div>
          <span>Your profile</span>
        </Link>
        <SiteUpdateBell
          updates={siteUpdates ?? []}
          unreadCount={siteUpdateUnreadCount}
        />
        <NotificationBell
          notifications={notifications ?? []}
          unreadCount={notificationUnreadCount}
        />
        <FeatureRequestButton />
        <LogoutButton />
      </div>

      {/* Mobile hamburger */}
      <div className="flex md:hidden items-center gap-3">
        {unseenMessageCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
            {unseenMessageCount > 9 ? '9+' : unseenMessageCount}
          </span>
        )}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-md text-forest-deep hover:bg-sage-light"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile slide-out menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-[280px] bg-sage-pale shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-sage-light p-4">
              <span className="font-serif text-lg font-bold text-forest-deep">Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-forest-deep hover:bg-sage-light"
                aria-label="Close menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {showFinishSetup && (
                <Link
                  href="/onboarding"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg bg-clay/10 px-4 py-3 text-sm font-bold text-clay hover:bg-clay/20"
                >
                  Finish setup <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setMobileOpen(false)
                    if (item.href === '/dashboard/messages' && unseenMessageCount > 0) {
                      handleMessagesClick()
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    item.isActive
                      ? 'bg-sage-light text-forest-deep'
                      : 'text-forest-mid hover:bg-sage-light hover:text-forest-deep',
                  )}
                >
                  {item.avatar && (
                    <Avatar className="h-8 w-8 border border-sage-light">
                      <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? ''} />
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                  )}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-medium text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}

              <div className="pt-4 border-t border-sage-light mt-4">
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
