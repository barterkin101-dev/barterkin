import { z } from 'zod'

export const WaitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  countyId: z.preprocess(
    (value) => {
      if (value === '' || value == null) return null
      return value
    },
    z.coerce.number().int().positive().nullable(),
  ).optional(),
})

export interface JoinWaitlistResult {
  ok: boolean
  error?: string
  alreadyJoined?: boolean
}
