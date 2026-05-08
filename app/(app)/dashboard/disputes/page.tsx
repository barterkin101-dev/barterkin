import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDisputes } from '@/lib/data/disputes'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function DisputesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Please sign in to view your disputes.</p>
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
        <p className="text-muted-foreground">Complete your profile.</p>
      </div>
    )
  }

  const disputes = await getDisputes(profile.id)

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    mediating: 'bg-purple-100 text-purple-800',
    resolved: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">Disputes</h1>

      {disputes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg text-muted-foreground">No disputes.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              If something goes wrong with a trade, you can open a dispute here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {disputes.map((dispute) => (
            <Link key={dispute.id} href={`/dashboard/disputes/${dispute.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Dispute</span>
                        <Badge className={statusColors[dispute.status] ?? ''}>
                          {dispute.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        vs {dispute.responder?.display_name ?? dispute.responder?.username}
                        {' · '}
                        {new Date(dispute.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{dispute.reason}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
