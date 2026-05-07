'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, Target, Clock, CheckCircle, XCircle, BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  getFinancialEntries, createFinancialEntry, updateFinancialEntry, deleteFinancialEntry,
  getFinancialExpenses, createFinancialExpense, updateFinancialExpense, deleteFinancialExpense,
} from '@/services/financial'
import { getClientOptions } from '@/services/clients'
import {
  getAllClients, getTeamCount,
  getImpostos, createImposto, updateImposto, deleteImposto,
  getContasPagar, createContaPagar, updateContaPagar, deleteContaPagar,
  getContasReceber, createContaReceber, updateContaReceber, deleteContaReceber,
  calcDRE, calcFluxoCaixa, calcIndicadores, calcAlertas,
  type Imposto, type ImpostoFormData,
  type ContaPagar, type ContaPagarFormData,
  type ContaReceber, type ContaReceberFormData,
} from '@/services/contador'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import type {
  FinancialEntry, FinancialEntryFormData, FinancialEntryType, FinancialEntryStatus, FinancialEntryCategory,
  FinancialExpense, FinancialExpenseFormData, ExpenseType, ExpenseCategory, ExpenseNature, Client,
} from '@/types'
import { useTranslations, useLocale } from 'next-intl'

// ─── Constants ────────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().split('T')[0]

const EMPTY_ENTRY: FinancialEntryFormData = {
  client_id: null, value: 0, type: 'recurring', category: 'subscription',
  status: 'confirmed', date: todayStr, description: null,
}
const EMPTY_EXPENSE: FinancialExpenseFormData & { nature: ExpenseNature } = {
  supplier: '', category: 'infrastructure', cost_center: null, value: 0,
  type: 'fixed', nature: 'opex', date: todayStr, description: null,
}
const EMPTY_IMPOSTO: ImpostoFormData = {
  tipo: '', competencia: todayStr.substring(0, 7) + '-01',
  valor: 0, status: 'pendente', vencimento: null, data_pagamento: null, notas: null,
}
const EMPTY_CONTA_PAGAR: ContaPagarFormData = {
  descricao: '', fornecedor: null, valor: 0, vencimento: todayStr,
  status: 'pendente', categoria: null, data_pagamento: null, notas: null,
}
const EMPTY_CONTA_RECEBER: ContaReceberFormData = {
  cliente: '', client_id: null, descricao: null, valor: 0,
  previsao: todayStr, status: 'pendente', numero_nf: null, notas: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriodOptions(allLabel: string, accLabelFn: (year: number) => string, locale: string) {
  const opts = [{ value: 'all', label: allLabel }]
  const now = new Date()
  opts.push({ value: String(now.getFullYear()), label: accLabelFn(now.getFullYear()) })
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}

function getDisplayStatusContaPagar(item: ContaPagar): string {
  if (item.status === 'pago') return 'pago'
  if (item.vencimento < todayStr) return 'atrasado'
  return 'pendente'
}

function getDisplayStatusImposto(item: Imposto): string {
  if (item.status === 'pago') return 'pago'
  if (item.vencimento && item.vencimento < todayStr) return 'atrasado'
  return 'pendente'
}

function getDisplayStatusContaReceber(item: ContaReceber): string {
  if (item.status === 'recebido') return 'recebido'
  if (item.previsao < todayStr) return 'inadimplente'
  return 'pendente'
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ''}`} />
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(status)}`}>
      {label}
    </span>
  )
}

