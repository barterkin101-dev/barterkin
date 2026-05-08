import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminDisputeById, getAdminDisputeMessages } from '@/lib/data/admin-disputes'
import { adminMediateDisputeForm, adminResolveDisputeForm } from '@/lib/actions/admin-disputes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface AdminDisputeDetailPageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  mediating: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
}

export default async function AdminDisputeDetailPage({ params }: AdminDisputeDetailPageProps) {
  const { id } = await params
  const dispute = await getAdminDisputeById(id)
  if (!dispute) notFound()

  const messages = await getAdminDisputeMessages(id)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get admin profile id for mediator
  let adminProfileId = ''
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (profile) adminProfileId = profile.id
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/disputes"
        className="inline-flex items-center gap-1 text-sm text-forest-mid hover:text-forest-deep"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to disputes
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl font-bold">Dispute</h1>
          <Badge className={statusColors[dispute.status] ?? ''}>{dispute.status}</Badge>
        </div>
        <p className="text-sm text-forest-mid">
          Opened {new Date(dispute.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-forest-mid font-bold">Initiator</p>
            <p className="mt-1 font-medium">
              {dispute.initiator_display_name ?? dispute.initiator_username ?? 'Unknown'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-forest-mid font-bold">Responder</p>
            <p className="mt-1 font-medium">
              {dispute.responder_display_name ?? dispute.responder_username ?? 'Unknown'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="font-medium">Reason:</p>
          <p className="mt-1 text-sm text-forest-mid whitespace-pre-wrap">{dispute.reason}</p>
        </CardContent>
      </Card>

      {dispute.resolution && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-900">Resolution:</p>
          <p className="mt-1 text-sm text-green-800">{dispute.resolution}</p>
          {dispute.resolution_outcome && (
            <p className="mt-1 text-sm font-medium text-green-800">
              Outcome: {dispute.resolution_outcome}
            </p>
          )}
          {dispute.mediator_display_name && (
            <p className="mt-1 text-xs text-green-700">
              Mediated by {dispute.mediator_display_name}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-semibold">Messages</h2>
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
            <div className="max-w-[70%] rounded-2xl px-4 py-2 bg-sage-pale">
              <p className="text-xs opacity-70 mb-1">
                {msg.sender_display_name ?? msg.sender_username ?? 'Member'}
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

      {dispute.status !== 'resolved' && dispute.status !== 'dismissed' && adminProfileId && (
        <>
          <form action={adminMediateDisputeForm} className="flex items-end gap-2">
            <input type="hidden" name="disputeId" value={dispute.id} />
            <input type="hidden" name="mediatorProfileId" value={adminProfileId} />
            <Textarea
              name="content"
              placeholder="Mediate as admin..."
              className="min-h-[80px] resize-none"
              required
            />
            <Button type="submit">Send</Button>
          </form>

          <form action={adminResolveDisputeForm} className="space-y-3 border-t pt-6">
            <input type="hidden" name="disputeId" value={dispute.id} />
            <input type="hidden" name="mediatorProfileId" value={adminProfileId} />
            <h3 className="font-semibold">Resolve Dispute</h3>
            <Textarea
              name="resolution"
              placeholder="Enter resolution summary..."
              className="min-h-[80px] resize-none"
              required
            />
            <div className="flex items-center gap-3">
              <select
                name="outcome"
                required
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select outcome...</option>
                <option value="initiator_favored">Initiator Favored</option>
                <option value="responder_favored">Responder Favored</option>
                <option value="mutual_agreement">Mutual Agreement</option>
                <option value="no_action">No Action Taken</option>
              </select>
              <Button type="submit" variant="default">Resolve</Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
