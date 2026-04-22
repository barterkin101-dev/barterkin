import type { Metadata } from 'next'
import { getAdminMembers } from '@/lib/data/admin'
import { MembersTable } from '@/components/admin/MembersTable'

export const metadata: Metadata = {
  title: 'Members',
}

export default async function AdminMembersPage() {
  const members = await getAdminMembers()
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
          Members
        </h1>
        <p className="text-base text-forest-mid">
          {members.length} {members.length === 1 ? 'Georgian' : 'Georgians'} on the directory.
        </p>
      </header>
      <MembersTable members={members} />
    </div>
  )
}
