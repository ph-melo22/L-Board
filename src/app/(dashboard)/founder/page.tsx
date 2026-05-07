'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, AlertTriangle, UserPlus, Crown, User } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  getOKRs, createOKR, updateOKR, deleteOKR,
  createKeyResult, updateKeyResult, deleteKeyResult,
  getProjects, createProject, updateProject, deleteProject,
  getNotes, upsertNote, deleteNote,
} from '@/services/founder'
import { getTeam, inviteTeamMember, removeTeamMember, updateMemberRole } from '@/services/team'
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils'
import type { OKR, OKRStatus, KeyResult, StrategicProject, StrategicNote, Profile, UserRole } from '@/types'
import { useTranslations } from 'next-intl'

// ─── OKR Section ──────────────────────────────────────────────────────────────

const EMPTY_KR = { description: '', target: 100, current: 0, unit: '%' }

function OKRCard({ okr, onReload }: { okr: OKR; onReload: () => void }) {
  const t = useTranslations('founder')
  const tc = useTranslations('common')
  const tl = useTranslations('labels')
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [krOpen, setKrOpen] = useState(false)
  const [editingKr, setEditingKr] = useState<KeyResult | null>(null)
  const [krForm, setKrForm] = useState(EMPTY_KR)
  const [savingKr, setSavingKr] = useState(false)
  const [deleteKrId, setDeleteKrId] = useState<string | null>(null)

  const avgProgress = okr.key_results.length
    ? okr.key_results.reduce((acc, kr) => acc + Math.min(100, (kr.current / kr.target) * 100), 0) / okr.key_results.length
    : 0

  function openNewKr() {
    setEditingKr(null)
    setKrForm(EMPTY_KR)
    setKrOpen(true)
  }

  function openEditKr(kr: KeyResult) {
    setEditingKr(kr)
    setKrForm({ description: kr.description, target: kr.target, current: kr.current, unit: kr.unit })
    setKrOpen(true)
  }

  async function handleSaveKr() {
    setSavingKr(true)
    try {
      if (editingKr) { await updateKeyResult(editingKr.id, krForm); toast({ title: t('toast.krUpdated') }) }
      else { await createKeyResult(okr.id, krForm); toast({ title: t('toast.krAdded') }) }
      setKrOpen(false)
      onReload()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSavingKr(false) }
  }

  async function handleDeleteKr() {
    if (!deleteKrId) return
    try { await deleteKeyResult(deleteKrId); toast({ title: t('toast.krRemoved') }); onReload() }
    catch { toast({ title: t('toast.removeError'), variant: 'destructive' }) }
    finally { setDeleteKrId(null) }
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(okr.status)}`}>
                  {tl(okr.status as never)}
                </span>
                <span className="text-xs text-muted-foreground">{okr.quarter}</span>
              </div>
              <CardTitle className="mt-1 text-sm">{okr.objective}</CardTitle>
            </div>
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('avgProgress')}</span>
              <span>{avgProgress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="space-y-3 pt-0">
            {okr.key_results.map((kr) => {
              const pct = Math.min(100, (kr.current / kr.target) * 100)
              return (
                <div key={kr.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-muted-foreground flex-1">{kr.description}</span>
                    <span className="font-medium shrink-0">{kr.current} / {kr.target} {kr.unit}</span>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditKr(kr)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => setDeleteKrId(kr.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="h-1 w-full rounded-full bg-muted">
                    <div className="h-1 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            <button
              onClick={openNewKr}
              className="w-full rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              {t('addKR')}
            </button>
          </CardContent>
        )}
      </Card>

      {/* KR Dialog */}
      <Dialog open={krOpen} onOpenChange={setKrOpen}>
        <DialogContent className="sm:max-w-sm overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingKr ? t('editKR') : t('newKR')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('kr.description')}</Label>
              <Input value={krForm.description} onChange={(e) => setKrForm({ ...krForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t('kr.target')}</Label>
                <Input type="number" value={krForm.target} onChange={(e) => setKrForm({ ...krForm, target: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('kr.current')}</Label>
                <Input type="number" value={krForm.current} onChange={(e) => setKrForm({ ...krForm, current: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('kr.unit')}</Label>
                <Input placeholder={t('kr.unitPlaceholder')} value={krForm.unit} onChange={(e) => setKrForm({ ...krForm, unit: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKrOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSaveKr} disabled={savingKr || !krForm.description}>
              {savingKr ? tc('saving') : tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete KR */}
      <AlertDialog open={!!deleteKrId} onOpenChange={(o) => !o && setDeleteKrId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteKR')}</AlertDialogTitle>
            <AlertDialogDescription>{tc('irreversible')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKr} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FounderPage() {
  const t = useTranslations('founder')
  const tc = useTranslations('common')
  const tl = useTranslations('labels')
  const tTeam = useTranslations('team')
  const { toast } = useToast()

  const [okrs, setOkrs] = useState<OKR[]>([])
  const [projects, setProjects] = useState<StrategicProject[]>([])
  const [notes, setNotes] = useState<StrategicNote[]>([])
  const [team, setTeam] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Team dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role: 'employee' as UserRole })
  const [inviting, setInviting] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)

  // OKR dialog
  const [okrOpen, setOkrOpen] = useState(false)
  const [editingOkr, setEditingOkr] = useState<OKR | null>(null)
  const [okrForm, setOkrForm] = useState({ objective: '', status: 'on_track' as OKRStatus, quarter: '' })
  const [savingOkr, setSavingOkr] = useState(false)
  const [deleteOkrId, setDeleteOkrId] = useState<string | null>(null)

  // Project dialog
  const [projectOpen, setProjectOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<StrategicProject | null>(null)
  const [projectForm, setProjectForm] = useState({ title: '', description: null as string | null, status: 'planning' as StrategicProject['status'], priority: 'medium' as StrategicProject['priority'], due_date: null as string | null })
  const [savingProject, setSavingProject] = useState(false)
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null)

  // Note dialog
  const [noteOpen, setNoteOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<StrategicNote | null>(null)
  const [noteForm, setNoteForm] = useState({ title: '', content: '', tags: '' })
  const [savingNote, setSavingNote] = useState(false)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [o, p, n, tm] = await Promise.all([getOKRs(), getProjects(), getNotes(), getTeam()])
      setOkrs(o); setProjects(p); setNotes(n); setTeam(tm); setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // OKR handlers
  function openNewOkr() { setEditingOkr(null); setOkrForm({ objective: '', status: 'on_track', quarter: '' }); setOkrOpen(true) }
  function openEditOkr(o: OKR) { setEditingOkr(o); setOkrForm({ objective: o.objective, status: o.status, quarter: o.quarter }); setOkrOpen(true) }
  async function handleSaveOkr() {
    setSavingOkr(true)
    try {
      if (editingOkr) { await updateOKR(editingOkr.id, okrForm); toast({ title: t('toast.okrUpdated') }) }
      else { await createOKR(okrForm); toast({ title: t('toast.okrCreated') }) }
      setOkrOpen(false); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSavingOkr(false) }
  }
  async function handleDeleteOkr() {
    if (!deleteOkrId) return
    try { await deleteOKR(deleteOkrId); toast({ title: t('toast.okrRemoved') }); load() }
    catch { toast({ title: t('toast.removeError'), variant: 'destructive' }) }
    finally { setDeleteOkrId(null) }
  }

  // Project handlers
  function openNewProject() { setEditingProject(null); setProjectForm({ title: '', description: null, status: 'planning', priority: 'medium', due_date: null }); setProjectOpen(true) }
  function openEditProject(p: StrategicProject) { setEditingProject(p); setProjectForm({ title: p.title, description: p.description, status: p.status, priority: p.priority, due_date: p.due_date }); setProjectOpen(true) }
  async function handleSaveProject() {
    setSavingProject(true)
    try {
      if (editingProject) { await updateProject(editingProject.id, projectForm); toast({ title: t('toast.projectUpdated') }) }
      else { await createProject(projectForm); toast({ title: t('toast.projectCreated') }) }
      setProjectOpen(false); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSavingProject(false) }
  }
  async function handleDeleteProject() {
    if (!deleteProjectId) return
    try { await deleteProject(deleteProjectId); toast({ title: t('toast.projectRemoved') }); load() }
    catch { toast({ title: t('toast.removeError'), variant: 'destructive' }) }
    finally { setDeleteProjectId(null) }
  }

  // Note handlers
  function openNewNote() { setEditingNote(null); setNoteForm({ title: '', content: '', tags: '' }); setNoteOpen(true) }
  function openEditNote(n: StrategicNote) { setEditingNote(n); setNoteForm({ title: n.title, content: n.content, tags: n.tags.join(', ') }); setNoteOpen(true) }
  async function handleSaveNote() {
    setSavingNote(true)
    try {
      const tags = noteForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      await upsertNote({ id: editingNote?.id, title: noteForm.title, content: noteForm.content, tags })
      toast({ title: editingNote ? t('toast.noteUpdated') : t('toast.noteCreated') })
      setNoteOpen(false); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSavingNote(false) }
  }
  async function handleDeleteNote() {
    if (!deleteNoteId) return
    try { await deleteNote(deleteNoteId); toast({ title: t('toast.noteRemoved') }); load() }
    catch { toast({ title: t('toast.removeError'), variant: 'destructive' }) }
    finally { setDeleteNoteId(null) }
  }

  // Team handlers
  async function handleInvite() {
    setInviting(true)
    try {
      await inviteTeamMember(inviteForm.full_name, inviteForm.email, inviteForm.role)
      toast({ title: t('toast.inviteSent'), description: t('toast.inviteSentDesc', { email: inviteForm.email }) })
      setInviteOpen(false)
      setInviteForm({ full_name: '', email: '', role: 'employee' })
      load()
    } catch (e: unknown) {
      toast({ title: t('toast.inviteError'), description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally { setInviting(false) }
  }

  async function handleRemoveMember() {
    if (!removeMemberId) return
    try {
      await removeTeamMember(removeMemberId)
      toast({ title: t('toast.memberRemoved') })
      load()
    } catch {
      toast({ title: t('toast.memberRemoveError'), variant: 'destructive' })
    } finally { setRemoveMemberId(null) }
  }

  async function handleRoleChange(id: string, role: UserRole) {
    try {
      await updateMemberRole(id, role)
      toast({ title: t('toast.roleUpdated') })
      load()
    } catch {
      toast({ title: t('toast.roleError'), variant: 'destructive' })
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

  return (
    <div className="space-y-4">
      <Tabs defaultValue="okrs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="okrs">{t('tabs.okrs')} ({okrs.length})</TabsTrigger>
            <TabsTrigger value="projects">{t('tabs.projects')} ({projects.length})</TabsTrigger>
            <TabsTrigger value="notes">{t('tabs.notes')} ({notes.length})</TabsTrigger>
            <TabsTrigger value="team">{t('tabs.team')} ({team.length})</TabsTrigger>
          </TabsList>
          <div>
            <TabsContent value="okrs" className="mt-0">
              <Button size="sm" onClick={openNewOkr}><Plus className="mr-1.5 h-4 w-4" /> {t('newOkr')}</Button>
            </TabsContent>
            <TabsContent value="projects" className="mt-0">
              <Button size="sm" onClick={openNewProject}><Plus className="mr-1.5 h-4 w-4" /> {t('newProject')}</Button>
            </TabsContent>
            <TabsContent value="notes" className="mt-0">
              <Button size="sm" onClick={openNewNote}><Plus className="mr-1.5 h-4 w-4" /> {t('newNote')}</Button>
            </TabsContent>
            <TabsContent value="team" className="mt-0">
              <Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="mr-1.5 h-4 w-4" /> {t('invite')}</Button>
            </TabsContent>
          </div>
        </div>

        {/* OKRs */}
        <TabsContent value="okrs">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {[1,2,3,4].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : okrs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noOkrs')}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {okrs.map((okr) => (
                <div key={okr.id} className="relative">
                  <OKRCard okr={okr} onReload={load} />
                  <div className="absolute right-10 top-3 flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditOkr(okr)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteOkrId(okr.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Projects */}
        <TabsContent value="projects">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noProjects')}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(p.status)}`}>
                            {tl(p.status as never)}
                          </span>
                          <span className={`text-xs font-medium ${getPriorityColor(p.priority)}`}>
                            {tl(p.priority as never)}
                          </span>
                        </div>
                        <CardTitle className="mt-1 text-sm">{p.title}</CardTitle>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditProject(p)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteProjectId(p.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  {(p.description || p.due_date) && (
                    <CardContent className="pt-0 space-y-1">
                      {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                      {p.due_date && <p className="text-xs text-muted-foreground">{t('dueDate', { date: formatDate(p.due_date) })}</p>}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map((i) => <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noNotes')}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {notes.map((n) => (
                <Card key={n.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{n.title}</CardTitle>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditNote(n)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteNoteId(n.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{n.content}</p>
                    {n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {n.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{t('updatedAt', { date: formatDate(n.updated_at) })}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Team */}
        <TabsContent value="team">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : team.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noTeam')}</p>
          ) : (
            <div className="space-y-2">
              {team.map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center gap-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                      {member.full_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        member.role === 'founder'   ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        member.role === 'developer' ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                        'border-border bg-muted text-muted-foreground'
                      }`}>
                        {member.role === 'founder' ? <Crown className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {tTeam(`roles.${member.role}.label` as never)}
                      </span>
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.id, v as UserRole)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="founder">{tTeam('roles.founder.label')}</SelectItem>
                          <SelectItem value="developer">{tTeam('roles.developer.label')}</SelectItem>
                          <SelectItem value="employee">{tTeam('roles.employee.label')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setRemoveMemberId(member.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* OKR Dialog */}
      <Dialog open={okrOpen} onOpenChange={setOkrOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingOkr ? t('editOkr') : t('newOkr')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('okrObjective')}</Label>
              <Input value={okrForm.objective} onChange={(e) => setOkrForm({ ...okrForm, objective: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('okrQuarter')}</Label>
                <Input placeholder="Q2 2025" value={okrForm.quarter} onChange={(e) => setOkrForm({ ...okrForm, quarter: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={okrForm.status} onValueChange={(v) => setOkrForm({ ...okrForm, status: v as OKRStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">{tl('on_track')}</SelectItem>
                    <SelectItem value="at_risk">{tl('at_risk')}</SelectItem>
                    <SelectItem value="off_track">{tl('off_track')}</SelectItem>
                    <SelectItem value="completed">{tl('completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOkrOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSaveOkr} disabled={savingOkr || !okrForm.objective}>
              {savingOkr ? tc('saving') : tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Dialog */}
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingProject ? t('editProject') : t('newProject')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('projectTitle')}</Label>
              <Input value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('projectDescription')}</Label>
              <Textarea rows={2} value={projectForm.description ?? ''} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value || null })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={projectForm.status} onValueChange={(v) => setProjectForm({ ...projectForm, status: v as StrategicProject['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">{tl('planning')}</SelectItem>
                    <SelectItem value="active">{tl('active')}</SelectItem>
                    <SelectItem value="paused">{tl('paused')}</SelectItem>
                    <SelectItem value="completed">{tl('completed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('projectPriority')}</Label>
                <Select value={projectForm.priority} onValueChange={(v) => setProjectForm({ ...projectForm, priority: v as StrategicProject['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{tl('low')}</SelectItem>
                    <SelectItem value="medium">{tl('medium')}</SelectItem>
                    <SelectItem value="high">{tl('high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('projectDueDate')}</Label>
              <Input type="date" value={projectForm.due_date ?? ''} onChange={(e) => setProjectForm({ ...projectForm, due_date: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSaveProject} disabled={savingProject || !projectForm.title}>
              {savingProject ? tc('saving') : tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingNote ? t('editNote') : t('newNote')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('projectTitle')}</Label>
              <Input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('noteContent')}</Label>
              <Textarea rows={5} value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('noteTags')}</Label>
              <Input placeholder={t('noteTagsPlaceholder')} value={noteForm.tags} onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSaveNote} disabled={savingNote || !noteForm.title}>
              {savingNote ? tc('saving') : tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete OKR */}
      <AlertDialog open={!!deleteOkrId} onOpenChange={(o) => !o && setDeleteOkrId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteOkr')}</AlertDialogTitle>
            <AlertDialogDescription>{tc('irreversible')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOkr} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Project */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={(o) => !o && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteProject')}</AlertDialogTitle>
            <AlertDialogDescription>{tc('irreversible')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Note */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={(o) => !o && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteNote')}</AlertDialogTitle>
            <AlertDialogDescription>{tc('irreversible')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tc('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Team Member */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{t('inviteTitle')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{tTeam('form.fullName')}</Label>
              <Input
                placeholder={tTeam('form.fullNamePlaceholder')}
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{tTeam('form.email')}</Label>
              <Input
                type="email"
                placeholder={tTeam('form.emailPlaceholder')}
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{tTeam('form.access')}</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{t('roleEmployee')}</SelectItem>
                  <SelectItem value="developer">{t('roleDeveloper')}</SelectItem>
                  <SelectItem value="founder">{t('roleFounder')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('inviteEmailInfo')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>{tc('cancel')}</Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteForm.email || !inviteForm.full_name}
            >
              {inviting ? tTeam('invite.sending') : tTeam('invite.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirm */}
      <AlertDialog open={!!removeMemberId} onOpenChange={(o) => !o && setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeMemberTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeMemberDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('removeAccess')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
