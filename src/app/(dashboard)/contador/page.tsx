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
import { formatCurrency, formatDate, getLabelByStatus, getStatusColor } from '@/lib/utils'
import type {
  FinancialEntry, FinancialEntryFormData, FinancialEntryType, FinancialEntryStatus, FinancialEntryCategory,
  FinancialExpense, FinancialExpenseFormData, ExpenseType, ExpenseCategory, ExpenseNature, Client,
} from '@/types'

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

function getPeriodOptions() {
  const opts = [{ value: 'all', label: 'Todo o período' }]
  const now = new Date()
  opts.push({ value: String(now.getFullYear()), label: `Acumulado ${now.getFullYear()}` })
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(status)}`}>
      {getLabelByStatus(status)}
    </span>
  )
}

function KPICard({
  title, value, sub, color = 'default', trend,
}: {
  title: string
  value: string
  sub?: string
  color?: 'green' | 'red' | 'amber' | 'default'
  trend?: number
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
            {Math.abs(trend).toFixed(1)}% vs mês anterior
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
  label: string; value?: number; indent?: number
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
  const { toast } = useToast()
  const periodOptions = useMemo(() => getPeriodOptions(), [])

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
      if (entryModal.item) { await updateFinancialEntry(entryModal.item.id, entryForm); toast({ title: 'Receita atualizada' }) }
      else { await createFinancialEntry(entryForm); toast({ title: 'Receita criada' }) }
      setEntryModal({ open: false, item: null }); load()
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }) }
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
      if (expenseModal.item) { await updateFinancialExpense(expenseModal.item.id, expenseForm); toast({ title: 'Despesa atualizada' }) }
      else { await createFinancialExpense(expenseForm); toast({ title: 'Despesa criada' }) }
      setExpenseModal({ open: false, item: null }); load()
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }) }
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
      if (impostoModal.item) { await updateImposto(impostoModal.item.id, impostoForm); toast({ title: 'Imposto atualizado' }) }
      else { await createImposto(impostoForm); toast({ title: 'Imposto criado' }) }
      setImpostoModal({ open: false, item: null }); load()
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }) }
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
      if (contaPagarModal.item) { await updateContaPagar(contaPagarModal.item.id, contaPagarForm); toast({ title: 'Conta atualizada' }) }
      else { await createContaPagar(contaPagarForm); toast({ title: 'Conta criada' }) }
      setContaPagarModal({ open: false, item: null }); load()
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }) }
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
      if (contaReceberModal.item) { await updateContaReceber(contaReceberModal.item.id, contaReceberForm); toast({ title: 'Conta atualizada' }) }
      else { await createContaReceber(contaReceberForm); toast({ title: 'Conta criada' }) }
      setContaReceberModal({ open: false, item: null }); load()
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }) }
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
      toast({ title: 'Removido com sucesso' }); load()
    } catch { toast({ title: 'Erro ao remover', variant: 'destructive' }) }
    finally { setDeleteTarget(null) }
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Erro ao carregar dados financeiros.</p>
        <Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>
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
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="caixa">Caixa</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Saúde Financeira</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title="Receita Total" value={formatCurrency(dreAll.receitaBruta)} color="green" />
                  <KPICard title="Lucro Líquido" value={formatCurrency(dreAll.lucroLiquido)} color={dreAll.lucroLiquido >= 0 ? 'green' : 'red'} />
                  <KPICard title="EBITDA" value={formatCurrency(dreAll.ebitda)} color={dreAll.ebitda >= 0 ? 'green' : 'red'} sub={`Margem ${dreAll.margemEbitda.toFixed(1)}%`} />
                  <KPICard title="Margem Bruta" value={`${dreAll.margemBruta.toFixed(1)}%`} color={dreAll.margemBruta >= 40 ? 'green' : dreAll.margemBruta >= 20 ? 'amber' : 'red'} sub={`Margem Líquida ${dreAll.margemLiquida.toFixed(1)}%`} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Caixa</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title="MRR" value={formatCurrency(ind.mrr)} color="green" sub="Receita recorrente mensal" />
                  <KPICard title="Caixa Estimado" value={formatCurrency(saldoEstimado)} color={saldoEstimado >= 0 ? 'green' : 'red'} sub="Baseado em lançamentos" />
                  <KPICard title="Burn Rate" value={formatCurrency(ind.burnRate)} sub="Média mensal (3 meses)" />
                  <KPICard title="Runway Est." value={ind.runway > 0 ? `${ind.runway.toFixed(1)} meses` : '—'} color={ind.runway > 6 ? 'green' : ind.runway > 3 ? 'amber' : ind.runway > 0 ? 'red' : 'default'} sub="Reserva estimada" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Eficiência</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title="CAC" value={ind.cac > 0 ? formatCurrency(ind.cac) : '—'} sub="Custo de aquisição" />
                  <KPICard title="LTV Est." value={ind.ltv > 0 ? formatCurrency(ind.ltv) : '—'} sub="Valor do cliente (5% churn)" />
                  <KPICard title="LTV / CAC" value={ind.ltvCac > 0 ? `${ind.ltvCac.toFixed(2)}x` : '—'} color={ind.ltvCac >= 3 ? 'green' : ind.ltvCac >= 1 ? 'amber' : ind.ltvCac > 0 ? 'red' : 'default'} sub="Ideal ≥ 3x" />
                  <KPICard title="Ticket Médio" value={formatCurrency(ind.ticketMedio)} trend={ind.crescimentoMensal} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Riscos</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      {[
                        { label: 'Impostos vencidos', value: impostos.filter((i) => i.status !== 'pago' && i.vencimento && i.vencimento < todayStr).length, icon: XCircle, bad: true },
                        { label: 'Contas vencidas', value: contasPagar.filter((c) => c.status !== 'pago' && c.vencimento < todayStr).length, icon: XCircle, bad: true },
                        { label: 'Impostos pendentes', value: impostos.filter((i) => i.status === 'pendente').length, icon: Clock, bad: false },
                        { label: 'Contas a pagar pendentes', value: contasPagar.filter((c) => c.status === 'pendente').length, icon: Clock, bad: false },
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
                        { label: 'Receita a confirmar', value: formatCurrency(entries.filter((e) => e.status === 'pending').reduce((s, e) => s + e.value, 0)) },
                        { label: 'A receber (pendente)', value: formatCurrency(contasReceber.filter((c) => c.status === 'pendente').reduce((s, c) => s + c.valor, 0)) },
                        { label: 'Inadimplência', value: formatCurrency(contasReceber.filter((c) => c.status === 'inadimplente' || (c.status === 'pendente' && c.previsao < todayStr)).reduce((s, c) => s + c.valor, 0)) },
                        { label: 'Entradas pendentes total', value: formatCurrency(pendentesEntradas) },
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
            <Label className="text-xs text-muted-foreground shrink-0">Período:</Label>
            <Select value={drePeriod} onValueChange={setDrePeriod}>
              <SelectTrigger className="w-56 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periodOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? <Skeleton className="h-96" /> : (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4" /> Demonstrativo de Resultado (DRE)</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="pb-2 text-left font-medium">Linha</th>
                        <th className="pb-2 text-right font-medium w-40">Valor</th>
                        <th className="pb-2 text-right font-medium pl-4 w-16">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      <DRERow label="Receita Bruta" value={dre.receitaBruta} bold />
                      {dre.deducoes > 0 && <DRERow label="(-) Deduções (PIS/COFINS/ISS/ICMS)" value={-dre.deducoes} indent={1} sub />}
                      <DRERow label="= Receita Líquida" value={dre.receitaLiquida} bold highlight />
                      <DRERow separator />
                      {dre.cmv > 0 && <DRERow label="(-) CMV / Custo do Produto ou Serviço" value={-dre.cmv} indent={1} sub />}
                      <DRERow label="= Lucro Bruto" value={dre.lucroBruto} bold highlight margin={dre.margemBruta} />
                      <DRERow separator />
                      <DRERow label="Despesas Operacionais" bold />
                      {dre.opexPayroll > 0 && <DRERow label="Folha de Pagamento" value={-dre.opexPayroll} indent={1} sub />}
                      {dre.opexMarketing > 0 && <DRERow label="Marketing" value={-dre.opexMarketing} indent={1} sub />}
                      {dre.opexInfra > 0 && <DRERow label="Infraestrutura" value={-dre.opexInfra} indent={1} sub />}
                      {dre.opexTools > 0 && <DRERow label="Ferramentas" value={-dre.opexTools} indent={1} sub />}
                      {dre.opexOffice > 0 && <DRERow label="Escritório" value={-dre.opexOffice} indent={1} sub />}
                      {dre.opexOther > 0 && <DRERow label="Outras Despesas" value={-dre.opexOther} indent={1} sub />}
                      <DRERow label="= Total Despesas Operacionais" value={-dre.opexTotal} bold />
                      <DRERow separator />
                      <DRERow label="= EBIT (Resultado Operacional)" value={dre.ebit} bold highlight />
                      {dre.da > 0 && <DRERow label="(+) Depreciação e Amortização" value={dre.da} indent={1} sub />}
                      <DRERow label="= EBITDA" value={dre.ebitda} bold highlight margin={dre.margemEbitda} />
                      <DRERow separator />
                      {dre.impostosLucro > 0 && <DRERow label="(-) Impostos s/ Lucro (IRPJ/CSLL)" value={-dre.impostosLucro} indent={1} sub />}
                      <DRERow label="= Lucro Líquido" value={dre.lucroLiquido} bold highlight margin={dre.margemLiquida} />
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  * Despesas classificadas como &quot;CMV/CPV&quot; ou &quot;Depr./Amort.&quot; na aba Lançamentos aparecem nas linhas corretas do DRE. Impostos sobre receita (PIS, COFINS, ISS) e sobre lucro (IRPJ, CSLL) são lançados na aba Impostos.
                </p>
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
                <KPICard title="Caixa Estimado" value={formatCurrency(saldoEstimado)} color={saldoEstimado >= 0 ? 'green' : 'red'} sub="Receitas conf. − Despesas (total)" />
                <KPICard title="Entradas Pendentes" value={formatCurrency(pendentesEntradas)} color="amber" sub="Receitas pend. + contas a receber" />
                <KPICard title="Saídas Pendentes" value={formatCurrency(pendentesSaidas)} color="red" sub="Contas a pagar + impostos pend." />
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm">Entradas vs Saídas — últimos 8 meses</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={fluxo} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <RechartTooltip
                        formatter={(v: number, name: string) => [
                          formatCurrency(v),
                          name === 'entradas' ? 'Entradas' : name === 'saidas' ? 'Saídas' : 'Saldo Mensal',
                        ]}
                      />
                      <Legend formatter={(v) => v === 'entradas' ? 'Entradas' : v === 'saidas' ? 'Saídas' : 'Saldo Mensal'} />
                      <Bar dataKey="entradas" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="saidas" fill="#f87171" radius={[3, 3, 0, 0]} />
                      <Line type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Projeção (baseada na média dos últimos 3 meses)</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '30 dias', value: saldoEstimado + avgNet },
                    { label: '60 dias', value: saldoEstimado + avgNet * 2 },
                    { label: '90 dias', value: saldoEstimado + avgNet * 3 },
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
            <div className="flex items-center justify-between mb-3">
              <TabsList>
                <TabsTrigger value="receitas">Receitas ({entries.length})</TabsTrigger>
                <TabsTrigger value="despesas">Despesas ({expenses.length})</TabsTrigger>
                <TabsTrigger value="impostos">Impostos ({impostos.length})</TabsTrigger>
              </TabsList>
              <div>
                {lancTab === 'receitas' && <Button size="sm" onClick={() => openEntry()}><Plus className="mr-1.5 h-4 w-4" />Nova Receita</Button>}
                {lancTab === 'despesas' && <Button size="sm" onClick={() => openExpense()}><Plus className="mr-1.5 h-4 w-4" />Nova Despesa</Button>}
                {lancTab === 'impostos' && <Button size="sm" onClick={() => openImposto()}><Plus className="mr-1.5 h-4 w-4" />Novo Imposto</Button>}
              </div>
            </div>

            {/* Receitas */}
            <TabsContent value="receitas">
              <Card><CardContent className="p-0">
                {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  : entries.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhuma receita lançada.</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">Data</th>
                          <th className="px-4 py-3 text-left font-medium">Cliente</th>
                          <th className="px-4 py-3 text-left font-medium">Categoria</th>
                          <th className="px-4 py-3 text-left font-medium">Tipo</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium">Valor</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{entries.map((e) => (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                            <td className="px-4 py-3">{e.clients?.name ?? '—'}</td>
                            <td className="px-4 py-3">{getLabelByStatus(e.category)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{getLabelByStatus(e.type)}</td>
                            <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
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
                  : expenses.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhuma despesa lançada.</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">Data</th>
                          <th className="px-4 py-3 text-left font-medium">Fornecedor</th>
                          <th className="px-4 py-3 text-left font-medium">Categoria</th>
                          <th className="px-4 py-3 text-left font-medium">Natureza (DRE)</th>
                          <th className="px-4 py-3 text-left font-medium">Tipo</th>
                          <th className="px-4 py-3 text-right font-medium">Valor</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{expenses.map((e) => (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                            <td className="px-4 py-3 font-medium">{e.supplier}</td>
                            <td className="px-4 py-3">{getLabelByStatus(e.category)}</td>
                            <td className="px-4 py-3"><StatusBadge status={e.nature ?? 'opex'} /></td>
                            <td className="px-4 py-3 text-muted-foreground">{getLabelByStatus(e.type)}</td>
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
                  : impostos.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhum imposto lançado.</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">Tipo</th>
                          <th className="px-4 py-3 text-left font-medium">Competência</th>
                          <th className="px-4 py-3 text-left font-medium">Vencimento</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium">Valor</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{impostos.map((i) => (
                          <tr key={i.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 font-medium">{i.tipo}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(i.competencia)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(i.vencimento)}</td>
                            <td className="px-4 py-3"><StatusBadge status={getDisplayStatusImposto(i)} /></td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(i.valor)}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openImposto(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'imposto', id: i.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
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
            <div className="flex items-center justify-between mb-3">
              <TabsList>
                <TabsTrigger value="pagar">A Pagar ({contasPagar.length})</TabsTrigger>
                <TabsTrigger value="receber">A Receber ({contasReceber.length})</TabsTrigger>
              </TabsList>
              <div>
                {contasTab === 'pagar' && <Button size="sm" onClick={() => openContaPagar()}><Plus className="mr-1.5 h-4 w-4" />Nova Conta</Button>}
                {contasTab === 'receber' && <Button size="sm" onClick={() => openContaReceber()}><Plus className="mr-1.5 h-4 w-4" />Nova Conta</Button>}
              </div>
            </div>

            {/* A Pagar */}
            <TabsContent value="pagar">
              <Card><CardContent className="p-0">
                {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  : contasPagar.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhuma conta a pagar.</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">Descrição</th>
                          <th className="px-4 py-3 text-left font-medium">Fornecedor</th>
                          <th className="px-4 py-3 text-left font-medium">Categoria</th>
                          <th className="px-4 py-3 text-left font-medium">Vencimento</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium">Valor</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{contasPagar.map((c) => (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 font-medium">{c.descricao}</td>
                            <td className="px-4 py-3 text-muted-foreground">{c.fornecedor ?? '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{c.categoria ?? '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(c.vencimento)}</td>
                            <td className="px-4 py-3"><StatusBadge status={getDisplayStatusContaPagar(c)} /></td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.valor)}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openContaPagar(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'pagar', id: c.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
              </CardContent></Card>
            </TabsContent>

            {/* A Receber */}
            <TabsContent value="receber">
              <Card><CardContent className="p-0">
                {loading ? <div className="p-4 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                  : contasReceber.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhuma conta a receber.</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b text-xs text-muted-foreground">
                          <th className="px-4 py-3 text-left font-medium">Cliente</th>
                          <th className="px-4 py-3 text-left font-medium">Descrição</th>
                          <th className="px-4 py-3 text-left font-medium">NF</th>
                          <th className="px-4 py-3 text-left font-medium">Previsão</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                          <th className="px-4 py-3 text-right font-medium">Valor</th>
                          <th className="px-4 py-3" />
                        </tr></thead>
                        <tbody>{contasReceber.map((c) => (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="px-4 py-3 font-medium">{c.cliente}</td>
                            <td className="px-4 py-3 text-muted-foreground">{c.descricao ?? '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{c.numero_nf ?? '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatDate(c.previsao)}</td>
                            <td className="px-4 py-3"><StatusBadge status={getDisplayStatusContaReceber(c)} /></td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.valor)}</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openContaReceber(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'receber', id: c.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}</tbody>
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Receita</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title="MRR" value={formatCurrency(ind.mrr)} color="green" sub="Recorrente este mês" />
                  <KPICard title="Receita Acumulada" value={formatCurrency(ind.receitaAcumulada)} color="green" />
                  <KPICard title="Ticket Médio" value={formatCurrency(ind.ticketMedio)} sub="Média por entrada confirmada" />
                  <KPICard title="Crescimento MoM" value={`${ind.crescimentoMensal >= 0 ? '+' : ''}${ind.crescimentoMensal.toFixed(1)}%`} color={ind.crescimentoMensal >= 0 ? 'green' : 'red'} sub="vs mês anterior" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Clientes</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title="CAC" value={ind.cac > 0 ? formatCurrency(ind.cac) : '—'} sub="Marketing ÷ novos clientes (3 meses)" />
                  <KPICard title="LTV Est." value={ind.ltv > 0 ? formatCurrency(ind.ltv) : '—'} sub="Rev. média ÷ 5% churn estimado" />
                  <KPICard title="LTV / CAC" value={ind.ltvCac > 0 ? `${ind.ltvCac.toFixed(2)}x` : '—'} color={ind.ltvCac >= 3 ? 'green' : ind.ltvCac >= 1 ? 'amber' : ind.ltvCac > 0 ? 'red' : 'default'} sub="Ideal ≥ 3x" />
                  <KPICard title="Receita / Cliente" value={ind.receitaPorCliente !== undefined ? formatCurrency(ind.receitaPorCliente) : '—'} sub="Total ÷ clientes ativos" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Eficiência Operacional</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title="Burn Rate" value={formatCurrency(ind.burnRate)} sub="Média mensal de despesas (3 meses)" />
                  <KPICard title="Runway Est." value={ind.runway > 0 ? `${ind.runway.toFixed(1)} meses` : '—'} color={ind.runway > 6 ? 'green' : ind.runway > 3 ? 'amber' : ind.runway > 0 ? 'red' : 'default'} sub="Caixa ÷ Burn Rate" />
                  <KPICard title="Receita / Colaborador" value={ind.receitaPorColaborador > 0 ? formatCurrency(ind.receitaPorColaborador) : '—'} sub={`${teamCount} colaborador(es)`} />
                  <KPICard title="Custo / Cliente" value={ind.custoPorCliente > 0 ? formatCurrency(ind.custoPorCliente) : '—'} sub="Burn Rate ÷ clientes ativos" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resultado</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <KPICard title="Despesa Acumulada" value={formatCurrency(ind.despesaAcumulada)} color="red" />
                  <KPICard title="Resultado Acumulado" value={formatCurrency(ind.receitaAcumulada - ind.despesaAcumulada)} color={(ind.receitaAcumulada - ind.despesaAcumulada) >= 0 ? 'green' : 'red'} />
                  <KPICard title="Margem Bruta" value={`${dreAll.margemBruta.toFixed(1)}%`} color={dreAll.margemBruta >= 40 ? 'green' : dreAll.margemBruta >= 20 ? 'amber' : 'red'} sub="Sobre receita líquida" />
                  <KPICard title="Margem Líquida" value={`${dreAll.margemLiquida.toFixed(1)}%`} color={dreAll.margemLiquida >= 15 ? 'green' : dreAll.margemLiquida >= 5 ? 'amber' : 'red'} sub="Sobre receita líquida" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                * CAC considera gastos de marketing dos últimos 3 meses dividido por novos clientes no período.
                LTV usa receita média mensal por cliente ativo dividida por 5% de churn estimado (ajuste conforme sua realidade).
                Runway é estimado com base no resultado acumulado dividido pelo burn rate médio.
              </p>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ──────────────────────────────────────────────────────────── */}

      {/* Receita Dialog */}
      <Dialog open={entryModal.open} onOpenChange={(o) => !o && setEntryModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{entryModal.item ? 'Editar Receita' : 'Nova Receita'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>Cliente</Label>
              <Select value={entryForm.client_id ?? 'none'} onValueChange={(v) => setEntryForm({ ...entryForm, client_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clientOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" value={entryForm.value} onChange={(e) => setEntryForm({ ...entryForm, value: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={entryForm.type} onValueChange={(v) => setEntryForm({ ...entryForm, type: v as FinancialEntryType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">Recorrente</SelectItem>
                  <SelectItem value="one_time">Pontual</SelectItem>
                  <SelectItem value="upsell">Upsell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={entryForm.category} onValueChange={(v) => setEntryForm({ ...entryForm, category: v as FinancialEntryCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Assinatura</SelectItem>
                  <SelectItem value="consulting">Consultoria</SelectItem>
                  <SelectItem value="implementation">Implantação</SelectItem>
                  <SelectItem value="support">Suporte</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Status</Label>
              <Select value={entryForm.status} onValueChange={(v) => setEntryForm({ ...entryForm, status: v as FinancialEntryStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Descrição</Label>
              <Input value={entryForm.description ?? ''} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryModal({ open: false, item: null })}>Cancelar</Button>
            <Button onClick={saveEntry} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Despesa Dialog */}
      <Dialog open={expenseModal.open} onOpenChange={(o) => !o && setExpenseModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{expenseModal.item ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>Fornecedor</Label>
              <Input value={expenseForm.supplier} onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" value={expenseForm.value} onChange={(e) => setExpenseForm({ ...expenseForm, value: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v as ExpenseCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                  <SelectItem value="payroll">Folha</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="tools">Ferramentas</SelectItem>
                  <SelectItem value="office">Escritório</SelectItem>
                  <SelectItem value="taxes">Impostos</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={expenseForm.type} onValueChange={(v) => setExpenseForm({ ...expenseForm, type: v as ExpenseType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixo</SelectItem>
                  <SelectItem value="variable">Variável</SelectItem>
                  <SelectItem value="investment">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Natureza no DRE</Label>
              <Select value={expenseForm.nature} onValueChange={(v) => setExpenseForm({ ...expenseForm, nature: v as ExpenseNature })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="opex">Despesa Operacional (padrão)</SelectItem>
                  <SelectItem value="cogs">CMV / Custo do Produto ou Serviço</SelectItem>
                  <SelectItem value="da">Depreciação / Amortização</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Centro de Custo</Label>
              <Input value={expenseForm.cost_center ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, cost_center: e.target.value || null })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Descrição</Label>
              <Input value={expenseForm.description ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseModal({ open: false, item: null })}>Cancelar</Button>
            <Button onClick={saveExpense} disabled={saving || !expenseForm.supplier}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Imposto Dialog */}
      <Dialog open={impostoModal.open} onOpenChange={(o) => !o && setImpostoModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{impostoModal.item ? 'Editar Imposto' : 'Novo Imposto'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>Tipo de Imposto</Label>
              <Input placeholder="Ex: IRPJ, CSLL, PIS, COFINS, ISS…" value={impostoForm.tipo} onChange={(e) => setImpostoForm({ ...impostoForm, tipo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" value={impostoForm.valor} onChange={(e) => setImpostoForm({ ...impostoForm, valor: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Competência</Label>
              <Input type="date" value={impostoForm.competencia} onChange={(e) => setImpostoForm({ ...impostoForm, competencia: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={impostoForm.vencimento ?? ''} onChange={(e) => setImpostoForm({ ...impostoForm, vencimento: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={impostoForm.status} onValueChange={(v) => setImpostoForm({ ...impostoForm, status: v as Imposto['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {impostoForm.status === 'pago' && (
              <div className="space-y-1.5 col-span-2">
                <Label>Data de Pagamento</Label>
                <Input type="date" value={impostoForm.data_pagamento ?? ''} onChange={(e) => setImpostoForm({ ...impostoForm, data_pagamento: e.target.value || null })} />
              </div>
            )}
            <div className="space-y-1.5 col-span-2">
              <Label>Notas</Label>
              <Input value={impostoForm.notas ?? ''} onChange={(e) => setImpostoForm({ ...impostoForm, notas: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpostoModal({ open: false, item: null })}>Cancelar</Button>
            <Button onClick={saveImposto} disabled={saving || !impostoForm.tipo}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conta a Pagar Dialog */}
      <Dialog open={contaPagarModal.open} onOpenChange={(o) => !o && setContaPagarModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{contaPagarModal.item ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>Descrição</Label>
              <Input value={contaPagarForm.descricao} onChange={(e) => setContaPagarForm({ ...contaPagarForm, descricao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Input value={contaPagarForm.fornecedor ?? ''} onChange={(e) => setContaPagarForm({ ...contaPagarForm, fornecedor: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input placeholder="Ex: Aluguel, Fornecedor…" value={contaPagarForm.categoria ?? ''} onChange={(e) => setContaPagarForm({ ...contaPagarForm, categoria: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" value={contaPagarForm.valor} onChange={(e) => setContaPagarForm({ ...contaPagarForm, valor: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={contaPagarForm.vencimento} onChange={(e) => setContaPagarForm({ ...contaPagarForm, vencimento: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={contaPagarForm.status} onValueChange={(v) => setContaPagarForm({ ...contaPagarForm, status: v as ContaPagar['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {contaPagarForm.status === 'pago' && (
              <div className="space-y-1.5">
                <Label>Data de Pagamento</Label>
                <Input type="date" value={contaPagarForm.data_pagamento ?? ''} onChange={(e) => setContaPagarForm({ ...contaPagarForm, data_pagamento: e.target.value || null })} />
              </div>
            )}
            <div className="space-y-1.5 col-span-2">
              <Label>Notas</Label>
              <Input value={contaPagarForm.notas ?? ''} onChange={(e) => setContaPagarForm({ ...contaPagarForm, notas: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContaPagarModal({ open: false, item: null })}>Cancelar</Button>
            <Button onClick={saveContaPagar} disabled={saving || !contaPagarForm.descricao}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conta a Receber Dialog */}
      <Dialog open={contaReceberModal.open} onOpenChange={(o) => !o && setContaReceberModal({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{contaReceberModal.item ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>Cliente</Label>
              <Select value={contaReceberForm.client_id ?? 'none'} onValueChange={(v) => {
                const cl = v === 'none' ? null : clients.find((c) => c.id === v) ?? null
                setContaReceberForm({ ...contaReceberForm, client_id: v === 'none' ? null : v, cliente: cl?.name ?? contaReceberForm.cliente })
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione ou digita abaixo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Cliente avulso</SelectItem>
                  {clientOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {(!contaReceberForm.client_id || contaReceberForm.client_id === 'none') && (
              <div className="space-y-1.5 col-span-2">
                <Label>Nome do Cliente</Label>
                <Input value={contaReceberForm.cliente} onChange={(e) => setContaReceberForm({ ...contaReceberForm, cliente: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" value={contaReceberForm.valor} onChange={(e) => setContaReceberForm({ ...contaReceberForm, valor: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Previsão de Recebimento</Label>
              <Input type="date" value={contaReceberForm.previsao} onChange={(e) => setContaReceberForm({ ...contaReceberForm, previsao: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={contaReceberForm.status} onValueChange={(v) => setContaReceberForm({ ...contaReceberForm, status: v as ContaReceber['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="inadimplente">Inadimplente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Número NF</Label>
              <Input value={contaReceberForm.numero_nf ?? ''} onChange={(e) => setContaReceberForm({ ...contaReceberForm, numero_nf: e.target.value || null })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Descrição</Label>
              <Input value={contaReceberForm.descricao ?? ''} onChange={(e) => setContaReceberForm({ ...contaReceberForm, descricao: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContaReceberModal({ open: false, item: null })}>Cancelar</Button>
            <Button onClick={saveContaReceber} disabled={saving || !contaReceberForm.cliente}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
