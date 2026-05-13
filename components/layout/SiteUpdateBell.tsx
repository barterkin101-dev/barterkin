'use client'

import { useState, useRef, useEffect } from 'react'
import { Megaphone, Wrench, Sparkles, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SiteUpdateRow } from '@/lib/data/site-updates'
import { markSiteUpdatesReadAction } from '@/lib/actions/site-updates'

export function SiteUpdateBell({
  updates,
  unreadCount,
}: {
  updates: SiteUpdateRow[]
  unreadCount: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    if (!open && updates.length > 0) {
      markSiteUpdatesReadAction(updates.map((u) => u.id))
    }
    setOpen(!open)
  }

  const categoryIcon = (category: SiteUpdateRow['category']) => {
    switch (category) {
      case 'feature':
        return <Sparkles className="h-4 w-4 text-amber-500" />
      case 'fix':
        return <Wrench className="h-4 w-4 text-blue-500" />
      case 'announcement':
        return <Megaphone className="h-4 w-4 text-clay" />
      default:
        return <Sparkles className="h-4 w-4 text-amber-500" />
    }
  }

  const categoryLabel = (category: SiteUpdateRow['category']) => {
    switch (category) {
      case 'feature':
        return 'New feature'
      case 'fix':
        return 'Bug fix'
      case 'announcement':
        return 'Announcement'
      default:
        return 'Update'
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-forest-mid hover:bg-sage-light hover:text-forest-deep transition-colors"
        aria-label={`Site updates${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Megaphone className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-medium text-white ring-2 ring-sage-bg"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-sage-light bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-sage-light px-4 py-3">
            <span className="text-sm font-semibold text-forest-deep">What&apos;s new</span>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} new</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {updates.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No updates yet
              </div>
            ) : (
              updates.map((u) => (
                <div
                  key={u.id}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 border-b border-sage-light/50 last:border-b-0"
                >
                  <span className="mt-0.5 shrink-0" aria-hidden="true">
                    {categoryIcon(u.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-forest-mid/70 uppercase tracking-wide">
                      {categoryLabel(u.category)}
                    </p>
                    <p className="text-sm font-medium text-forest-deep mt-0.5">{u.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{u.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(u.published_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {updates.length > 0 && (
            <div className="border-t border-sage-light px-4 py-2">
              <button
                onClick={() => {
                  markSiteUpdatesReadAction(updates.map((u) => u.id))
                  setOpen(false)
                }}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-forest-mid hover:text-forest-deep transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as seen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
