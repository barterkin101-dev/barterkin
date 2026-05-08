import { z } from 'zod'

export const DisputeSchema = z.object({
  responderProfileId: z.string().uuid({ message: 'Invalid member.' }),
  listingId: z.string().uuid({ message: 'Invalid listing.' }).optional().or(z.literal('')),
  conversationId: z.string().uuid({ message: 'Invalid conversation.' }).optional().or(z.literal('')),
  reason: z
    .string()
    .trim()
    .min(10, 'Please describe the issue in at least 10 characters.')
    .max(500, 'Reason must be 500 characters or fewer.'),
})

export type DisputeValues = z.infer<typeof DisputeSchema>

export const DisputeMessageSchema = z.object({
  disputeId: z.string().uuid({ message: 'Invalid dispute.' }),
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message must be 2000 characters or fewer.'),
})

export type DisputeMessageValues = z.infer<typeof DisputeMessageSchema>

export const ResolveDisputeSchema = z.object({
  disputeId: z.string().uuid({ message: 'Invalid dispute.' }),
  resolution: z
    .string()
    .trim()
    .min(10, 'Please describe the resolution.')
    .max(1000, 'Resolution must be 1000 characters or fewer.'),
  outcome: z.enum(['refund_agreed', 'no_action', 'warning_issued', 'ban_recommended']),
})

export type ResolveDisputeValues = z.infer<typeof ResolveDisputeSchema>
