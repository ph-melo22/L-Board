'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCurrentMonthKey, getMonthOptions, shiftMonthKey } from '@/lib/period'
import { useTranslations } from 'next-intl'

interface PeriodSelectorProps {
  value: string
  onChange: (value: string) => void
  allowAll?: boolean
  monthsBack?: number
  className?: string
}

export function PeriodSelector({ value, onChange, allowAll = false, monthsBack = 24, className }: PeriodSelectorProps) {
  const tc = useTranslations('common')
  const options = getMonthOptions(allowAll ? tc('all') : undefined, monthsBack)
  const currentMonth = getCurrentMonthKey()

  const canGoPrev = value !== 'all'
  const canGoNext = value !== 'all' && value < currentMonth

  function goPrev() {
    if (value === 'all') return
    onChange(shiftMonthKey(value, -1))
  }
  function goNext() {
    if (value === 'all' || value >= currentMonth) return
    onChange(shiftMonthKey(value, 1))
  }

  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${className ?? ''}`}>
      <Label className="text-xs text-muted-foreground shrink-0">{tc('period')}</Label>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 md:h-9 md:w-9" disabled={!canGoPrev} onClick={goPrev} aria-label={tc('previous')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full sm:w-52 h-10 text-base md:h-9 md:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 md:h-9 md:w-9" disabled={!canGoNext} onClick={goNext} aria-label={tc('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
