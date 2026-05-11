'use client'

import { useState, useCallback } from 'react'
import imageCompression from 'browser-image-compression'
import { X, Upload, ImagePlus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { isValidListingImageFile, LISTING_IMAGE_MAX_COUNT } from '@/lib/utils/listing-image-validation'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  userId: string
  values: string[]
  onChange: (urls: string[]) => void
}

export function ImageUploader({ userId, values, onChange }: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      setError(null)
      if (!files || files.length === 0) return

      const remaining = LISTING_IMAGE_MAX_COUNT - values.length
      const toUpload = Math.min(files.length, remaining)
      if (toUpload === 0) {
        setError(`Maximum ${LISTING_IMAGE_MAX_COUNT} images allowed.`)
        return
      }

      setUploading(true)
      const uploadedUrls: string[] = []

      try {
        for (let i = 0; i < toUpload; i++) {
          const file = files[i]
          const check = isValidListingImageFile(file)
          if (!check.ok) {
            setError(check.error.message)
            continue
          }

          const compressed = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/jpeg',
          })

          const supabase = createClient()
          const path = `${userId}/${Date.now()}_${i}.jpg`
          const { error: upErr } = await supabase.storage
            .from('listing-images')
            .upload(path, compressed, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/jpeg',
            })

          if (upErr) {
            import('@/lib/utils/client-logger').then(({ clientLogger }) =>
              clientLogger.error('ImageUploader', 'upload failed', { context: { message: upErr.message } })
            )
            setError('One or more uploads failed. Please try again.')
            continue
          }

          const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
          uploadedUrls.push(data.publicUrl)
        }

        if (uploadedUrls.length > 0) {
          onChange([...values, ...uploadedUrls])
        }
      } catch (e) {
        import('@/lib/utils/client-logger').then(({ clientLogger }) =>
          clientLogger.error('ImageUploader', 'unexpected error', { error: e })
        )
        setError('Something went wrong uploading images. Please try again.')
      } finally {
        setUploading(false)
      }
    },
    [userId, values, onChange],
  )

  function removeImage(index: number) {
    const next = [...values]
    next.splice(index, 1)
    onChange(next)
  }

  const canAddMore = values.length < LISTING_IMAGE_MAX_COUNT

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {values.map((url, i) => (
          <div key={`${url}-${i}`} className="relative h-24 w-24 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Listing image ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background"
              aria-label={`Remove image ${i + 1}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <label
            className={cn(
              'flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
              uploading
                ? 'border-muted bg-muted cursor-not-allowed'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50',
            )}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploading}
            />
            {uploading ? (
              <Upload className="h-6 w-6 animate-bounce text-muted-foreground" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
            <span className="mt-1 text-xs text-muted-foreground">
              {uploading ? 'Uploading...' : 'Add'}
            </span>
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {values.length} / {LISTING_IMAGE_MAX_COUNT} images. JPG, PNG, or WEBP up to 5 MB each.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
