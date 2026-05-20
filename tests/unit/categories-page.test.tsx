import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createClient } from '@/lib/supabase/server'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  captureEvent: vi.fn(),
}))

async function renderPage() {
  const { default: Page } = await import('@/app/categories/page')
  return render(await Page())
}

function mockCategoryData({
  profileRows = [
    { category_id: 1 },
    { category_id: 1 },
    { category_id: 2 },
    { category_id: null },
  ],
  listingRows = [
    { category_id: 1 },
    { category_id: 1 },
    { category_id: 3 },
  ],
  skillRows = [
    { skill_text: 'Gardening', profiles: { category_id: 1 } },
    { skill_text: 'Cooking', profiles: { category_id: 2 } },
    { skill_text: 'Baking', profiles: { category_id: 2 } },
    { skill_text: 'Gardening', profiles: { category_id: 1 } },
    { skill_text: 'Woodworking', profiles: { category_id: 1 } },
  ],
}: {
  profileRows?: { category_id: number | null }[]
  listingRows?: { category_id: number | null }[]
  skillRows?: { skill_text: string; profiles: { category_id: number | null } }[]
} = {}) {
  const profileQuery = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: profileRows,
          error: null,
        }),
      })),
    })),
  }

  const listingQuery = {
    select: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({
        data: listingRows,
        error: null,
      }),
    })),
  }

  const skillQuery = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({
            data: skillRows,
            error: null,
          }),
        })),
      })),
    })),
  }

  let callCount = 0
  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn(() => {
      callCount++
      if (callCount === 1) return profileQuery
      if (callCount === 2) return listingQuery
      return skillQuery
    }),
  } as never)
}

describe('/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders page title and hero', async () => {
    mockCategoryData()

    await renderPage()

    expect(screen.getByText('What do you')).toBeInTheDocument()
    expect(screen.getByText('need?')).toBeInTheDocument()
    expect(screen.getByText(/Browse \d+ members/)).toBeInTheDocument()
  })

  it('renders all 10 category cards', async () => {
    mockCategoryData()

    await renderPage()

    expect(screen.getByText('Home & Garden')).toBeInTheDocument()
    expect(screen.getByText('Food & Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Arts & Crafts')).toBeInTheDocument()
    expect(screen.getByText('Music & Performance')).toBeInTheDocument()
    expect(screen.getByText('Tech & Digital')).toBeInTheDocument()
    expect(screen.getByText('Wellness & Bodywork')).toBeInTheDocument()
    expect(screen.getByText('Teaching & Tutoring')).toBeInTheDocument()
    expect(screen.getByText('Trades & Repair')).toBeInTheDocument()
    expect(screen.getByText('Outdoors & Animals')).toBeInTheDocument()
    expect(screen.getByText('Community & Events')).toBeInTheDocument()
  })

  it('shows member and listing counts per category', async () => {
    mockCategoryData()

    await renderPage()

    expect(screen.getByText('2 members')).toBeInTheDocument() // Home & Garden
    expect(screen.getByText('1 member')).toBeInTheDocument() // Food & Kitchen
    expect(screen.getByText('2 listings')).toBeInTheDocument() // Home & Garden
    expect(screen.getByText('1 listing')).toBeInTheDocument() // Arts & Crafts
  })

  it('shows top skills per category', async () => {
    mockCategoryData()

    await renderPage()

    expect(screen.getByText('Gardening')).toBeInTheDocument()
    expect(screen.getByText('Woodworking')).toBeInTheDocument()
    expect(screen.getByText('Cooking')).toBeInTheDocument()
    expect(screen.getByText('Baking')).toBeInTheDocument()
  })

  it('links each category to directory with slug param', async () => {
    mockCategoryData()

    await renderPage()

    const homeGardenLink = screen.getByRole('link', { name: /Browse Home & Garden/i })
    expect(homeGardenLink.closest('a')).toHaveAttribute('href', '/directory?category=home-garden')

    const foodKitchenLink = screen.getByRole('link', { name: /Browse Food & Kitchen/i })
    expect(foodKitchenLink.closest('a')).toHaveAttribute('href', '/directory?category=food-kitchen')
  })

  it('shows "Be the first to join" for empty categories', async () => {
    mockCategoryData({
      profileRows: [],
      listingRows: [],
      skillRows: [],
    })

    await renderPage()

    expect(screen.getAllByText('Be the first to join').length).toBeGreaterThanOrEqual(1)
  })

  it('renders CTA section with signup link', async () => {
    mockCategoryData()

    await renderPage()

    expect(screen.getByText('Have a skill to share?')).toBeInTheDocument()
    const signupCta = screen.getByRole('link', { name: /get started free/i })
    expect(signupCta).toHaveAttribute('href', '/signup')
  })

  it('renders error state when data fetch fails', async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42P01' },
            }),
          })),
        })),
      })),
    } as never)

    await renderPage()

    expect(screen.getByText('Something went wrong loading categories.')).toBeInTheDocument()
  })
})
