export interface SubmitTestimonialResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}
