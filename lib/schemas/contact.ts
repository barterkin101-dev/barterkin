import { z } from 'zod'

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