function KPICard({
  title, value, sub, color = 'default', trend, trendLabel,
}: {
  title: string
  value: string
  sub?: string
  color?: 'green' | 'red' | 'amber' | 'default'
  trend?: number
  trendLabel?: string
}) {
  const valueColor = {
    green: 'text-emerald-600',
    red: 'text-red-500',
    amber: 'text-amber-500',
    default: 'text-foreground',
  }[color]

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        {trend !== undefined && trend !== 0 && (
          <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}% {trendLabel}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DRERow({
  label, value, indent = 0, bold = false, separator = false, margin,
  highlight = false, sub = false,
}: {
  label?: string; value?: number; indent?: number
  bold?: boolean; separator?: boolean; margin?: number
  highlight?: boolean; sub?: boolean
}) {
  if (separator) return <tr><td colSpan={3} className="py-1"><Separator /></td></tr>
  const isNegative = value !== undefined && value < 0
  const displayValue = value !== undefined
    ? isNegative
      ? `(${formatCurrency(Math.abs(value))})`
      : formatCurrency(value)
    : ''

  return (
    <tr className={highlight ? 'bg-muted/40' : ''}>
      <td className={`py-1.5 text-sm ${bold ? 'font-semibold' : ''} ${sub ? 'text-muted-foreground' : ''}`}
        style={{ paddingLeft: `${indent * 16 + 4}px` }}>
        {label}
      </td>
      <td className={`py-1.5 text-right text-sm ${bold ? 'font-semibold' : ''} ${isNegative ? 'text-red-500' : ''} ${sub ? 'text-muted-foreground' : ''}`}>
        {displayValue}
      </td>
      <td className="py-1.5 pl-4 text-right text-xs text-muted-foreground w-16">
        {margin !== undefined && margin !== 0 ? `${margin.toFixed(1)}%` : ''}
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContadorPage() {
  const t = useTranslations('contador')
  const tc = useTranslations('common')
  const tl = useTranslations('labels')
  const td = useTranslations('contador.dialogs')
  const locale = useLocale()
  const { toast } = useToast()

  const periodOptions = useMemo(
    () => getPeriodOptions(t('allPeriods'), (year) => t('accumulated', { year }), locale),
    [t, locale]
  )

  // ── Data state ──
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [expenses, setExpenses] = useState<(FinancialExpense & { nature?: ExpenseNature })[]>([])
  const [impostos, setImpostos] = useState<Imposto[]>([])
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([])
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([])
  const [teamCount, setTeamCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // ── UI state ──
  const [drePeriod, setDrePeriod] = useState('all')
  const [lancTab, setLancTab] = useState('receitas')
  const [contasTab, setContasTab] = useState('pagar')
  const [saving, setSaving] = useState(false)

  // ── Modal state ──
  const [entryModal, setEntryModal] = useState<{ open: boolean; item: FinancialEntry | null }>({ open: false, item: null })
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; item: (FinancialExpense & { nature?: ExpenseNature }) | null }>({ open: false, item: null })
  const [impostoModal, setImpostoModal] = useState<{ open: boolean; item: Imposto | null }>({ open: false, item: null })
  const [contaPagarModal, setContaPagarModal] = useState<{ open: boolean; item: ContaPagar | null }>({ open: false, item: null })
  const [contaReceberModal, setContaReceberModal] = useState<{ open: boolean; item: ContaReceber | null }>({ open: false, item: null })
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null)

  // ── Form state ──
  const [entryForm, setEntryForm] = useState<FinancialEntryFormData>(EMPTY_ENTRY)
  const [expenseForm, setExpenseForm] = useState<FinancialExpenseFormData & { nature: ExpenseNature }>(EMPTY_EXPENSE)
  const [impostoForm, setImpostoForm] = useState<ImpostoFormData>(EMPTY_IMPOSTO)
  const [contaPagarForm, setContaPagarForm] = useState<ContaPagarFormData>(EMPTY_CONTA_PAGAR)
  const [contaReceberForm, setContaReceberForm] = useState<ContaReceberFormData>(EMPTY_CONTA_RECEBER)

  // ── Load ──
  async function load() {
    setLoading(true)
    try {
      const [e, ex, im, cp, cr, cl, co, tc] = await Promise.all([
        getFinancialEntries(),
        getFinancialExpenses(),
        getImpostos(),
        getContasPagar(),
        getContasReceber(),
        getAllClients(),
        getClientOptions(),
        getTeamCount(),
      ])
      setEntries(e); setExpenses(ex); setImpostos(im)
      setContasPagar(cp); setContasReceber(cr)
      setClients(cl); setClientOptions(co); setTeamCount(tc)
      setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // ── Derived calculations ──
  const dre = useMemo(() => calcDRE(entries, expenses, impostos, drePeriod), [entries, expenses, impostos, drePeriod])
  const dreAll = useMemo(() => calcDRE(entries, expenses, impostos, 'all'), [entries, expenses, impostos])
  const fluxo = useMemo(() => calcFluxoCaixa(entries, expenses), [entries, expenses])
  const ind = useMemo(() => calcIndicadores(entries, expenses, clients, teamCount), [entries, expenses, clients, teamCount])
  const alertas = useMemo(() => calcAlertas(dreAll, ind, impostos, contasPagar, entries), [dreAll, ind, impostos, contasPagar, entries])

  const saldoEstimado = useMemo(() => fluxo.reduce((s, m) => s + m.saldo, 0), [fluxo])
  const last3 = fluxo.slice(-3)
  const avgNet = last3.length > 0 ? last3.reduce((s, m) => s + m.saldo, 0) / last3.length : 0
  const pendentesEntradas = useMemo(() =>
    entries.filter((e) => e.status === 'pending').reduce((s, e) => s + e.value, 0) +
    contasReceber.filter((c) => c.status !== 'recebido').reduce((s, c) => s + c.valor, 0),
    [entries, contasReceber]
  )
  const pendentesSaidas = useMemo(() =>
    contasPagar.filter((c) => c.status !== 'pago').reduce((s, c) => s + c.valor, 0) +
    impostos.filter((i) => i.status !== 'pago').reduce((s, i) => s + i.valor, 0),
    [contasPagar, impostos]
  )

  // ── Handlers: Entry ──
  function openEntry(item?: FinancialEntry) {
    setEntryForm(item
      ? { client_id: item.client_id, value: item.value, type: item.type, category: item.category, status: item.status, date: item.date, description: item.description }
      : EMPTY_ENTRY)
    setEntryModal({ open: true, item: item ?? null })
  }
  async function saveEntry() {
    setSaving(true)
    try {
      if (entryModal.item) { await updateFinancialEntry(entryModal.item.id, entryForm); toast({ title: t('toast.receitaUpdated') }) }
      else { await createFinancialEntry(entryForm); toast({ title: t('toast.receitaCreated') }) }
      setEntryModal({ open: false, item: null }); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  // ── Handlers: Expense ──
  function openExpense(item?: FinancialExpense & { nature?: ExpenseNature }) {
    setExpenseForm(item
      ? { supplier: item.supplier, category: item.category, cost_center: item.cost_center, value: item.value, type: item.type, nature: item.nature ?? 'opex', date: item.date, description: item.description }
      : EMPTY_EXPENSE)
    setExpenseModal({ open: true, item: item ?? null })
  }
  async function saveExpense() {
    setSaving(true)
    try {
      if (expenseModal.item) { await updateFinancialExpense(expenseModal.item.id, expenseForm); toast({ title: t('toast.despesaUpdated') }) }
      else { await createFinancialExpense(expenseForm); toast({ title: t('toast.despesaCreated') }) }
      setExpenseModal({ open: false, item: null }); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  // ── Handlers: Imposto ──
  function openImposto(item?: Imposto) {
    setImpostoForm(item
      ? { tipo: item.tipo, competencia: item.competencia, valor: item.valor, status: item.status, vencimento: item.vencimento, data_pagamento: item.data_pagamento, notas: item.notas }
      : EMPTY_IMPOSTO)
    setImpostoModal({ open: true, item: item ?? null })
  }
  async function saveImposto() {
    setSaving(true)
    try {
      if (impostoModal.item) { await updateImposto(impostoModal.item.id, impostoForm); toast({ title: t('toast.impostoUpdated') }) }
      else { await createImposto(impostoForm); toast({ title: t('toast.impostoCreated') }) }
      setImpostoModal({ open: false, item: null }); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  // ── Handlers: Conta a Pagar ──
  function openContaPagar(item?: ContaPagar) {
    setContaPagarForm(item
      ? { descricao: item.descricao, fornecedor: item.fornecedor, valor: item.valor, vencimento: item.vencimento, status: item.status, categoria: item.categoria, data_pagamento: item.data_pagamento, notas: item.notas }
      : EMPTY_CONTA_PAGAR)
    setContaPagarModal({ open: true, item: item ?? null })
  }
  async function saveContaPagar() {
    setSaving(true)
    try {
      if (contaPagarModal.item) { await updateContaPagar(contaPagarModal.item.id, contaPagarForm); toast({ title: t('toast.contaUpdated') }) }
      else { await createContaPagar(contaPagarForm); toast({ title: t('toast.contaCreated') }) }
      setContaPagarModal({ open: false, item: null }); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  // ── Handlers: Conta a Receber ──
  function openContaReceber(item?: ContaReceber) {
    setContaReceberForm(item
      ? { cliente: item.cliente, client_id: item.client_id, descricao: item.descricao, valor: item.valor, previsao: item.previsao, status: item.status, numero_nf: item.numero_nf, notas: item.notas }
      : EMPTY_CONTA_RECEBER)
    setContaReceberModal({ open: true, item: item ?? null })
  }
  async function saveContaReceber() {
    setSaving(true)
    try {
      if (contaReceberModal.item) { await updateContaReceber(contaReceberModal.item.id, contaReceberForm); toast({ title: t('toast.contaUpdated') }) }
      else { await createContaReceber(contaReceberForm); toast({ title: t('toast.contaCreated') }) }
      setContaReceberModal({ open: false, item: null }); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  // ── Handler: Delete ──
  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const { type, id } = deleteTarget
      if (type === 'entry') await deleteFinancialEntry(id)
      else if (type === 'expense') await deleteFinancialExpense(id)
      else if (type === 'imposto') await deleteImposto(id)
      else if (type === 'pagar') await deleteContaPagar(id)
      else if (type === 'receber') await deleteContaReceber(id)
      toast({ title: t('removedSuccess') }); load()
    } catch { toast({ title: t('toast.removeError'), variant: 'destructive' }) }
    finally { setDeleteTarget(null) }
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">{t('errorLoading')}</p>
        <Button size="sm" variant="outline" onClick={load}>{tc('retry')}</Button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Alertas */}
      {!loading && alertas.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex flex-wrap gap-2">
            {alertas.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  a.tipo === 'critical'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                }`}
              >
                {a.tipo === 'critical' ? <XCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                <span className="font-semibold">{a.titulo}:</span> {a.descricao}
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="visao-geral">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="visao-geral">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="dre">{t('tabs.dre')}</TabsTrigger>
          <TabsTrigger value="caixa">{t('tabs.caixa')}</TabsTrigger>
          <TabsTrigger value="lancamentos">{t('tabs.lancamentos')}</TabsTrigger>
          <TabsTrigger value="contas">{t('tabs.contas')}</TabsTrigger>
          <TabsTrigger value="indicadores">{t('tabs.indicadores')}</TabsTrigger>
        </TabsList>

        {/* ── TAB: VISÃO GERAL ─────────────────────────────────────────────── */}
        <TabsContent value="visao-geral" className="space-y-6 pt-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('overview.financialHealth')}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title={t('kpi.totalRevenue')} value={formatCurrency(dreAll.receitaBruta)} color="green" />
                  <KPICard title={t('kpi.netProfit')} value={formatCurrency(dreAll.lucroLiquido)} color={dreAll.lucroLiquido >= 0 ? 'green' : 'red'} />
                  <KPICard title={t('kpi.ebitda')} value={formatCurrency(dreAll.ebitda)} color={dreAll.ebitda >= 0 ? 'green' : 'red'} sub={t('kpi.ebitdaMarginLabel', { pct: dreAll.margemEbitda.toFixed(1) })} />
                  <KPICard title={t('kpi.grossMargin')} value={`${dreAll.margemBruta.toFixed(1)}%`} color={dreAll.margemBruta >= 40 ? 'green' : dreAll.margemBruta >= 20 ? 'amber' : 'red'} sub={t('kpi.netMarginLabel', { pct: dreAll.margemLiquida.toFixed(1) })} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('overview.cash')}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title={t('kpi.mrr')} value={formatCurrency(ind.mrr)} color="green" sub={t('kpi.mrrSub')} />
                  <KPICard title={t('kpi.estimatedCash')} value={formatCurrency(saldoEstimado)} color={saldoEstimado >= 0 ? 'green' : 'red'} sub={t('kpi.estimatedCashSub')} />
                  <KPICard title={t('kpi.burnRate')} value={formatCurrency(ind.burnRate)} sub={t('kpi.burnRateSub')} />
                  <KPICard title={t('kpi.runway')} value={ind.runway > 0 ? t('kpi.runwayMonths', { months: ind.runway.toFixed(1) }) : '—'} color={ind.runway > 6 ? 'green' : ind.runway > 3 ? 'amber' : ind.runway > 0 ? 'red' : 'default'} sub={t('kpi.runwaySub')} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('overview.efficiency')}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title={t('kpi.cac')} value={ind.cac > 0 ? formatCurrency(ind.cac) : '—'} sub={t('kpi.cacSub')} />
                  <KPICard title={t('kpi.ltv')} value={ind.ltv > 0 ? formatCurrency(ind.ltv) : '—'} sub={t('kpi.ltvSub')} />
                  <KPICard title={t('kpi.ltvCac')} value={ind.ltvCac > 0 ? `${ind.ltvCac.toFixed(2)}x` : '—'} color={ind.ltvCac >= 3 ? 'green' : ind.ltvCac >= 1 ? 'amber' : ind.ltvCac > 0 ? 'red' : 'default'} sub={t('kpi.ltvCacSub')} />
                  <KPICard title={t('kpi.avgTicket')} value={formatCurrency(ind.ticketMedio)} trend={ind.crescimentoMensal} trendLabel={t('kpi.vsPrevMonth')} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('overview.risks')}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      {[
                        { label: t('overview.overdueImpostos'), value: impostos.filter((i) => i.status !== 'pago' && i.vencimento && i.vencimento < todayStr).length, icon: XCircle, bad: true },
                        { label: t('overview.overdueContas'), value: contasPagar.filter((c) => c.status !== 'pago' && c.vencimento < todayStr).length, icon: XCircle, bad: true },
                        { label: t('overview.pendingImpostos'), value: impostos.filter((i) => i.status === 'pendente').length, icon: Clock, bad: false },
                        { label: t('overview.pendingContas'), value: contasPagar.filter((c) => c.status === 'pendente').length, icon: Clock, bad: false },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <item.icon className={`h-4 w-4 ${item.bad && item.value > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                            <span className="text-muted-foreground">{item.label}</span>
                          </div>
                          <span className={`font-semibold ${item.bad && item.value > 0 ? 'text-red-500' : ''}`}>{item.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      {[
                        { label: t('overview.pendingRevenue'), value: formatCurrency(entries.filter((e) => e.status === 'pending').reduce((s, e) => s + e.value, 0)) },
                        { label: t('overview.pendingReceivables'), value: formatCurrency(contasReceber.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.valor, 0)) },
                        { label: t('overview.delinquency'), value: formatCurrency(contasReceber.filter((c) => c.status === 'inadimplente' || (c.status === 'pendente' && c.previsao < todayStr)).reduce((s, c) => s + c.valor, 0)) },
                        { label: t('overview.totalPendingEntries'), value: formatCurrency(pendentesEntradas) },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── TAB: DRE ─────────────────────────────────────────────────────── */}
        <TabsContent value="dre" className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">{t('period')}</Label>
            <Select value={drePeriod} onValueChange={setDrePeriod}>
              <SelectTrigger className="w-56 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periodOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? <Skeleton className="h-96" /> : (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4" /> {t('dre.title')}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="pb-2 text-left font-medium">{t('dre.line')}</th>
                        <th className="pb-2 text-right font-medium w-40">{t('dre.value')}</th>
                        <th className="pb-2 text-right font-medium pl-4 w-16">{t('dre.margin')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <DRERow label={t('dre.grossRevenue')} value={dre.receitaBruta} bold />
                      {dre.deducoes > 0 && <DRERow label={t('dre.deductions')} value={-dre.deducoes} indent={1} sub />}
                      <DRERow label={t('dre.netRevenue')} value={dre.receitaLiquida} bold highlight />
                      <DRERow separator />
                      {dre.cmv > 0 && <DRERow label={t('dre.cogs')} value={-dre.cmv} indent={1} sub />}
                      <DRERow label={t('dre.grossProfit')} value={dre.lucroBruto} bold highlight margin={dre.margemBruta} />
                      <DRERow separator />
                      <DRERow label={t('dre.opex')} bold />
                      {dre.opexPayroll > 0 && <DRERow label={t('dre.opexPayroll')} value={-dre.opexPayroll} indent={1} sub />}
                      {dre.opexMarketing > 0 && <DRERow label={t('dre.opexMarketing')} value={-dre.opexMarketing} indent={1} sub />}
                      {dre.opexInfra > 0 && <DRERow label={t('dre.opexInfra')} value={-dre.opexInfra} indent={1} sub />}
                      {dre.opexTools > 0 && <DRERow label={t('dre.opexTools')} value={-dre.opexTools} indent={1} sub />}
                      {dre.opexOffice > 0 && <DRERow label={t('dre.opexOffice')} value={-dre.opexOffice} indent={1} sub />}
                      {dre.opexOther > 0 && <DRERow label={t('dre.opexOther')} value={-dre.opexOther} indent={1} sub />}
                      <DRERow label={t('dre.totalOpex')} value={-dre.opexTotal} bold />
                      <DRERow separator />
                      <DRERow label={t('dre.ebit')} value={dre.ebit} bold highlight />
                      {dre.da > 0 && <DRERow label={t('dre.daLine')} value={dre.da} indent={1} sub />}
                      <DRERow label={t('dre.ebitdaLine')} value={dre.ebitda} bold highlight margin={dre.margemEbitda} />
                      <DRERow separator />
                      {dre.impostosLucro > 0 && <DRERow label={t('dre.taxesLine')} value={-dre.impostosLucro} indent={1} sub />}
                      <DRERow label={t('dre.netProfit')} value={dre.lucroLiquido} bold highlight margin={dre.margemLiquida} />
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{t('dre.note')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── TAB: CAIXA ───────────────────────────────────────────────────── */}
        <TabsContent value="caixa" className="space-y-4 pt-4">
          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
              <Skeleton className="h-64" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KPICard title={t('kpi.estimatedCash')} value={formatCurrency(saldoEstimado)} color={saldoEstimado >= 0 ? 'green' : 'red'} sub={t('caixa.estimatedCashSub')} />
                <KPICard title={t('caixa.pendingEntries')} value={formatCurrency(pendentesEntradas)} color="amber" sub={t('caixa.pendingEntriesSub')} />
                <KPICard title={t('caixa.pendingSaidas')} value={formatCurrency(pendentesSaidas)} color="red" sub={t('caixa.pendingSaidasSub')} />
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm">{t('caixa.title')}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={fluxo} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <RechartTooltip
                        formatter={(v: number, name: string) => [
                          formatCurrency(v),
                          name === 'entradas' ? t('caixa.chartEntries') : name === 'saidas' ? t('caixa.chartSaidas') : t('caixa.chartBalance'),
                        ]}
                      />
                      <Legend formatter={(v) => v === 'entradas' ? t('caixa.chartEntries') : v === 'saidas' ? t('caixa.chartSaidas') : t('caixa.chartBalance')} />
                      <Bar dataKey="entradas" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="saidas" fill="#f87171" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('caixa.projection')}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: t('caixa.days30'), value: saldoEstimado + avgNet },
                    { label: t('caixa.days60'), value: saldoEstimado + avgNet * 2 },
                    { label: t('caixa.days90'), value: saldoEstimado + avgNet * 3 },
                  ].map((p) => (
                    <Card key={p.label}>
                      <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{p.label}</CardTitle></CardHeader>
                      <CardContent className="pt-0">
                        <p className={`text-lg font-bold ${p.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(p.value)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── TAB: LANÇAMENTOS ─────────────────────────────────────────────── */}
        <TabsContent value="lancamentos" className="pt-4">
          <Tabs value={lancTab} onValueChange={setLancTab}>
            <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="receitas">{t('lancamentos.receitas')} ({entries.length})</TabsTrigger>
                <TabsTrigger value="despesas">{t('lancamentos.despesas')} ({expenses.length})</TabsTrigger>
                <TabsTrigger value="impostos">{t('lancamentos.impostos')} ({impostos.length})</TabsTrigger>
              </TabsList>
              <div>
                {lancTab === 'receitas' && <Button size="sm" onClick={() => openEntry()}><Plus className="mr-1.5 h-4 w-4" />{t('lancamentos.newReceita')}</Button>}
                {lancTab === 'despesas' && <Button size="sm" onClick={() => openExpense()}><Plus className="mr-1.5 h-4 w-4" />{t('lancamentos.newDespesa')}</Button>}
                {lancTab === 'impostos' && <Button size="sm" onClick={() => openImposto()}><Plus className="mr-1.5 h-4 w-4" />{t('lancamentos.newImposto')}</Button>}
              </div>
            </div>

            {/* Receitas */}
            <TabsContent value="receitas">
              <Card><CardContent className="p-0">
                {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  : entries.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{t('lancamentos.noReceitas')}</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colDate')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colClient')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colCategory')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colType')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colStatus')}</th>
                          <th className="px-4 py-3 text-right font-medium">{t('lancamentos.colValue')}</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{entries.map((e) => (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                            <td className="px-4 py-3">{e.clients?.name ?? '—'}</td>
                            <td className="px-4 py-3">{tl(e.category as never)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{tl(e.type as never)}</td>
                            <td className="px-4 py-3"><StatusBadge status={e.status} label={tl(e.status as never)} /></td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.value)}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEntry(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'entry', id: e.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
              </CardContent></Card>
            </TabsContent>

            {/* Despesas */}
            <TabsContent value="despesas">
              <Card><CardContent className="p-0">
                {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  : expenses.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{t('lancamentos.noDespesas')}</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colDate')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colSupplier')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colCategory')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colNature')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colType')}</th>
                          <th className="px-4 py-3 text-right font-medium">{t('lancamentos.colValue')}</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{expenses.map((e) => (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                            <td className="px-4 py-3 font-medium">{e.supplier}</td>
                            <td className="px-4 py-3">{tl(e.category as never)}</td>
                            <td className="px-4 py-3"><StatusBadge status={e.nature ?? 'opex'} label={tl((e.nature ?? 'opex') as never)} /></td>
                            <td className="px-4 py-3 text-muted-foreground">{tl(e.type as never)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.value)}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openExpense(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'expense', id: e.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
              </CardContent></Card>
            </TabsContent>

            {/* Impostos */}
            <TabsContent value="impostos">
              <Card><CardContent className="p-0">
                {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  : impostos.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{t('lancamentos.noImpostos')}</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colTaxType')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colCompetencia')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colVencimento')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('lancamentos.colStatus')}</th>
                          <th className="px-4 py-3 text-right font-medium">{t('lancamentos.colValue')}</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{impostos.map((i) => {
                          const ds = getDisplayStatusImposto(i)
                          return (
                            <tr key={i.id} className="border-b last:border-0 hover:bg-muted/40">
                              <td className="px-4 py-3 font-medium">{i.tipo}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatDate(i.competencia)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatDate(i.vencimento)}</td>
                              <td className="px-4 py-3"><StatusBadge status={ds} label={tl(ds as never)} /></td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(i.valor)}</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openImposto(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'imposto', id: i.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}</tbody>
                      </table>
                    </div>
                  )}
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── TAB: CONTAS ──────────────────────────────────────────────────── */}
        <TabsContent value="contas" className="pt-4">
          <Tabs value={contasTab} onValueChange={setContasTab}>
            <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="pagar">{t('contas.pagar')} ({contasPagar.length})</TabsTrigger>
                <TabsTrigger value="receber">{t('contas.receber')} ({contasReceber.length})</TabsTrigger>
              </TabsList>
              <div>
                {contasTab === 'pagar' && <Button size="sm" onClick={() => openContaPagar()}><Plus className="mr-1.5 h-4 w-4" />{t('contas.newConta')}</Button>}
                {contasTab === 'receber' && <Button size="sm" onClick={() => openContaReceber()}><Plus className="mr-1.5 h-4 w-4" />{t('contas.newConta')}</Button>}
              </div>
            </div>

            {/* A Pagar */}
            <TabsContent value="pagar">
              <Card><CardContent className="p-0">
                {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  : contasPagar.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{t('contas.noPagar')}</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colDescription')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colSupplier')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colCategory')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colDueDate')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colStatus')}</th>
                          <th className="px-4 py-3 text-right font-medium">{t('contas.colValue')}</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{contasPagar.map((c) => {
                          const ds = getDisplayStatusContaPagar(c)
                          return (
                            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                              <td className="px-4 py-3 font-medium">{c.descricao}</td>
                              <td className="px-4 py-3 text-muted-foreground">{c.fornecedor ?? '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{c.categoria ?? '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatDate(c.vencimento)}</td>
                              <td className="px-4 py-3"><StatusBadge status={ds} label={tl(ds as never)} /></td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.valor)}</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openContaPagar(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'pagar', id: c.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}</tbody>
                      </table>
                    </div>
                  )}
              </CardContent></Card>
            </TabsContent>

            {/* A Receber */}
            <TabsContent value="receber">
              <Card><CardContent className="p-0">
                {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  : contasReceber.length === 0 ? <p className="p-6 text-sm text-muted-foreground">{t('contas.noReceber')}</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colClient')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colDescription')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colNF')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colPrevisao')}</th>
                          <th className="px-4 py-3 text-left font-medium">{t('contas.colStatus')}</th>
                          <th className="px-4 py-3 text-right font-medium">{t('contas.colValue')}</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{contasReceber.map((c) => {
                          const ds = getDisplayStatusContaReceber(c)
                          return (
                            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                              <td className="px-4 py-3 font-medium">{c.cliente}</td>
                              <td className="px-4 py-3 text-muted-foreground">{c.descricao ?? '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{c.numero_nf ?? '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatDate(c.previsao)}</td>
                              <td className="px-4 py-3"><StatusBadge status={ds} label={tl(ds as never)} /></td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.valor)}</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openContaReceber(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'receber', id: c.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}</tbody>
                      </table>
                    </div>
                  )}
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── TAB: INDICADORES ─────────────────────────────────────────────── */}
        <TabsContent value="indicadores" className="space-y-6 pt-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('indicadores.revenue')}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title={t('indicadores.mrr')} value={formatCurrency(ind.mrr)} color="green" sub={t('indicadores.mrrSub')} />
                  <KPICard title={t('indicadores.accumulated')} value={formatCurrency(ind.receitaAcumulada)} color="green" />
                  <KPICard title={t('indicadores.avgTicket')} value={formatCurrency(ind.ticketMedio)} sub={t('indicadores.avgTicketSub')} />
                  <KPICard title={t('indicadores.mom')} value={`${ind.crescimentoMensal >= 0 ? '+' : ''}${ind.crescimentoMensal.toFixed(1)}%`} color={ind.crescimentoMensal >= 0 ? 'green' : 'red'} sub={t('indicadores.momSub')} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('indicadores.clients')}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title={t('indicadores.cac')} value={ind.cac > 0 ? formatCurrency(ind.cac) : '—'} sub={t('indicadores.cacSub')} />
                  <KPICard title={t('indicadores.ltv')} value={ind.ltv > 0 ? formatCurrency(ind.ltv) : '—'} sub={t('indicadores.ltvSub')} />
                  <KPICard title={t('indicadores.ltvCac')} value={ind.ltvCac > 0 ? `${ind.ltvCac.toFixed(2)}x` : '—'} color={ind.ltvCac >= 3 ? 'green' : ind.ltvCac >= 1 ? 'amber' : ind.ltvCac > 0 ? 'red' : 'default'} sub={t('indicadores.ltvCacSub')} />
                  <KPICard title={t('indicadores.revenuePerClient')} value={ind.receitaPorCliente !== undefined ? formatCurrency(ind.receitaPorCliente) : '—'} sub={t('indicadores.revenuePerClientSub')} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('indicadores.efficiency')}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title={t('indicadores.burnRate')} value={formatCurrency(ind.burnRate)} sub={t('indicadores.burnRateSub')} />
                  <KPICard title={t('indicadores.runway')} value={ind.runway > 0 ? `${ind.runway.toFixed(1)} meses` : '—'} color={ind.runway > 6 ? 'green' : ind.runway > 3 ? 'amber' : ind.runway > 0 ? 'red' : 'default'} sub={t('indicadores.runwaySub')} />
                  <KPICard title={t('indicadores.revenuePerEmployee')} value={ind.receitaPorColaborador > 0 ? formatCurrency(ind.receitaPorColaborador) : '—'} sub={t('kpi.collaboratorSub', { count: teamCount })} />
                  <KPICard title={t('indicadores.costPerClient')} value={ind.custoPorCliente > 0 ? formatCurrency(ind.custoPorCliente) : '—'} sub={t('indicadores.costPerClientSub')} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('indicadores.result')}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title={t('indicadores.totalExpenses')} value={formatCurrency(ind.despesaAcumulada)} color="red" />
                  <KPICard title={t('indicadores.totalResult')} value={formatCurrency(ind.receitaAcumulada - ind.despesaAcumulada)} color={(ind.receitaAcumulada - ind.despesaAcumulada) >= 0 ? 'green' : 'red'} />
                  <KPICard title={t('indicadores.grossMargin')} value={`${dreAll.margemBruta.toFixed(1)}%`} color={dreAll.margemBruta >= 40 ? 'green' : dreAll.margemBruta >= 20 ? 'amber' : 'red'} sub={t('indicadores.grossMarginSub')} />
                  <KPICard title={t('indicadores.netMargin')} value={`${dreAll.margemLiquida.toFixed(1)}%`} color={dreAll.margemLiquida >= 15 ? 'green' : dreAll.margemLiquida >= 5 ? 'amber' : 'red'} sub={t('indicadores.netMarginSub')} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{t('indicadores.note')}</p>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ──────────────────────────────────────────────────────────── */}

      {/* Receita Dialog */}
      <Dialog open={entryModal.open} onOpenChange={(o) => !o && setEntryModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{entryModal.item ? td('receitaEdit') : td('receitaNew')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{td('client')}</Label>
              <Select value={entryForm.client_id ?? 'none'} onValueChange={(v) => setEntryForm({ ...entryForm, client_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder={tc('select')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc('none')}</SelectItem>
                  {clientOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{td('value')}</Label>
              <Input type="number" value={entryForm.value} onChange={(e) => setEntryForm({ ...entryForm, value: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('date')}</Label>
              <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('type')}</Label>
              <Select value={entryForm.type} onValueChange={(v) => setEntryForm({ ...entryForm, type: v as FinancialEntryType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">{tl('recurring')}</SelectItem>
                  <SelectItem value="one_time">{tl('one_time')}</SelectItem>
                  <SelectItem value="upsell">{tl('upsell')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{td('category')}</Label>
              <Select value={entryForm.category} onValueChange={(v) => setEntryForm({ ...entryForm, category: v as FinancialEntryCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">{tl('subscription')}</SelectItem>
                  <SelectItem value="consulting">{tl('consulting')}</SelectItem>
                  <SelectItem value="implementation">{tl('implementation')}</SelectItem>
                  <SelectItem value="support">{tl('support')}</SelectItem>
                  <SelectItem value="other">{tl('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{td('status')}</Label>
              <Select value={entryForm.status} onValueChange={(v) => setEntryForm({ ...entryForm, status: v as FinancialEntryStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">{tl('confirmed')}</SelectItem>
                  <SelectItem value="pending">{tl('pending')}</SelectItem>
                  <SelectItem value="cancelled">{tl('cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{td('description')}</Label>
              <Input value={entryForm.description ?? ''} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryModal({ open: false, item: null })}>{tc('cancel')}</Button>
            <Button onClick={saveEntry} disabled={saving}>{saving ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Despesa Dialog */}
      <Dialog open={expenseModal.open} onOpenChange={(o) => !o && setExpenseModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{expenseModal.item ? td('despesaEdit') : td('despesaNew')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{td('supplier')}</Label>
              <Input value={expenseForm.supplier} onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('value')}</Label>
              <Input type="number" value={expenseForm.value} onChange={(e) => setExpenseForm({ ...expenseForm, value: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('date')}</Label>
              <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('category')}</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v as ExpenseCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="infrastructure">{tl('infrastructure')}</SelectItem>
                  <SelectItem value="payroll">{tl('payroll')}</SelectItem>
                  <SelectItem value="marketing">{tl('marketing')}</SelectItem>
                  <SelectItem value="tools">{tl('tools')}</SelectItem>
                  <SelectItem value="office">{tl('office')}</SelectItem>
                  <SelectItem value="taxes">{tl('taxes')}</SelectItem>
                  <SelectItem value="other">{tl('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{td('type')}</Label>
              <Select value={expenseForm.type} onValueChange={(v) => setExpenseForm({ ...expenseForm, type: v as ExpenseType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{tl('fixed')}</SelectItem>
                  <SelectItem value="variable">{tl('variable')}</SelectItem>
                  <SelectItem value="investment">{tl('investment')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{td('natureDRE')}</Label>
              <Select value={expenseForm.nature} onValueChange={(v) => setExpenseForm({ ...expenseForm, nature: v as ExpenseNature })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="opex">{td('opex')}</SelectItem>
                  <SelectItem value="cogs">{td('cogs')}</SelectItem>
                  <SelectItem value="da">{td('da')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{td('costCenter')}</Label>
              <Input value={expenseForm.cost_center ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, cost_center: e.target.value || null })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{td('description')}</Label>
              <Input value={expenseForm.description ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseModal({ open: false, item: null })}>{tc('cancel')}</Button>
            <Button onClick={saveExpense} disabled={saving || !expenseForm.supplier}>{saving ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Imposto Dialog */}
      <Dialog open={impostoModal.open} onOpenChange={(o) => !o && setImpostoModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{impostoModal.item ? td('impostoEdit') : td('impostoNew')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{td('taxType')}</Label>
              <Input placeholder={td('taxPlaceholder')} value={impostoForm.tipo} onChange={(e) => setImpostoForm({ ...impostoForm, tipo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('value')}</Label>
              <Input type="number" value={impostoForm.valor} onChange={(e) => setImpostoForm({ ...impostoForm, valor: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('competencia')}</Label>
              <Input type="date" value={impostoForm.competencia} onChange={(e) => setImpostoForm({ ...impostoForm, competencia: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('vencimento')}</Label>
              <Input type="date" value={impostoForm.vencimento ?? ''} onChange={(e) => setImpostoForm({ ...impostoForm, vencimento: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('status')}</Label>
              <Select value={impostoForm.status} onValueChange={(v) => setImpostoForm({ ...impostoForm, status: v as Imposto['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">{tl('pendente')}</SelectItem>
                  <SelectItem value="pago">{tl('pago')}</SelectItem>
                  <SelectItem value="atrasado">{tl('atrasado')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {impostoForm.status === 'pago' && (
              <div className="space-y-1.5 col-span-2">
                <Label>{td('paymentDate')}</Label>
                <Input type="date" value={impostoForm.data_pagamento ?? ''} onChange={(e) => setImpostoForm({ ...impostoForm, data_pagamento: e.target.value || null })} />
              </div>
            )}
            <div className="space-y-1.5 col-span-2">
              <Label>{td('notes')}</Label>
              <Input value={impostoForm.notas ?? ''} onChange={(e) => setImpostoForm({ ...impostoForm, notas: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpostoModal({ open: false, item: null })}>{tc('cancel')}</Button>
            <Button onClick={saveImposto} disabled={saving || !impostoForm.tipo}>{saving ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conta a Pagar Dialog */}
      <Dialog open={contaPagarModal.open} onOpenChange={(o) => !o && setContaPagarModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{contaPagarModal.item ? td('contaPagarEdit') : td('contaPagarNew')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{td('descricao')}</Label>
              <Input value={contaPagarForm.descricao} onChange={(e) => setContaPagarForm({ ...contaPagarForm, descricao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('supplier')}</Label>
              <Input value={contaPagarForm.fornecedor ?? ''} onChange={(e) => setContaPagarForm({ ...contaPagarForm, fornecedor: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('category')}</Label>
              <Input placeholder={td('categoryPlaceholder')} value={contaPagarForm.categoria ?? ''} onChange={(e) => setContaPagarForm({ ...contaPagarForm, categoria: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('value')}</Label>
              <Input type="number" value={contaPagarForm.valor} onChange={(e) => setContaPagarForm({ ...contaPagarForm, valor: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('vencimento')}</Label>
              <Input type="date" value={contaPagarForm.vencimento} onChange={(e) => setContaPagarForm({ ...contaPagarForm, vencimento: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('status')}</Label>
              <Select value={contaPagarForm.status} onValueChange={(v) => setContaPagarForm({ ...contaPagarForm, status: v as ContaPagar['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">{tl('pendente')}</SelectItem>
                  <SelectItem value="pago">{tl('pago')}</SelectItem>
                  <SelectItem value="atrasado">{tl('atrasado')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {contaPagarForm.status === 'pago' && (
              <div className="space-y-1.5">
                <Label>{td('paymentDate')}</Label>
                <Input type="date" value={contaPagarForm.data_pagamento ?? ''} onChange={(e) => setContaPagarForm({ ...contaPagarForm, data_pagamento: e.target.value || null })} />
              </div>
            )}
            <div className="space-y-1.5 col-span-2">
              <Label>{td('notes')}</Label>
              <Input value={contaPagarForm.notas ?? ''} onChange={(e) => setContaPagarForm({ ...contaPagarForm, notas: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContaPagarModal({ open: false, item: null })}>{tc('cancel')}</Button>
            <Button onClick={saveContaPagar} disabled={saving || !contaPagarForm.descricao}>{saving ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conta a Receber Dialog */}
      <Dialog open={contaReceberModal.open} onOpenChange={(o) => !o && setContaReceberModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{contaReceberModal.item ? td('contaReceberEdit') : td('contaReceberNew')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{td('client')}</Label>
              <Select value={contaReceberForm.client_id ?? 'none'} onValueChange={(v) => {
                const cl = v === 'none' ? null : clients.find((c) => c.id === v) ?? null
                setContaReceberForm({ ...contaReceberForm, client_id: v === 'none' ? null : v, cliente: cl?.name ?? contaReceberForm.cliente })
              }}>
                <SelectTrigger><SelectValue placeholder={td('clientPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{td('avulso')}</SelectItem>
                  {clientOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(!contaReceberForm.client_id || contaReceberForm.client_id === 'none') && (
              <div className="space-y-1.5 col-span-2">
                <Label>{td('clientName')}</Label>
                <Input value={contaReceberForm.cliente} onChange={(e) => setContaReceberForm({ ...contaReceberForm, cliente: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{td('value')}</Label>
              <Input type="number" value={contaReceberForm.valor} onChange={(e) => setContaReceberForm({ ...contaReceberForm, valor: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('previsao')}</Label>
              <Input type="date" value={contaReceberForm.previsao} onChange={(e) => setContaReceberForm({ ...contaReceberForm, previsao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{td('status')}</Label>
              <Select value={contaReceberForm.status} onValueChange={(v) => setContaReceberForm({ ...contaReceberForm, status: v as ContaReceber['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">{tl('pendente')}</SelectItem>
                  <SelectItem value="recebido">{tl('recebido')}</SelectItem>
                  <SelectItem value="inadimplente">{tl('inadimplente')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{td('nf')}</Label>
              <Input value={contaReceberForm.numero_nf ?? ''} onChange={(e) => setContaReceberForm({ ...contaReceberForm, numero_nf: e.target.value || null })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{td('description')}</Label>
              <Input value={contaReceberForm.descricao ?? ''} onChange={(e) => setContaReceberForm({ ...contaReceberForm, descricao: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContaReceberModal({ open: false, item: null })}>{tc('cancel')}</Button>
            <Button onClick={saveContaReceber} disabled={saving || !contaReceberForm.cliente}>{saving ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteItem')}</AlertDialogTitle>
            <AlertDialogDescription>{tc('irreversible')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{tc('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
