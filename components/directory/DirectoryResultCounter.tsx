export function DirectoryResultCounter({
  from,
  to,
  total,
}: {
  from: number
  to: number
  total: number
}) {
  if (total === 0) return null

  const text =
    total > 20
      ? `Showing ${from}\u2013${to} of ${total}`
      : `Showing all ${total}`

  return (
    <p className="text-sm text-forest-mid md:text-right text-center mb-4">{text}</p>
  )
}
