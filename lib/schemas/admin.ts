import { z } from 'zod'

/**
 * Admin action input schemas — shared validation for admin server actions.
 * These are lightweight schemas for direct FormData / RPC parameter validation.
 */

export const AdminBanSchema = z.object({
  profileId: z.string().uuid({ message: 'Invalid profile ID.' }),
})

export const AdminTicketStatusSchema = z.object({
  ticketId: z.string().uuid({ message: 'Invalid ticket ID.' }),
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']),
})

export const AdminTicketReplySchema = z.object({
  ticketId: z.string().uuid({ message: 'Invalid ticket ID.' }),
  content: z
    .string()
    .trim()
    .min(1, 'Reply cannot be empty.')
    .max(2000, 'Reply must be 2000 characters or fewer.'),
})

export const AdminListingModerationSchema = z.object({
  listingId: z.string().uuid({ message: 'Invalid listing ID.' }),
  action: z.enum(['active', 'paused', 'cancelled']),
})

export const AdminDisputeMediationSchema = z.object({
  disputeId: z.string().uuid({ message: 'Invalid dispute ID.' }),
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message must be 2000 characters or fewer.'),
  mediatorProfileId: z.string().uuid({ message: 'Invalid mediator profile.' }),
})

export const AdminDisputeResolutionSchema = z.object({
  disputeId: z.string().uuid({ message: 'Invalid dispute ID.' }),
  resolution: z
    .string()
    .trim()
    .min(10, 'Please describe the resolution.')
    .max(1000, 'Resolution must be 1000 characters or fewer.'),
  outcome: z.enum(['refund_agreed', 'no_action', 'warning_issued', 'ban_recommended']),
  mediatorProfileId: z.string().uuid({ message: 'Invalid mediator profile.' }),
})
