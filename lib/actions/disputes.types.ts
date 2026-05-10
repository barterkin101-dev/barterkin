export interface CreateDisputeResult {
  ok: boolean
  disputeId?: string
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface AddDisputeMessageResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface ResolveDisputeResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}
