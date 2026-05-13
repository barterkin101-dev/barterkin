import type { Metadata } from 'next'
import Link from 'next/link'
import { Inbox, Clock, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { listSupportTickets } from '@/lib/actions/admin-support'

export const metadata: Metadata = {
  title: 'Support Inbox',
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

export default async function SupportInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const result = await listSupportTickets(status)

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
            Support Inbox
          </h1>
          <p className="text-base text-forest-mid">
            Manage customer support requests from email and other channels.
          </p>
        </header>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-700">Failed to load tickets: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tickets = result.tickets || []
  const openCount = tickets.filter((t) => t.status === 'open').length
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
          Support Inbox
        </h1>
        <p className="text-base text-forest-mid">
          Manage customer support requests from email and other channels.
        </p>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
              Open
            </CardTitle>
            <Inbox className="h-4 w-4 text-forest-mid" />
          </CardHeader>
          <CardContent>
            <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">{openCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
              In Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-forest-mid" />
          </CardHeader>
          <CardContent>
            <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
              Total
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-forest-mid" />
          </CardHeader>
          <CardContent>
            <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">{tickets.length}</p>
          </CardContent>
        </Card>
      </section>

      {/* Filter tabs */}
      <section className="flex flex-wrap gap-2">
        {(['all', 'open', 'in_progress', 'waiting', 'resolved', 'closed'] as const).map((s) => (
          <Link
            key={s}
            href={s === 'all' ? '/admin/support' : `/admin/support?status=${s}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              (status || 'all') === s
                ? 'bg-forest-deep text-white'
                : 'bg-sage-pale text-forest-mid hover:bg-sage-light'
            }`}
          >
            {s === 'all' ? 'All' : statusConfig[s]?.label || s}
          </Link>
        ))}
      </section>

      {/* Tickets list */}
      <section className="space-y-4">
        {tickets.length === 0 ? (
          <Card className="bg-sage-pale ring-1 ring-sage-light">
            <CardContent className="p-8 text-center">
              <Inbox className="h-12 w-12 text-forest-mid mx-auto mb-4" />
              <p className="text-forest-mid text-lg font-medium">No tickets found</p>
              <p className="text-forest-mid/70 text-sm mt-1">
                Support requests will appear here when customers email support@barterkin.com
              </p>
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => {
            const sConfig = statusConfig[ticket.status] || statusConfig.open
            const pConfig = priorityConfig[ticket.priority] || priorityConfig.normal
            return (
              <Link key={ticket.id} href={`/admin/support/${ticket.id}`}>
                <Card className="bg-sage-pale ring-1 ring-sage-light transition-colors hover:bg-sage-light/50 cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={sConfig.variant} className="flex items-center gap-1">
                            {sConfig.icon}
                            {sConfig.label}
                          </Badge>
                          <Badge variant="outline" className={pConfig.className}>
                            {pConfig.label}
                          </Badge>
                          <span className="text-xs text-forest-mid/60">
                            {new Date(ticket.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <h3 className="font-medium text-forest-deep truncate">{ticket.subject}</h3>
                        <p className="text-sm text-forest-mid mt-1 truncate">
                          From: {ticket.from_name || ticket.from_email} · {ticket.from_email}
                        </p>
                        <p className="text-sm text-forest-mid/70 mt-1 line-clamp-2">
                          {ticket.body_text.slice(0, 200)}
                          {ticket.body_text.length > 200 ? '...' : ''}
                        </p>
                      </div>
                      {ticket.reply_count ? (
                        <div className="flex items-center gap-1 text-sm text-forest-mid">
                          <MessageSquare className="h-4 w-4" />
                          {ticket.reply_count}
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
