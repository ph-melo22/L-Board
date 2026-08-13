'use client'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  className?: string
}

export function Checkbox({ checked, onCheckedChange, id, className }: CheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded border p-1 transition-colors sm:h-4 sm:w-4 sm:p-0',
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background hover:border-primary/50',
        className
      )}
    >
      {checked && <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3" strokeWidth={3} />}
    </button>
  )
}
