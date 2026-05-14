import type { PostContactUpgradeNudgeProps } from '@/lib/post-contact-upgrade-nudge'

export interface SendMessageResult {
  ok: boolean
  messageId?: string
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface CreateConversationResult {
  ok: boolean
  conversationId?: string
  postContactUpgradeNudge?: PostContactUpgradeNudgeProps
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface MarkReadResult {
  ok: boolean
  error?: string
}
