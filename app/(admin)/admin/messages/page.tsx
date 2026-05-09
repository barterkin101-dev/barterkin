import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminConversations } from '@/lib/data/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Messages',
}

export default async function AdminMessagesPage() {
  const conversations = await getAdminConversations()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
          Messages
        </h1>
        <p className="text-base text-forest-mid">
          Overview of member conversations and messaging activity.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-forest-mid">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-forest-deep">{conversations.length}</div>
          </CardContent>
        </Card>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-8 text-center space-y-2">
          <h2 className="font-serif text-xl font-bold text-forest-deep">No conversations yet.</h2>
          <p className="text-base text-forest-mid">
            When members start messaging, you&apos;ll see conversation summaries here.
          </p>
        </div>
      ) : (
        <div className="bg-sage-pale ring-1 ring-sage-light rounded-lg overflow-hidden">
          <table className="w-full text-base">
            <thead className="border-b border-sage-light">
              <tr className="text-left text-sm text-forest-mid">
                <th scope="col" className="px-4 py-3 font-bold">Participants</th>
                <th scope="col" className="px-4 py-3 font-bold">Last Message</th>
                <th scope="col" className="px-4 py-3 font-bold">Updated</th>
                <th scope="col" className="px-4 py-3 font-bold">Messages</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-sage-light/60 last:border-b-0"
                >
                  <td className="px-4 py-3 text-sm text-forest-deep">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-forest-mid" />
                      <span className="font-medium">
                        {c.participant_names.join(' ↔ ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-forest-deep max-w-md">
                    {c.last_message ? (
                      <p className="line-clamp-2" title={c.last_message}>
                        {c.last_message}
                      </p>
                    ) : (
                      <span className="text-forest-mid italic">No messages</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-forest-mid whitespace-nowrap">
                    {new Date(c.updated_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-forest-deep">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4 text-forest-mid" />
                      <span>{c.message_count}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
