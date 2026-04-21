import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function DirectoryPagination({
  currentPage,
  totalPages,
  searchParams,
}: {
  currentPage: number
  totalPages: number
  searchParams: Record<string, string | string[] | undefined>
}) {
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  const buildHref = (page: number): string => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === 'page' || v === undefined) continue
      const value = Array.isArray(v) ? v[0] : v
      if (value !== undefined) params.set(k, value)
    }
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    return qs ? `/directory?${qs}` : '/directory'
  }

  return (
    <nav
      className="flex items-center justify-center gap-2 py-8"
      aria-label="Directory pagination"
    >
      {hasPrev ? (
        <Button
          asChild
          size="lg"
          className="h-11 bg-clay px-5 text-sage-bg hover:bg-clay/90"
        >
          <Link href={buildHref(currentPage - 1)} aria-label="Previous page of results">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Previous
          </Link>
        </Button>
      ) : (
        <Button
          size="lg"
          variant="outline"
          disabled
          aria-disabled="true"
          aria-label="Previous page of results"
          className={cn('h-11 border-sage-light px-5 text-muted-foreground')}
        >
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Previous
        </Button>
      )}

      <span
        role="status"
        aria-live="polite"
        className="px-4 text-sm text-forest-mid"
      >
        Page {currentPage} of {totalPages}
      </span>

      {hasNext ? (
        <Button
          asChild
          size="lg"
          className="h-11 bg-clay px-5 text-sage-bg hover:bg-clay/90"
        >
          <Link href={buildHref(currentPage + 1)} aria-label="Next page of results">
            Next
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button
          size="lg"
          variant="outline"
          disabled
          aria-disabled="true"
          aria-label="Next page of results"
          className={cn('h-11 border-sage-light px-5 text-muted-foreground')}
        >
          Next
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </nav>
  )
}
