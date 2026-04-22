import type { Metadata } from 'next'
import { getAdminContacts } from '@/lib/data/admin'
import { ContactStatusTabs } from '@/components/admin/ContactStatusTabs'
import { ContactsTable } from '@/components/admin/ContactsTable'

export const metadata: Metadata = {
  title: 'Contact requests',
}

const ALLOWED_STATUSES = new Set(['all', 'bounced', 'failed'])

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  // Whitelist the status param — any other value falls back to "all".
  const safeStatus = status && ALLOWED_STATUSES.has(status) ? status : 'all'
  const filterArg = safeStatus === 'all' ? undefined : safeStatus
  const contacts = await getAdminContacts(filterArg)

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
          Contact requests
        </h1>
        <p className="text-base text-forest-mid">
          Every message sent through the directory.
        </p>
      </header>
      <ContactStatusTabs activeStatus={safeStatus} />
      <ContactsTable contacts={contacts} activeStatus={safeStatus} />
    </div>
  )
}
