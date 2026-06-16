'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Settings, KeyRound, Plus, Trash2, Eye, EyeOff, AlertTriangle, Building2, Check, X,
  CalendarDays, Link2, Link2Off,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { formatDate } from '@/lib/utils'

type Provider = 'openai' | 'anthropic' | 'gemini' | 'grok' | 'deepseek' | 'other'

interface OrgApiKey {
  id: string
  provider: Provider
  label: string | null
  key_hint: string
  is_active: boolean
  created_at: string
}

interface Organization {
  id: string
  name: string
  created_at: string
}

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
  grok: 'Grok (xAI)',
  deepseek: 'DeepSeek',
  other: 'Outro',
}

const PROVIDER_COLORS: Record<Provider, string> = {
  openai: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  anthropic: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  gemini: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  grok: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  deepseek: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  other: 'bg-muted text-muted-foreground border-border',
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const tc = useTranslations('common')
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // Org state
  const [org, setOrg] = useState<Organization | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Google Calendar state
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null)
  const [gcalConnectedAt, setGcalConnectedAt] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  // API keys state
  const [keys, setKeys] = useState<OrgApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ provider: 'openai' as Provider, label: '', api_key: '' })
  const [showKey, setShowKey] = useState(false)
  const [adding, setAdding] = useState(false)

  async function loadGCalStatus() {
    const res = await fetch('/api/google/status')
    if (res.ok) {
      const data = await res.json()
      setGcalConnected(data.connected)
      setGcalConnectedAt(data.created_at)
    }
  }

  async function handleDisconnectGCal() {
    setDisconnecting(true)
    const res = await fetch('/api/google/disconnect', { method: 'DELETE' })
    if (res.ok) {
      setGcalConnected(false)
      setGcalConnectedAt(null)
      toast({ title: 'Google Calendar desconectado' })
    }
    setDisconnecting(false)
  }

  async function loadOrg() {
    const res = await fetch('/api/settings')
    if (res.ok) {
      const data = await res.json()
      setOrg(data)
      setNewName(data.name)
    }
  }

  async function loadKeys() {
    setLoadingKeys(true)
    const res = await fetch('/api/settings/ai-keys')
    if (res.ok) setKeys(await res.json())
    setLoadingKeys(false)
  }

  useEffect(() => {
    loadOrg()
    loadKeys()
    loadGCalStatus()
  }, [])

  useEffect(() => {
    const google = searchParams.get('google')
    if (google === 'success') {
      toast({ title: 'Google Calendar conectado com sucesso!' })
      loadGCalStatus()
    } else if (google === 'error') {
      toast({ title: 'Erro ao conectar Google Calendar', variant: 'destructive' })
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveName() {
    setSavingName(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    if (res.ok) {
      const data = await res.json()
      setOrg(data)
      setEditingName(false)
      toast({ title: t('toast.nameUpdated') })
    } else {
      const err = await res.json()
      toast({ title: tc('error'), description: err.error, variant: 'destructive' })
    }
    setSavingName(false)
  }

  async function handleToggle(id: string, current: boolean) {
    const res = await fetch(`/api/settings/ai-keys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, is_active: !current } : k))
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/settings/ai-keys/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setKeys((prev) => prev.filter((k) => k.id !== id))
      toast({ title: t('toast.keyRemoved') })
    }
  }

  async function handleAdd() {
    if (!addForm.api_key) return
    setAdding(true)
    const res = await fetch('/api/settings/ai-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    if (res.ok) {
      setKeys((prev) => [data, ...prev])
      setAddOpen(false)
      setAddForm({ provider: 'openai', label: '', api_key: '' })
      toast({ title: t('toast.keyAdded') })
    } else {
      toast({ title: tc('error'), description: data.error, variant: 'destructive' })
    }
    setAdding(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Org card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            {t('orgSection')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!org ? (
            <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
          ) : editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="max-w-xs"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveName} disabled={savingName || !newName.trim()}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNewName(org.name) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{org.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('createdAt', { date: formatDate(org.created_at) })}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditingName(true)}>
                <Settings className="mr-1.5 h-3.5 w-3.5" /> {tc('edit')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Calendar card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" />
            Google Calendar
          </CardTitle>
          <p className="text-xs text-muted-foreground pt-1">
            Conecte sua agenda para a Layla ter acesso aos seus compromissos e criar eventos.
          </p>
        </CardHeader>
        <CardContent>
          {gcalConnected === null ? (
            <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
          ) : gcalConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-emerald-600">Conectado</p>
                  {gcalConnectedAt && (
                    <p className="text-xs text-muted-foreground">desde {formatDate(gcalConnectedAt)}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDisconnectGCal}
                disabled={disconnecting}
              >
                <Link2Off className="mr-1.5 h-3.5 w-3.5" />
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => window.location.href = '/api/google/auth'}>
              <Link2 className="mr-1.5 h-4 w-4" />
              Conectar Google Calendar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* AI Keys card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              {t('aiKeys')}
            </CardTitle>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> {t('newKey')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            {t('aiKeysDesc')}
          </p>
        </CardHeader>
        <CardContent>
          {loadingKeys ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('noKeys')}</p>
              <p className="text-xs text-muted-foreground">{t('noKeysDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    key.is_active ? 'bg-card' : 'bg-muted/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      variant="outline"
                      className={`shrink-0 text-xs ${PROVIDER_COLORS[key.provider]}`}
                    >
                      {PROVIDER_LABELS[key.provider]}
                    </Badge>
                    <div className="min-w-0">
                      {key.label && (
                        <p className="text-sm font-medium truncate">{key.label}</p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono">••••{key.key_hint}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleToggle(key.id, key.is_active)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        key.is_active
                          ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {key.is_active ? t('active') : t('inactive')}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(key.id)}
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

      {/* Add key dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> {t('addKeyTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('form.provider')}</Label>
              <Select
                value={addForm.provider}
                onValueChange={(v) => setAddForm({ ...addForm, provider: v as Provider })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(PROVIDER_LABELS) as [Provider, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.label')}</Label>
              <Input
                placeholder="Ex: Produção"
                value={addForm.label}
                onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.apiKey')}</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={addForm.api_key}
                  onChange={(e) => setAddForm({ ...addForm, api_key: e.target.value })}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('keyEncrypted')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleAdd} disabled={adding || !addForm.api_key}>
              {adding ? tc('saving') : t('saveKey')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
