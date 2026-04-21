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

// Database row aliases — types resolve after migration 005 was applied and types regenerated (Plan 05-02).
export type ContactRequestRow = Database['public']['Tables']['contact_requests']['Row']
export type BlockRow = Database['public']['Tables']['blocks']['Row']
export type ReportRow = Database['public']['Tables']['reports']['Row']
