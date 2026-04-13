import { createClient } from '@/lib/supabase/client'
import type { DashboardMetrics, RevenueChartData } from '@/types'
import { getMonthName } from '@/lib/utils'

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = createClient()

  const [clientsRes, entriesRes, expensesRes, tasksRes] = await Promise.all([
    supabase.from('clients').select('monthly_revenue, operational_cost, status'),
    supabase.from('financial_entries').select('value, status').neq('status', 'cancelled'),
    supabase.from('financial_expenses').select('value'),
    supabase.from('tasks').select('status, impacts_revenue, revenue_impact_value').neq('status', 'done'),
  ])

  const clients = clientsRes.data ?? []
  const entries = entriesRes.data ?? []
  const expenses = expensesRes.data ?? []
  const tasks = tasksRes.data ?? []

  const activeClients = clients.filter((c) => c.status === 'active')
  const churnedClients = clients.filter((c) => c.status === 'churned')

  const mrr = activeClients.reduce((acc, c) => acc + (c.monthly_revenue ?? 0), 0)
  const totalRevenue = entries.reduce((acc, e) => acc + (e.value ?? 0), 0)
  const totalCosts = expenses.reduce((acc, e) => acc + (e.value ?? 0), 0)
  const profit = totalRevenue - totalCosts

  const pendingTasks = tasks.filter((t) => t.status !== 'done').length
  const revenueAtRisk = tasks
    .filter((t) => t.impacts_revenue)
    .reduce((acc, t) => acc + (t.revenue_impact_value ?? 0), 0)

  return {
    totalRevenue,
    mrr,
    totalCosts,
    profit,
    activeClients: activeClients.length,
    churnedClients: churnedClients.length,
    pendingTasks,
    revenueAtRisk,
  }
}

export async function getRevenueChartData(): Promise<RevenueChartData[]> {
  const supabase = createClient()

  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [entriesRes, expensesRes] = await Promise.all([
    supabase
      .from('financial_entries')
      .select('value, date, status')
      .gte('date', sixMonthsAgo.toISOString().split('T')[0])
      .neq('status', 'cancelled'),
    supabase
      .from('financial_expenses')
      .select('value, date')
      .gte('date', sixMonthsAgo.toISOString().split('T')[0]),
  ])

  const entries = entriesRes.data ?? []
  const expenses = expensesRes.data ?? []

  const months: RevenueChartData[] = []

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = `${getMonthName(date.getMonth())}/${String(date.getFullYear()).slice(2)}`

    const revenue = entries
      .filter((e) => e.date.startsWith(monthStr))
      .reduce((acc, e) => acc + (e.value ?? 0), 0)

    const costs = expenses
      .filter((e) => e.date.startsWith(monthStr))
      .reduce((acc, e) => acc + (e.value ?? 0), 0)

    months.push({ month: label, revenue, costs, profit: revenue - costs })
  }

  return months
}
