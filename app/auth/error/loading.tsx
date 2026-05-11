import { Skeleton } from '@/components/ui/skeleton'

export default function AuthErrorLoading() {
  return (
    <div className="mx-auto max-w-md px-6 py-12 space-y-6 text-center">
      <Skeleton className="h-12 w-12 mx-auto" />
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-16 w-full mx-auto" />
      <Skeleton className="h-10 w-32 mx-auto" />
    </div>
  )
}
