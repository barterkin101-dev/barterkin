export interface MarkTradeCompleteResult {
  ok: boolean
  status?: string
  completedAt?: string | null
  error?: string
}

export interface SubmitTradeReviewResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}
