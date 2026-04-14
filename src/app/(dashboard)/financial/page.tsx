'use client'
import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  getFinancialEntries, createFinancialEntry, updateFinancialEntry, deleteFinancialEntry,
  getFinancialExpenses, createFinancialExpense, updateFinancialExpense, deleteFinancialExpense,
  calcEntriesTotal, calcExpensesTotal,
} from '@/services/financial'
import { getClientOptions } from '@/services/clients'
import { formatCurrency, formatDate, getLabelByStatus, getStatusColor } from '@/lib/utils'
import type {
  FinancialEntry, FinancialEntryFormData, FinancialEntryType, FinancialEntryStatus, FinancialEntryCategory,
  FinancialExpense, FinancialExpenseFormData, ExpenseType, ExpenseCategory,
} from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

const EMPTY_ENTRY: FinancialEntryFormData = {
  client_id: null, value: 0, type: 'recurring', category: 'subscription',
  status: 'confirmed', date: new Date().toISOString().split('T')[0], description: null,
}
const EMPTY_EXPENSE: FinancialExpenseFormData = {
  supplier: '', category: 'infrastructure', cost_center: null, value: 0,
  type: 'fixed', date: new Date().toISOString().split('T')[0], description: null,
}

const EXPENSE_COLORS: Record<string, string> = {
  infrastructure: '#6366f1', payroll: '#f59e0b', marketing: '#10b981',
  tools: '#3b82f6', office: '#8b5cf6', taxes: '#ef4444', other: '#94a3b8',
}

// ─── Period helpers ───────────────────────────────────────────────────────────

function getMonthOptions() {
  const opts = [{ value: 'all', label: 'Todos os períodos' }]
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}

