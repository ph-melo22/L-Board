import { createClient } from '@/lib/supabase/client'
import type { FinancialEntry, FinancialExpense, Client, ExpenseNature } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ImpostoStatus = 'pago' | 'pendente' | 'atrasado'

export interface Imposto {
  id: string
  tipo: string
  competencia: string
  valor: number
  status: ImpostoStatus
  vencimento: string | null
  data_pagamento: string | null
  notas: string | null
  created_at: string
}
export type ImpostoFormData = Omit<Imposto, 'id' | 'created_at'>

export interface ContaPagar {
  id: string
  descricao: string
  fornecedor: string | null
  valor: number
  vencimento: string
  status: 'pendente' | 'pago' | 'atrasado'
  categoria: string | null
  data_pagamento: string | null
  notas: string | null
  created_at: string
}
export type ContaPagarFormData = Omit<ContaPagar, 'id' | 'created_at'>

export interface ContaReceber {
  id: string
  cliente: string
  client_id: string | null
  descricao: string | null
  valor: number
  previsao: string
  status: 'pendente' | 'recebido' | 'inadimplente'
  numero_nf: string | null
  notas: string | null
  created_at: string
}
export type ContaReceberFormData = Omit<ContaReceber, 'id' | 'created_at'>

// ─── Data fetching ─────────────────────────────────────────────────────────────

export async function getAllClients(): Promise<Client[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('clients').select('*').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTeamCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
  return count ?? 1
}

// ─── CRUD Impostos ─────────────────────────────────────────────────────────────

