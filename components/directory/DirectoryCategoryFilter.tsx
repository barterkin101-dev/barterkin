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
import { CATEGORIES } from '@/lib/data/categories'

export function DirectoryCategoryFilter({
  value,
  onChange,
}: {
  value: string | null
  onChange: (slug: string | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const selected = CATEGORIES.find((c) => c.slug === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by category"
          className="h-11 w-full min-w-[200px] justify-between border-sage-light text-forest-deep hover:bg-sage-bg"
        >
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected?.name ?? 'Category'}
          </span>
          <ChevronsUpDown className="ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                key="__all__"
                value="All categories"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
                className="data-[selected=true]:bg-clay data-[selected=true]:text-primary-foreground"
              >
                All categories
                <Check className={cn('ml-auto', value === null ? 'opacity-100' : 'opacity-0')} />
              </CommandItem>
              {CATEGORIES.map((c) => (
                <CommandItem
                  key={c.slug}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.slug)
                    setOpen(false)
                  }}
                  className="data-[selected=true]:bg-clay data-[selected=true]:text-primary-foreground"
                >
                  {c.name}
                  <Check className={cn('ml-auto', value === c.slug ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
