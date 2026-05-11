import { Skeleton } from '@/components/ui/skeleton'

export default function AdminTicketDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-5 w-96" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-16" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <Skeleton className="h-16 w-2/3" />
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
