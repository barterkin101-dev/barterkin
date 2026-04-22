import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAdminMemberById } from '@/lib/data/admin'
import { MemberDetailView } from '@/components/admin/MemberDetailView'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const profile = await getAdminMemberById(id)
  const name = profile?.display_name ?? 'Member'
  return {
    title: name,
  }
}

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getAdminMemberById(id)
  if (!profile) notFound()
  return <MemberDetailView profile={profile} />
}
