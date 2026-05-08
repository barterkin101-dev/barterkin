'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
}

export function StarRating({ value, onChange, size = 'md', readOnly = false }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1
        const isFilled = (hoverValue || value) >= starValue
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            className={cn(
              'transition-colors',
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110',
            )}
            onMouseEnter={() => !readOnly && setHoverValue(starValue)}
            onMouseLeave={() => !readOnly && setHoverValue(0)}
            onClick={() => !readOnly && onChange?.(starValue)}
            aria-label={`${starValue} star${starValue === 1 ? '' : 's'}`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-muted-foreground',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
