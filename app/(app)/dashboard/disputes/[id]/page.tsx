import { createClient } from '@/lib/supabase/server'
import { getDisputes, getDisputeMessages } from '@/lib/data/disputes'
import { addDisputeMessageForm } from '@/lib/actions/disputes'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

interface DisputeDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function DisputeDetailPage({ params }: DisputeDetailPageProps) {
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

  const disputes = await getDisputes(profile.id)
  const dispute = disputes.find((d) => d.id === id)

  if (!dispute) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Dispute not found.</p>
      </div>
    )
  }

  const messages = await getDisputeMessages(dispute.id)

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    mediating: 'bg-purple-100 text-purple-800',
    resolved: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/disputes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to disputes
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl font-bold">Dispute</h1>
          <Badge className={statusColors[dispute.status] ?? ''}>{dispute.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Opened {new Date(dispute.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <p className="font-medium">Reason:</p>
        <p className="mt-1 text-sm text-muted-foreground">{dispute.reason}</p>
      </div>

      {dispute.resolution && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-medium text-green-900">Resolution:</p>
          <p className="mt-1 text-sm text-green-800">{dispute.resolution}</p>
          {dispute.resolution_outcome && (
            <p className="mt-1 text-sm font-medium text-green-800">
              Outcome: {dispute.resolution_outcome}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-semibold">Messages</h2>
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

      {dispute.status !== 'resolved' && dispute.status !== 'dismissed' && (
        <form action={addDisputeMessageForm} className="flex items-end gap-2">
          <input type="hidden" name="disputeId" value={dispute.id} />
          <Textarea
            name="content"
            placeholder="Add a message..."
            className="min-h-[80px] resize-none"
            required
          />
          <Button type="submit">Send</Button>
        </form>
      )}
    </div>
  )
}
