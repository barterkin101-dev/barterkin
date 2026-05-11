'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationRow } from '@/lib/data/notifications'

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationRow[]
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

  const typeIcon = (type: NotificationRow['type']) => {
    switch (type) {
      case 'message':
        return '💬'
      case 'ticket':
        return '🎫'
      case 'dispute':
        return '⚠️'
      case 'admin':
        return '📢'
      default:
        return '🔔'
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-forest-mid hover:bg-sage-light hover:text-forest-deep transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white ring-2 ring-sage-bg"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-sage-light bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-sage-light px-4 py-3">
            <span className="text-sm font-semibold text-forest-deep">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50',
                    !n.is_read && 'bg-muted/30'
                  )}
                >
                  <span className="mt-0.5 text-base" aria-hidden="true">
                    {typeIcon(n.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => setOpen(false)}
                        className="block"
                      >
                        <p className="text-sm font-medium text-forest-deep">{n.title}</p>
                        <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTime(n.created_at)}
                        </p>
                      </Link>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-forest-deep">{n.title}</p>
                        <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTime(n.created_at)}
                        </p>
                      </>
                    )}
                  </div>
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </div>
              ))
            )}
          </div>
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
