'use client'
import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, ChevronUp, ChevronDown, AlertTriangle, Search } from 'lucide-react'
import Link from 'next/link'
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
import { useToast } from '@/hooks/use-toast'
import { getClients, createClient_, updateClient, deleteClient } from '@/services/clients'
import { formatCurrency, formatDate, formatPercent, getLabelByStatus, getStatusColor } from '@/lib/utils'
import type { ClientWithProfit, ClientFormData, ClientStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'monthly_revenue' | 'margin' | 'renewal_date'
type SortDir = 'asc' | 'desc'

const EMPTY_FORM: ClientFormData = {
  name: '', product: '', monthly_revenue: 0, operational_cost: 0,
  start_date: new Date().toISOString().split('T')[0], renewal_date: null, status: 'active',
}

const PAGE_SIZE = 10

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { toast } = useToast()
  const [clients, setClients] = useState<ClientWithProfit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Filters
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Pagination
  const [page, setPage] = useState(1)

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ClientWithProfit | null>(null)
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setClients(await getClients()); setError(false) }
    catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openNew() { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true) }
  function openEdit(c: ClientWithProfit) {
    setEditing(c)
    setForm({ name: c.name, product: c.product, monthly_revenue: c.monthly_revenue, operational_cost: c.operational_cost, start_date: c.start_date, renewal_date: c.renewal_date, status: c.status })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) { await updateClient(editing.id, form); toast({ title: 'Cliente atualizado' }) }
      else { await createClient_(form); toast({ title: 'Cliente criado' }) }
      setDialogOpen(false); load()
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    try { await deleteClient(deleteId); toast({ title: 'Cliente removido' }); load() }
    catch { toast({ title: 'Erro ao remover', variant: 'destructive' }) }
    finally { setDeleteId(null) }
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) { setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  // Derived data
  const filtered = useMemo(() => {
    let result = clients
    if (filterStatus !== 'all') result = result.filter((c) => c.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.product.toLowerCase().includes(q))
    }
    result = [...result].sort((a, b) => {
      let av: string | number = a[sortKey] ?? ''
      let bv: string | number = b[sortKey] ?? ''
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return result
  }, [clients, filterStatus, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-20" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  function SortTh({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        className="px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-foreground transition-colors"
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">{label} <SortIcon col={col} /></span>
      </th>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Erro ao carregar clientes.</p>
        <Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou produto..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'active', 'trial', 'inactive', 'churned'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1) }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Todos' : getLabelByStatus(s)}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Button size="sm" onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Novo Cliente</Button>
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          {search && ` para "${search}"`}
        </p>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : paginated.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <SortTh col="name" label="Cliente" />
                    <th className="px-4 py-3 text-left font-medium">Produto</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <SortTh col="monthly_revenue" label="Receita/mês" />
                    <SortTh col="margin" label="Margem" />
                    <SortTh col="renewal_date" label="Renovação" />
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.product}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(c.status)}`}>
                          {getLabelByStatus(c.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(c.monthly_revenue)}</td>
                      <td className="px-4 py-3 text-right">{formatPercent(c.margin)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.renewal_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/clients/${c.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                className="w-8"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {/* Dialog Create/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Produto / Plano</Label>
                <Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Receita Mensal (R$)</Label>
                <Input type="number" value={form.monthly_revenue} onChange={(e) => setForm({ ...form, monthly_revenue: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Custo Operacional (R$)</Label>
                <Input type="number" value={form.operational_cost} onChange={(e) => setForm({ ...form, operational_cost: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Renovação</Label>
                <Input type="date" value={form.renewal_date ?? ''} onChange={(e) => setForm({ ...form, renewal_date: e.target.value || null })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ClientStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remover cliente?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
