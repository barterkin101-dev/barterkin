import type { Database } from '@/lib/database.types'

/**
 * SendContactResult — return envelope for sendContactRequest server action.
 * `code` field maps 1:1 to inline error copy in the Contact Sheet (D-03).
 * Codes mirror the Edge Function's rejection codes in supabase/functions/send-contact/index.ts.
 */
export interface SendContactResult {
  ok: boolean
  error?: string
  code?:
    | 'unauthorized'
    | 'bad_message'
    | 'daily_cap'
    | 'weekly_cap'
    | 'pair_cap'
    | 'pair_dup'
    | 'sender_banned'
    | 'recipient_unreachable'
    | 'not_accepting'
    | 'sender_blocked'
    | 'send_failed'
    | 'unknown'
  contactId?: string
}

export interface BlockMemberResult {
  ok: boolean
  error?: string
  code?: 'unauthorized' | 'self_block' | 'bad_input' | 'unknown'
}

export interface ReportMemberResult {
  ok: boolean
  error?: string
  code?: 'unauthorized' | 'self_report' | 'bad_input' | 'unknown'
  fieldErrors?: Record<string, string[]>
}

export interface MarkContactsSeenResult {
  ok: boolean
  error?: string
  count?: number
}

// Database row aliases — types are regenerated post-migration in Wave 1.
// Until migration 005 lands, these refer to tables that don't yet exist; typecheck
// tolerates this because Database['public']['Tables'] is regenerated after `supabase db push`.
// @ts-expect-error — contact_requests table added in Wave 1 migration (Plan 05-02). Remove after type regen.
export type ContactRequestRow = Database['public']['Tables']['contact_requests']['Row']
// @ts-expect-error — blocks table added in Wave 1 migration (Plan 05-02). Remove after type regen.
export type BlockRow = Database['public']['Tables']['blocks']['Row']
// @ts-expect-error — reports table added in Wave 1 migration (Plan 05-02). Remove after type regen.
export type ReportRow = Database['public']['Tables']['reports']['Row']
