import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Inbox, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getSupportTicket, replyToTicket, updateTicketStatus } from '@/lib/actions/admin-support'

interface PageProps {
  params: Promise<{ id: string }>
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  open: { label: 'Open', variant: 'default', icon: <Inbox className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  waiting: { label: 'Waiting', variant: 'outline', icon: <AlertCircle className="h-3 w-3" /> },
  resolved: { label: 'Resolved', variant: 'secondary', icon: <CheckCircle className="h-3 w-3" /> },
  closed: { label: 'Closed', variant: 'outline', icon: <CheckCircle className="h-3 w-3" /> },
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-sage-pale text-forest-mid border-sage-light' },
  normal: { label: 'Normal', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  high: { label: 'High', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  urgent: { label: 'Urgent', className: 'bg-red-50 text-red-700 border-red-200' },
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const result = await getSupportTicket(id)
  if (!result.ok || !result.ticket) {
    return { title: 'Ticket Not Found' }
  }
  return { title: result.ticket.subject }
}

export default async function SupportTicketDetailPage({ params }: PageProps) {
  const { id } = await params
  const result = await getSupportTicket(id)

  if (!result.ok || !result.ticket) {
    notFound()
  }

  const { ticket, replies } = result
  const sConfig = statusConfig[ticket.status] || statusConfig.open
  const pConfig = priorityConfig[ticket.priority] || priorityConfig.normal

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/support">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Inbox
          </Button>
        </Link>
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={sConfig.variant} className="flex items-center gap-1">
            {sConfig.icon}
            {sConfig.label}
          </Badge>
          <Badge variant="outline" className={pConfig.className}>
            {pConfig.label}
          </Badge>
          <span className="text-sm text-forest-mid/60">
            #{ticket.id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleString('en-US')}
          </span>
        </div>
        <h1 className="font-serif text-[28px] font-bold text-forest-deep leading-[1.2]">
          {ticket.subject}
        </h1>
        <p className="text-base text-forest-mid">
          From: <strong>{ticket.from_name || ticket.from_email}</strong> · {ticket.from_email}
        </p>
      </header>

      {/* Status actions */}
      <section className="flex flex-wrap gap-2">
        {(['open', 'in_progress', 'waiting', 'resolved', 'closed'] as const).map((status) => (
          <form key={status} action={async () => {
            'use server'
            await updateTicketStatus(ticket.id, status)
          }}>
            <Button
              type="submit"
              variant={ticket.status === status ? 'default' : 'outline'}
              size="sm"
            >
              {statusConfig[status]?.label || status}
            </Button>
          </form>
        ))}
      </section>

      {/* Conversation */}
      <section className="space-y-4">
        {/* Original message */}
        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-forest-mid flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-forest-deep text-white flex items-center justify-center text-xs font-bold">
                {(ticket.from_name || ticket.from_email).slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-forest-deep">{ticket.from_name || ticket.from_email}</p>
                <p className="text-xs text-forest-mid/60">
                  {new Date(ticket.created_at).toLocaleString('en-US')}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose prose-sm max-w-none text-forest-deep whitespace-pre-wrap">
              {ticket.body_text}
            </div>
          </CardContent>
        </Card>

        {/* Replies */}
        {replies?.map((reply) => (
          <Card key={reply.id} className="bg-forest-deep text-white ring-1 ring-forest-deep">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-white text-forest-deep flex items-center justify-center text-xs font-bold">
                  BK
                </span>
                <div>
                  <p>Barterkin Support</p>
                  <p className="text-xs text-white/60">
                    {new Date(reply.sent_at).toLocaleString('en-US')}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="whitespace-pre-wrap">{reply.body}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Reply form */}
      <Card className="bg-sage-pale ring-1 ring-sage-light">
        <CardContent className="p-6">
          <form action={async (formData: FormData) => {
            'use server'
            await replyToTicket(null, formData)
          }} className="space-y-4">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <div>
              <label htmlFor="body" className="block text-sm font-medium text-forest-deep mb-2">
                Reply to {ticket.from_email}
              </label>
              <Textarea
                id="body"
                name="body"
                placeholder="Type your reply..."
                rows={6}
                required
                className="bg-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-forest-mid/60">
                This will send an email to {ticket.from_email} via Resend.
              </p>
              <Button type="submit" className="gap-2">
                <Send className="h-4 w-4" />
                Send Reply
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
