'use client'
import * as React from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 300

export function DirectoryKeywordSearch({
  initialValue,
  onSubmit,
}: {
  initialValue: string | null
  onSubmit: (q: string | null) => void
}) {
  // Stores the last URL-committed value we rendered with.
  const [prevInitialValue, setPrevInitialValue] = React.useState<string | null>(initialValue)
  // In-flight local edit buffer (what the user is typing between debounce fires).
  const [localValue, setLocalValue] = React.useState(initialValue ?? '')

  // React's recommended "derived state" reset pattern (no useEffect needed).
  // When the URL changes externally (e.g., Clear filters), synchronously reset.
  // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (prevInitialValue !== initialValue) {
    setPrevInitialValue(initialValue)
    setLocalValue(initialValue ?? '')
  }

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSubmittedRef = React.useRef<string>(initialValue ?? '')

  const submit = React.useCallback(
    (next: string) => {
      const trimmed = next.trim()
      if (trimmed === lastSubmittedRef.current) return
      lastSubmittedRef.current = trimmed
      onSubmit(trimmed.length >= 2 ? trimmed : null)
    },
    [onSubmit],
  )

  const handleChange = (next: string) => {
    setLocalValue(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => submit(next), DEBOUNCE_MS)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current)
      submit(localValue)
    }
  }

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setLocalValue('')
    submit('')
  }

  // Cleanup timer on unmount only.
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="relative w-full min-w-[240px]">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        role="searchbox"
        aria-label="Search by keyword"
        placeholder="Search skills, names, or bios"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn('h-11 pl-10', localValue ? 'pr-10' : '')}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
