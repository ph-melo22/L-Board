'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getClientById, updateClient, deleteClient } from '@/services/clients'
import { getTasks } from '@/services/demands'
import { formatCurrency, formatDate, formatPercent, getLabelByStatus, getStatusColor, getPriorityColor } from '@/lib/utils'
import type { ClientWithProfit, ClientFormData, ClientStatus, Task } from '@/types'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [client, setClient] = useState<ClientWithProfit | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [form, setForm] = useState<ClientFormData | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [c, allTasks] = await Promise.all([getClientById(id), getTasks()])
      setClient(c)
      setTasks(allTasks.filter((t) => t.client_id === id))
      setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  function openEdit() {
    if (!client) return
    setForm({
      name: client.name,
      product: client.product,
      monthly_revenue: client.monthly_revenue,
      operational_cost: client.operational_cost,
      start_date: client.start_date,
      renewal_date: client.renewal_date,
      status: client.status,
    })
    setEditOpen(true)
  }

  async function handleSave() {
    if (!client || !form) return
    setSaving(true)
    try {
      await updateClient(client.id, form)
      toast({ title: 'Cliente atualizado' })
      setEditOpen(false)
      load()
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!client) return
    try {
      await deleteClient(client.id)
      toast({ title: 'Cliente removido' })
      router.push('/clients')
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Erro ao carregar cliente.</p>
        <Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
        </div>
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!client) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">Cliente não encontrado.</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/clients')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover</Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
          {client.name[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold">{client.name}</h2>
          <p className="text-sm text-muted-foreground">{client.product}</p>
        </div>
        <span className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(client.status)}`}>
          {getLabelByStatus(client.status)}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Receita Mensal', value: formatCurrency(client.monthly_revenue) },
          { label: 'Custo Operacional', value: formatCurrency(client.operational_cost) },
          { label: 'Lucro Mensal', value: formatCurrency(client.profit) },
          { label: 'Margem', value: formatPercent(client.margin) },
        ].map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Início</p>
            <p className="font-medium">{formatDate(client.start_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Renovação</p>
            <p className="font-medium">{formatDate(client.renewal_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Criado em</p>
            <p className="font-medium">{formatDate(client.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Demandas ({tasks.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhuma tarefa vinculada.</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Título</th>
                  <th className="px-4 py-2 text-left font-medium">Prioridade</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Prazo</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{t.title}</td>
                    <td className={`px-4 py-2 font-medium ${getPriorityColor(t.priority)}`}>{getLabelByStatus(t.priority)}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(t.status)}`}>
                        {getLabelByStatus(t.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(t.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {form && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
            <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
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
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
