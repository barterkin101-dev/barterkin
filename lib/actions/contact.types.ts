import type { Database } from '@/lib/database.types'

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
