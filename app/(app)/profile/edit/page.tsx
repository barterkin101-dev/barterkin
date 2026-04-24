import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import type { ProfileWithRelations } from '@/lib/actions/profile.types'
import { safeReturnTo } from '@/lib/utils/returnTo'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Edit profile' }

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const supabase = await createClient()
  // Pitfall 4 + CLAUDE.md: getUser() for gating the page (DML-adjacent)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('profiles')
    .select('*, skills_offered(*), skills_wanted(*), counties(name), categories(id, name, slug)')
    .eq('owner_id', user.id)
    .maybeSingle()

  // D-06 + T-9-03: validate returnTo. Relative paths only; anything else → undefined (toast in place).
  const { returnTo } = await searchParams
  const validReturnTo = safeReturnTo(returnTo)

  return (
    <div className="mx-auto max-w-2xl">
      <ProfileEditForm
        userId={user.id}
        defaultValues={(data as ProfileWithRelations) ?? null}
        returnTo={validReturnTo}
      />
    </div>
  )
}
