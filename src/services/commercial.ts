import { createClient } from '@/lib/supabase/client'
import { getMonthName } from '@/lib/utils'
import { getCurrentMonthKey, toLocalDateStr } from '@/lib/period'

export interface CommercialSummary {
  today: number
  thisWeek: number
  thisMonth: number
  semesterTotal: number
  semesterMonthly: { month: string; value: number }[]
  semesterLabel: string
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // segunda = 0
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

export async function getCommercialSummary(referenceMonthKey: string = getCurrentMonthKey()): Promise<CommercialSummary> {
  const supabase = createClient()

  const now = new Date()
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
  const entries = data ?? []

  const todayStr = toLocalDateStr(now)
  const weekStartStr = toLocalDateStr(startOfWeek(now))
  const monthKey = referenceMonthKey

  const today = entries
    .filter((e) => e.date === todayStr)
    .reduce((acc, e) => acc + (e.value ?? 0), 0)

  const thisWeek = entries
    .filter((e) => e.date >= weekStartStr && e.date <= todayStr)
    .reduce((acc, e) => acc + (e.value ?? 0), 0)

  const thisMonth = entries
    .filter((e) => e.date.startsWith(monthKey))
    .reduce((acc, e) => acc + (e.value ?? 0), 0)

  const semesterTotal = entries.reduce((acc, e) => acc + (e.value ?? 0), 0)

  const semesterMonthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(referenceDate.getFullYear(), currentSemester * 6 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${getMonthName(d.getMonth())}/${String(d.getFullYear()).slice(2)}`
    const value = entries
      .filter((e) => e.date.startsWith(key))
      .reduce((acc, e) => acc + (e.value ?? 0), 0)
    return { month: label, value }
  })

  const semesterLabel = `${getMonthName(currentSemester * 6)}–${getMonthName(currentSemester * 6 + 5)}/${String(referenceDate.getFullYear()).slice(2)}`

  return { today, thisWeek, thisMonth, semesterTotal, semesterMonthly, semesterLabel }
}
