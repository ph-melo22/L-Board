import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export function calculateProfit(revenue: number, cost: number): number {
  return revenue - cost
}

export function calculateMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0
  return ((revenue - cost) / revenue) * 100
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Client status
    active: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    inactive: 'text-gray-600 bg-gray-50 border-gray-200',
    churned: 'text-red-600 bg-red-50 border-red-200',
    trial: 'text-blue-600 bg-blue-50 border-blue-200',
    // Task status
    backlog: 'text-gray-600 bg-gray-50 border-gray-200',
    todo: 'text-blue-600 bg-blue-50 border-blue-200',
    in_progress: 'text-amber-600 bg-amber-50 border-amber-200',
    review: 'text-purple-600 bg-purple-50 border-purple-200',
    done: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    // Financial
    confirmed: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    pending: 'text-amber-600 bg-amber-50 border-amber-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200',
    pago: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    atrasado: 'text-red-600 bg-red-50 border-red-200',
    recebido: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    inadimplente: 'text-red-600 bg-red-50 border-red-200',
    // OKR
    on_track: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    at_risk: 'text-amber-600 bg-amber-50 border-amber-200',
    off_track: 'text-red-600 bg-red-50 border-red-200',
    completed: 'text-blue-600 bg-blue-50 border-blue-200',
  }
  return colors[status] ?? 'text-gray-600 bg-gray-50 border-gray-200'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'text-gray-500',
    medium: 'text-blue-500',
    high: 'text-amber-500',
    critical: 'text-red-500',
  }
  return colors[priority] ?? 'text-gray-500'
}

export function getLabelByStatus(status: string): string {
  const labels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    churned: 'Churned',
    trial: 'Trial',
    backlog: 'Backlog',
    todo: 'A fazer',
    in_progress: 'Em progresso',
    review: 'Revisão',
    done: 'Concluído',
    confirmed: 'Confirmado',
    pending: 'Pendente',
    cancelled: 'Cancelado',
    on_track: 'No prazo',
    at_risk: 'Em risco',
    off_track: 'Atrasado',
    completed: 'Concluído',
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
    recurring: 'Recorrente',
    one_time: 'Pontual',
    upsell: 'Upsell',
    fixed: 'Fixo',
    variable: 'Variável',
    investment: 'Investimento',
    subscription: 'Assinatura',
    consulting: 'Consultoria',
    implementation: 'Implantação',
    support: 'Suporte',
    other: 'Outro',
    infrastructure: 'Infraestrutura',
    payroll: 'Folha',
    marketing: 'Marketing',
    tools: 'Ferramentas',
    office: 'Escritório',
    taxes: 'Impostos',
    planning: 'Planejando',
    pago: 'Pago',
    atrasado: 'Atrasado',
    recebido: 'Recebido',
    inadimplente: 'Inadimplente',
    cogs: 'CMV/CPV',
    opex: 'Despesa Operacional',
    da: 'Depr./Amort.',
  }
  return labels[status] ?? status
}

export function getMonthName(monthIndex: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return months[monthIndex] ?? ''
}
