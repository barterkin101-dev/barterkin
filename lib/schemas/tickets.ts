import { z } from 'zod'

export const TicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, 'Subject is required (at least 5 characters).')
    .max(120, 'Subject must be 120 characters or fewer.'),
  description: z
    .string()
    .trim()
    .min(20, 'Description is too short. Please write at least 20 characters.')
    .max(2000, 'Description must be 2000 characters or fewer.'),
  category: z.enum(['bug', 'feature', 'account', 'billing', 'other']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

export type TicketValues = z.infer<typeof TicketSchema>

export const TicketMessageSchema = z.object({
  ticketId: z.string().uuid({ message: 'Invalid ticket.' }),
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message must be 2000 characters or fewer.'),
})

export type TicketMessageValues = z.infer<typeof TicketMessageSchema>
