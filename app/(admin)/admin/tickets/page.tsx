import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminTickets } from '@/lib/data/admin-tickets'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Tickets',
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-800',
  normal: 'bg-slate-100 text-slate-800',
  high: 'bg-red-100 text-red-800',
  urgent: 'bg-red-200 text-red-900',
}

export default async function AdminTicketsPage() {
  const tickets = await getAdminTickets()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
          Support Tickets
        </h1>
        <p className="text-base text-forest-mid">
          {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} across all members.
        </p>
      </header>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg text-forest-mid">No tickets yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/admin/tickets/${ticket.id}`}>
              <Card className="transition-colors hover:bg-sage-pale/50">
                <CardContent className="flex items-start justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{ticket.subject}</h3>
                      <Badge className={statusColors[ticket.status] ?? ''}>
                        {ticket.status}
                      </Badge>
                      <Badge className={priorityColors[ticket.priority] ?? ''}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-forest-mid">
                      {ticket.category} · From{' '}
                      <span className="font-medium">
                        {ticket.profile_display_name ?? ticket.profile_username ?? 'Unknown'}
                      </span>
                      {' · '}
                      {new Date(ticket.created_at).toLocaleDateString()}
                      {' · '}
                      {ticket.message_count} {ticket.message_count === 1 ? 'reply' : 'replies'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
