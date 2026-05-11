import { Skeleton } from '@/components/ui/skeleton'

export default function AdminDisputeDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <Skeleton className="h-16 w-3/4" />
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  )
}
