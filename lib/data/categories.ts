export interface Category {
  readonly id: number
  readonly name: string
  readonly slug: string
}

/**
 * PROF-06 — canonical 10-category taxonomy.
 *
 * IDs are stable — referenced by profiles.category_id FK. Migration 003
 * (Plan 03-02) seeds identical rows into the `categories` table.
 * Order matches UI-SPEC §Placeholder / seeded data.
 */
export const CATEGORIES = [
  { id: 1, name: 'Home & Garden', slug: 'home-garden' },
  { id: 2, name: 'Food & Kitchen', slug: 'food-kitchen' },
  { id: 3, name: 'Arts & Crafts', slug: 'arts-crafts' },
  { id: 4, name: 'Music & Performance', slug: 'music-performance' },
  { id: 5, name: 'Tech & Digital', slug: 'tech-digital' },
  { id: 6, name: 'Wellness & Bodywork', slug: 'wellness-bodywork' },
  { id: 7, name: 'Teaching & Tutoring', slug: 'teaching-tutoring' },
  { id: 8, name: 'Trades & Repair', slug: 'trades-repair' },
  { id: 9, name: 'Outdoors & Animals', slug: 'outdoors-animals' },
  { id: 10, name: 'Community & Events', slug: 'community-events' },
] as const satisfies readonly Category[]

export type CategorySlug = (typeof CATEGORIES)[number]['slug']
