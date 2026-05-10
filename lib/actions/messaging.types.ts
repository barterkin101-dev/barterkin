export interface SendMessageResult {
  ok: boolean
  messageId?: string
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface CreateConversationResult {
  ok: boolean
  conversationId?: string
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface MarkReadResult {
  ok: boolean
  error?: string
}
