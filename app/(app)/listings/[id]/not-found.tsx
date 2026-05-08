import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Listing not found',
}

export default function ListingNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <h1 className="font-serif text-4xl font-bold text-forest-deep">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        This listing doesn&apos;t exist or may have been removed.
      </p>
      <Button asChild className="mt-8">
        <Link href="/listings">Browse listings</Link>
      </Button>
    </div>
  )
}
