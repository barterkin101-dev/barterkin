import { z } from 'zod'

export const RatingSchema = z.object({
  rateeProfileId: z.string().uuid({ message: 'Invalid member.' }),
  listingId: z.string().uuid({ message: 'Invalid listing.' }).optional(),
  score: z
    .number()
    .int()
    .min(1, 'Minimum rating is 1 star.')
    .max(5, 'Maximum rating is 5 stars.'),
  reviewText: z
    .string()
    .max(500, 'Review must be 500 characters or fewer.')
    .optional()
    .or(z.literal('')),
})

export type RatingValues = z.infer<typeof RatingSchema>
