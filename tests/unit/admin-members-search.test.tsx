/**
 * Phase 8 — ADMIN-02 — MembersTable real-time search
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MembersTable } from '@/components/admin/MembersTable'
import type { AdminMemberRow } from '@/lib/data/admin'

function row(overrides: Partial<AdminMemberRow> = {}): AdminMemberRow {
  return {
    id: overrides.id ?? 'id-' + Math.random().toString(36).slice(2, 8),
    display_name: overrides.display_name ?? 'Alice Baker',
    is_published: overrides.is_published ?? true,
    banned: overrides.banned ?? false,
    created_at: overrides.created_at ?? '2026-03-01T12:00:00Z',
    avatar_url: overrides.avatar_url ?? null,
    county_name: overrides.county_name ?? 'Fulton',
  }
}

const MEMBERS: AdminMemberRow[] = [
  row({ id: 'a', display_name: 'Alice Baker' }),
  row({ id: 'b', display_name: 'Bob Carpenter' }),
  row({ id: 'c', display_name: 'Carol Welder', banned: true }),
]

describe('ADMIN-02 — MembersTable filters by display_name', () => {
  it('renders all rows when search query is empty', () => {
    render(<MembersTable members={MEMBERS} />)
    expect(screen.getByText('Alice Baker')).toBeInTheDocument()
    expect(screen.getByText('Bob Carpenter')).toBeInTheDocument()
    expect(screen.getByText('Carol Welder')).toBeInTheDocument()
  })

  it('filters rows to those whose display_name contains the query (case-insensitive)', () => {
    render(<MembersTable members={MEMBERS} />)
    const input = screen.getByLabelText('Search members by display name')
    fireEvent.change(input, { target: { value: 'alice' } })
    expect(screen.getByText('Alice Baker')).toBeInTheDocument()
    expect(screen.queryByText('Bob Carpenter')).not.toBeInTheDocument()
    expect(screen.queryByText('Carol Welder')).not.toBeInTheDocument()
  })

  it('shows zero-results state when query matches no rows', () => {
    render(<MembersTable members={MEMBERS} />)
    const input = screen.getByLabelText('Search members by display name')
    fireEvent.change(input, { target: { value: 'zzzzz' } })
    expect(screen.getByText(/No matches for/i)).toBeInTheDocument()
    // Zero-results renders TWO Clear-search controls (the X icon in the input +
    // the CTA underneath the empty-state message). Assert at least one exists.
    expect(screen.getAllByRole('button', { name: /Clear search/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('clears filter when search input is cleared via X button', () => {
    render(<MembersTable members={MEMBERS} />)
    const input = screen.getByLabelText('Search members by display name') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'alice' } })
    // With a query that DOES match (shows table view), only the X icon button
    // has aria-label "Clear search" — so getByRole is unambiguous here.
    const clearBtn = screen.getByRole('button', { name: 'Clear search' })
    fireEvent.click(clearBtn)
    expect(input.value).toBe('')
    expect(screen.getByText('Bob Carpenter')).toBeInTheDocument()
  })

  it('Escape key clears the search input', () => {
    render(<MembersTable members={MEMBERS} />)
    const input = screen.getByLabelText('Search members by display name') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'alice' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.value).toBe('')
  })

  it('renders empty state when members array is empty', () => {
    render(<MembersTable members={[]} />)
    expect(screen.getByText('No members yet.')).toBeInTheDocument()
  })
})
