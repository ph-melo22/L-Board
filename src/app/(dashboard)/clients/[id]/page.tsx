'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, AlertTriangle, Plus, KeyRound } from 'lucide-react'
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
import { getClientApiKeys, createClientApiKey, updateClientApiKey, deleteClientApiKey } from '@/services/apiKeys'
import { formatCurrency, formatDate, formatPercent, getStatusColor, getPriorityColor } from '@/lib/utils'
import type { ClientWithProfit, ClientFormData, ClientStatus, Task, ClientApiKey, ClientApiKeyFormData, ApiKeyProvider } from '@/types'
import { useTranslations } from 'next-intl'

const PROVIDER_CONFIG: Record<ApiKeyProvider, { name: string; placeholder: string }> = {
  openai:    { name: 'OpenAI',        placeholder: 'sk-proj-...' },
  anthropic: { name: 'Anthropic',     placeholder: 'sk-ant-...' },
  gemini:    { name: 'Google Gemini', placeholder: 'AIza...' },
  grok:      { name: 'Grok (xAI)',    placeholder: 'xai-...' },
  deepseek:  { name: 'DeepSeek',      placeholder: 'sk-...' },
  other:     { name: 'Other',         placeholder: 'API Key...' },
}

const CLIENT_STATUS_KEYS: ClientStatus[] = ['active', 'trial', 'inactive', 'churned']

