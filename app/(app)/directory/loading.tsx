import { DirectorySkeletonCard } from '@/components/directory/DirectorySkeletonCard'

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading directory results"
      className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} aria-hidden="true">
          <DirectorySkeletonCard />
        </div>
      ))}
    </div>
  )
}
