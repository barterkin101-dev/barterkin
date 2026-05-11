import { Skeleton } from '@/components/ui/skeleton'

export default function LegalPageLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <Skeleton className="h-10 w-64" />
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  )
}
