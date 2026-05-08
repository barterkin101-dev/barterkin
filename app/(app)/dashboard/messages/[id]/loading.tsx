import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={`h-16 w-3/4 ${i % 2 === 0 ? '' : 'ml-auto'}`} />
        ))}
      </div>
    </div>
  )
}
