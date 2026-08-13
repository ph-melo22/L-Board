'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Trash2, AlertTriangle, Search, X, Clock, Sparkles, Upload, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getLeads, createLead, deleteLead, moveLeadStage } from '@/services/crm'
import { getTeam, getCurrentProfile } from '@/services/team'
import { formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import type { CrmLead, CrmLeadFormData, CrmLeadPriority, CrmLeadStage, Profile } from '@/types'

const STAGES: CrmLeadStage[] = ['novo', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido']

const EMPTY_FORM: CrmLeadFormData = {
  owner_id: null, name: '', company: null, role_title: null, email: null, phone: null,
  stage: 'novo', source: null, product_interest: null, deal_value: 0, win_probability: null,
  expected_close_date: null, loss_reason: null, industry: null, company_size: null,
  priority: 'medium', tags: [], next_follow_up_date: null, notes: null,
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

interface AILead {
  name: string
  company?: string | null
  role_title?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  product_interest?: string | null
  deal_value?: number | null
  industry?: string | null
  company_size?: string | null
  notes?: string | null
}

function isOverdue(lead: CrmLead): boolean {
  if (!lead.next_follow_up_date || lead.stage === 'ganho' || lead.stage === 'perdido') return false
  return lead.next_follow_up_date < new Date().toISOString().split('T')[0]
}

export default function CrmPage() {
  const { toast } = useToast()
  const t  = useTranslations('crm')
  const tc = useTranslations('common')

  const [leads, setLeads]               = useState<CrmLead[]>([])
  const [team, setTeam]                 = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(false)
  const [search, setSearch]             = useState('')
  const [filterOwner, setFilterOwner]   = useState('all')
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [form, setForm]                 = useState<CrmLeadFormData>(EMPTY_FORM)
  const [tagsInput, setTagsInput]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [deleteId, setDeleteId]         = useState<string | null>(null)
  const [lossLeadId, setLossLeadId]     = useState<string | null>(null)
  const [lossReason, setLossReason]     = useState('')

  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiStep, setAiStep]             = useState<'upload' | 'preview'>('upload')
  const [aiFile, setAiFile]             = useState<File | null>(null)
  const [aiOwnerId, setAiOwnerId]       = useState<string>('')
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiLeads, setAiLeads]           = useState<AILead[]>([])
  const [aiSelected, setAiSelected]     = useState<Set<number>>(new Set())
  const [aiCreating, setAiCreating]     = useState(false)

  const isManager = currentProfile?.role === 'founder' || currentProfile?.role === 'manager'

  async function load() {
    setLoading(true)
    try {
      const [ld, profile] = await Promise.all([getLeads(), getCurrentProfile()])
      setLeads(ld); setCurrentProfile(profile)
      if (profile?.role === 'founder' || profile?.role === 'manager') setTeam(await getTeam())
      setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openNew(stage: CrmLeadStage = 'novo') {
    setForm({ ...EMPTY_FORM, stage, owner_id: isManager ? null : currentProfile?.id ?? null })
    setTagsInput('')
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const tags = tagsInput.split(',').map((tg) => tg.trim()).filter(Boolean)
      const owner_id = form.owner_id ?? (isManager ? null : currentProfile?.id ?? null)
      await createLead({ ...form, tags, owner_id })
      toast({ title: t('toast.created') })
      setDialogOpen(false); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    try { await deleteLead(deleteId); toast({ title: t('toast.deleted') }); load() }
    catch { toast({ title: t('toast.deleteError'), variant: 'destructive' }) }
    finally { setDeleteId(null) }
  }

  async function handleMoveStage(lead: CrmLead, newStage: CrmLeadStage) {
    if (newStage === 'perdido') { setLossLeadId(lead.id); setLossReason(''); return }
    try {
      await moveLeadStage(lead.id, newStage)
      setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, stage: newStage } : l))
    } catch { toast({ title: t('toast.moveError'), variant: 'destructive' }) }
  }

  async function handleConfirmLoss() {
    if (!lossLeadId) return
    try {
      await moveLeadStage(lossLeadId, 'perdido', lossReason || undefined)
      setLeads((prev) => prev.map((l) => l.id === lossLeadId ? { ...l, stage: 'perdido', loss_reason: lossReason || null } : l))
    } catch { toast({ title: t('toast.moveError'), variant: 'destructive' }) }
    finally { setLossLeadId(null) }
  }

  function openAiImport() {
    setAiFile(null); setAiLeads([]); setAiSelected(new Set())
    setAiOwnerId(isManager ? '' : currentProfile?.id ?? '')
    setAiStep('upload')
    setAiDialogOpen(true)
  }

  async function handleAiGenerate() {
    if (!aiFile) return
    setAiLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', aiFile)
      const res = await fetch('/api/crm/ai-import', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? t('toast.importError'))

      setAiLeads(json.leads)
      setAiSelected(new Set((json.leads as AILead[]).map((_, i) => i)))
      setAiStep('preview')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('toast.importError'), variant: 'destructive' })
    } finally {
      setAiLoading(false)
    }
  }

  async function handleAiCreate() {
    setAiCreating(true)
    try {
      const owner_id = aiOwnerId || currentProfile?.id || null
      const selected = aiLeads.filter((_, i) => aiSelected.has(i))
      for (const lead of selected) {
        await createLead({
          ...EMPTY_FORM,
          owner_id,
          name: lead.name,
          company: lead.company ?? null,
          role_title: lead.role_title ?? null,
          email: lead.email ?? null,
          phone: lead.phone ?? null,
          source: lead.source ?? null,
          product_interest: lead.product_interest ?? null,
          deal_value: lead.deal_value ?? 0,
          industry: lead.industry ?? null,
          company_size: lead.company_size ?? null,
          notes: lead.notes ?? null,
        })
      }
      toast({ title: t('toast.importSuccess', { count: selected.length }) })
      setAiDialogOpen(false); load()
    } catch {
      toast({ title: t('toast.importError'), variant: 'destructive' })
    } finally {
      setAiCreating(false)
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (search) {
        const q = search.toLowerCase()
        if (!l.name.toLowerCase().includes(q) && !(l.company ?? '').toLowerCase().includes(q)) return false
      }
      if (filterOwner !== 'all' && l.owner_id !== filterOwner) return false
      return true
    })
  }, [leads, search, filterOwner])

  const hasFilters = search || filterOwner !== 'all'
  function clearFilters() { setSearch(''); setFilterOwner('all') }

  const byStage = (stage: CrmLeadStage) => filteredLeads.filter((l) => l.stage === stage)
  const overdueCount = leads.filter(isOverdue).length

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
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-800/50 dark:bg-red-950/40">
          <Clock className="h-4 w-4 text-red-600 shrink-0 dark:text-red-400" />
          <p className="text-sm font-medium text-red-800 dark:text-red-300">
            {t('overdueCount', { count: overdueCount })}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1 sm:flex-none sm:min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('searchPlaceholder')} className="pl-8 h-10 text-base w-full md:h-9 md:text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isManager && (
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-44 h-10 text-base md:h-9 md:text-sm"><SelectValue placeholder={t('allOwners')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allOwners')}</SelectItem>
              {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground">
            <X className="mr-1 h-3.5 w-3.5" /> {t('clearFilters')}
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={openAiImport}><Sparkles className="mr-1.5 h-4 w-4 text-purple-600" /> {t('aiImport')}</Button>
          <Button size="sm" onClick={() => openNew()}><Plus className="mr-1.5 h-4 w-4" /> {t('newLead')}</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((s) => <Skeleton key={s} className="h-48 min-w-[220px] flex-shrink-0" />)}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {STAGES.map((stage) => (
            <div key={stage} className="flex flex-col gap-2 min-w-[220px] flex-shrink-0 w-[calc(85vw)] sm:w-auto sm:flex-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(`stage.${stage}`)}
                </span>
                <span className="text-xs text-muted-foreground">{byStage(stage).length}</span>
              </div>
              <div className="flex flex-col gap-2 min-h-[80px] rounded-lg bg-muted/40 p-2">
                {byStage(stage).map((lead) => (
                  <Card key={lead.id} className={`shadow-none border ${isOverdue(lead) ? 'border-red-300' : 'border-border/60'}`}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <Link href={`/crm/${lead.id}`} className="min-w-0 flex-1">
                          <p className="text-xs font-medium leading-tight line-clamp-2 hover:underline">{lead.name}</p>
                          {lead.company && <p className="text-xs text-muted-foreground truncate">{lead.company}</p>}
                        </Link>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(lead.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {lead.deal_value > 0 && <span className="text-xs font-medium">{formatCurrency(lead.deal_value)}</span>}
                        <span className={`text-xs ${lead.priority === 'high' ? 'text-red-500' : lead.priority === 'medium' ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {t(`priority.${lead.priority}`)}
                        </span>
                        {isManager && lead.profiles?.full_name && (
                          <span className="text-xs text-muted-foreground truncate">· {lead.profiles.full_name}</span>
                        )}
                      </div>
                      {isOverdue(lead) && (
                        <p className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <Clock className="h-3 w-3" /> {t('overdue')}
                        </p>
                      )}
                      <div className="flex gap-1 pt-1 border-t border-border/40">
                        {STAGES.indexOf(stage) > 0 && (
                          <button onClick={() => handleMoveStage(lead, STAGES[STAGES.indexOf(stage) - 1])} className="flex-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors py-0.5">←</button>
                        )}
                        {STAGES.indexOf(stage) < STAGES.length - 1 && (
                          <button onClick={() => handleMoveStage(lead, STAGES[STAGES.indexOf(stage) + 1])} className="flex-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors py-0.5">→</button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <button onClick={() => openNew(stage)} className="w-full rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                  {t('addCard')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{t('newLead')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 col-span-2">
              <Label>{t('form.name')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.company')}</Label>
              <Input value={form.company ?? ''} onChange={(e) => setForm({ ...form, company: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.roleTitle')}</Label>
              <Input value={form.role_title ?? ''} onChange={(e) => setForm({ ...form, role_title: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.email')}</Label>
              <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.phone')}</Label>
              <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.source')}</Label>
              <Input value={form.source ?? ''} onChange={(e) => setForm({ ...form, source: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.productInterest')}</Label>
              <Input value={form.product_interest ?? ''} onChange={(e) => setForm({ ...form, product_interest: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.dealValue')}</Label>
              <Input type="number" value={form.deal_value} onChange={(e) => setForm({ ...form, deal_value: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.priority')}</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as CrmLeadPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high'] as const).map((p) => <SelectItem key={p} value={p}>{t(`priority.${p}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.expectedCloseDate')}</Label>
              <Input type="date" value={form.expected_close_date ?? ''} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.nextFollowUp')}</Label>
              <Input type="date" value={form.next_follow_up_date ?? ''} onChange={(e) => setForm({ ...form, next_follow_up_date: e.target.value || null })} />
            </div>
            {isManager && (
              <div className="space-y-1.5 col-span-2">
                <Label>{t('form.owner')}</Label>
                <Select value={form.owner_id ?? currentProfile?.id ?? ''} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 col-span-2">
              <Label>{t('form.tags')}</Label>
              <Input placeholder={t('form.tagsPlaceholder')} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>{t('form.notes')}</Label>
              <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiDialogOpen} onOpenChange={(o) => { if (!aiLoading && !aiCreating) setAiDialogOpen(o) }}>
        <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" /> {t('aiImportTitle')}
            </DialogTitle>
          </DialogHeader>

          {aiStep === 'upload' && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">{t('aiUploadDesc')}</p>

              <label
                htmlFor="crm-ai-input"
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${aiFile ? 'border-purple-400 bg-purple-50' : 'border-border hover:border-purple-300 hover:bg-muted/40'}`}
              >
                <Upload className={`h-8 w-8 ${aiFile ? 'text-purple-600' : 'text-muted-foreground'}`} />
                {aiFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-purple-700">{aiFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {aiFile.size >= 1024 * 1024 ? `${(aiFile.size / (1024 * 1024)).toFixed(1)} MB` : `${(aiFile.size / 1024).toFixed(0)} KB`}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('aiSelectFile')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('aiMaxSize')}</p>
                  </div>
                )}
                <input id="crm-ai-input" type="file" className="hidden" onChange={(e) => setAiFile(e.target.files?.[0] ?? null)} />
              </label>

              {aiFile && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setAiFile(null)}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> {t('aiRemoveFile')}
                </Button>
              )}

              {isManager && (
                <div className="space-y-1.5">
                  <Label>{t('aiOwnerLabel')}</Label>
                  <Select value={aiOwnerId} onValueChange={setAiOwnerId}>
                    <SelectTrigger><SelectValue placeholder={t('aiOwnerPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {aiStep === 'preview' && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t('aiGenerated', { count: aiLeads.length })}</p>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setAiSelected(aiSelected.size === aiLeads.length ? new Set() : new Set(aiLeads.map((_, i) => i)))}
                >
                  {aiSelected.size === aiLeads.length ? t('aiDeselectAll') : t('aiSelectAll')}
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {aiLeads.map((lead, i) => (
                  <div
                    key={i}
                    onClick={() => setAiSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors ${aiSelected.has(i) ? 'border-purple-300 bg-purple-50' : 'border-border bg-background opacity-50'}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${aiSelected.has(i) ? 'bg-purple-600 border-purple-600' : 'border-border'}`}>
                        {aiSelected.has(i) && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{lead.name}</p>
                        {lead.company && <p className="text-xs text-muted-foreground mt-0.5">{lead.company}{lead.role_title ? ` — ${lead.role_title}` : ''}</p>}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                          {lead.email && <span>{lead.email}</span>}
                          {lead.phone && <span>{lead.phone}</span>}
                          {!!lead.deal_value && <span>{formatCurrency(lead.deal_value)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {aiStep === 'preview' && (
              <Button variant="outline" size="sm" onClick={() => setAiStep('upload')}>{t('aiBack')}</Button>
            )}
            <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={aiLoading || aiCreating}>{tc('cancel')}</Button>
            {aiStep === 'upload' ? (
              <Button onClick={handleAiGenerate} disabled={!aiFile || aiLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                {aiLoading ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t('aiAnalyzing')}</> : <><Sparkles className="mr-1.5 h-4 w-4" /> {t('aiGenerateBtn')}</>}
              </Button>
            ) : (
              <Button onClick={handleAiCreate} disabled={aiSelected.size === 0 || aiCreating} className="bg-purple-600 hover:bg-purple-700 text-white">
                {aiCreating ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> {t('aiCreatingBtn')}</> : t('aiCreateBtn', { count: aiSelected.size })}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lossLeadId} onOpenChange={(o) => !o && setLossLeadId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('lossReasonTitle')}</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label>{t('form.lossReason')}</Label>
            <Textarea rows={3} value={lossReason} onChange={(e) => setLossReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossLeadId(null)}>{tc('cancel')}</Button>
            <Button onClick={handleConfirmLoss} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('markLost')}</Button>
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
