/**
 * LIST-08 — client-side listing image validation gate.
 *
 * Rules:
 *   - MIME must be JPG, PNG, or WEBP
 *   - Size must be <= 5 MB (5 * 1024 * 1024 bytes, boundary inclusive)
 *   - Max 5 images per listing
 */
export const LISTING_IMAGE_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const LISTING_IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const LISTING_IMAGE_MAX_COUNT = 5

export type ListingImageErrorCode = 'TOO_LARGE' | 'WRONG_TYPE' | 'TOO_MANY'

export interface ListingImageValidationError {
  code: ListingImageErrorCode
  message: string
}

export function isValidListingImageFile(
  file: File,
): { ok: true } | { ok: false; error: ListingImageValidationError } {
  if (!LISTING_IMAGE_ALLOWED_TYPES.includes(file.type as (typeof LISTING_IMAGE_ALLOWED_TYPES)[number])) {
    return {
      ok: false,
      error: {
        code: 'WRONG_TYPE',
        message: 'Only JPG, PNG, and WEBP images are supported.',
      },
    }
  }
  if (file.size > LISTING_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: {
        code: 'TOO_LARGE',
        message: 'That file is larger than 5 MB. Please pick a smaller image.',
      },
    }
  }
  return { ok: true }
}
