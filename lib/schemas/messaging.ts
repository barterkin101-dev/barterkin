import { z } from 'zod'

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid({ message: 'Invalid conversation.' }),
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message must be 2000 characters or fewer.'),
})

export type SendMessageValues = z.infer<typeof SendMessageSchema>

export const CreateConversationSchema = z.object({
  recipientProfileId: z.string().uuid({ message: 'Invalid recipient.' }),
  listingId: z.string().uuid({ message: 'Invalid listing.' }).optional(),
  initialMessage: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message must be 2000 characters or fewer.'),
})

export type CreateConversationValues = z.infer<typeof CreateConversationSchema>
