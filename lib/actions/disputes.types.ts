export interface CreateDisputeResult {
  ok: boolean
  disputeId?: string
  error?: string
}

export interface AddDisputeMessageResult {
  ok: boolean
  error?: string
}

export interface ResolveDisputeResult {
  ok: boolean
  error?: string
}
