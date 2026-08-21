import { createClient } from '@/lib/supabase/client'
import { getCurrentMonthKey, toLocalDateStr } from '@/lib/period'
import { computePeriodTotals } from '@/lib/goalPeriods'
import type { PeriodTotals } from '@/types'

export type CommercialSummary = PeriodTotals

export async function getCommercialSummary(referenceMonthKey: string = getCurrentMonthKey()): Promise<CommercialSummary> {
  const supabase = createClient()

  const [refYear, refMonth] = referenceMonthKey.split('-').map(Number)
  const referenceDate = new Date(refYear, refMonth - 1, 1)
  const currentSemester = referenceDate.getMonth() < 6 ? 0 : 1
  const semesterStart = new Date(referenceDate.getFullYear(), currentSemester * 6, 1)

  const { data, error } = await supabase
    .from('financial_entries')
    .select('value, date, status')
    .neq('status', 'cancelled')
    .gte('date', toLocalDateStr(semesterStart))

  if (error) throw new Error(error.message)
  const entries = (data ?? []).map((e) => ({ value: e.value ?? 0, date: e.date }))

  return computePeriodTotals(entries, referenceMonthKey)
}