export async function getImpostos(): Promise<Imposto[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('impostos')
    .select('*')
    .order('competencia', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createImposto(d: ImpostoFormData): Promise<Imposto> {
  const supabase = createClient()
  const { data, error } = await supabase.from('impostos').insert(d).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateImposto(id: string, d: Partial<ImpostoFormData>): Promise<Imposto> {
  const supabase = createClient()
  const { data, error } = await supabase.from('impostos').update(d).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteImposto(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('impostos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── CRUD Contas a Pagar ───────────────────────────────────────────────────────

export async function getContasPagar(): Promise<ContaPagar[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contas_pagar')
    .select('*')
    .order('vencimento', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createContaPagar(d: ContaPagarFormData): Promise<ContaPagar> {
  const supabase = createClient()
  const { data, error } = await supabase.from('contas_pagar').insert(d).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateContaPagar(id: string, d: Partial<ContaPagarFormData>): Promise<ContaPagar> {
  const supabase = createClient()
  const { data, error } = await supabase.from('contas_pagar').update(d).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteContaPagar(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('contas_pagar').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── CRUD Contas a Receber ─────────────────────────────────────────────────────

export async function getContasReceber(): Promise<ContaReceber[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contas_receber')
    .select('*')
    .order('previsao', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createContaReceber(d: ContaReceberFormData): Promise<ContaReceber> {
  const supabase = createClient()
  const { data, error } = await supabase.from('contas_receber').insert(d).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateContaReceber(id: string, d: Partial<ContaReceberFormData>): Promise<ContaReceber> {
  const supabase = createClient()
  const { data, error } = await supabase.from('contas_receber').update(d).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteContaReceber(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('contas_receber').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ─── DRE ──────────────────────────────────────────────────────────────────────

const IMPOSTOS_RECEITA = ['PIS', 'COFINS', 'ISS', 'ISS/ISSQN', 'ICMS', 'Simples Nacional']
const IMPOSTOS_LUCRO = ['IRPJ', 'CSLL', 'IRPJ/CSLL']

export interface DREData {
  receitaBruta: number
  deducoes: number
  receitaLiquida: number
  cmv: number
  lucroBruto: number
  opexMarketing: number
  opexPayroll: number
  opexInfra: number
  opexTools: number
  opexOffice: number
  opexOther: number
  opexTotal: number
  ebit: number
  da: number
  ebitda: number
  impostosLucro: number
  lucroLiquido: number
  margemBruta: number
  margemEbitda: number
  margemLiquida: number
}

export function calcDRE(
  entries: FinancialEntry[],
  expenses: (FinancialExpense & { nature?: ExpenseNature })[],
  impostos: Imposto[],
  period = 'all'
): DREData {
  const fe = period === 'all' ? entries : entries.filter((e) => e.date.startsWith(period))
  const ex = period === 'all' ? expenses : expenses.filter((e) => e.date.startsWith(period))
  const im = period === 'all' ? impostos : impostos.filter((i) => i.competencia.startsWith(period))

  const receitaBruta = fe.filter((e) => e.status !== 'cancelled').reduce((s, e) => s + e.value, 0)
  const deducoes = im.filter((i) => IMPOSTOS_RECEITA.includes(i.tipo)).reduce((s, i) => s + i.valor, 0)
  const receitaLiquida = receitaBruta - deducoes
  const cmv = ex.filter((e) => e.nature === 'cogs').reduce((s, e) => s + e.value, 0)
  const lucroBruto = receitaLiquida - cmv

  const opex = ex.filter((e) => !e.nature || e.nature === 'opex')
  const opexMarketing = opex.filter((e) => e.category === 'marketing').reduce((s, e) => s + e.value, 0)
  const opexPayroll = opex.filter((e) => e.category === 'payroll').reduce((s, e) => s + e.value, 0)
  const opexInfra = opex.filter((e) => e.category === 'infrastructure').reduce((s, e) => s + e.value, 0)
  const opexTools = opex.filter((e) => e.category === 'tools').reduce((s, e) => s + e.value, 0)
  const opexOffice = opex.filter((e) => e.category === 'office').reduce((s, e) => s + e.value, 0)
  const opexOther = opex
    .filter((e) => !['marketing', 'payroll', 'infrastructure', 'tools', 'office'].includes(e.category))
    .reduce((s, e) => s + e.value, 0)
  const opexTotal = opexMarketing + opexPayroll + opexInfra + opexTools + opexOffice + opexOther

  const ebit = lucroBruto - opexTotal
  const da = ex.filter((e) => e.nature === 'da').reduce((s, e) => s + e.value, 0)
  const ebitda = ebit + da
  const impostosLucro = im.filter((i) => IMPOSTOS_LUCRO.includes(i.tipo)).reduce((s, i) => s + i.valor, 0)
  const lucroLiquido = ebit - impostosLucro

  return {
    receitaBruta, deducoes, receitaLiquida, cmv, lucroBruto,
    opexMarketing, opexPayroll, opexInfra, opexTools, opexOffice, opexOther, opexTotal,
    ebit, da, ebitda, impostosLucro, lucroLiquido,
    margemBruta: receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0,
    margemEbitda: receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0,
    margemLiquida: receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0,
  }
}

// ─── Fluxo de Caixa ───────────────────────────────────────────────────────────

export interface FluxoMes {
  mes: string
  entradas: number
  saidas: number
  saldo: number
  acumulado: number
}

export function calcFluxoCaixa(
  entries: FinancialEntry[],
  expenses: FinancialExpense[],
  n = 8
): FluxoMes[] {
  const now = new Date()
  const meses: FluxoMes[] = []
  let acumulado = 0

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

    const entradas = entries
      .filter((e) => e.date.startsWith(key) && e.status !== 'cancelled')
      .reduce((s, e) => s + e.value, 0)
    const saidas = expenses
      .filter((e) => e.date.startsWith(key))
      .reduce((s, e) => s + e.value, 0)
    const saldo = entradas - saidas
    acumulado += saldo
    meses.push({ mes: label, entradas, saidas, saldo, acumulado })
  }

  return meses
}

// ─── Indicadores ──────────────────────────────────────────────────────────────

export interface Indicadores {
  mrr: number
  ticketMedio: number
  crescimentoMensal: number
  cac: number
  ltv: number
  ltvCac: number
  burnRate: number
  runway: number
  receitaPorColaborador: number
  custoPorCliente: number
  receitaAcumulada: number
  despesaAcumulada: number
}

export function calcIndicadores(
  entries: FinancialEntry[],
  expenses: FinancialExpense[],
  clients: Client[],
  teamCount: number
): Indicadores {
  const now = new Date()
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevMonth = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const last3 = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const confirmed = entries.filter((e) => e.status !== 'cancelled')
  const receitaAcumulada = confirmed.reduce((s, e) => s + e.value, 0)
  const despesaAcumulada = expenses.reduce((s, e) => s + e.value, 0)

  const mrr = confirmed
    .filter((e) => e.date.startsWith(curMonth) && e.type === 'recurring')
    .reduce((s, e) => s + e.value, 0)

  const ticketMedio = confirmed.length > 0 ? receitaAcumulada / confirmed.length : 0

  const curRevenue = confirmed.filter((e) => e.date.startsWith(curMonth)).reduce((s, e) => s + e.value, 0)
  const prevRevenue = confirmed.filter((e) => e.date.startsWith(prevMonth)).reduce((s, e) => s + e.value, 0)
  const crescimentoMensal = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0

  const marketingSpend = expenses
    .filter((e) => last3.some((m) => e.date.startsWith(m)) && e.category === 'marketing')
    .reduce((s, e) => s + e.value, 0)
  const newClients = clients.filter((c) => last3.some((m) => c.start_date?.startsWith(m))).length
  const cac = newClients > 0 ? marketingSpend / newClients : 0

  const activeClients = clients.filter((c) => c.status === 'active')
  const avgMonthlyRevPerClient =
    activeClients.length > 0
      ? activeClients.reduce((s, c) => s + (c.monthly_revenue ?? 0), 0) / activeClients.length
      : 0
  const ltv = avgMonthlyRevPerClient / 0.05

  const ltvCac = cac > 0 ? ltv / cac : 0

  const last3Expenses = expenses.filter((e) => last3.some((m) => e.date.startsWith(m)))
  const burnRate = last3Expenses.length > 0 ? last3Expenses.reduce((s, e) => s + e.value, 0) / 3 : 0
  const resultado = receitaAcumulada - despesaAcumulada
  const runway = burnRate > 0 && resultado > 0 ? resultado / burnRate : 0

  const receitaPorColaborador = teamCount > 0 ? curRevenue / teamCount : 0
  const custoPorCliente = activeClients.length > 0 && burnRate > 0 ? burnRate / activeClients.length : 0

  return {
    mrr, ticketMedio, crescimentoMensal, cac, ltv, ltvCac,
    burnRate, runway, receitaPorColaborador, custoPorCliente,
    receitaAcumulada, despesaAcumulada,
  }
}

// ─── Alertas ──────────────────────────────────────────────────────────────────

export interface Alerta {
  tipo: 'critical' | 'warning'
  titulo: string
  descricao: string
}

export function calcAlertas(
  dre: DREData,
  ind: Indicadores,
  impostos: Imposto[],
  contasPagar: ContaPagar[],
  entries: FinancialEntry[]
): Alerta[] {
  const alertas: Alerta[] = []
  const today = new Date().toISOString().split('T')[0]

  if (dre.receitaLiquida > 0) {
    if (dre.margemBruta < 20)
      alertas.push({ tipo: 'critical', titulo: 'Margem Bruta Crítica', descricao: `${dre.margemBruta.toFixed(1)}% — abaixo de 20%` })
    else if (dre.margemBruta < 40)
      alertas.push({ tipo: 'warning', titulo: 'Margem Bruta em Atenção', descricao: `${dre.margemBruta.toFixed(1)}% — ideal acima de 40%` })
  }

  const impostoVencidos = impostos.filter((i) => i.status !== 'pago' && i.vencimento && i.vencimento < today)
  if (impostoVencidos.length > 0)
    alertas.push({ tipo: 'critical', titulo: 'Impostos Vencidos', descricao: `${impostoVencidos.length} imposto(s) com vencimento em atraso` })

  const contasVencidas = contasPagar.filter((c) => c.status !== 'pago' && c.vencimento < today)
  if (contasVencidas.length > 0)
    alertas.push({ tipo: 'critical', titulo: 'Contas Vencidas', descricao: `${contasVencidas.length} conta(s) a pagar vencidas` })

  if (ind.runway > 0 && ind.runway < 3)
    alertas.push({ tipo: 'critical', titulo: 'Runway Crítico', descricao: `${ind.runway.toFixed(1)} meses de reserva estimada` })
  else if (ind.runway > 0 && ind.runway < 6)
    alertas.push({ tipo: 'warning', titulo: 'Runway em Atenção', descricao: `${ind.runway.toFixed(1)} meses de reserva estimada` })

  if (ind.cac > 0 && ind.ltvCac < 1)
    alertas.push({ tipo: 'critical', titulo: 'LTV/CAC Desfavorável', descricao: `${ind.ltvCac.toFixed(2)}x — cliente custa mais do que traz` })
  else if (ind.cac > 0 && ind.ltvCac < 3)
    alertas.push({ tipo: 'warning', titulo: 'LTV/CAC Baixo', descricao: `${ind.ltvCac.toFixed(2)}x — ideal é 3x ou mais` })

  const pendingRevenue = entries.filter((e) => e.status === 'pending').reduce((s, e) => s + e.value, 0)
  if (pendingRevenue > 0 && ind.mrr > 0 && pendingRevenue / ind.mrr > 0.5)
    alertas.push({ tipo: 'warning', titulo: 'Receita Pendente Alta', descricao: `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingRevenue)} pendentes de confirmação` })

  return alertas
}
