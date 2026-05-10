import { Skeleton } from '@/components/ui/skeleton'

export default function VerifyPendingLoading() {
  return (
    <div className="mx-auto max-w-[480px] w-full space-y-6">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-10 w-48" />
    </div>
  )
}
