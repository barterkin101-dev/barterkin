'use client'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/data/categories'

interface CategoryPickerProps {
  value: number | null
  onChange: (categoryId: number) => void
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <RadioGroup
      value={value != null ? String(value) : ''}
      onValueChange={(v) => onChange(Number(v))}
      className="grid grid-cols-2 gap-2 md:grid-cols-3"
    >
      {CATEGORIES.map((cat) => {
        const isSelected = value === cat.id
        return (
          <div key={cat.id} className="relative">
            <RadioGroupItem
              value={String(cat.id)}
              id={`category-${cat.id}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`category-${cat.id}`}
              className={cn(
                'flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-center text-sm font-medium transition-colors',
                'hover:bg-sage-pale hover:border-forest-mid',
                isSelected
                  ? 'border-forest-mid bg-sage-pale text-forest-deep'
                  : 'border-border bg-background text-foreground',
              )}
            >
              {cat.name}
            </Label>
          </div>
        )
      })}
    </RadioGroup>
  )
}
