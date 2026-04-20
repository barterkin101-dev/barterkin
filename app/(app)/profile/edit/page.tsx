import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import type { ProfileWithRelations } from '@/lib/actions/profile.types'

export const metadata = { title: 'Edit profile' }

export default async function ProfileEditPage() {
  const supabase = await createClient()
  // Pitfall 4 + CLAUDE.md: getUser() for gating the page (DML-adjacent)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('*, skills_offered(*), skills_wanted(*), counties(name), categories(id, name, slug)')
    .eq('owner_id', user.id)
    .maybeSingle()

  return <ProfileEditForm userId={user.id} defaultValues={(data as ProfileWithRelations) ?? null} />
}
