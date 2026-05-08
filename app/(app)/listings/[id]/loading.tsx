import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
