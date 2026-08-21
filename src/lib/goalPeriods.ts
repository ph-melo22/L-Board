import { getMonthName } from './utils'
import { toLocalDateStr } from './period'
import type { PeriodTotals } from '@/types'

export interface PeriodEntry {
  value: number
  date: string
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // segunda = 0
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Soma um conjunto de entradas {value, date} em today / thisWeek / thisMonth
 * (referenceMonthKey) / semesterTotal — mesma lógica usada por Comercial
 * (financial_entries) e pelas metas individuais de vendedor (crm_leads).
 */
export function computePeriodTotals(entries: PeriodEntry[], referenceMonthKey: string): PeriodTotals {
  const now = new Date()
  const [refYear, refMonth] = referenceMonthKey.split('-').map(Number)
  const referenceDate = new Date(refYear, refMonth - 1, 1)
  const currentSemester = referenceDate.getMonth() < 6 ? 0 : 1
  const semesterStart = new Date(referenceDate.getFullYear(), currentSemester * 6, 1)
  const semesterStartStr = toLocalDateStr(semesterStart)

  const scoped = entries.filter((e) => e.date >= semesterStartStr)

  const todayStr = toLocalDateStr(now)
  const weekStartStr = toLocalDateStr(startOfWeek(now))
  const monthKey = referenceMonthKey

  const today = scoped
    .filter((e) => e.date === todayStr)
    .reduce((acc, e) => acc + e.value, 0)

  const thisWeek = scoped
    .filter((e) => e.date >= weekStartStr && e.date <= todayStr)
    .reduce((acc, e) => acc + e.value, 0)

  const thisMonth = scoped
    .filter((e) => e.date.startsWith(monthKey))
    .reduce((acc, e) => acc + e.value, 0)

  const semesterTotal = scoped.reduce((acc, e) => acc + e.value, 0)

  const semesterMonthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(referenceDate.getFullYear(), currentSemester * 6 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${getMonthName(d.getMonth())}/${String(d.getFullYear()).slice(2)}`
    const value = scoped
      .filter((e) => e.date.startsWith(key))
      .reduce((acc, e) => acc + e.value, 0)
    return { month: label, value }
  })

  const semesterLabel = `${getMonthName(currentSemester * 6)}–${getMonthName(currentSemester * 6 + 5)}/${String(referenceDate.getFullYear()).slice(2)}`

  return { today, thisWeek, thisMonth, semesterTotal, semesterMonthly, semesterLabel }
}
