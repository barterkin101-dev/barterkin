'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import posthog from 'posthog-js'
import { cn } from '@/lib/utils'
import { markNotificationsReadAction } from '@/lib/actions/notifications'
import type { NotificationRow } from '@/lib/data/notifications'

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationRow[]
  unreadCount: number
}) {
  const [open, setOpen] = useState(false)
  const [localNotifications, setLocalNotifications] = useState(notifications)
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalNotifications(notifications)
    setLocalUnreadCount(unreadCount)
  }, [notifications, unreadCount])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (!open) {
      posthog.capture('notification_bell_clicked', {
        unread_count: localUnreadCount,
      })
    }
    setOpen(!open)
  }

  const handleMarkAllRead = async () => {
    const unreadIds = localNotifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return

    posthog.capture('notification_marked_read', {
      count: unreadIds.length,
      source: 'mark_all',
    })

    await markNotificationsReadAction(unreadIds)
    setLocalNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setLocalUnreadCount(0)
  }

  const handleMarkOneRead = async (id: string) => {
    const notification = localNotifications.find((n) => n.id === id)
    if (!notification || notification.is_read) return

    posthog.capture('notification_marked_read', {
      count: 1,
      source: 'individual_click',
      type: notification.type,
    })

    await markNotificationsReadAction([id])
    setLocalNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setLocalUnreadCount((prev) => Math.max(0, prev - 1))
  }

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
      case 'trade':
        return '🤝'
      case 'listing_save':
        return '🔖'
      case 'review':
        return '⭐'
      case 'referral':
        return '🎁'
      case 'system':
        return '🔔'
      default:
        return '🔔'
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-forest-mid hover:bg-sage-light hover:text-forest-deep transition-colors"
        aria-label={`Notifications${localUnreadCount > 0 ? `, ${localUnreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {localUnreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white ring-2 ring-sage-bg"
          >
            {localUnreadCount > 9 ? '9+' : localUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-sage-light bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b border-sage-light px-4 py-3">
            <span className="text-sm font-semibold text-forest-deep">Notifications</span>
            {localUnreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{localUnreadCount} unread</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {localNotifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              localNotifications.map((n) => (
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
                        onClick={() => {
                          handleMarkOneRead(n.id)
                          setOpen(false)
                        }}
                        className="block"
                      >
                        <p className="text-sm font-medium text-forest-deep">{n.title}</p>
                        <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTime(n.created_at)}
                        </p>
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleMarkOneRead(n.id)}
                        className="block w-full text-left"
                      >
                        <p className="text-sm font-medium text-forest-deep">{n.title}</p>
                        <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTime(n.created_at)}
                        </p>
                      </button>
                    )}
                  </div>
                  {!n.is_read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </div>
              ))
            )}
          </div>

          {localNotifications.length > 0 && localUnreadCount > 0 && (
            <div className="border-t border-sage-light px-4 py-2">
              <button
                onClick={handleMarkAllRead}
                className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-forest-mid hover:text-forest-deep transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all as read
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
