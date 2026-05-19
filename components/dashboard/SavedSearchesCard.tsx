'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, BellOff, Search, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'
import type { SavedSearchWithNames } from '@/lib/data/saved-searches'

interface SavedSearchesCardProps {
  searches: SavedSearchWithNames[]
}

function searchLabel(search: SavedSearchWithNames): string {
  const parts: string[] = []
  if (search.query) parts.push(`"${search.query}"`)
  if (search.category_name) parts.push(search.category_name)
  if (search.county_name) parts.push(search.county_name)
  if (parts.length === 0) return 'All listings'
  return parts.join(' · ')
}

function searchHref(search: SavedSearchWithNames): string {
  const params = new URLSearchParams()
  if (search.query) params.set('q', search.query)
  if (search.category_id) {
    const slug = search.category_name?.toLowerCase().replace(/\s+/g, '-') ?? String(search.category_id)
    params.set('category', slug)
  }
  if (search.county_id) params.set('county', String(search.county_id))
  return `/directory?${params.toString()}`
}

export function SavedSearchesCard({ searches }: SavedSearchesCardProps) {
  const [optimisticSearches, setOptimisticSearches] = useState(searches)

  const handleToggle = async (searchId: string, enabled: boolean) => {
    setOptimisticSearches((prev) =>
      prev.map((s) => (s.id === searchId ? { ...s, email_alert_enabled: enabled } : s)),
    )

    const fd = new FormData()
    fd.set('searchId', searchId)
    fd.set('enabled', String(enabled))

    try {
      const res = await fetch('/api/saved-searches/toggle', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error('Toggle failed')
      captureClientEvent('saved_search_alert_toggled', { search_id: searchId, enabled })
    } catch {
      // Revert on failure
      setOptimisticSearches((prev) =>
        prev.map((s) => (s.id === searchId ? { ...s, email_alert_enabled: !enabled } : s)),
      )
    }
  }

  const handleDelete = async (searchId: string) => {
    setOptimisticSearches((prev) => prev.filter((s) => s.id !== searchId))

    const fd = new FormData()
    fd.set('searchId', searchId)

    try {
      const res = await fetch('/api/saved-searches/delete', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error('Delete failed')
      captureClientEvent('saved_search_deleted', { search_id: searchId })
    } catch {
      // Revert on failure — refetch would be better but this is lightweight
      setOptimisticSearches(searches)
    }
  }

  if (optimisticSearches.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Search className="h-5 w-5 text-primary" />
            Saved Searches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm text-muted-foreground">
            Save directory searches to get alerts when new listings match.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/directory">Browse directory</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Search className="h-5 w-5 text-primary" />
          Saved Searches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {optimisticSearches.map((search) => (
          <div
            key={search.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={searchHref(search)}
                className="block truncate text-sm font-medium hover:underline"
              >
                {searchLabel(search)}
              </Link>
              <p className="text-xs text-muted-foreground">
                {search.email_alert_enabled ? 'Alerts on' : 'Alerts off'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={search.email_alert_enabled ? 'Turn off alerts' : 'Turn on alerts'}
                onClick={() => handleToggle(search.id, !search.email_alert_enabled)}
              >
                {search.email_alert_enabled ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Remove saved search"
                onClick={() => handleDelete(search.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
