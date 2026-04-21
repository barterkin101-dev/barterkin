import { z } from 'zod'

/**
 * MessageSchema — single source of truth for contact-relay message payloads.
 * Consumed identically by the client Contact form (RHF + zodResolver) and the
 * server action that proxies to the send-contact Edge Function, AND by the
 * Edge Function itself (re-validated Deno-side as defense-in-depth).
 *
 * Requirement coverage:
 *   CONT-02 — message length 20..500 characters, trim whitespace
 *   CONT-03 — recipient identified by recipientProfileId (UUID), NOT email
 *
 * Source: 05-CONTEXT.md D-01/D-02; 05-UI-SPEC.md Copywriting Contract.
 */
export const MessageSchema = z.object({
  recipientProfileId: z.string().uuid({ message: 'Invalid recipient.' }),
  message: z
    .string()
    .trim()
    .min(20, 'Your message is too short. Please write at least 20 characters so they have enough context to reply.')
    .max(500, 'Your message is too long. Keep it under 500 characters — the goal is a quick hello, not a proposal.'),
})
export type MessageValues = z.infer<typeof MessageSchema>

/**
 * ReportReasonEnum — TRUST-01 canonical enum.
 * Matches the CHECK constraint in supabase/migrations/005_contact_relay_trust.sql.
 */
export const ReportReasonEnum = z.enum(['harassment', 'spam', 'off-topic', 'impersonation', 'other'] as const)
export type ReportReason = z.infer<typeof ReportReasonEnum>

/**
 * ReportSchema — payload for the reportMember server action.
 *
 * Requirement coverage:
 *   TRUST-01 — reason enum + optional note
 *   TRUST-05 — client never sees other reporters' rows (RLS); note is bounded to prevent abuse
 */
export const ReportSchema = z.object({
  targetProfileId: z.string().uuid({ message: 'Invalid target profile.' }),
  reason: ReportReasonEnum,
  note: z.string().max(500, 'Note must be 500 characters or fewer.').optional().or(z.literal('')),
})
export type ReportValues = z.infer<typeof ReportSchema>

/**
 * BlockSchema — payload for the blockMember server action.
 *
 * Requirement coverage:
 *   TRUST-02 — block is directional (blocker, blocked) with RLS enforcing blocker_id = auth.uid()
 */
export const BlockSchema = z.object({
  blockedOwnerId: z.string().uuid({ message: 'Invalid member.' }),
  blockedDisplayName: z.string().trim().min(1).max(60),
  blockedUsername: z.string().trim().min(1).max(60),
})
export type BlockValues = z.infer<typeof BlockSchema>
