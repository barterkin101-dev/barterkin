'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { toggleSaveListing } from '@/lib/actions/saved-listings'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SaveListingButtonProps {
  listingId: string
  initialSaved?: boolean
  variant?: 'icon' | 'button'
  className?: string
}

export function SaveListingButton({
  listingId,
  initialSaved = false,
  variant = 'icon',
  className,
}: SaveListingButtonProps) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    startTransition(async () => {
      const formData = new FormData()
      formData.append('listingId', listingId)
      const result = await toggleSaveListing(null, formData)

      if (result.ok) {
        setSaved(result.saved ?? false)
        toast(result.saved ? 'Saved!' : 'Removed', {
          description: result.saved
            ? 'Listing added to your saved items.'
            : 'Listing removed from your saved items.',
        })
      } else {
        toast.error(result.error ?? 'Something went wrong.')
      }
    })
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          'inline-flex items-center justify-center rounded-full p-2 transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          saved ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground',
          className,
        )}
        aria-label={saved ? 'Unsave listing' : 'Save listing'}
        title={saved ? 'Unsave listing' : 'Save listing'}
      >
        <Heart
          className={cn('h-5 w-5 transition-all', saved && 'fill-current')}
        />
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors',
        saved
          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4', saved && 'fill-current')} />
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
