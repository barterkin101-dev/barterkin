'use client'

import { useState, useRef, useEffect, startTransition, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { ChatMessage } from './ChatMessage'
import { sendChatMessage, createTicketFromChat } from '@/lib/actions/chatbot'
import type { SendMessageResult, CreateTicketFromChatResult } from '@/lib/actions/chatbot'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Message {
  role: 'user' | 'bot'
  content: string
  actions?: { type: 'link' | 'button'; label: string; href?: string; action?: string }[]
}

function SendButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending} className="h-9 w-9 rounded-full p-0">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
    </Button>
  )
}

export function ChatWindow({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      content:
        "Hey there! I'm the Barterkin assistant. I can help with:\n• How Barterkin works\n• Creating listings\n• Messaging members\n• Safety & trust\n• Checking your ticket status\n\nWhat can I help you with?",
    },
  ])
  const [sessionId, setSessionId] = useState('')
  const [input, setInput] = useState('')
  const [escalating, setEscalating] = useState(false)
  const [ticketSubject, setTicketSubject] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const [sendState, sendAction, sendPending] = useActionState<SendMessageResult | null, FormData>(
    sendChatMessage,
    null,
  )

  const [ticketState, ticketAction, ticketPending] = useActionState<CreateTicketFromChatResult | null, FormData>(
    createTicketFromChat,
    null,
  )

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Handle bot response
  useEffect(() => {
    if (sendState?.ok) {
      const { botResponse } = sendState
      startTransition(() => {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: botResponse.text, actions: botResponse.actions },
        ])
        setSessionId(sendState.sessionId)
        if (botResponse.intent === 'escalate') {
          setEscalating(true)
        }
      })
    }
  }, [sendState])

  // Handle ticket creation
  useEffect(() => {
    if (ticketState?.ok) {
      startTransition(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content: `✅ Support ticket created! Our team will respond within 24 hours. You can view it in your Dashboard → Tickets.`,
          },
        ])
        setEscalating(false)
        setTicketSubject('')
      })
    } else if (ticketState && !ticketState.ok) {
      startTransition(() => {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: `❌ ${ticketState.error}` },
        ])
      })
    }
  }, [ticketState])

  const handleSubmit = (formData: FormData) => {
    const text = String(formData.get('message') ?? '').trim()
    if (!text) return

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    sendAction(formData)
  }

  const handleAction = (action: string) => {
    if (action === 'escalate') {
      setEscalating(true)
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: "I'll create a support ticket for you. Please describe your issue in a few words for the subject line.",
        },
      ])
    }
  }

  return (
    <div className="flex h-[480px] w-[360px] flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-sage-light">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-forest-deep px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-white" />
          <span className="font-medium text-white">Barterkin Support</span>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            actions={msg.actions}
            onAction={handleAction}
          />
        ))}

        {/* Escalation form */}
        {escalating && (
          <form action={ticketAction} className="mt-3 space-y-2">
            <input type="hidden" name="sessionId" value={sessionId} />
            <input
              name="subject"
              placeholder="Subject (e.g. 'Cannot publish listing')"
              value={ticketSubject}
              onChange={(e) => setTicketSubject(e.target.value)}
              className="w-full rounded-lg border border-sage-light bg-sage-pale px-3 py-2 text-sm placeholder:text-forest-mid/50"
              required
            />
            <textarea
              name="body"
              placeholder="Describe your issue in detail..."
              rows={3}
              className="w-full rounded-lg border border-sage-light bg-sage-pale px-3 py-2 text-sm placeholder:text-forest-mid/50"
              required
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="text-xs">
                Create Ticket
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  setEscalating(false)
                  setTicketSubject('')
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Input */}
      {!escalating && (
        <form
          action={handleSubmit}
          className="flex items-center gap-2 border-t border-sage-light px-4 py-3"
        >
          <input type="hidden" name="sessionId" value={sessionId} />
          <input
            name="message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-sage-light bg-sage-pale px-4 py-2 text-sm placeholder:text-forest-mid/50 focus:outline-none focus:ring-2 focus:ring-forest-deep/20"
            autoComplete="off"
          />
          <SendButton />
        </form>
      )}
    </div>
  )
}
