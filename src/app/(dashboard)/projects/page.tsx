'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, AlertTriangle, Calendar, FolderKanban, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { getProjects, createProject } from '@/services/projects'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { ProjectListItem, ProjectFormData, ProjectStatus, ProjectPriority } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planejamento',
  active: 'Em Andamento',
  paused: 'Pausado',
  completed: 'Concluído',
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  planning: 'text-blue-600 bg-blue-50 border-blue-200',
  active: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  paused: 'text-amber-600 bg-amber-50 border-amber-200',
  completed: 'text-muted-foreground bg-muted border-border',
}

const PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
}

const PRIORITY_TEXT: Record<ProjectPriority, string> = {
  low: 'text-muted-foreground',
  medium: 'text-amber-600',
  high: 'text-orange-600',
  critical: 'text-red-600 font-semibold',
}

const EMPTY_FORM: ProjectFormData = {
  title: '', description: null, objectives: null, scope: null,
  deliverables: null, risks: null, status: 'planning', priority: 'medium',
  start_date: null, end_date: null, owner_id: null,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcProgress(tasks: ProjectListItem['project_tasks']): number {
  if (tasks.length === 0) return 0
  let total = 0, done = 0
  for (const task of tasks) {
    const subs = task.project_subtasks
    if (subs.length > 0) {
      total += subs.length
      done += subs.filter(s => s.completed).length
    } else {
      total += 1
      done += task.completed ? 1 : 0
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myOnly, setMyOnly] = useState(false)

  const displayed = useMemo(() => {
    if (!myOnly || !currentUserId) return projects
    return projects.filter(p =>
      p.owner_id === currentUserId ||
      p.project_members.some(m => m.user_id === currentUserId)
    )
  }, [projects, myOnly, currentUserId])

  async function load() {
    setLoading(true)
    try { setProjects(await getProjects()); setError(false) }
    catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  async function handleCreate() {
    setSaving(true)
    try {
      const p = await createProject(form)
      toast({ title: 'Projeto criado' })
      setDialogOpen(false)
      router.push(`/projects/${p.id}`)
    } catch { toast({ title: 'Erro ao criar projeto', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Erro ao carregar projetos.</p>
        <Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>
      </div>
    )
  }

  const statGroups = [
    { key: 'active' as ProjectStatus, label: 'Em andamento', count: projects.filter(p => p.status === 'active').length },
    { key: 'planning' as ProjectStatus, label: 'Planejamento', count: projects.filter(p => p.status === 'planning').length },
    { key: 'completed' as ProjectStatus, label: 'Concluídos', count: projects.filter(p => p.status === 'completed').length },
  ]

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-4">
          {statGroups.map(g => (
            <div key={g.key} className="text-center">
              <p className="text-lg font-bold leading-none">{g.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm" variant={myOnly ? 'default' : 'outline'}
            onClick={() => setMyOnly(v => !v)}
            className={myOnly ? '' : 'text-muted-foreground'}
          >
            <User className="mr-1.5 h-3.5 w-3.5" /> Meus projetos
          </Button>
          <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo Projeto
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-20">
          <FolderKanban className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {myOnly ? 'Nenhum projeto seu encontrado.' : 'Nenhum projeto ainda.'}
          </p>
          {!myOnly && (
            <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true) }}>
              <Plus className="mr-1.5 h-4 w-4" /> Criar primeiro projeto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayed.map((project) => {
            const pct = calcProgress(project.project_tasks)
            return (
              <Card
                key={project.id}
                className="shadow-none cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-tight line-clamp-2 flex-1">{project.title}</p>
                    <span className={`shrink-0 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{project.description}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {project.project_tasks.length} atividade{project.project_tasks.length !== 1 ? 's' : ''}
                      </span>
                      <span className="font-semibold text-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className={PRIORITY_TEXT[project.priority]}>{PRIORITY_LABELS[project.priority]}</span>
                    {project.end_date && (
                      <span className="flex items-center gap-1 text-muted-foreground ml-auto">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.end_date)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome do Projeto *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Redesign do Site"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value || null })}
                placeholder="Contexto geral do projeto..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProjectStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as ProjectPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_LABELS) as ProjectPriority[]).map(p => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data de Início</Label>
              <Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo Final</Label>
              <Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
              {saving ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
