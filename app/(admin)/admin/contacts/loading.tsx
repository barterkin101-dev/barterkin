import { Skeleton } from '@/components/ui/skeleton'

export default function AdminContactsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-6 w-96" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
