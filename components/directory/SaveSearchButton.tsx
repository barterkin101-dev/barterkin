'use client'

import { useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureClientEvent } from '@/lib/analytics-client'

interface SaveSearchButtonProps {
  profileId: string
  query: string | null
  categoryId: number | null
  countyId: number | null
}

export function SaveSearchButton({
  profileId,
  query,
  categoryId,
  countyId,
}: SaveSearchButtonProps) {
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  const handleSave = async () => {
    if (saved || pending) return
    setPending(true)

    const fd = new FormData()
    fd.set('profileId', profileId)
    if (query) fd.set('query', query)
    if (categoryId) fd.set('categoryId', String(categoryId))
    if (countyId) fd.set('countyId', String(countyId))

    try {
      const res = await fetch('/api/saved-searches/save', {
        method: 'POST',
        body: fd,
      })
      if (res.ok) {
        setSaved(true)
        captureClientEvent('saved_search_created', {
          query: query ?? undefined,
          category_id: categoryId ?? undefined,
          county_id: countyId ?? undefined,
        })
      }
    } catch {
      // silent fail — toast would be nice but keeping it lightweight
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={pending || saved}
      aria-label="Save this search"
    >
      {saved ? (
        <>
          <BookmarkCheck className="mr-2 h-4 w-4" />
          Saved
        </>
      ) : (
        <>
          <Bookmark className="mr-2 h-4 w-4" />
          Save search
        </>
      )}
    </Button>
  )
}
