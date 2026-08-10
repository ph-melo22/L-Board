import { createClient } from '@/lib/supabase/client'
import { getMonthName } from '@/lib/utils'

export interface CommercialSummary {
  today: number
  thisWeek: number
  thisMonth: number
  semesterTotal: number
  semesterMonthly: { month: string; value: number }[]
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // segunda = 0
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export async function getCommercialSummary(): Promise<CommercialSummary> {
  const supabase = createClient()

  const now = new Date()
  const currentSemester = now.getMonth() < 6 ? 0 : 1
  const semesterStart = new Date(now.getFullYear(), currentSemester * 6, 1)

  const { data, error } = await supabase
    .from('financial_entries')
    .select('value, date, status')
    .neq('status', 'cancelled')
    .gte('date', toDateStr(semesterStart))

  if (error) throw new Error(error.message)
  const entries = data ?? []

  const todayStr = toDateStr(now)
  const weekStartStr = toDateStr(startOfWeek(now))
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

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
    const d = new Date(now.getFullYear(), currentSemester * 6 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${getMonthName(d.getMonth())}/${String(d.getFullYear()).slice(2)}`
    const value = entries
      .filter((e) => e.date.startsWith(key))
      .reduce((acc, e) => acc + (e.value ?? 0), 0)
    return { month: label, value }
  })

  return { today, thisWeek, thisMonth, semesterTotal, semesterMonthly }
}
