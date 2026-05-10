import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminTicketById, getAdminTicketMessages } from '@/lib/data/admin-tickets'
import { adminUpdateTicketStatusForm, adminReplyTicketForm } from '@/lib/actions/admin-tickets'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

interface AdminTicketDetailPageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

export default async function AdminTicketDetailPage({ params }: AdminTicketDetailPageProps) {
  const { id } = await params
  const ticket = await getAdminTicketById(id)
  if (!ticket) notFound()

  const messages = await getAdminTicketMessages(id)

  return (
    <div className="space-y-6">
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1 text-sm text-forest-mid hover:text-forest-deep"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-serif text-2xl font-bold">{ticket.subject}</h1>
          <Badge className={statusColors[ticket.status] ?? ''}>{ticket.status}</Badge>
        </div>
        <p className="text-sm text-forest-mid">
          {ticket.category} · {ticket.priority} priority · From{' '}
          {ticket.profile_display_name ?? ticket.profile_username ?? 'Unknown'} · Created{' '}
          {new Date(ticket.created_at).toLocaleDateString()}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
        </CardContent>
      </Card>

      <form action={adminUpdateTicketStatusForm} className="flex items-center gap-3">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <select
          name="status"
          defaultValue={ticket.status}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <Button type="submit" size="sm">Update Status</Button>
      </form>

      <div className="space-y-4">
        <h2 className="font-semibold">Thread</h2>
        {messages.length === 0 && (
          <p className="text-sm text-forest-mid">No replies yet.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender_profile_id === null ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                msg.sender_profile_id === null
                  ? 'bg-forest-deep text-white'
                  : msg.is_internal
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-sage-pale'
              }`}
            >
              <p className="text-xs opacity-70 mb-1">
                {msg.sender_profile_id === null
                  ? 'Admin'
                  : msg.sender_display_name ?? msg.sender_username ?? 'Member'}
                {msg.is_internal && ' · Internal'}
              </p>
              <p className="text-sm">{msg.content}</p>
              <p className="mt-1 text-xs opacity-70">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form action={adminReplyTicketForm} className="flex items-end gap-2">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <Textarea
          name="content"
          placeholder="Reply as admin..."
          className="min-h-[80px] resize-none"
          required
        />
        <Button type="submit">Reply</Button>
      </form>
    </div>
  )
}
