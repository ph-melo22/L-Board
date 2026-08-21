'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Pencil, Trash2, AlertTriangle, Plus, StickyNote, Phone, Mail, Users, ArrowRightLeft, Handshake,
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import {
  getLead, updateLead, deleteLead, getLeadInteractions, addLeadInteraction,
  getLeadFollowUpTasks, createFollowUpTask,
} from '@/services/crm'
import { updateTaskStatus } from '@/services/demands'
import { getTeam, getCurrentProfile } from '@/services/team'
import { createClient_ } from '@/services/clients'
import { formatCurrency, formatDate, getPriorityColor } from '@/lib/utils'
import { LeadChat } from './LeadChat'
import type {
  CrmLead, CrmLeadFormData, CrmLeadPriority, CrmLeadInteraction, CrmLeadInteractionType, Task, Profile,
} from '@/types'

const INTERACTION_ICONS: Record<CrmLeadInteractionType, React.ElementType> = {
  note: StickyNote, call: Phone, email: Mail, meeting: Users, stage_change: ArrowRightLeft,
}

const EMPTY_FOLLOWUP = { title: '', due_date: '', priority: 'medium' as Task['priority'] }

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const t  = useTranslations('crmDetail')
  const tc = useTranslations('common')
  const tCrm = useTranslations('crm')

  const [lead, setLead] = useState<CrmLead | null>(null)
  const [interactions, setInteractions] = useState<CrmLeadInteraction[]>([])
  const [followUps, setFollowUps] = useState<Task[]>([])
  const [team, setTeam] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<CrmLeadFormData | null>(null)
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const [interactionOpen, setInteractionOpen] = useState(false)
  const [interactionForm, setInteractionForm] = useState<{ type: CrmLeadInteractionType; content: string }>({ type: 'note', content: '' })
  const [savingInteraction, setSavingInteraction] = useState(false)

  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [followUpForm, setFollowUpForm] = useState(EMPTY_FOLLOWUP)
  const [savingFollowUp, setSavingFollowUp] = useState(false)

  const [convertOpen, setConvertOpen] = useState(false)
  const [convertForm, setConvertForm] = useState({ name: '', product: '', monthly_revenue: 0, operational_cost: 0 })
  const [converting, setConverting] = useState(false)

  const isManager = currentProfile?.role === 'founder' || currentProfile?.role === 'manager'

  async function load() {
    setLoading(true)
    try {
      const [l, ix, fu, profile] = await Promise.all([
        getLead(id), getLeadInteractions(id), getLeadFollowUpTasks(id), getCurrentProfile(),
      ])
      setLead(l); setInteractions(ix); setFollowUps(fu); setCurrentProfile(profile)
      if (profile?.role === 'founder' || profile?.role === 'manager') setTeam(await getTeam())
      setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  function openEdit() {
    if (!lead) return
    setForm({
      owner_id: lead.owner_id, name: lead.name, company: lead.company, role_title: lead.role_title,
      email: lead.email, phone: lead.phone, stage: lead.stage, source: lead.source,
      product_interest: lead.product_interest, deal_value: lead.deal_value, win_probability: lead.win_probability,
      expected_close_date: lead.expected_close_date, loss_reason: lead.loss_reason, industry: lead.industry,
      company_size: lead.company_size, priority: lead.priority, tags: lead.tags,
      next_follow_up_date: lead.next_follow_up_date, notes: lead.notes,
    })
    setTagsInput(lead.tags.join(', '))
    setEditOpen(true)
  }

  async function handleSave() {
    if (!lead || !form) return
    setSaving(true)
    try {
      const tags = tagsInput.split(',').map((tg) => tg.trim()).filter(Boolean)
      await updateLead(lead.id, { ...form, tags })
      toast({ title: t('toast.leadUpdated') })
      setEditOpen(false); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!lead) return
    try { await deleteLead(lead.id); toast({ title: t('toast.leadDeleted') }); router.push('/crm') }
    catch { toast({ title: t('toast.deleteError'), variant: 'destructive' }) }
  }

  async function handleAddInteraction() {
    if (!lead || !interactionForm.content.trim()) return
    setSavingInteraction(true)
    try {
      await addLeadInteraction(lead.id, interactionForm.type, interactionForm.content.trim())
      toast({ title: t('toast.interactionAdded') })
      setInteractionOpen(false); setInteractionForm({ type: 'note', content: '' }); load()
    } catch { toast({ title: t('toast.interactionError'), variant: 'destructive' }) }
    finally { setSavingInteraction(false) }
  }

  async function handleAddFollowUp() {
    if (!lead || !followUpForm.title.trim() || !followUpForm.due_date) return
    setSavingFollowUp(true)
    try {
      await createFollowUpTask(lead.id, followUpForm)
      toast({ title: t('toast.followUpAdded') })
      setFollowUpOpen(false); setFollowUpForm(EMPTY_FOLLOWUP); load()
    } catch { toast({ title: t('toast.followUpError'), variant: 'destructive' }) }
    finally { setSavingFollowUp(false) }
  }

  async function handleToggleFollowUp(taskId: string, done: boolean) {
    const previous = followUps
    setFollowUps((fu) => fu.map((tk) => tk.id === taskId ? { ...tk, status: done ? 'done' : 'todo' } : tk))
    try {
      await updateTaskStatus(taskId, done ? 'done' : 'todo')
    } catch {
      setFollowUps(previous)
      toast({ title: t('toast.followUpUpdateError'), variant: 'destructive' })
    }
  }

  function openConvert() {
    if (!lead) return
    setConvertForm({ name: lead.company || lead.name, product: lead.product_interest || '', monthly_revenue: lead.deal_value, operational_cost: 0 })
    setConvertOpen(true)
  }

  async function handleConvert() {
    if (!lead || !convertForm.name.trim()) return
    setConverting(true)
    try {
      const client = await createClient_({
        name: convertForm.name, product: convertForm.product,
        monthly_revenue: convertForm.monthly_revenue, operational_cost: convertForm.operational_cost,
        start_date: new Date().toISOString().split('T')[0], renewal_date: null, status: 'active',
      })
      await updateLead(lead.id, { client_id: client.id } as never)
      toast({ title: t('toast.converted') })
      setConvertOpen(false); load()
    } catch { toast({ title: t('toast.convertError'), variant: 'destructive' }) }
    finally { setConverting(false) }
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
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-96 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  if (!lead) {
    return <div className="flex h-full items-center justify-center"><p className="text-sm text-muted-foreground">{t('leadNotFound')}</p></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/crm')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t('back')}
        </button>
        <div className="flex gap-2">
          {lead.stage === 'ganho' && !lead.client_id && (
            <Button size="sm" onClick={openConvert}><Handshake className="mr-1.5 h-3.5 w-3.5" /> {t('convertToClient')}</Button>
          )}
          <Button variant="outline" size="sm" onClick={openEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" /> {tc('edit')}</Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> {tc('delete')}</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6 min-w-0">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary shrink-0">
              {lead.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">{lead.name}</h2>
              {lead.company && <p className="text-sm text-muted-foreground truncate">{lead.company}{lead.role_title ? ` — ${lead.role_title}` : ''}</p>}
            </div>
            <span className="ml-auto shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {tCrm(`stage.${lead.stage}`)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: t('metrics.dealValue'), value: formatCurrency(lead.deal_value) },
              { label: t('metrics.winProbability'), value: lead.win_probability != null ? `${lead.win_probability}%` : '—' },
              { label: t('metrics.priority'), value: tCrm(`priority.${lead.priority}`), className: getPriorityColor(lead.priority) },
              { label: t('metrics.expectedCloseDate'), value: formatDate(lead.expected_close_date) },
            ].map((m) => (
              <Card key={m.label}>
                <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{m.label}</CardTitle></CardHeader>
                <CardContent><p className={`text-lg font-bold ${m.className ?? ''}`}>{m.value}</p></CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">{t('info')}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">{t('fields.email')}</p><p className="font-medium">{lead.email ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('fields.phone')}</p><p className="font-medium">{lead.phone ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('fields.source')}</p><p className="font-medium">{lead.source ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('fields.productInterest')}</p><p className="font-medium">{lead.product_interest ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('fields.industry')}</p><p className="font-medium">{lead.industry ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('fields.companySize')}</p><p className="font-medium">{lead.company_size ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('fields.owner')}</p><p className="font-medium">{lead.profiles?.full_name ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">{t('fields.nextFollowUp')}</p><p className="font-medium">{formatDate(lead.next_follow_up_date)}</p></div>
              {lead.tags.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">{t('fields.tags')}</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.map((tg) => <span key={tg} className="rounded-full bg-muted px-2 py-0.5 text-xs">{tg}</span>)}
                  </div>
                </div>
              )}
              {lead.notes && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground">{t('fields.notes')}</p><p className="font-medium whitespace-pre-wrap">{lead.notes}</p></div>
              )}
              {lead.stage === 'perdido' && lead.loss_reason && (
                <div className="col-span-2"><p className="text-xs text-muted-foreground">{t('fields.lossReason')}</p><p className="font-medium">{lead.loss_reason}</p></div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">{t('followUps', { count: followUps.length })}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setFollowUpOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> {t('newFollowUp')}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {followUps.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{t('noFollowUps')}</p>
              ) : (
                <div className="divide-y divide-border">
                  {followUps.map((tk) => {
                    const isDone = tk.status === 'done'
                    return (
                      <div key={tk.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={(v) => handleToggleFollowUp(tk.id, !!v)}
                          aria-label={t('followUpDialog.taskTitle')}
                        />
                        <span className={`flex-1 truncate ${isDone ? 'line-through text-muted-foreground' : ''}`}>{tk.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDate(tk.due_date)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">{t('timeline')}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setInteractionOpen(true)}><Plus className="mr-1.5 h-3.5 w-3.5" /> {t('registerInteraction')}</Button>
            </CardHeader>
            <CardContent className="p-0">
              {interactions.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">{t('noInteractions')}</p>
              ) : (
                <div className="divide-y divide-border">
                  {interactions.map((ix) => {
                    const Icon = INTERACTION_ICONS[ix.type]
                    return (
                      <div key={ix.id} className="flex items-start gap-3 px-4 py-3">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm whitespace-pre-wrap">{ix.content}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ix.profiles?.full_name ?? t('systemAuthor')} · {formatDate(ix.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="p-4 h-fit lg:sticky lg:top-4">
          <LeadChat leadId={lead.id} onLeadChanged={load} />
        </Card>
      </div>

      {/* Edit Dialog */}
      {form && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
            <DialogHeader><DialogTitle>{t('editLead')}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5 col-span-2">
                <Label>{tCrm('form.name')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>{tCrm('form.company')}</Label><Input value={form.company ?? ''} onChange={(e) => setForm({ ...form, company: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>{tCrm('form.roleTitle')}</Label><Input value={form.role_title ?? ''} onChange={(e) => setForm({ ...form, role_title: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>{tCrm('form.email')}</Label><Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>{tCrm('form.phone')}</Label><Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>{tCrm('form.source')}</Label><Input value={form.source ?? ''} onChange={(e) => setForm({ ...form, source: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>{tCrm('form.productInterest')}</Label><Input value={form.product_interest ?? ''} onChange={(e) => setForm({ ...form, product_interest: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>{tCrm('form.dealValue')}</Label><Input type="number" value={form.deal_value} onChange={(e) => setForm({ ...form, deal_value: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label>{t('metrics.winProbability')} (%)</Label><Input type="number" min={0} max={100} value={form.win_probability ?? ''} onChange={(e) => setForm({ ...form, win_probability: e.target.value ? Number(e.target.value) : null })} /></div>
              <div className="space-y-1.5">
                <Label>{tCrm('form.priority')}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as CrmLeadPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['low', 'medium', 'high'] as const).map((p) => <SelectItem key={p} value={p}>{tCrm(`priority.${p}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{tCrm('form.expectedCloseDate')}</Label><Input type="date" value={form.expected_close_date ?? ''} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>{tCrm('form.nextFollowUp')}</Label><Input type="date" value={form.next_follow_up_date ?? ''} onChange={(e) => setForm({ ...form, next_follow_up_date: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>{t('fields.industry')}</Label><Input value={form.industry ?? ''} onChange={(e) => setForm({ ...form, industry: e.target.value || null })} /></div>
              <div className="space-y-1.5"><Label>{t('fields.companySize')}</Label><Input value={form.company_size ?? ''} onChange={(e) => setForm({ ...form, company_size: e.target.value || null })} /></div>
              {isManager && (
                <div className="space-y-1.5 col-span-2">
                  <Label>{tCrm('form.owner')}</Label>
                  <Select value={form.owner_id ?? ''} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 col-span-2"><Label>{tCrm('form.tags')} ({tCrm('form.tagsPlaceholder')})</Label><Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} /></div>
              <div className="space-y-1.5 col-span-2"><Label>{tCrm('form.notes')}</Label><Textarea rows={3} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>{tc('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? tc('saving') : tc('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Interaction Dialog */}
      <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('interactionDialog.title')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('interactionDialog.type')}</Label>
              <Select value={interactionForm.type} onValueChange={(v) => setInteractionForm({ ...interactionForm, type: v as CrmLeadInteractionType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['note', 'call', 'email', 'meeting'] as const).map((tpe) => <SelectItem key={tpe} value={tpe}>{t(`interactionType.${tpe}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('interactionDialog.content')}</Label>
              <Textarea rows={3} value={interactionForm.content} onChange={(e) => setInteractionForm({ ...interactionForm, content: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInteractionOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleAddInteraction} disabled={savingInteraction || !interactionForm.content.trim()}>{savingInteraction ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('followUpDialog.title')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>{t('followUpDialog.taskTitle')}</Label><Input value={followUpForm.title} onChange={(e) => setFollowUpForm({ ...followUpForm, title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('followUpDialog.dueDate')}</Label><Input type="date" value={followUpForm.due_date} onChange={(e) => setFollowUpForm({ ...followUpForm, due_date: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>{t('followUpDialog.priority')}</Label>
              <Select value={followUpForm.priority} onValueChange={(v) => setFollowUpForm({ ...followUpForm, priority: v as Task['priority'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['low', 'medium', 'high', 'critical'] as const).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleAddFollowUp} disabled={savingFollowUp || !followUpForm.title.trim() || !followUpForm.due_date}>{savingFollowUp ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Client Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('convertDialog.title')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">{t('convertDialog.hint')}</p>
            <div className="space-y-1.5"><Label>{t('convertDialog.name')}</Label><Input value={convertForm.name} onChange={(e) => setConvertForm({ ...convertForm, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('convertDialog.product')}</Label><Input value={convertForm.product} onChange={(e) => setConvertForm({ ...convertForm, product: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('convertDialog.monthlyRevenue')}</Label><Input type="number" value={convertForm.monthly_revenue} onChange={(e) => setConvertForm({ ...convertForm, monthly_revenue: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>{t('convertDialog.operationalCost')}</Label><Input type="number" value={convertForm.operational_cost} onChange={(e) => setConvertForm({ ...convertForm, operational_cost: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleConvert} disabled={converting || !convertForm.name.trim()}>{converting ? t('convertDialog.submitting') : t('convertDialog.submit')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteLeadTitle')}</AlertDialogTitle>
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
