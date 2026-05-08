import type { Metadata } from 'next'
import Link from 'next/link'
import { Users, Mail, UserPlus, ShoppingBag, Ticket, AlertTriangle, MessageCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { getAdminStats } from '@/lib/data/admin'

export const metadata: Metadata = {
  title: 'Overview',
}

export default async function AdminHomePage() {
  const stats = await getAdminStats()
  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <h1 className="font-serif text-[32px] font-bold text-forest-deep leading-[1.15]">
          Admin
        </h1>
        <p className="text-base text-forest-mid">
          Welcome back. Here&apos;s what&apos;s happening on Barterkin.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
              Total members
            </CardTitle>
            <Users className="h-4 w-4 text-forest-mid" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">
              {stats.totalMembers}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
              Contacts sent
            </CardTitle>
            <Mail className="h-4 w-4 text-forest-mid" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">
              {stats.totalContacts}
            </p>
            <CardDescription className="text-sm text-forest-mid">
              All time
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
              New this week
            </CardTitle>
            <UserPlus className="h-4 w-4 text-forest-mid" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">
              {stats.newThisWeek}
            </p>
            <CardDescription className="text-sm text-forest-mid">
              Last 7 days
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="bg-sage-pale ring-1 ring-sage-light">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
              Conversations
            </CardTitle>
            <MessageCircle className="h-4 w-4 text-forest-mid" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">
              {stats.totalConversations}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/listings">
          <Card className="bg-sage-pale ring-1 ring-sage-light transition-colors hover:bg-sage-light/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
                Listings
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-forest-mid" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">
                {stats.totalListings}
              </p>
              <CardDescription className="text-sm text-forest-mid">
                Manage marketplace listings
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/tickets">
          <Card className="bg-sage-pale ring-1 ring-sage-light transition-colors hover:bg-sage-light/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
                Tickets
              </CardTitle>
              <Ticket className="h-4 w-4 text-forest-mid" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">
                {stats.totalTickets}
              </p>
              <CardDescription className="text-sm text-forest-mid">
                Support requests
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/disputes">
          <Card className="bg-sage-pale ring-1 ring-sage-light transition-colors hover:bg-sage-light/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm uppercase tracking-wide text-forest-mid font-bold">
                Disputes
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-forest-mid" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-[32px] font-bold text-clay font-sans leading-[1.15]">
                {stats.totalDisputes}
              </p>
              <CardDescription className="text-sm text-forest-mid">
                Trade mediation
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  )
}
