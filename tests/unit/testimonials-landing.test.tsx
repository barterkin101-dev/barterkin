import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Testimonials } from '@/components/landing/Testimonials'
import type { TestimonialRow } from '@/lib/data/testimonials'

vi.mock('@/lib/analytics-client', () => ({
  captureClientEvent: vi.fn(),
}))

describe('Testimonials landing component', () => {
  const mockTestimonials: TestimonialRow[] = [
    {
      id: 't1',
      quote: 'Barterkin helped me find a plumber in my county without spending a dime.',
      trade_context: 'Plumbing for sourdough bread',
      created_at: '2026-05-20T10:00:00Z',
      profile: {
        id: 'p1',
        display_name: 'Alice Johnson',
        username: 'alicej',
        avatar_url: 'https://example.com/avatar.jpg',
        county_name: 'Fulton',
      },
    },
    {
      id: 't2',
      quote: 'Amazing community. I traded tutoring for tailoring services.',
      trade_context: null,
      created_at: '2026-05-19T10:00:00Z',
      profile: {
        id: 'p2',
        display_name: 'Bob Smith',
        username: 'bobsmith',
        avatar_url: null,
        county_name: 'Cobb',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders section title and testimonials', () => {
    render(<Testimonials testimonials={mockTestimonials} />)
    expect(screen.getByText('What our community is saying')).toBeInTheDocument()
    expect(screen.getByText(/Barterkin helped me find a plumber/)).toBeInTheDocument()
    expect(screen.getByText(/Amazing community/)).toBeInTheDocument()
  })

  it('renders trade context when present', () => {
    render(<Testimonials testimonials={mockTestimonials} />)
    expect(screen.getByText(/Plumbing for sourdough bread/)).toBeInTheDocument()
  })

  it('renders profile display name and county', () => {
    render(<Testimonials testimonials={mockTestimonials} />)
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('Fulton, GA')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('Cobb, GA')).toBeInTheDocument()
  })

  it('renders avatar fallback when no avatar_url', () => {
    render(<Testimonials testimonials={mockTestimonials} />)
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('returns null when no testimonials', () => {
    const { container } = render(<Testimonials testimonials={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders single testimonial correctly', () => {
    render(<Testimonials testimonials={[mockTestimonials[0]]} />)
    expect(screen.getByText('What our community is saying')).toBeInTheDocument()
    expect(screen.getByText(/Barterkin helped me find a plumber/)).toBeInTheDocument()
  })
})
