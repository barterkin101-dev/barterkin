'use client'
import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CATEGORIES } from '@/lib/data/categories'
import georgiaCounties from '@/lib/data/georgia-counties.json'

export function ActiveFilterChips({
  categorySlug,
  countyFips,
  q,
}: {
  categorySlug: string | null
  countyFips: number | null
  q: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const removeParam = (key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(key)
    params.delete('page') // reset pagination on filter change
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const categoryName = categorySlug
    ? CATEGORIES.find((c) => c.slug === categorySlug)?.name ?? null
    : null
  const countyName = countyFips
    ? (georgiaCounties as Array<{ fips: number; name: string }>).find(
        (c) => c.fips === countyFips,
      )?.name ?? null
    : null

  const chips: Array<{
    key: 'category' | 'county' | 'q'
    label: string
    ariaLabel: string
  }> = []
  if (categoryName) {
    chips.push({
      key: 'category',
      label: `Category: ${categoryName}`,
      ariaLabel: 'Remove category filter',
    })
  }
  if (countyName) {
    chips.push({
      key: 'county',
      label: `County: ${countyName}`,
      ariaLabel: 'Remove county filter',
    })
  }
  if (q) {
    chips.push({
      key: 'q',
      label: `Search: ${q}`,
      ariaLabel: 'Remove search filter',
    })
  }

  if (chips.length === 0) return null

  return (
    <div
      className="flex flex-wrap gap-2 py-2"
      role="list"
      aria-label="Active filters"
    >
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          role="listitem"
          className="h-9 gap-1 rounded-md bg-sage-pale px-3 text-sm font-normal text-forest-deep ring-1 ring-clay"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => removeParam(chip.key)}
            aria-label={chip.ariaLabel}
            className="ml-1 inline-flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </Badge>
      ))}
    </div>
  )
}
