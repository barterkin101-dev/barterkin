import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProfileViewsSnapshotCard } from '@/components/dashboard/ProfileViewsSnapshotCard'

describe('ProfileViewsSnapshotCard', () => {
  it('does not render for unpublished profiles', () => {
    const { container } = render(
      <ProfileViewsSnapshotCard
        isPublished={false}
        snapshot={{ currentViews: 2, previousViews: 1, delta: 1, trend: 'up' }}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the empty state copy', () => {
    render(
      <ProfileViewsSnapshotCard
        isPublished={true}
        snapshot={{ currentViews: 0, previousViews: 0, delta: 0, trend: 'empty' }}
      />,
    )

    expect(screen.getByText('Profile views snapshot')).toBeInTheDocument()
    expect(screen.getByText('0 in the last 7 days vs 0 in the prior 7 days')).toBeInTheDocument()
    expect(screen.getByText(/No one has viewed your profile in the last 14 days yet/i)).toBeInTheDocument()
  })

  it('renders rising momentum copy', () => {
    render(
      <ProfileViewsSnapshotCard
        isPublished={true}
        snapshot={{ currentViews: 6, previousViews: 2, delta: 4, trend: 'up' }}
      />,
    )

    expect(screen.getByText('6 in the last 7 days vs 2 in the prior 7 days')).toBeInTheDocument()
    expect(screen.getByText(/Up 4 from the prior week/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /refresh profile/i })).not.toBeInTheDocument()
  })

  it('renders the declining CTA when views dip', () => {
    render(
      <ProfileViewsSnapshotCard
        isPublished={true}
        snapshot={{ currentViews: 1, previousViews: 5, delta: -4, trend: 'down' }}
      />,
    )

    expect(screen.getByText('1 in the last 7 days vs 5 in the prior 7 days')).toBeInTheDocument()
    expect(screen.getByText(/Down 4 from the prior week/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /refresh profile/i })).toHaveAttribute('href', '/profile/edit')
  })
})
