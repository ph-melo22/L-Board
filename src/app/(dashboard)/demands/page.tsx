'use client'
import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, DollarSign, AlertTriangle, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { getTasks, createTask, updateTask, deleteTask, updateTaskStatus } from '@/services/demands'
import { getClientOptions } from '@/services/clients'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { Task, TaskFormData, TaskPriority, TaskStatus } from '@/types'

const STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done']

const EMPTY_FORM: TaskFormData = {
  title: '', description: null, client_id: null, squad: null, responsible: null,
  priority: 'medium', impacts_revenue: false, revenue_impact_value: null, due_date: null, status: 'backlog',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

export default function DemandsPage() {
  const { toast } = useToast()
  const t  = useTranslations('demands')
  const tc = useTranslations('common')
  const [tasks, setTasks]               = useState<Task[]>([])
  const [clientOptions, setClientOptions] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(false)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<Task | null>(null)
  const [form, setForm]                 = useState<TaskFormData>(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [deleteId, setDeleteId]         = useState<string | null>(null)
  const [search, setSearch]             = useState('')
  const [filterClient, setFilterClient] = useState('all')
  const [filterResponsible, setFilterResponsible] = useState('')
  const [filterSquad, setFilterSquad]   = useState('')

  async function load() {
    setLoading(true)
    try {
      const [tk, co] = await Promise.all([getTasks(), getClientOptions()])
      setTasks(tk); setClientOptions(co); setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openNew(status: TaskStatus = 'backlog') {
    setEditing(null); setForm({ ...EMPTY_FORM, status }); setDialogOpen(true)
  }
  function openEdit(tk: Task) {
    setEditing(tk)
    setForm({ title: tk.title, description: tk.description, client_id: tk.client_id, squad: tk.squad, responsible: tk.responsible, priority: tk.priority, impacts_revenue: tk.impacts_revenue, revenue_impact_value: tk.revenue_impact_value, due_date: tk.due_date, status: tk.status })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) { await updateTask(editing.id, form); toast({ title: t('toast.updated') }) }
      else { await createTask(form); toast({ title: t('toast.created') }) }
      setDialogOpen(false); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    try { await deleteTask(deleteId); toast({ title: t('toast.deleted') }); load() }
    catch { toast({ title: t('toast.deleteError'), variant: 'destructive' }) }
    finally { setDeleteId(null) }
  }

  async function handleMoveStatus(task: Task, newStatus: TaskStatus) {
    try {
      await updateTaskStatus(task.id, newStatus)
      setTasks((prev) => prev.map((tk) => tk.id === task.id ? { ...tk, status: newStatus } : tk))
    } catch { toast({ title: t('toast.moveError'), variant: 'destructive' }) }
  }

  const hasFilters = search || filterClient !== 'all' || filterResponsible || filterSquad

  const filteredTasks = useMemo(() => {
    return tasks.filter((tk) => {
      if (search && !tk.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterClient !== 'all' && tk.client_id !== filterClient) return false
      if (filterResponsible && !tk.responsible?.toLowerCase().includes(filterResponsible.toLowerCase())) return false
      if (filterSquad && !tk.squad?.toLowerCase().includes(filterSquad.toLowerCase())) return false
      return true
    })
  }, [tasks, search, filterClient, filterResponsible, filterSquad])

  function clearFilters() {
    setSearch(''); setFilterClient('all'); setFilterResponsible(''); setFilterSquad('')
  }

  const byStatus = (status: TaskStatus) => filteredTasks.filter((tk) => tk.status === status)
  const criticalCount = tasks.filter((tk) => tk.priority === 'critical' && tk.status !== 'done').length

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
      {criticalCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800/50 dark:bg-red-950/40">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 dark:text-red-400" />
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            {t('criticalCount', { count: criticalCount })}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1 sm:flex-none sm:min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchPlaceholder')} className="pl-8 h-9 text-sm w-full" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="flex-1 sm:flex-none sm:w-40 h-9 text-sm"><SelectValue placeholder={t('allClients')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allClients')}</SelectItem>
            {clientOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder={t('responsiblePlaceholder')} className="w-36 h-9 text-sm hidden sm:block" value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)} />
        <Input placeholder={t('squadPlaceholder')} className="w-32 h-9 text-sm hidden sm:block" value={filterSquad} onChange={(e) => setFilterSquad(e.target.value)} />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground">
            <X className="mr-1 h-3.5 w-3.5" /> {t('clearFilters')}
          </Button>
        )}
        <div className="ml-auto">
          <Button size="sm" onClick={() => openNew()}><Plus className="mr-1.5 h-4 w-4" /> {t('newTask')}</Button>
        </div>
      </div>

      {hasFilters && (
        <p className="text-xs text-muted-foreground">
          {t('taskCount', { count: filteredTasks.length })}
        </p>
      )}

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUSES.map((s) => <Skeleton key={s} className="h-48 min-w-[200px] flex-shrink-0" />)}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {STATUSES.map((status) => (
            <div key={status} className="flex flex-col gap-2 min-w-[200px] flex-shrink-0 w-[calc(85vw)] sm:w-auto sm:flex-1">
              <div className="flex items-center justify-between px-1">
                <span className={`text-xs font-semibold uppercase tracking-wide ${getStatusColor(status).split(' ')[0]}`}>
                  {t(`status.${status}`)}
                </span>
                <span className="text-xs text-muted-foreground">{byStatus(status).length}</span>
              </div>
              <div className="flex flex-col gap-2 min-h-[80px] rounded-lg bg-muted/40 p-2">
                {byStatus(status).map((task) => (
                  <Card key={task.id} className={`shadow-none border ${task.priority === 'critical' ? 'border-red-300' : 'border-border/60'}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-medium leading-tight line-clamp-2">{task.title}</p>
                        <div className="flex shrink-0 gap-0.5">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEdit(task)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => setDeleteId(task.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>{t(`priority.${task.priority}`)}</span>
                        {task.clients && <span className="text-xs text-muted-foreground truncate">{task.clients.name}</span>}
                        {task.responsible && <span className="text-xs text-muted-foreground">· {task.responsible}</span>}
                        {task.impacts_revenue && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600">
                            <DollarSign className="h-3 w-3" />
                            {task.revenue_impact_value ? formatCurrency(task.revenue_impact_value) : tc('risk')}
                          </span>
                        )}
                      </div>
                      {task.due_date && <p className="text-xs text-muted-foreground">{formatDate(task.due_date)}</p>}
                      <div className="flex gap-1 pt-1 border-t border-border/40">
                        {STATUSES.indexOf(status) > 0 && (
                          <button onClick={() => handleMoveStatus(task, STATUSES[STATUSES.indexOf(status) - 1])} className="flex-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors py-0.5">←</button>
                        )}
                        {STATUSES.indexOf(status) < STATUSES.length - 1 && (
                          <button onClick={() => handleMoveStatus(task, STATUSES[STATUSES.indexOf(status) + 1])} className="flex-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors py-0.5">→</button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <button onClick={() => openNew(status)} className="w-full rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                  {t('addCard')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editing ? t('editTask') : t('newTask')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{t('form.title')}</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t('form.description')}</Label>
              <Textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.priority')}</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
                    <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.status')}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.client')}</Label>
              <Select value={form.client_id ?? 'none'} onValueChange={(v) => setForm({ ...form, client_id: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder={tc('none')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc('none')}</SelectItem>
                  {clientOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.dueDate')}</Label>
              <Input type="date" value={form.due_date ?? ''} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.squad')}</Label>
              <Input value={form.squad ?? ''} onChange={(e) => setForm({ ...form, squad: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.responsible')}</Label>
              <Input value={form.responsible ?? ''} onChange={(e) => setForm({ ...form, responsible: e.target.value || null })} />
            </div>
            <div className="col-span-2 flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
              <input type="checkbox" id="impacts_revenue" checked={form.impacts_revenue} onChange={(e) => setForm({ ...form, impacts_revenue: e.target.checked, revenue_impact_value: e.target.checked ? form.revenue_impact_value : null })} className="h-4 w-4" />
              <Label htmlFor="impacts_revenue" className="cursor-pointer">{t('form.impactsRevenue')}</Label>
              {form.impacts_revenue && (
                <Input type="number" placeholder={t('form.revenueImpact')} className="w-full sm:w-40 sm:ml-auto mt-2 sm:mt-0" value={form.revenue_impact_value ?? ''} onChange={(e) => setForm({ ...form, revenue_impact_value: e.target.value ? Number(e.target.value) : null })} />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.title}>{saving ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
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
