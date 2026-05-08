import { createClient } from '@/lib/supabase/server'
import { ListingForm } from '@/components/listings/ListingForm'
import { redirect } from 'next/navigation'

export default async function NewListingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: categories }, { data: counties }] = await Promise.all([
    supabase.from('categories').select('id, name').order('id'),
    supabase.from('counties').select('id, name').order('name'),
  ])

  return (
    <ListingForm
      userId={user.id}
      categories={categories ?? []}
      counties={counties ?? []}
    />
  )
}
