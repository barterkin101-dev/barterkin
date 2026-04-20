'use client'
import { useState } from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { X } from 'lucide-react'
import type { ProfileFormValues } from '@/lib/schemas/profile'

const MAX_SKILLS = 5

interface SkillRowListProps {
  fieldName: 'skillsOffered' | 'skillsWanted'
  placeholder: string
  groupHelp: string
}

export function SkillRowList({ fieldName, placeholder, groupHelp }: SkillRowListProps) {
  const { control, formState: { errors } } = useFormContext<ProfileFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    // react-hook-form useFieldArray works with string arrays by boxing them as { value: string }
    // We use a workaround: store as flat string array with Controller pattern
    name: fieldName as never,
  })

  const [showCapHint, setShowCapHint] = useState(false)

  function handleAddSkill() {
    if (fields.length >= MAX_SKILLS) {
      setShowCapHint(true)
      setTimeout(() => setShowCapHint(false), 3000)
      return
    }
    append('' as never)
  }

  const atCap = fields.length >= MAX_SKILLS
  const fieldErrors = errors[fieldName]

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <FormItem key={field.id}>
          <div className="flex items-center gap-2">
            <FormControl>
              <Input
                placeholder={placeholder}
                {...control.register(`${fieldName}.${index}` as never)}
              />
            </FormControl>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove skill ${index + 1}`}
                onClick={() => remove(index)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {/* Per-row error */}
          {Array.isArray(fieldErrors) && fieldErrors[index] && (
            <FormMessage>{(fieldErrors[index] as { message?: string })?.message}</FormMessage>
          )}
        </FormItem>
      ))}

      {/* Root array error (e.g. "Enter a skill or remove this row.") */}
      {fieldErrors && !Array.isArray(fieldErrors) && (
        <FormMessage>{(fieldErrors as { message?: string })?.message}</FormMessage>
      )}

      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddSkill}
          disabled={atCap}
        >
          + Add skill
        </Button>
        {showCapHint && (
          <p className="text-xs text-muted-foreground">
            You&apos;ve hit the 5-skill limit. Remove one to add another.
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{groupHelp}</p>
    </div>
  )
}
