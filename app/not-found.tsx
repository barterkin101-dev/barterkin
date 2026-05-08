import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Page not found',
}

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <h1 className="font-serif text-4xl font-bold text-forest-deep">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        This page doesn&apos;t exist or may have been removed.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  )
}
