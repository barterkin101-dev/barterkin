/**
 * Barterkin Chatbot Engine
 *
 * Rule-based bot with FAQ matching, ticket integration, and escalation.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createLogger } from '@/lib/utils/logger'
import { generateChatResponse } from '@/lib/chatbot/openai'

export type ChatIntent =
  | 'greeting'
  | 'faq'
  | 'ticket_status'
  | 'escalate'
  | 'goodbye'
  | 'unknown'

export interface BotResponse {
  text: string
  intent: ChatIntent
  actions?: ChatAction[]
}

export interface ChatAction {
  type: 'link' | 'button'
  label: string
  href?: string
  action?: string
}

interface FAQEntry {
  keywords: string[]
  response: string
  actions?: ChatAction[]
}

const FAQS: FAQEntry[] = [
  {
    keywords: ['how', 'work', 'barter', 'trade', 'exchange'],
    response:
      "Barterkin is a Georgia-only community skills exchange. You list what you offer, browse what others have, and message them to arrange a trade. No cash needed — just skills, goods, and trust.",
    actions: [
      { type: 'link', label: 'Browse listings', href: '/listings' },
      { type: 'link', label: 'Join the directory', href: '/signup' },
    ],
  },
  {
    keywords: ['sign', 'up', 'register', 'join', 'account', 'create'],
    response:
      "Sign up with your email, verify it, fill in your profile (name, photo, skills), and you're in the directory. Takes about two minutes.",
    actions: [{ type: 'link', label: 'Sign up', href: '/signup' }],
  },
  {
    keywords: ['verify', 'email', 'confirmation', 'pending'],
    response:
      "Check your inbox (and spam folder) for a verification link from Barterkin. Click it and you'll be redirected back to complete your profile.",
  },
  {
    keywords: ['listing', 'post', 'create', 'sell', 'offer'],
    response:
      "Go to your Dashboard → Listings → New Listing. Add a title, description, photos, and what you'd like in return. Then publish it!",
    actions: [{ type: 'link', label: 'My Dashboard', href: '/dashboard' }],
  },
  {
    keywords: ['message', 'contact', 'dm', 'reach', 'talk'],
    response:
      'Click "Contact Seller" on any listing to start a conversation. You can message back and forth, then arrange the trade details.',
  },
  {
    keywords: ['safe', 'scam', 'trust', 'report', 'block'],
    response:
      'Every member is email-verified and Georgia-based. You can block users, report suspicious behavior, and our team reviews every report. Meet in public places for in-person trades.',
    actions: [{ type: 'link', label: 'Community Guidelines', href: '/legal/guidelines' }],
  },
  {
    keywords: ['county', 'location', 'where', 'georgia', 'area'],
    response:
      'Barterkin covers all 159 Georgia counties. When you set up your profile, pick your county so nearby members can find you.',
  },
  {
    keywords: ['password', 'reset', 'forgot', 'login', 'signin'],
    response:
      'Go to the login page and click "Forgot password?" We\'ll send you a magic link to reset it.',
    actions: [{ type: 'link', label: 'Login', href: '/login' }],
  },
  {
    keywords: ['delete', 'remove', 'account', 'close'],
    response:
      "To delete your account, contact our support team. We'll remove your data within 48 hours.",
    actions: [{ type: 'button', label: 'Contact support', action: 'escalate' }],
  },
  {
    keywords: ['fee', 'cost', 'price', 'money', 'free', 'pay'],
    response:
      'Barterkin is completely free to use. No listing fees, no membership fees, no commissions. We believe in community over commerce.',
  },
]

export function detectIntent(message: string): ChatIntent {
  const lower = message.toLowerCase().trim()

  if (/^(hi|hello|hey|howdy|greetings|yo)\b/.test(lower)) return 'greeting'
  if (/^(bye|goodbye|see ya|later|peace|thanks|thank you)\b/.test(lower)) return 'goodbye'

  const escalatePhrases = [
    'talk to human', 'talk to a human', 'talk to a person', 'real person', 'human agent',
    'create ticket', 'file ticket', 'support ticket', 'open ticket',
    'complaint', 'dispute', 'not working', 'broken', 'bug',
    'refund', 'chargeback', 'lawyer', 'legal',
  ]
  if (escalatePhrases.some((p) => lower.includes(p))) return 'escalate'

  const ticketPhrases = [
    'ticket status', 'my ticket', 'check ticket', 'where is my ticket',
    'support request', 'help request', 'case status',
  ]
  if (ticketPhrases.some((p) => lower.includes(p))) return 'ticket_status'

  return 'unknown'
}

function matchFAQ(message: string): FAQEntry | null {
  const words = message.toLowerCase().split(/\s+/)
  let best: FAQEntry | null = null
  let bestScore = 0

  for (const faq of FAQS) {
    const score = faq.keywords.filter((k) => words.some((w) => w.includes(k) || k.includes(w))).length
    if (score > bestScore) {
      bestScore = score
      best = faq
    }
  }

  return bestScore >= 1 ? best : null
}

async function getTicketStatus(email: string): Promise<string> {
  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('id, subject, status, created_at')
    .eq('user_email', email)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!tickets || tickets.length === 0) {
    return "I don't see any support tickets from your email address. Would you like to create one?"
  }

  const lines = tickets.map(
    (t) => `• "${t.subject}" — ${t.status.replace('_', ' ')} (opened ${new Date(t.created_at).toLocaleDateString()})`
  )
  return `Here are your recent tickets:\n${lines.join('\n')}`
}

export async function generateBotResponse(
  userMessage: string,
  context: { email?: string; profileId?: string; ticketId?: string },
): Promise<BotResponse> {
  const intent = detectIntent(userMessage)

  if (intent === 'greeting') {
    return {
      text: "Hey there! I'm the Barterkin assistant. I can help with:\n• How Barterkin works\n• Creating listings\n• Messaging members\n• Safety & trust\n• Checking your ticket status\n\nWhat can I help you with?",
      intent: 'greeting',
    }
  }

  if (intent === 'goodbye') {
    return {
      text: "You're welcome! Happy trading. If you need anything else, just open this chat again.",
      intent: 'goodbye',
    }
  }

  if (intent === 'escalate') {
    return {
      text: "I understand you'd like to speak with our support team. I can create a ticket for you right now. What's the issue about?",
      intent: 'escalate',
      actions: [{ type: 'button', label: 'Create support ticket', action: 'escalate' }],
    }
  }

  if (intent === 'ticket_status') {
    if (!context.email) {
      return {
        text: "I can check your ticket status if you're logged in, or you can tell me the email address you used when submitting the ticket.",
        intent: 'ticket_status',
      }
    }
    const status = await getTicketStatus(context.email)
    return { text: status, intent: 'ticket_status' }
  }

  const faq = matchFAQ(userMessage)
  if (faq) {
    return { text: faq.response, intent: 'faq', actions: faq.actions }
  }

  return {
    text: "I'm not sure I understand. I can help with how Barterkin works, creating listings, messaging, safety, or checking your tickets. If you need more help, I can connect you with our support team.",
    intent: 'unknown',
    actions: [
      { type: 'button', label: 'Browse FAQ topics', action: 'faq_menu' },
      { type: 'button', label: 'Contact support', action: 'escalate' },
    ],
  }
}

export async function escalateToTicket(
  sessionId: string,
  subject: string,
  body: string,
  userEmail?: string,
  profileId?: string,
): Promise<{ ok: true; ticketId: string } | { ok: false; error: string }> {
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .insert({
      profile_id: profileId ?? null,
      user_email: userEmail ?? null,
      subject: subject.slice(0, 200),
      description: body.slice(0, 4000),
      category: 'other',
      priority: 'normal',
      status: 'open',
      source: 'chatbot',
    })
    .select('id')
    .single()

  if (error || !ticket) {
    const log = createLogger('chatbot')
    log.error('escalateToTicket failed', { context: { code: error?.code } })
    return { ok: false, error: 'Failed to create ticket. Please try again.' }
  }

  await supabaseAdmin
    .from('chat_sessions')
    .update({ status: 'escalated', ticket_id: ticket.id })
    .eq('id', sessionId)

  await supabaseAdmin.from('chat_messages').insert({
    session_id: sessionId,
    role: 'bot',
    content: `I've created a support ticket for you. Our team will respond within 24 hours.`,
    intent: 'escalate',
    metadata: { ticket_id: ticket.id },
  })

  return { ok: true, ticketId: ticket.id }
}
