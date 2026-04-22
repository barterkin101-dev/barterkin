import { ContactStatusBadge } from '@/components/admin/ContactStatusBadge'
import type { AdminContactRow } from '@/lib/data/admin'

interface ContactsTableProps {
  contacts: AdminContactRow[]
  activeStatus: string
}

const TAB_LABEL: Record<string, string> = {
  bounced: 'Bounced',
  failed: 'Failed',
}

function formatSent(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ContactsTable({ contacts, activeStatus }: ContactsTableProps) {
  if (contacts.length === 0) {
    const isFiltered = activeStatus !== 'all' && activeStatus !== ''
    const tabLabel = TAB_LABEL[activeStatus] ?? activeStatus
    return (
      <div className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-8 text-center space-y-2">
        {isFiltered ? (
          <h2 className="font-serif text-xl font-bold text-forest-deep">
            No {tabLabel} contacts.
          </h2>
        ) : (
          <>
            <h2 className="font-serif text-xl font-bold text-forest-deep">
              No contact requests yet.
            </h2>
            <p className="text-base text-forest-mid">
              When members start reaching out through the directory, you&apos;ll see their messages here.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="bg-sage-pale ring-1 ring-sage-light rounded-lg overflow-hidden">
      <table className="w-full text-base">
        <thead className="border-b border-sage-light">
          <tr className="text-left text-sm text-forest-mid">
            <th scope="col" className="px-4 py-3 font-bold">From</th>
            <th scope="col" className="px-4 py-3 font-bold">To</th>
            <th scope="col" className="px-4 py-3 font-bold">Message</th>
            <th scope="col" className="px-4 py-3 font-bold">Status</th>
            <th scope="col" className="px-4 py-3 font-bold">Sent</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr
              key={c.id}
              className="border-b border-sage-light/60 last:border-b-0"
            >
              <td className="px-4 py-3 text-sm text-forest-deep font-bold">
                {c.sender_display_name ?? '—'}
              </td>
              <td className="px-4 py-3 text-sm text-forest-deep font-bold">
                {c.recipient_display_name ?? '—'}
              </td>
              <td className="px-4 py-3 text-sm text-forest-deep max-w-md">
                <p className="line-clamp-2" title={c.message}>
                  {c.message}
                </p>
              </td>
              <td className="px-4 py-3">
                <ContactStatusBadge status={c.status} />
              </td>
              <td className="px-4 py-3 text-sm text-forest-mid whitespace-nowrap">
                {formatSent(c.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
