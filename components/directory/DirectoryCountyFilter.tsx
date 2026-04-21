'use client'
import { CountyCombobox } from '@/components/profile/CountyCombobox'

export function DirectoryCountyFilter({
  value,
  onChange,
}: {
  value: number | null
  onChange: (fips: number | null) => void
}) {
  return (
    <div className="w-full min-w-[220px]" aria-label="Filter by county">
      <CountyCombobox
        value={value}
        // CountyCombobox's onChange emits a non-null fips; pass through as-is.
        // Clearing the county filter happens via the active-filter chip × button,
        // NOT via this control (UI-SPEC parity with Phase 3 semantics).
        onChange={(fips) => onChange(fips)}
      />
    </div>
  )
}
