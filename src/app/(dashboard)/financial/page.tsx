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
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import type {
  FinancialEntry, FinancialEntryFormData, FinancialEntryType, FinancialEntryStatus, FinancialEntryCategory,
  FinancialExpense, FinancialExpenseFormData, ExpenseType, ExpenseCategory,
} from '@/types'
import { useTranslations } from 'next-intl'

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

function getMonthOptions(allLabel: string) {
  const opts = [{ value: 'all', label: allLabel }]
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return opts
}

export default function FinancialPage() {
  const { toast } = useToast()
  const t  = useTranslations('financial')
  const tc = useTranslations('common')
  const tl = useTranslations('labels')

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

  const filteredEntries = useMemo(() =>
    period === 'all' ? entries : entries.filter((e) => e.date.startsWith(period)),
    [entries, period]
  )
  const filteredExpenses = useMemo(() =>
    period === 'all' ? expenses : expenses.filter((e) => e.date.startsWith(period)),
    [expenses, period]
  )

  const expenseByCat = useMemo(() => {
    const map: Record<string, number> = {}
    filteredExpenses.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + e.value })
    return Object.entries(map).map(([cat, value]) => ({ name: tl(cat as never), value, cat }))
  }, [filteredExpenses, tl])

  function openNewEntry() { setEditingEntry(null); setEntryForm(EMPTY_ENTRY); setEntryOpen(true) }
  function openEditEntry(e: FinancialEntry) {
    setEditingEntry(e)
    setEntryForm({ client_id: e.client_id, value: e.value, type: e.type, category: e.category, status: e.status, date: e.date, description: e.description })
    setEntryOpen(true)
  }
  async function handleSaveEntry() {
    setSavingEntry(true)
    try {
      if (editingEntry) { await updateFinancialEntry(editingEntry.id, entryForm); toast({ title: t('toast.updated') }) }
      else { await createFinancialEntry(entryForm); toast({ title: t('toast.created') }) }
      setEntryOpen(false); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSavingEntry(false) }
  }
  async function handleDeleteEntry() {
    if (!deleteEntryId) return
    try { await deleteFinancialEntry(deleteEntryId); toast({ title: t('toast.deleted') }); load() }
    catch { toast({ title: t('toast.deleteError'), variant: 'destructive' }) }
    finally { setDeleteEntryId(null) }
  }

  function openNewExpense() { setEditingExpense(null); setExpenseForm(EMPTY_EXPENSE); setExpenseOpen(true) }
  function openEditExpense(e: FinancialExpense) {
    setEditingExpense(e)
    setExpenseForm({ supplier: e.supplier, category: e.category, cost_center: e.cost_center, value: e.value, type: e.type, date: e.date, description: e.description })
    setExpenseOpen(true)
  }
  async function handleSaveExpense() {
    setSavingExpense(true)
    try {
      if (editingExpense) { await updateFinancialExpense(editingExpense.id, expenseForm); toast({ title: t('toast.updated') }) }
      else { await createFinancialExpense(expenseForm); toast({ title: t('toast.created') }) }
      setExpenseOpen(false); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSavingExpense(false) }
  }
  async function handleDeleteExpense() {
    if (!deleteExpenseId) return
    try { await deleteFinancialExpense(deleteExpenseId); toast({ title: t('toast.deleted') }); load() }
    catch { toast({ title: t('toast.deleteError'), variant: 'destructive' }) }
    finally { setDeleteExpenseId(null) }
  }

  const totalEntries = calcEntriesTotal(filteredEntries)
  const totalExpenses = calcExpensesTotal(filteredExpenses)
  const monthOptions = getMonthOptions(t('allPeriods'))

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">{t('errorLoading')}</p>
        <Button size="sm" variant="outline" onClick={load}>{tc('retry')}</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Label className="text-xs text-muted-foreground shrink-0">{t('period')}</Label>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-52 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{t('summary.entries')}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold text-emerald-600">{formatCurrency(totalEntries)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{t('summary.expenses')}</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold text-red-500">{formatCurrency(totalExpenses)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{t('summary.result')}</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-xl font-bold ${totalEntries - totalExpenses >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(totalEntries - totalExpenses)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="entries">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="entries">{t('tabs.entries')} ({filteredEntries.length})</TabsTrigger>
            <TabsTrigger value="expenses">{t('tabs.expenses')} ({filteredExpenses.length})</TabsTrigger>
          </TabsList>
          <div>
            <TabsContent value="entries" className="mt-0">
              <Button size="sm" onClick={openNewEntry}><Plus className="mr-1.5 h-4 w-4" /> {t('newEntry')}</Button>
            </TabsContent>
            <TabsContent value="expenses" className="mt-0">
              <Button size="sm" onClick={openNewExpense}><Plus className="mr-1.5 h-4 w-4" /> {t('newExpense')}</Button>
            </TabsContent>
          </div>
        </div>

        <TabsContent value="entries">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filteredEntries.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">{t('noEntries')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">{t('columns.date')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('columns.client')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('columns.category')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('columns.type')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('columns.status')}</th>
                        <th className="px-4 py-3 text-right font-medium">{t('columns.value')}</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((e) => (
                        <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                          <td className="px-4 py-3">{e.clients?.name ?? '—'}</td>
                          <td className="px-4 py-3">{tl(e.category as never)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{tl(e.type as never)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(e.status)}`}>{tl(e.status as never)}</span>
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

        <TabsContent value="expenses" className="space-y-4">
          {!loading && expenseByCat.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">{t('expensesByCategory')}</CardTitle></CardHeader>
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
                <p className="p-6 text-sm text-muted-foreground">{t('noExpenses')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">{t('columns.date')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('columns.supplier')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('columns.category')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('columns.type')}</th>
                        <th className="px-4 py-3 text-left font-medium">{t('columns.costCenter')}</th>
                        <th className="px-4 py-3 text-right font-medium">{t('columns.value')}</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((e) => (
                        <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(e.date)}</td>
                          <td className="px-4 py-3 font-medium">{e.supplier}</td>
                          <td className="px-4 py-3">{tl(e.category as never)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{tl(e.type as never)}</td>
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
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingEntry ? t('editEntry') : t('newEntry')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{t('form.client')}</Label>
              <Select value={entryForm.client_id ?? 'none'} onValueChange={(v) => setEntryForm({ ...entryForm, client_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder={tc('select')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc('none')}</SelectItem>
                  {clientOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.value')}</Label>
              <Input type="number" value={entryForm.value} onChange={(e) => setEntryForm({ ...entryForm, value: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.date')}</Label>
              <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.type')}</Label>
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
              <Label>{t('form.category')}</Label>
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
              <Label>{t('form.status')}</Label>
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
              <Label>{t('form.description')}</Label>
              <Input value={entryForm.description ?? ''} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSaveEntry} disabled={savingEntry}>{savingEntry ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingExpense ? t('editExpense') : t('newExpense')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{t('form.supplier')}</Label>
              <Input value={expenseForm.supplier} onChange={(e) => setExpenseForm({ ...expenseForm, supplier: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.value')}</Label>
              <Input type="number" value={expenseForm.value} onChange={(e) => setExpenseForm({ ...expenseForm, value: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.date')}</Label>
              <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.type')}</Label>
              <Select value={expenseForm.type} onValueChange={(v) => setExpenseForm({ ...expenseForm, type: v as ExpenseType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{tl('fixed')}</SelectItem>
                  <SelectItem value="variable">{tl('variable')}</SelectItem>
                  <SelectItem value="investment">{tl('investment')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.category')}</Label>
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
            <div className="space-y-1.5 col-span-2">
              <Label>{t('form.costCenter')}</Label>
              <Input value={expenseForm.cost_center ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, cost_center: e.target.value || null })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t('form.description')}</Label>
              <Input value={expenseForm.description ?? ''} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSaveExpense} disabled={savingExpense || !expenseForm.supplier}>{savingExpense ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEntryId} onOpenChange={(o) => !o && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('deleteEntry')}</AlertDialogTitle><AlertDialogDescription>{tc('irreversible')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{tc('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteExpenseId} onOpenChange={(o) => !o && setDeleteExpenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t('deleteExpense')}</AlertDialogTitle><AlertDialogDescription>{tc('irreversible')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{tc('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
