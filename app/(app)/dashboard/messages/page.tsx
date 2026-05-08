import { createClient } from '@/lib/supabase/server'
import { getConversations } from '@/lib/data/messaging'
import { ConversationList } from '@/components/messaging/ConversationList'
import { redirect } from 'next/navigation'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Complete your profile to use messaging.</p>
      </div>
    )
  }

  const conversations = await getConversations(profile.id)

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-bold leading-[1.15] md:text-[32px]">Messages</h1>
      <ConversationList conversations={conversations} />
    </div>
  )
}
