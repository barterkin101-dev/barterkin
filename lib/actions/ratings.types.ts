export interface SubmitRatingResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}
