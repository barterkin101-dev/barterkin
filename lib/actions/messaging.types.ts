export interface SendMessageResult {
  ok: boolean
  messageId?: string
  error?: string
}

export interface CreateConversationResult {
  ok: boolean
  conversationId?: string
  error?: string
}

export interface MarkReadResult {
  ok: boolean
  error?: string
}
