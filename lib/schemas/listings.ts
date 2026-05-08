import { z } from 'zod'

/**
 * ListingFormSchema — single source of truth for listing create/edit payloads.
 * Consumed by client (RHF + zodResolver) and server (safeParse in action).
 *
 * Requirement coverage:
 *   LIST-01 — title: 5..120 chars, trim whitespace
 *   LIST-02 — description: 20..2000 chars
 *   LIST-03 — category: optional FK into categories
 *   LIST-04 — county: optional FK into counties
 *   LIST-05 — condition: enum
 *   LIST-06 — trade_terms: optional, <=200 chars
 *   LIST-07 — price_estimate: optional free text
 *   LIST-08 — images: 1..5 URLs
 */
export const ListingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title is required (at least 5 characters).')
    .max(120, 'Title must be 120 characters or fewer.'),
  description: z
    .string()
    .trim()
    .min(20, 'Description is too short. Please write at least 20 characters.')
    .max(2000, 'Description must be 2000 characters or fewer.'),
  categoryId: z.number().int().positive().nullable(),
  countyId: z.number().int().positive().nullable(),
  condition: z
    .enum(['new', 'like-new', 'good', 'fair', 'for-parts'])
    .nullable(),
  tradeTerms: z
    .string()
    .max(200, 'Trade terms must be 200 characters or fewer.')
    .optional()
    .or(z.literal('')),
  priceEstimate: z
    .string()
    .max(100, 'Price estimate must be 100 characters or fewer.')
    .refine((val) => !val || !/^-\d/.test(val.trim()), {
      message: 'Price estimate cannot be a negative number.',
    })
    .optional()
    .or(z.literal('')),
  images: z
    .array(z.string().url())
    .min(1, 'At least one image is required.')
    .max(5, 'Maximum 5 images allowed.'),
})

export type ListingFormValues = z.infer<typeof ListingFormSchema>

export const ListingStatusEnum = z.enum([
  'active',
  'paused',
  'completed',
  'cancelled',
])
export type ListingStatus = z.infer<typeof ListingStatusEnum>
