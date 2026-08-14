import { format } from 'date-fns'

/** Formata uma data para "YYYY-MM-DD" no fuso local (evita o off-by-one de toISOString() em fusos negativos). */
export function toLocalDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Mês atual em "YYYY-MM", no fuso local. */
export function getCurrentMonthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Soma/subtrai `delta` meses a uma chave "YYYY-MM". */
export function shiftMonthKey(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface MonthOption {
  value: string
  label: string
}

/**
 * Lista de opções de mês (mais recente primeiro) para os últimos `monthsBack` meses.
 * Se `allLabel` for informado, inclui uma opção `value: 'all'` no topo.
 */
export function getMonthOptions(allLabel?: string, monthsBack = 24): MonthOption[] {
  const opts: MonthOption[] = allLabel ? [{ value: 'all', label: allLabel }] : []
  const now = new Date()
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}
