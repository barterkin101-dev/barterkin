'use client'

import type { BotResponse } from '@/lib/chatbot/engine'
import Link from 'next/link'

interface ChatMessageProps {
  role: 'user' | 'bot'
  content: string
  actions?: BotResponse['actions']
  onAction?: (action: string) => void
}

export function ChatMessage({ role, content, actions, onAction }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-forest-deep text-white rounded-br-md'
            : 'bg-sage-pale text-forest-deep rounded-bl-md'
        }`}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        {actions && actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {actions.map((action, i) =>
              action.type === 'link' && action.href ? (
                <Link
                  key={i}
                  href={action.href}
                  className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-forest-deep hover:bg-white"
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  key={i}
                  onClick={() => action.action && onAction?.(action.action)}
                  className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-forest-deep hover:bg-white"
                >
                  {action.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
