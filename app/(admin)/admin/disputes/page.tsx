import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminDisputes } from '@/lib/data/admin-disputes'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Disputes',
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  mediating: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
}

export default async function AdminDisputesPage() {
  const disputes = await getAdminDisputes()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
          Disputes
        </h1>
        <p className="text-base text-forest-mid">
          {disputes.length} {disputes.length === 1 ? 'dispute' : 'disputes'} across all members.
        </p>
      </header>

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg text-forest-mid">No disputes yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => (
            <Link key={dispute.id} href={`/admin/disputes/${dispute.id}`}>
              <Card className="transition-colors hover:bg-sage-pale/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">Dispute</span>
                        <Badge className={statusColors[dispute.status] ?? ''}>
                          {dispute.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-forest-mid">
                        {dispute.initiator_display_name ?? dispute.initiator_username ?? 'Unknown'} vs{' '}
                        {dispute.responder_display_name ?? dispute.responder_username ?? 'Unknown'}
                        {' · '}
                        {new Date(dispute.created_at).toLocaleDateString()}
                        {' · '}
                        {dispute.message_count} {dispute.message_count === 1 ? 'message' : 'messages'}
                      </p>
                      <p className="mt-2 text-sm line-clamp-2">{dispute.reason}</p>
                    </div>
                    {dispute.mediator_display_name && (
                      <Badge variant="outline" className="flex-shrink-0">
                        Mediator: {dispute.mediator_display_name}
                      </Badge>
                    )}
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