const PROVIDERS = Object.entries(PROVIDER_CONFIG) as [ApiKeyProvider, { name: string; placeholder: string }][]

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations('clientDetail')
  const tc = useTranslations('common')
  const tl = useTranslations('labels')

  const [client, setClient] = useState<ClientWithProfit | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [form, setForm] = useState<ClientFormData | null>(null)
  const [saving, setSaving] = useState(false)

  const [apiKeys, setApiKeys] = useState<ClientApiKey[]>([])
  const [keyFormOpen, setKeyFormOpen] = useState(false)
  const [keyForm, setKeyForm] = useState<{ provider: ApiKeyProvider; label: string; api_key: string }>({
    provider: 'openai', label: '', api_key: '',
  })
  const [keyLoading, setKeyLoading] = useState(false)
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [c, allTasks, keys] = await Promise.all([getClientById(id), getTasks(), getClientApiKeys(id)])
      setClient(c)
      setTasks(allTasks.filter((t) => t.client_id === id))
      setApiKeys(keys)
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
      toast({ title: t('toast.updated') })
      setEditOpen(false)
      load()
    } catch {
      toast({ title: t('toast.saveError'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!client) return
    try {
      await deleteClient(client.id)
      toast({ title: t('toast.deleted') })
      router.push('/clients')
    } catch {
      toast({ title: t('toast.deleteError'), variant: 'destructive' })
    }
  }

  async function handleAddKey() {
    if (!keyForm.api_key || !keyForm.provider) return
    setKeyLoading(true)
    try {
      const newKey = await createClientApiKey({
        client_id: id,
        provider: keyForm.provider,
        label: keyForm.label || null,
        api_key: keyForm.api_key,
      } as ClientApiKeyFormData)
      setApiKeys((prev) => [newKey, ...prev])
      toast({ title: t('toast.keyAdded') })
      setKeyFormOpen(false)
      setKeyForm({ provider: 'openai', label: '', api_key: '' })
    } catch {
      toast({ title: t('toast.saveError'), variant: 'destructive' })
    } finally {
      setKeyLoading(false)
    }
  }

  async function handleToggleKey(keyId: string, is_active: boolean) {
    try {
      const updated = await updateClientApiKey(keyId, { is_active })
      setApiKeys((prev) => prev.map((k) => k.id === keyId ? { ...k, is_active: updated.is_active } : k))
    } catch {
      toast({ title: t('toast.saveError'), variant: 'destructive' })
    }
  }

  async function handleDeleteKey() {
    if (!deleteKeyId) return
    try {
      await deleteClientApiKey(deleteKeyId)
      setApiKeys((prev) => prev.filter((k) => k.id !== deleteKeyId))
      toast({ title: t('toast.keyRemoved') })
      setDeleteKeyId(null)
    } catch {
      toast({ title: t('toast.deleteError'), variant: 'destructive' })
    }
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">{t('errorLoading')}</p>
        <Button size="sm" variant="outline" onClick={load}>{tc('retry')}</Button>
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
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!client) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">{t('clientNotFound')}</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/clients')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" /> {tc('edit')}</Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> {tc('delete')}</Button>
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
          {tl(client.status as never)}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: t('monthlyRevenue'), value: formatCurrency(client.monthly_revenue) },
          { label: t('operationalCost'), value: formatCurrency(client.operational_cost) },
          { label: t('monthlyProfit'), value: formatCurrency(client.profit) },
          { label: t('margin'), value: formatPercent(client.margin) },
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
        <CardHeader><CardTitle className="text-sm">{t('info')}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t('startDate')}</p>
            <p className="font-medium">{formatDate(client.start_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('renewalDate')}</p>
            <p className="font-medium">{formatDate(client.renewal_date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('createdAt')}</p>
            <p className="font-medium">{formatDate(client.created_at)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader><CardTitle className="text-sm">{t('taskCount', { count: tasks.length })}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t('noTasksLinked')}</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">{t('columns.title')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('columns.priority')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('columns.status')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('columns.dueDate')}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{task.title}</td>
                    <td className={`px-4 py-2 font-medium ${getPriorityColor(task.priority)}`}>{tl(task.priority as never)}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(task.status)}`}>
                        {tl(task.status as never)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(task.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            {t('integrations', { count: apiKeys.length })}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setKeyFormOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('addIntegration')}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {apiKeys.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t('noApiKeys')}</p>
          ) : (
            <div className="divide-y divide-border">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{PROVIDER_CONFIG[key.provider].name}</span>
                      {key.label && <span className="text-xs text-muted-foreground">{key.label}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">••••••••{key.key_hint}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleKey(key.id, !key.is_active)}
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                        key.is_active
                          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400'
                          : 'border-muted bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      {key.is_active ? t('active') : t('inactive')}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteKeyId(key.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {form && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
            <DialogHeader><DialogTitle>{t('editClientTitle')}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>{t('form.name')}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>{t('form.product')}</Label>
                  <Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.monthlyRevenue')}</Label>
                  <Input type="number" value={form.monthly_revenue} onChange={(e) => setForm({ ...form, monthly_revenue: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.operationalCost')}</Label>
                  <Input type="number" value={form.operational_cost} onChange={(e) => setForm({ ...form, operational_cost: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.startDate')}</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('form.renewalDate')}</Label>
                  <Input type="date" value={form.renewal_date ?? ''} onChange={(e) => setForm({ ...form, renewal_date: e.target.value || null })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>{t('form.status')}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ClientStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLIENT_STATUS_KEYS.map((s) => (
                        <SelectItem key={s} value={s}>{tl(s as never)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>{tc('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? tc('saving') : tc('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Key Dialog */}
      <Dialog open={keyFormOpen} onOpenChange={setKeyFormOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> {t('addKeyDialogTitle')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('provider')}</Label>
              <Select
                value={keyForm.provider}
                onValueChange={(v) => setKeyForm({ ...keyForm, provider: v as ApiKeyProvider })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(([value, cfg]) => (
                    <SelectItem key={value} value={value}>{cfg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('apiKeyLabel')}</Label>
              <Input
                placeholder={t('labelPlaceholder')}
                value={keyForm.label}
                onChange={(e) => setKeyForm({ ...keyForm, label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('apiKeyField')}</Label>
              <Input
                type="password"
                placeholder={PROVIDER_CONFIG[keyForm.provider].placeholder}
                value={keyForm.api_key}
                onChange={(e) => setKeyForm({ ...keyForm, api_key: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t('keyEncrypted')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKeyFormOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleAddKey} disabled={keyLoading || !keyForm.api_key}>
              {keyLoading ? tc('saving') : t('saveKey')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Key Confirm */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={(o) => !o && setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteKey')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteKeyDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Client Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteClientTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{tc('irreversible')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
