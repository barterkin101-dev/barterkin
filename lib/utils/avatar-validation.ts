/**
 * PROF-02 — client-side avatar validation gate.
 *
 * This is the UX-layer check; the authoritative enforcement is
 * Supabase Storage RLS + user-scoped path prefix (Plan 03-02). A
 * client with the dev-tools open can bypass this predicate, but
 * Storage will still reject the upload.
 *
 * Rules:
 *   - MIME must be JPG, PNG, or WEBP
 *   - Size must be <= 2 MB (2 * 1024 * 1024 bytes, boundary inclusive)
 *
 * Error copy is verbatim from UI-SPEC §Error states.
 */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2 MB
export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type AvatarErrorCode = 'TOO_LARGE' | 'WRONG_TYPE'

export interface AvatarValidationError {
  code: AvatarErrorCode
  message: string
}

export function isValidAvatarFile(
  file: File,
): { ok: true } | { ok: false; error: AvatarValidationError } {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    return {
      ok: false,
      error: {
        code: 'WRONG_TYPE',
        message: 'Only JPG, PNG, and WEBP images are supported.',
      },
    }
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return {
      ok: false,
      error: {
        code: 'TOO_LARGE',
        message:
          'That file is larger than 2 MB. Please pick a smaller image — we\u2019ll resize it for you before upload.',
      },
    }
  }
  return { ok: true }
}
