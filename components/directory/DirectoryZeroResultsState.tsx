import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function DirectoryZeroResultsState() {
  return (
    <div className="py-16 text-center">
      <Card className="max-w-xl mx-auto bg-sage-pale border-sage-light p-8 md:p-12 space-y-6">
        <SearchX className="h-12 w-12 text-forest-mid mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-forest-deep">
          No profiles match those filters.
        </h2>
        <p className="text-base text-forest-deep leading-[1.5] max-w-md mx-auto">
          Try removing a filter, broadening your county, or searching for a related skill.
        </p>
        <Button
          asChild
          size="lg"
          className="h-11 min-w-[180px] bg-clay hover:bg-clay/90 text-sage-bg"
        >
          <Link href="/directory">Clear filters</Link>
        </Button>
      </Card>
    </div>
  )
}
