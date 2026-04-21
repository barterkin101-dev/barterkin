import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DirectorySkeletonCard() {
  return (
    <Card className="bg-sage-pale ring-1 ring-sage-light rounded-lg p-6 min-h-[220px] border-0">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
    </Card>
  )
}
