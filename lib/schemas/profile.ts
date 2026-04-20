import { z } from 'zod'

/**
 * ProfileFormSchema — single source of truth for profile edit payloads.
 * Consumed identically by the client (RHF + zodResolver) and the server
 * (safeParse inside the profile server action in Plan 03).
 *
 * Requirement coverage:
 *   PROF-01 — displayName + bio length bounds
 *   PROF-03 — skillsOffered: 0..5 entries, 1..60 chars each
 *   PROF-04 — skillsWanted: 0..5 entries, 1..60 chars each
 *   PROF-07 — availability free-text, <=200 chars
 *   PROF-09 — optional TikTok handle (@name with dots/underscores, <=25 chars)
 */
export const ProfileFormSchema = z.object({
  // PROF-01
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required.')
    .max(60, 'Display name must be 60 characters or fewer.'),
  // PROF-01
  bio: z
    .string()
    .max(500, 'Bio must be 500 characters or fewer.')
    .optional()
    .or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  // PROF-03
  skillsOffered: z
    .array(z.string().trim().min(1).max(60, 'Skills are up to 60 characters each.'))
    .min(0)
    .max(5),
  // PROF-04
  skillsWanted: z
    .array(z.string().trim().min(1).max(60, 'Skills are up to 60 characters each.'))
    .min(0)
    .max(5),
  // GEO-02 — selected county (FK into counties table)
  countyId: z.number().int().positive().nullable(),
  // PROF-06 — selected category (FK into categories table)
  categoryId: z.number().int().positive().nullable(),
  // PROF-07
  availability: z
    .string()
    .max(200, 'Availability must be 200 characters or fewer.')
    .optional()
    .or(z.literal('')),
  acceptingContact: z.boolean().default(true),
  // PROF-09 — optional TikTok handle; regex mirrors UI-SPEC validation copy
  tiktokHandle: z
    .string()
    .regex(
      /^@[a-zA-Z0-9_.]{1,24}$/,
      'TikTok handles start with @ and can have letters, numbers, periods, and underscores.',
    )
    .optional()
    .or(z.literal('')),
})

export type ProfileFormValues = z.infer<typeof ProfileFormSchema>

/**
 * Input shape for the completeness gate (PROF-12, GEO-01).
 * Skill count is passed in so the caller can decide whether to count
 * `skills_offered` rows or `ProfileFormValues.skillsOffered.length`.
 */
export interface ProfileCompletenessInput {
  displayName: string | null | undefined
  avatarUrl: string | null | undefined
  countyId: number | null | undefined
  categoryId: number | null | undefined
  skillsOfferedCount: number
}

/**
 * PROF-12, GEO-01 — a profile is "complete" (appears in the directory) when:
 *   - displayName is set
 *   - avatarUrl is set
 *   - countyId is set (county selected)
 *   - categoryId is set (primary category selected)
 *   - at least 1 skill offered
 *
 * Any single missing field hides the profile from the directory.
 */
export function isProfileComplete(input: ProfileCompletenessInput): boolean {
  return (
    Boolean(input.displayName) &&
    Boolean(input.avatarUrl) &&
    typeof input.countyId === 'number' &&
    input.countyId > 0 &&
    typeof input.categoryId === 'number' &&
    input.categoryId > 0 &&
    input.skillsOfferedCount >= 1
  )
}
