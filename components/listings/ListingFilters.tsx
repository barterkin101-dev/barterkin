'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

const conditions = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'for-parts', label: 'For Parts' },
]

interface FilterOption {
  id: number
  name: string
}

interface ListingFiltersProps {
  categories: FilterOption[]
  counties: FilterOption[]
}

export function ListingFilters({ categories, counties }: ListingFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const q = searchParams.get('q') ?? ''
  const categoryId = searchParams.get('category') ?? ''
  const countyId = searchParams.get('county') ?? ''
  const condition = searchParams.get('condition') ?? ''

  function buildUrl(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === '' || value === null || value === undefined) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    params.set('page', '1')
    return `/listings?${params.toString()}`
  }

  function handleSearch(formData: FormData) {
    const newQ = String(formData.get('q') ?? '')
    startTransition(() => {
      router.push(buildUrl({ q: newQ }))
    })
  }

  const hasFilters = q || categoryId || countyId || condition

  return (
    <div className="space-y-4">
      <form
        action={handleSearch}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Search listings..."
            defaultValue={q}
            className="pl-9"
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          Search
        </Button>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => startTransition(() => router.push('/listings'))}
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </form>

      <div className="flex flex-wrap gap-3">
        <Select
          value={categoryId}
          onValueChange={(value) =>
            startTransition(() => router.push(buildUrl({ category: value })))
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={countyId}
          onValueChange={(value) =>
            startTransition(() => router.push(buildUrl({ county: value })))
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="County" />
          </SelectTrigger>
          <SelectContent>
            {counties.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={condition}
          onValueChange={(value) =>
            startTransition(() => router.push(buildUrl({ condition: value })))
          }
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            {conditions.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