export default function FinancialPage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [expenses, setExpenses] = useState<FinancialExpense[]>([])
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState('all')

  const [entryOpen, setEntryOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null)
  const [entryForm, setEntryForm] = useState<FinancialEntryFormData>(EMPTY_ENTRY)
  const [savingEntry, setSavingEntry] = useState(false)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)

  const [expenseOpen, setExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<FinancialExpense | null>(null)
  const [expenseForm, setExpenseForm] = useState<FinancialExpenseFormData>(EMPTY_EXPENSE)
  const [savingExpense, setSavingExpense] = useState(false)
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [e, ex, co] = await Promise.all([getFinancialEntries(), getFinancialExpenses(), getClientOptions()])
      setEntries(e); setExpenses(ex); setClientOptions(co); setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Period filter
  const filteredEntries = useMemo(() =>
    period === 'all' ? entries : entries.filter((e) => e.date.startsWith(period)),
    [entries, period]
  )
  const filteredExpenses = useMemo(() =>
    period === 'all' ? expenses : expenses.filter((e) => e.date.startsWith(period)),
    [expenses, period]
  )

  // Expense by category chart data
  const expenseByCat = useMemo(() => {
    const map: Record<string, number> = {}
    filteredExpenses.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + e.value })
    return Object.entries(map).map(([cat, value]) => ({ name: getLabelByStatus(cat), value, cat }))
  }, [filteredExpenses])

  // Entry handlers
  function openNewEntry() { setEditingEntry(null); setEntryForm(EMPTY_ENTRY); setEntryOpen(true) }
  function openEditEntry(e: FinancialEntry) {
    setEditingEntry(e)
    setEntryForm({ client_id: e.client_id, value: e.value, type: e.type, category: e.category, status: e.status, date: e.date, description: e.description })
    setEntryOpen(true)
  }
  async function handleSaveEntry() {
    setSavingEntry(true)
    try {
      if (editingEntry) { await updateFinancialEntry(editingEntry.id, entryForm); toast({ title: 'Entrada atualizada' }) }
      else { await createFinancialEntry(entryForm); toast({ title: 'Entrada criada' }) }
      setEntryOpen(false); load()
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }) }
    finally { setSavingEntry(false) }
  }
  async function handleDeleteEntry() {
    if (!deleteEntryId) return
    try { await deleteFinancialEntry(deleteEntryId); toast({ title: 'Entrada removida' }); load() }
    catch { toast({ title: 'Erro ao remover', variant: 'destructive' }) }
    finally { setDeleteEntryId(null) }
  }

  // Expense handlers
  function openNewExpense() { setEditingExpense(null); setExpenseForm(EMPTY_EXPENSE); setExpenseOpen(true) }
  function openEditExpense(e: FinancialExpense) {
    setEditingExpense(e)
    setExpenseForm({ supplier: e.supplier, category: e.category, cost_center: e.cost_center, value: e.value, type: e.type, date: e.date, description: e.description })
    setExpenseOpen(true)
  }
  async function handleSaveExpense() {
    setSavingExpense(true)
    try {
      if (editingExpense) { await updateFinancialExpense(editingExpense.id, expenseForm); toast({ title: 'Despesa atualizada' }) }
      else { await createFinancialExpense(expenseForm); toast({ title: 'Despesa criada' }) }
      setExpenseOpen(false); load()
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }) }
    finally { setSavingExpense(false) }
  }
  async function handleDeleteExpense() {
    if (!deleteExpenseId) return
    try { await deleteFinancialExpense(deleteExpenseId); toast({ title: 'Despesa removida' }); load() }
    catch { toast({ title: 'Erro ao remover', variant: 'destructive' }) }
    finally { setDeleteExpenseId(null) }
  }

  const totalEntries = calcEntriesTotal(filteredEntries)
  const totalExpenses = calcExpensesTotal(filteredExpenses)
  const monthOptions = getMonthOptions()

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Erro ao carregar dados financeiros.</p>
        <Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Period filter */}
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground shrink-0">Período:</Label>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-52 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Receitas</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold text-emerald-600">{formatCurrency(totalEntries)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Despesas</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold text-red-500">{formatCurrency(totalExpenses)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Resultado</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-xl font-bold ${totalEntries - totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(totalEntries - totalExpenses)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="entries">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="entries">Entradas ({filteredEntries.length})</TabsTrigger>
            <TabsTrigger value="expenses">Despesas ({filteredExpenses.length})</TabsTrigger>
          </TabsList>
          <div>
            <TabsContent value="entries" className="mt-0">
              <Button size="sm" onClick={openNewEntry}><Plus className="mr-1.5 h-4 w-4" /> Nova Entrada</Button>
            </TabsContent>
            <TabsContent value="expenses" className="mt-0">
              <Button size="sm" onClick={openNewExpense}><Plus className="mr-1.5 h-4 w-4" /> Nova Despesa</Button>
            </TabsContent>
          </div>
        </div>

        {/* Entries */}
        <TabsContent value="entries">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filteredEntries.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Nenhuma entrada no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">Data</th>
                        <th className="px-4 py-3 text-left font-medium">Cliente</th>
                        <th className="px-4 py-3 text-left font-medium">Categoria</th>
                        <th className="px-4 py-3 text-left font-medium">Tipo</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Valor</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((e) => (
                        <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                          <td className="px-4 py-3">{e.clients?.name ?? '—'}</td>
                          <td className="px-4 py-3">{getLabelByStatus(e.category)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{getLabelByStatus(e.type)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(e.status)}`}>{getLabelByStatus(e.status)}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.value)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditEntry(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteEntryId(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses */}
        <TabsContent value="expenses" className="space-y-4">
          {/* Chart */}
          {!loading && expenseByCat.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Despesas por Categoria</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expenseByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {expenseByCat.map((entry) => (
                        <Cell key={entry.cat} fill={EXPENSE_COLORS[entry.cat] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filteredExpenses.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Nenhuma despesa no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">Data</th>
                        <th className="px-4 py-3 text-left font-medium">Fornecedor</th>
                        <th className="px-4 py-3 text-left font-medium">Categoria</th>
                        <th className="px-4 py-3 text-left font-medium">Tipo</th>
                        <th className="px-4 py-3 text-left font-medium">Centro de Custo</th>
                        <th className="px-4 py-3 text-right font-medium">Valor</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((e) => (
                        <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                          <td className="px-4 py-3 font-medium">{e.supplier}</td>
                          <td className="px-4 py-3">{getLabelByStatus(e.category)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{getLabelByStatus(e.type)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.cost_center ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.value)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditExpense(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteExpenseId(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entry Dialog */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingEntry ? 'Editar Entrada' : 'Nova Entrada'}</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => setEntryOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEntry} disabled={savingEntry}>{savingEntry ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveExpense} disabled={savingExpense || !expenseForm.supplier}>{savingExpense ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEntryId} onOpenChange={(o) => !o && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover entrada?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteExpenseId} onOpenChange={(o) => !o && setDeleteExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover despesa?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
