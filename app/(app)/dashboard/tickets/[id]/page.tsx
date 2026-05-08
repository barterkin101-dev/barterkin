import { createClient } from '@/lib/supabase/server'
import { getTickets, getTicketMessages } from '@/lib/data/tickets'
import { addTicketMessageForm } from '@/lib/actions/tickets'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface TicketDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Please sign in.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Profile not found.</p>
      </div>
    )
  }

  const tickets = await getTickets(profile.id)
  const ticket = tickets.find((t) => t.id === id)

  if (!ticket) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Ticket not found.</p>
      </div>
    )
  }

  const messages = await getTicketMessages(ticket.id)

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    waiting: 'bg-orange-100 text-orange-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/tickets"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl font-bold">{ticket.subject}</h1>
          <Badge className={statusColors[ticket.status] ?? ''}>{ticket.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {ticket.category} · {ticket.priority} priority · Created{' '}
          {new Date(ticket.created_at).toLocaleDateString()}
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-semibold">Replies</h2>
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No replies yet.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender_profile_id === profile.id ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.sender?.avatar_url ? (
              <Image
                src={msg.sender.avatar_url}
                alt={msg.sender.display_name ?? ''}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted" />
            )}
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                msg.sender_profile_id === profile.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
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

      <form action={addTicketMessageForm} className="flex items-end gap-2">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <Textarea
          name="content"
          placeholder="Add a reply..."
          className="min-h-[80px] resize-none"
          required
        />
        <Button type="submit">Reply</Button>
      </form>
    </div>
  )
}
