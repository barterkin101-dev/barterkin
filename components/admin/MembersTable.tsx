'use client'
import { useState, useDeferredValue } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/admin/StatusBadge'
import type { AdminMemberRow } from '@/lib/data/admin'

interface MembersTableProps {
  members: AdminMemberRow[]
}

function formatJoined(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initial(name: string | null): string {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

export function MembersTable({ members }: MembersTableProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const q = deferredQuery.trim().toLowerCase()

  const filtered = q
    ? members.filter((m) =>
        (m.display_name ?? '').toLowerCase().includes(q),
      )
    : members

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') setQuery('')
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-mid pointer-events-none"
          aria-hidden="true"
        />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by name…"
          aria-label="Search members by display name"
          className="pl-9 pr-9 h-11 bg-white"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-forest-mid hover:text-forest-deep"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-8 text-center space-y-2">
          <h2 className="font-serif text-xl font-bold text-forest-deep">No members yet.</h2>
          <p className="text-base text-forest-mid">
            When people sign up and publish their profile, they&apos;ll appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-8 text-center space-y-3">
          <h2 className="font-serif text-xl font-bold text-forest-deep">
            No matches for &ldquo;{query}&rdquo;.
          </h2>
          <p className="text-base text-forest-mid">
            Try a shorter name or clear the search.
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-sm font-bold text-forest-deep underline underline-offset-4"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="bg-sage-pale ring-1 ring-sage-light rounded-lg overflow-hidden">
          <table className="w-full text-base">
            <thead className="border-b border-sage-light">
              <tr className="text-left text-sm text-forest-mid">
                <th scope="col" className="px-4 py-3 font-bold">Name</th>
                <th scope="col" className="px-4 py-3 font-bold">County</th>
                <th scope="col" className="px-4 py-3 font-bold">Joined</th>
                <th scope="col" className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-sage-light/60 last:border-b-0 hover:bg-sage-light/40 transition-colors"
                >
                  <td className="px-4 py-2 min-h-[44px]">
                    <Link
                      href={`/admin/members/${m.id}`}
                      className="flex items-center gap-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay ring-offset-2 ring-offset-sage-pale rounded"
                    >
                      <Avatar className="h-8 w-8">
                        {m.avatar_url ? (
                          <AvatarImage src={m.avatar_url} alt="" />
                        ) : null}
                        <AvatarFallback>{initial(m.display_name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-sans font-bold text-forest-deep">
                        {m.display_name ?? 'Unnamed member'}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-sm text-forest-mid">{m.county_name ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-forest-mid">{formatJoined(m.created_at)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge isPublished={m.is_published} banned={m.banned} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
