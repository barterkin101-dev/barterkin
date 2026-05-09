import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Contact requests',
}

export default async function AdminContactsPage() {
  // In-app messaging replaced the email-based contact relay.
  // All admin contact oversight now lives in /admin/messages.
  redirect('/admin/messages')
}
