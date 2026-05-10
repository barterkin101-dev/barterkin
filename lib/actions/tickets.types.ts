export interface CreateTicketResult {
  ok: boolean
  ticketId?: string
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface AddTicketMessageResult {
  ok: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}
