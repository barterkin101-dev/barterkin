'use client'
import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { Camera, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { isValidAvatarFile } from '@/lib/utils/avatar-validation'
import { cn } from '@/lib/utils'

export function AvatarUploader({
  userId,
  value,
  onChange,
}: { userId: string; value: string | null; onChange: (url: string | null) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File) {
    setError(null)
    const check = isValidAvatarFile(file)
    if (!check.ok) { setError(check.error.message); return }
    setUploading(true)
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        fileType: 'image/jpeg',
      })
      const supabase = createClient()
      const path = `${userId}/avatar.jpg`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      onChange(`${data.publicUrl}?t=${Date.now()}`)   // Pitfall 7 cache bust
    } catch (e) {
      console.error('[AvatarUploader] upload failed', { name: (e as Error).name })
      setError("Couldn't upload that photo. Please check your connection and try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="relative block h-32 w-32 cursor-pointer">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={value ? 'Change profile photo' : 'Upload profile photo'}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          disabled={uploading}
        />
        <div className={cn(
          'flex h-32 w-32 items-center justify-center rounded-full',
          value ? 'bg-sage-pale' : 'border-2 border-dashed border-sage-light hover:border-solid hover:bg-clay/5',
        )}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-32 w-32 rounded-full object-cover" />
          ) : (
            <Camera className="h-8 w-8 text-forest-mid" />
          )}
        </div>
        {value && (
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-sage-pale">
            <Pencil className="h-4 w-4 text-forest-deep" />
          </span>
        )}
      </label>
      {uploading && <p className="text-sm text-forest-mid">Uploading...</p>}
      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}
      {value && !uploading && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="text-forest-mid">Remove</Button>
      )}
      <p className="text-sm text-muted-foreground">JPG, PNG, or WEBP. Up to 2 MB. We&rsquo;ll resize it for you.</p>
    </div>
  )
}
