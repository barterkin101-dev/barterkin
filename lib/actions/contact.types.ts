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

export type BlockRow = {
  blocker_id: string
  blocked_id: string
  created_at: string
}

export type ReportRow = {
  id: string
  reporter_id: string
  target_profile_id: string
  reason: string
  note: string | null
  status: string
  created_at: string
}
