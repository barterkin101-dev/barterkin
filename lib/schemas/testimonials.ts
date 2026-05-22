import { z } from 'zod'

export const TestimonialSchema = z.object({
  quote: z
    .string()
    .min(10, 'Testimonial must be at least 10 characters.')
    .max(500, 'Testimonial must be 500 characters or fewer.'),
  tradeContext: z
    .string()
    .max(200, 'Trade context must be 200 characters or fewer.')
    .optional()
    .or(z.literal('')),
})

export type TestimonialValues = z.infer<typeof TestimonialSchema>
