'use client'
import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle,
  ListTodo, ChevronDown, ChevronUp, CalendarClock,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, BarChart, Bar,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDashboardMetrics, getRevenueChartData } from '@/services/dashboard'
import { getClients } from '@/services/clients'
import { formatCurrency, formatDate, getStatusColor, getLabelByStatus, getMonthName } from '@/lib/utils'
import type { DashboardMetrics, RevenueChartData, GrowthProjection, GrowthSimulatorInputs, ClientWithProfit } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

// ─── Growth Simulator ─────────────────────────────────────────────────────────

function generateProjection(inputs: GrowthSimulatorInputs): GrowthProjection[] {
  const result: GrowthProjection[] = []
  let mrr = inputs.currentMRR
  const now = new Date()

  for (let i = 1; i <= inputs.months; i++) {
    mrr = mrr * (1 + inputs.growthRate / 100) * (1 - inputs.churnRate / 100)
    const costs = mrr * (inputs.avgCostPercentage / 100)
    const profit = mrr - costs
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    result.push({
      month: `${getMonthName(d.getMonth())}/${String(d.getFullYear()).slice(2)}`,
      mrr: Math.max(0, mrr),
      costs: Math.max(0, costs),
      profit: Math.max(0, profit),
      clients: 0,
    })
  }
  return result
}

function GrowthSimulator({ currentMRR }: { currentMRR: number }) {
  const [open, setOpen] = useState(false)
  const [inputs, setInputs] = useState<GrowthSimulatorInputs>({
    currentMRR,
    growthRate: 10,
    churnRate: 3,
    months: 12,
    avgCostPercentage: 40,
  })

  const projection = generateProjection({ ...inputs, currentMRR })
  const finalMRR = projection[projection.length - 1]?.mrr ?? 0
  const totalProfit = projection.reduce((acc, p) => acc + p.profit, 0)

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Simulador de Crescimento</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Projeção de MRR com base em crescimento e churn</p>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-6">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs">MRR Atual (R$)</Label>
              <Input type="number" value={inputs.currentMRR} onChange={(e) => setInputs({ ...inputs, currentMRR: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Crescimento Mensal (%)</Label>
              <Input type="number" value={inputs.growthRate} onChange={(e) => setInputs({ ...inputs, growthRate: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Churn Mensal (%)</Label>
              <Input type="number" value={inputs.churnRate} onChange={(e) => setInputs({ ...inputs, churnRate: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custo Médio (% da receita)</Label>
              <Input type="number" value={inputs.avgCostPercentage} onChange={(e) => setInputs({ ...inputs, avgCostPercentage: Number(e.target.value) })} />
            </div>
          </div>

          <div className="flex gap-3">
            {[3, 6, 12, 24].map((m) => (
              <button
                key={m}
                onClick={() => setInputs({ ...inputs, months: m })}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  inputs.months === m ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {m} meses
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Card className="shadow-none bg-muted/40">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">MRR Projetado</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(finalMRR)}</p>
                <p className="text-xs text-muted-foreground">em {inputs.months} meses</p>
              </CardContent>
            </Card>
            <Card className="shadow-none bg-muted/40">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Lucro Acumulado</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(totalProfit)}</p>
                <p className="text-xs text-muted-foreground">no período</p>
              </CardContent>
            </Card>
            <Card className="shadow-none bg-muted/40">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Crescimento Total</p>
                <p className="text-lg font-bold text-primary">
                  {inputs.currentMRR > 0 ? `${(((finalMRR - inputs.currentMRR) / inputs.currentMRR) * 100).toFixed(0)}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">vs MRR atual</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={projection} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="mrr" name="MRR" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="costs" name="Custos" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" name="Lucro" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [chartData, setChartData] = useState<RevenueChartData[]>([])
  const [clients, setClients] = useState<ClientWithProfit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([getDashboardMetrics(), getRevenueChartData(), getClients()])
      .then(([m, c, cl]) => { setMetrics(m); setChartData(c); setClients(cl) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // Alertas de renovação (próximos 30 dias)
  const today = new Date()
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30)
  const renewalAlerts = clients.filter((c) => {
    if (!c.renewal_date || c.status !== 'active') return false
    const d = new Date(c.renewal_date)
    return d >= today && d <= in30
  })

  // Comparativo mês atual vs anterior
  const currentMonth = chartData[chartData.length - 1]
  const prevMonth = chartData[chartData.length - 2]
  const revDiff = currentMonth && prevMonth && prevMonth.revenue > 0
    ? ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
    : null

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Erro ao conectar com o banco de dados.</p>
        <p className="text-xs text-muted-foreground">Verifique as variáveis de ambiente e a conexão com o Supabase.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-28" /><Skeleton className="h-3 w-24" /></CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!metrics) return null

  const cards = [
    { title: 'MRR', value: formatCurrency(metrics.mrr), icon: DollarSign, description: 'Receita mensal recorrente', color: 'text-emerald-600' },
    { title: 'Receita Total', value: formatCurrency(metrics.totalRevenue), icon: TrendingUp, description: revDiff !== null ? `${revDiff >= 0 ? '+' : ''}${revDiff.toFixed(1)}% vs mês anterior` : 'Todas as entradas confirmadas', color: 'text-blue-600' },
    { title: 'Custos Totais', value: formatCurrency(metrics.totalCosts), icon: TrendingDown, description: 'Total de despesas registradas', color: 'text-red-500' },
    { title: 'Lucro', value: formatCurrency(metrics.profit), icon: TrendingUp, description: 'Receita menos custos', color: metrics.profit >= 0 ? 'text-emerald-600' : 'text-red-500' },
    { title: 'Clientes Ativos', value: String(metrics.activeClients), icon: Users, description: `${metrics.churnedClients} churned`, color: 'text-blue-600' },
    { title: 'Tarefas Pendentes', value: String(metrics.pendingTasks), icon: ListTodo, description: 'Fora do status "done"', color: 'text-amber-600' },
    { title: 'Receita em Risco', value: formatCurrency(metrics.revenueAtRisk), icon: AlertTriangle, description: 'Tasks que impactam receita', color: 'text-red-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Alertas de renovação */}
      {renewalAlerts.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm text-amber-800">
                {renewalAlerts.length} cliente{renewalAlerts.length > 1 ? 's' : ''} com renovação nos próximos 30 dias
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {renewalAlerts.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs">
                  <span className="font-medium text-amber-900">{c.name}</span>
                  <span className="text-amber-600">{formatDate(c.renewal_date)}</span>
                  <span className="text-amber-500">{formatCurrency(c.monthly_revenue)}/mês</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Receita vs Custos — últimos 6 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" name="Receita" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} />
              <Area type="monotone" dataKey="costs" name="Custos" stroke="#ef4444" fill="url(#colorCosts)" strokeWidth={2} />
              <Area type="monotone" dataKey="profit" name="Lucro" stroke="#3b82f6" fill="url(#colorProfit)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Growth Simulator */}
      <GrowthSimulator currentMRR={metrics.mrr} />
    </div>
  )
}
