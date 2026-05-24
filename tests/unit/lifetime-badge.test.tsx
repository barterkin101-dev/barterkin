import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LifetimeBadge } from '@/components/profile/LifetimeBadge'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { DirectoryCard } from '@/components/directory/DirectoryCard'

describe('LifetimeBadge', () => {
  it('renders the badge text', () => {
    render(<LifetimeBadge />)
    expect(screen.getByText('Lifetime')).toBeInTheDocument()
  })
})

describe('ProfileCard lifetime badge', () => {
  const baseProfile = {
    id: 'p1',
    display_name: 'Test User',
    username: 'testuser',
    bio: null,
    avatar_url: null,
    tiktok_handle: null,
    availability: null,
    phone_verified: false,
    founding_member: false,
    tier: 'free',
    accepting_contact: true,
    counties: { name: 'Test County' },
    categories: { name: 'Test Category' },
    skills_offered: [],
    skills_wanted: [],
    rating_avg: null,
    rating_count: 0,
  } as unknown as Parameters<typeof ProfileCard>[0]['profile']

  it('shows lifetime badge for lifetime tier', () => {
    render(<ProfileCard profile={{ ...baseProfile, tier: 'lifetime' }} />)
    expect(screen.getByText('Lifetime')).toBeInTheDocument()
  })

  it('does not show lifetime badge for free tier', () => {
    render(<ProfileCard profile={baseProfile} />)
    expect(screen.queryByText('Lifetime')).not.toBeInTheDocument()
  })

  it('shows lifetime badge when both lifetime and founding apply', () => {
    render(
      <ProfileCard
        profile={{ ...baseProfile, tier: 'lifetime', founding_member: true }}
      />,
    )
    expect(screen.getByText('Lifetime')).toBeInTheDocument()
    expect(screen.queryByText('Founding member')).not.toBeInTheDocument()
  })
})

describe('DirectoryCard lifetime badge', () => {
  const baseProfile = {
    id: 'p1',
    display_name: 'Test User',
    username: 'testuser',
    avatar_url: null,
    founding_member: false,
    tier: 'free',
    counties: { name: 'Test County' },
    categories: { name: 'Test Category' },
    skills_offered: [],
    rating_avg: null,
    rating_count: 0,
  } as unknown as Parameters<typeof DirectoryCard>[0]['profile']

  it('shows lifetime badge for lifetime tier', () => {
    render(<DirectoryCard profile={{ ...baseProfile, tier: 'lifetime' }} />)
    expect(screen.getByText('Lifetime')).toBeInTheDocument()
  })

  it('shows founding badge when tier is founding', () => {
    render(<DirectoryCard profile={{ ...baseProfile, tier: 'founding' }} />)
    expect(screen.getByText('Founding member')).toBeInTheDocument()
    expect(screen.queryByText('Lifetime')).not.toBeInTheDocument()
  })

  it('shows lifetime over founding when both apply', () => {
    render(
      <DirectoryCard
        profile={{ ...baseProfile, tier: 'lifetime', founding_member: true }}
      />,
    )
    expect(screen.getByText('Lifetime')).toBeInTheDocument()
    expect(screen.queryByText('Founding member')).not.toBeInTheDocument()
  })
})
