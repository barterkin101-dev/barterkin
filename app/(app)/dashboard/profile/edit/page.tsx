import { createClient } from '@/lib/supabase/server'
import { BioWizard } from '@/components/profile/BioWizard'
import { redirect } from 'next/navigation'

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, skills_offered(*), skills_wanted(*), counties(name), categories(id, name, slug)')
    .eq('owner_id', user.id)
    .maybeSingle()

  return (
    <div className="py-4">
      <BioWizard userId={user.id} profile={profile} />
    </div>
  )
}
