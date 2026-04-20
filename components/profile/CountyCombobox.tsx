'use client'
import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import georgiaCounties from '@/lib/data/georgia-counties.json'

// georgia-counties.json shape: [{ fips: 13001, name: "Appling County" }, ...]
// 159 entries, FIPS-ordered, bundled statically — no DB round-trip.
// Critical: counties.id (Postgres PK) = county.fips (JSON field) — identical integers.
// onChange(county.fips) IS the profiles.county_id FK value — no translation needed.
// (Plan 02 revision iter-1 fix: counties.id = FIPS)

export function CountyCombobox({
  value,
  onChange,
}: { value: number | null; onChange: (countyId: number) => void }) {
  const [open, setOpen] = React.useState(false)
  const selected = georgiaCounties.find((c) => c.fips === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selected?.name ?? 'Select county'}
          <ChevronsUpDown className="ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search Georgia counties..." />
          <CommandList>
            <CommandEmpty>No county found.</CommandEmpty>
            <CommandGroup>
              {georgiaCounties.map((county) => (
                <CommandItem
                  key={county.fips}
                  value={county.name}
                  onSelect={() => {
                    onChange(county.fips)   // county.fips === counties.id (FIPS PK per Plan 02)
                    setOpen(false)
                  }}
                >
                  {county.name}
                  <Check
                    className={cn('ml-auto', value === county.fips ? 'opacity-100' : 'opacity-0')}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
