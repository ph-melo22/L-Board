'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronRight, ChevronDown,
  AlertTriangle, Calendar, X, UserRound, Check, Sparkles, Upload, Loader2, FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  getProject, updateProject, deleteProject,
  addProjectMember, removeProjectMember,
  createProjectTask, updateProjectTask, toggleProjectTask, deleteProjectTask,
  createProjectSubtask, updateProjectSubtask, toggleProjectSubtask, deleteProjectSubtask,
} from '@/services/projects'
import { getTeam } from '@/services/team'
import { formatDate } from '@/lib/utils'
import type {
  ProjectWithDetails, ProjectTask, ProjectSubtask, Profile,
  ProjectFormData, ProjectTaskFormData, ProjectSubtaskFormData,
  ProjectStatus, ProjectPriority,
} from '@/types'

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

const EMPTY_PROJECT_FORM: ProjectFormData = {
  title: '', description: null, objectives: null, scope: null,
  deliverables: null, risks: null, status: 'planning', priority: 'medium',
  start_date: null, end_date: null, owner_id: null,
}

const EMPTY_TASK_FORM: Omit<ProjectTaskFormData, 'project_id'> = {
  title: '', description: null, assigned_to: null, due_date: null,
  position: 0, completed: false,
}

const EMPTY_SUBTASK_FORM: Omit<ProjectSubtaskFormData, 'task_id'> = {
  title: '', assigned_to: null, due_date: null, completed: false,
}

// ─── Circular Progress SVG ────────────────────────────────────────────────────

function CircularProgress({ value }: { value: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <svg className="w-28 h-28" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" stroke="hsl(var(--muted))" />
      <circle
        cx="50" cy="50" r={r} fill="none" strokeWidth="10"
        stroke="hsl(var(--primary))"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="50" y="56" textAnchor="middle" fontSize="18" fontWeight="bold" fill="hsl(var(--foreground))">
        {value}%
      </text>
    </svg>
  )
}

// ─── Progress calculation ─────────────────────────────────────────────────────

function calcProgress(tasks: ProjectTask[]) {
  if (tasks.length === 0) return { pct: 0, totalItems: 0, doneItems: 0 }
  let total = 0, done = 0
  for (const t of tasks) {
    const subs = t.project_subtasks ?? []
    if (subs.length > 0) {
      total += subs.length
      done += subs.filter(s => s.completed).length
    } else {
      total += 1
      done += t.completed ? 1 : 0
    }
  }
  return { pct: total === 0 ? 0 : Math.round((done / total) * 100), totalItems: total, doneItems: done }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()

  const [project, setProject] = useState<ProjectWithDetails | null>(null)
  const [allMembers, setAllMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [saving, setSaving] = useState(false)

  // Expanded tasks
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Project edit dialog
  const [editProjectOpen, setEditProjectOpen] = useState(false)
  const [projectForm, setProjectForm] = useState<ProjectFormData>(EMPTY_PROJECT_FORM)

  // Task dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [taskForm, setTaskForm] = useState<Omit<ProjectTaskFormData, 'project_id'>>(EMPTY_TASK_FORM)

  // Subtask dialog
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false)
  const [editingSubtask, setEditingSubtask] = useState<ProjectSubtask | null>(null)
  const [subtaskParentId, setSubtaskParentId] = useState<string | null>(null)
  const [subtaskForm, setSubtaskForm] = useState<Omit<ProjectSubtaskFormData, 'task_id'>>(EMPTY_SUBTASK_FORM)

  // Inline quick-add subtask
  const [inlineTaskId, setInlineTaskId] = useState<string | null>(null)
  const [inlineTitle, setInlineTitle] = useState('')

  // AI Import
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiFile, setAiFile] = useState<File | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiTasks, setAiTasks] = useState<{ title: string; description: string; assigned_to_hint: string | null; subtasks: { title: string; assigned_to_hint: string | null }[] }[]>([])
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set())
  const [aiStep, setAiStep] = useState<'upload' | 'preview'>('upload')
  const [aiCreating, setAiCreating] = useState(false)

  // Delete confirms
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [deleteSubtaskId, setDeleteSubtaskId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, team] = await Promise.all([getProject(id), getTeam()])
      setProject(p)
      setAllMembers(team)
      setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  // Members not yet in this project
  const availableToAdd = useMemo(() => {
    if (!project) return []
    const inProject = new Set(project.project_members.map(m => m.user_id))
    return allMembers.filter(m => !inProject.has(m.id))
  }, [project, allMembers])

  const memberMap = useMemo(() => {
    const map: Record<string, string> = {}
    allMembers.forEach(m => { map[m.id] = m.full_name })
    return map
  }, [allMembers])

  const { pct, totalItems, doneItems } = useMemo(
    () => calcProgress(project?.project_tasks ?? []),
    [project]
  )

  // ── Project actions ────────────────────────────────────────────────────────

  function openEditProject() {
    if (!project) return
    setProjectForm({
      title: project.title, description: project.description,
      objectives: project.objectives, scope: project.scope,
      deliverables: project.deliverables, risks: project.risks,
      status: project.status, priority: project.priority,
      start_date: project.start_date, end_date: project.end_date,
      owner_id: project.owner_id,
    })
    setEditProjectOpen(true)
  }

  async function handleUpdateProject() {
    if (!project) return
    setSaving(true)
    try {
      const updated = await updateProject(project.id, projectForm)
      setProject(prev => prev ? { ...prev, ...updated } : prev)
      toast({ title: 'Projeto atualizado' })
      setEditProjectOpen(false)
    } catch { toast({ title: 'Erro ao salvar', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  async function handleDeleteProject() {
    if (!project) return
    try { await deleteProject(project.id); router.push('/projects') }
    catch { toast({ title: 'Erro ao excluir', variant: 'destructive' }) }
  }

  // ── Member actions ─────────────────────────────────────────────────────────

  async function handleAddMember(userId: string) {
    if (!project) return
    try {
      await addProjectMember(project.id, userId)
      setProject(prev => {
        if (!prev) return prev
        return { ...prev, project_members: [...prev.project_members, { id: crypto.randomUUID(), project_id: prev.id, user_id: userId, created_at: new Date().toISOString() }] }
      })
    } catch { toast({ title: 'Erro ao adicionar membro', variant: 'destructive' }) }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      await removeProjectMember(memberId)
      setProject(prev => prev ? { ...prev, project_members: prev.project_members.filter(m => m.id !== memberId) } : prev)
    } catch { toast({ title: 'Erro ao remover membro', variant: 'destructive' }) }
  }

  // ── Task actions ───────────────────────────────────────────────────────────

  function openNewTask() {
    setEditingTask(null)
    setTaskForm({ ...EMPTY_TASK_FORM, position: (project?.project_tasks.length ?? 0) })
    setTaskDialogOpen(true)
  }

  function openEditTask(task: ProjectTask) {
    setEditingTask(task)
    setTaskForm({ title: task.title, description: task.description, assigned_to: task.assigned_to, due_date: task.due_date, position: task.position, completed: task.completed, project_id: task.project_id } as Omit<ProjectTaskFormData, 'project_id'>)
    setTaskDialogOpen(true)
  }

  async function handleSaveTask() {
    if (!project) return
    setSaving(true)
    try {
      if (editingTask) {
        const updated = await updateProjectTask(editingTask.id, { ...taskForm, project_id: project.id })
        setProject(prev => {
          if (!prev) return prev
          return { ...prev, project_tasks: prev.project_tasks.map(t => t.id === editingTask.id ? { ...t, ...updated } : t) }
        })
        if (taskForm.assigned_to && taskForm.assigned_to !== editingTask.assigned_to) {
          notifyAssignment(taskForm.assigned_to, taskForm.title)
        }
        toast({ title: 'Atividade atualizada' })
      } else {
        const created = await createProjectTask({ ...taskForm, project_id: project.id })
        setProject(prev => prev ? { ...prev, project_tasks: [...prev.project_tasks, created] } : prev)
        setExpanded(prev => new Set(prev).add(created.id))
        if (taskForm.assigned_to) notifyAssignment(taskForm.assigned_to, taskForm.title)
        toast({ title: 'Atividade criada' })
      }
      setTaskDialogOpen(false)
    } catch { toast({ title: 'Erro ao salvar atividade', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  async function handleToggleTask(taskId: string, completed: boolean) {
    setProject(prev => {
      if (!prev) return prev
      return { ...prev, project_tasks: prev.project_tasks.map(t => t.id === taskId ? { ...t, completed } : t) }
    })
    try { await toggleProjectTask(taskId, completed) }
    catch {
      setProject(prev => {
        if (!prev) return prev
        return { ...prev, project_tasks: prev.project_tasks.map(t => t.id === taskId ? { ...t, completed: !completed } : t) }
      })
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  async function handleDeleteTask() {
    if (!deleteTaskId) return
    try {
      await deleteProjectTask(deleteTaskId)
      setProject(prev => prev ? { ...prev, project_tasks: prev.project_tasks.filter(t => t.id !== deleteTaskId) } : prev)
      toast({ title: 'Atividade removida' })
    } catch { toast({ title: 'Erro ao remover', variant: 'destructive' }) }
    finally { setDeleteTaskId(null) }
  }

  // ── Subtask actions ────────────────────────────────────────────────────────

  function openNewSubtask(taskId: string) {
    setEditingSubtask(null)
    setSubtaskParentId(taskId)
    setSubtaskForm(EMPTY_SUBTASK_FORM)
    setSubtaskDialogOpen(true)
  }

  function openEditSubtask(subtask: ProjectSubtask, taskId: string) {
    setEditingSubtask(subtask)
    setSubtaskParentId(taskId)
    setSubtaskForm({ title: subtask.title, assigned_to: subtask.assigned_to, due_date: subtask.due_date, completed: subtask.completed })
    setSubtaskDialogOpen(true)
  }

  async function handleSaveSubtask() {
    if (!subtaskParentId) return
    setSaving(true)
    try {
      if (editingSubtask) {
        const updated = await updateProjectSubtask(editingSubtask.id, { ...subtaskForm, task_id: subtaskParentId })
        setProject(prev => {
          if (!prev) return prev
          return { ...prev, project_tasks: prev.project_tasks.map(t => t.id === subtaskParentId ? { ...t, project_subtasks: (t.project_subtasks ?? []).map(s => s.id === editingSubtask.id ? { ...s, ...updated } : s) } : t) }
        })
        if (subtaskForm.assigned_to && subtaskForm.assigned_to !== editingSubtask.assigned_to) {
          notifyAssignment(subtaskForm.assigned_to, subtaskForm.title, 'subtask')
        }
        toast({ title: 'Sub-atividade atualizada' })
      } else {
        const created = await createProjectSubtask({ ...subtaskForm, task_id: subtaskParentId })
        setProject(prev => {
          if (!prev) return prev
          return { ...prev, project_tasks: prev.project_tasks.map(t => t.id === subtaskParentId ? { ...t, project_subtasks: [...(t.project_subtasks ?? []), created] } : t) }
        })
        if (subtaskForm.assigned_to) notifyAssignment(subtaskForm.assigned_to, subtaskForm.title, 'subtask')
        toast({ title: 'Sub-atividade criada' })
      }
      setSubtaskDialogOpen(false)
    } catch { toast({ title: 'Erro ao salvar sub-atividade', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  async function handleToggleSubtask(taskId: string, subtaskId: string, completed: boolean) {
    setProject(prev => {
      if (!prev) return prev
      return { ...prev, project_tasks: prev.project_tasks.map(t => t.id === taskId ? { ...t, project_subtasks: (t.project_subtasks ?? []).map(s => s.id === subtaskId ? { ...s, completed } : s) } : t) }
    })
    try { await toggleProjectSubtask(subtaskId, completed) }
    catch {
      setProject(prev => {
        if (!prev) return prev
        return { ...prev, project_tasks: prev.project_tasks.map(t => t.id === taskId ? { ...t, project_subtasks: (t.project_subtasks ?? []).map(s => s.id === subtaskId ? { ...s, completed: !completed } : s) } : t) }
      })
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  async function handleDeleteSubtask() {
    if (!deleteSubtaskId || !subtaskParentId) return
    try {
      await deleteProjectSubtask(deleteSubtaskId)
      setProject(prev => {
        if (!prev) return prev
        return { ...prev, project_tasks: prev.project_tasks.map(t => t.id === subtaskParentId ? { ...t, project_subtasks: (t.project_subtasks ?? []).filter(s => s.id !== deleteSubtaskId) } : t) }
      })
      toast({ title: 'Sub-atividade removida' })
    } catch { toast({ title: 'Erro ao remover', variant: 'destructive' }) }
    finally { setDeleteSubtaskId(null) }
  }

  // ── Inline quick-add ───────────────────────────────────────────────────────

  async function handleInlineAdd(taskId: string) {
    if (!inlineTitle.trim()) return
    try {
      const created = await createProjectSubtask({ title: inlineTitle.trim(), assigned_to: null, due_date: null, completed: false, task_id: taskId })
      setProject(prev => {
        if (!prev) return prev
        return { ...prev, project_tasks: prev.project_tasks.map(t => t.id === taskId ? { ...t, project_subtasks: [...(t.project_subtasks ?? []), created] } : t) }
      })
      setInlineTitle('')
    } catch { toast({ title: 'Erro ao adicionar sub-atividade', variant: 'destructive' }) }
  }

  // ── Email notification helper ──────────────────────────────────────────────

  function notifyAssignment(assignedId: string, taskTitle: string, taskType: 'task' | 'subtask' = 'task') {
    const assignee = allMembers.find(m => m.id === assignedId)
    if (!assignee || !project) return
    fetch('/api/notify/task-assigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigneeName: assignee.full_name,
        assigneeEmail: assignee.email,
        taskTitle,
        projectTitle: project.title,
        taskType,
      }),
    }).catch(() => {})
  }

  // ── Export report ──────────────────────────────────────────────────────────

  function handleExport() {
    if (!project) return
    const { pct: exportPct } = calcProgress(project.project_tasks)
    const completedTasks = project.project_tasks.filter(t => t.completed).length

    const memberNames = project.project_members
      .map(pm => memberMap[pm.user_id] ?? 'Usuário removido')
      .join(', ') || '—'

    const tasksHtml = project.project_tasks.map(t => {
      const subs = t.project_subtasks ?? []
      const subHtml = subs.length > 0 ? `
        <ul style="margin: 6px 0 0 0; padding-left: 20px; list-style: none;">
          ${subs.map(s => `
            <li style="font-size: 13px; color: #555; padding: 3px 0; display: flex; align-items: center; gap: 6px;">
              <span style="color: ${s.completed ? '#16a34a' : '#d1d5db'}; font-size: 15px;">${s.completed ? '✓' : '○'}</span>
              <span style="${s.completed ? 'text-decoration: line-through; color: #999;' : ''}">${s.title}</span>
              ${s.assigned_to && memberMap[s.assigned_to] ? `<span style="color: #888; font-size: 11px;">· ${memberMap[s.assigned_to]}</span>` : ''}
            </li>
          `).join('')}
        </ul>` : ''
      return `
        <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; background: ${t.completed ? '#f0fdf4' : '#fff'};">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: ${t.completed ? '#16a34a' : '#d1d5db'}; font-size: 16px;">${t.completed ? '✓' : '○'}</span>
            <span style="font-weight: 600; font-size: 14px; ${t.completed ? 'text-decoration: line-through; color: #999;' : ''}">${t.title}</span>
            ${t.assigned_to && memberMap[t.assigned_to] ? `<span style="color: #888; font-size: 12px; margin-left: auto;">· ${memberMap[t.assigned_to]}</span>` : ''}
          </div>
          ${t.description ? `<p style="font-size: 12px; color: #777; margin: 4px 0 0 24px;">${t.description}</p>` : ''}
          ${subHtml}
        </div>`
    }).join('')

    const detailSection = (label: string, value: string | null) => value ? `
      <div style="margin-bottom: 20px;">
        <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin: 0 0 6px;">${label}</p>
        <p style="font-size: 14px; color: #333; margin: 0; white-space: pre-wrap; line-height: 1.6;">${value}</p>
      </div>` : ''

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório — ${project.title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 24px; display: flex; gap: 8px;">
    <button onclick="window.print()" style="background: #1a1a1a; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; cursor: pointer;">Imprimir / Salvar PDF</button>
    <button onclick="window.close()" style="background: #f5f5f5; color: #333; border: 1px solid #ddd; padding: 10px 20px; border-radius: 6px; font-size: 14px; cursor: pointer;">Fechar</button>
  </div>

  <div style="border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 28px;">
    <h1 style="margin: 0 0 6px; font-size: 24px;">${project.title}</h1>
    <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: #555;">
      <span>Status: <strong>${STATUS_LABELS[project.status]}</strong></span>
      <span>Prioridade: <strong>${PRIORITY_LABELS[project.priority]}</strong></span>
      <span>Progresso: <strong>${exportPct}%</strong> (${completedTasks}/${project.project_tasks.length} atividades)</span>
      ${project.end_date ? `<span>Prazo: <strong>${new Intl.DateTimeFormat('pt-BR').format(new Date(project.end_date))}</strong></span>` : ''}
    </div>
    ${project.description ? `<p style="font-size: 14px; color: #555; margin: 12px 0 0;">${project.description}</p>` : ''}
  </div>

  ${detailSection('Objetivos', project.objectives)}
  ${detailSection('Escopo', project.scope)}
  ${detailSection('Entregáveis', project.deliverables)}
  ${detailSection('Riscos', project.risks)}

  <div style="margin-bottom: 20px;">
    <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin: 0 0 6px;">Membros</p>
    <p style="font-size: 14px; color: #333; margin: 0;">${memberNames}</p>
  </div>

  <div>
    <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin: 0 0 12px;">Atividades</p>
    ${tasksHtml || '<p style="color: #999; font-size: 14px;">Nenhuma atividade cadastrada.</p>'}
  </div>

  <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999;">
    Relatório gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())} · L Board
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  // ── AI Import ──────────────────────────────────────────────────────────────

  function openAiDialog() {
    setAiFile(null)
    setAiTasks([])
    setAiSelected(new Set())
    setAiStep('upload')
    setAiDialogOpen(true)
  }

  async function handleAiGenerate() {
    if (!aiFile || !project) return
    setAiLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', aiFile)
      const memberNames = allMembers.map(m => m.full_name).join(', ')
      if (memberNames) fd.append('members', memberNames)

      const res = await fetch(`/api/projects/${project.id}/ai-tasks`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')

      setAiTasks(json.tasks)
      setAiSelected(new Set(json.tasks.map((_: unknown, i: number) => i)))
      setAiStep('preview')
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao processar PDF', variant: 'destructive' })
    } finally {
      setAiLoading(false)
    }
  }

  async function handleAiCreate() {
    if (!project) return
    setAiCreating(true)
    try {
      const selected = aiTasks.filter((_, i) => aiSelected.has(i))
      const memberByName: Record<string, string> = {}
      allMembers.forEach(m => { memberByName[m.full_name.toLowerCase()] = m.id })

      let position = project.project_tasks.length
      const created: ProjectTask[] = []
      for (const t of selected) {
        const assignedId = t.assigned_to_hint
          ? memberByName[t.assigned_to_hint.toLowerCase()] ?? null
          : null
        const task = await createProjectTask({
          project_id: project.id, title: t.title, description: t.description || null,
          assigned_to: assignedId, due_date: null, position: position++, completed: false,
        })
        for (const s of t.subtasks) {
          const subAssignedId = s.assigned_to_hint
            ? memberByName[s.assigned_to_hint.toLowerCase()] ?? null
            : null
          const sub = await createProjectSubtask({
            task_id: task.id, title: s.title, assigned_to: subAssignedId,
            due_date: null, completed: false,
          })
          task.project_subtasks = [...(task.project_subtasks ?? []), sub]
        }
        created.push(task)
      }

      setProject(prev => prev ? { ...prev, project_tasks: [...prev.project_tasks, ...created] } : prev)
      setExpanded(prev => { const n = new Set(prev); created.forEach(t => n.add(t.id)); return n })
      toast({ title: `${created.length} atividade${created.length !== 1 ? 's' : ''} criada${created.length !== 1 ? 's' : ''} com sucesso` })
      setAiDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao criar tarefas', variant: 'destructive' })
    } finally {
      setAiCreating(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
          </div>
          <div className="space-y-3">
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Projeto não encontrado.</p>
        <Button size="sm" variant="outline" onClick={() => router.push('/projects')}>← Voltar</Button>
      </div>
    )
  }

  const completedTasksCount = project.project_tasks.filter(t => t.completed).length

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5" onClick={() => router.push('/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold leading-tight truncate">{project.title}</h2>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_COLORS[project.status]}`}>
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          {project.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" variant="outline" onClick={openAiDialog} className="text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Importar via IA
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport} className="text-muted-foreground">
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={openEditProject}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteProjectOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Right sidebar (shows first on mobile) ── */}
        <div className="order-first lg:order-last space-y-4">

          {/* Progress */}
          <Card className="shadow-none">
            <CardContent className="pt-4 pb-4 flex flex-col items-center gap-3">
              <CircularProgress value={pct} />
              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                  {doneItems} de {totalItems} item{totalItems !== 1 ? 's' : ''} concluído{totalItems !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {completedTasksCount}/{project.project_tasks.length} atividade{project.project_tasks.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="w-full grid grid-cols-2 gap-2 text-center pt-1 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Prioridade</p>
                  <p className="text-xs font-semibold mt-0.5">{PRIORITY_LABELS[project.priority]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="text-xs font-semibold mt-0.5">{formatDate(project.end_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project details */}
          {(project.objectives || project.scope || project.deliverables || project.risks) && (
            <Card className="shadow-none">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhes</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-4">
                {[
                  { label: 'Objetivos', value: project.objectives },
                  { label: 'Escopo', value: project.scope },
                  { label: 'Entregáveis', value: project.deliverables },
                  { label: 'Riscos', value: project.risks },
                ].filter(d => d.value).map(d => (
                  <div key={d.label}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{d.label}</p>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{d.value}</p>
                  </div>
                ))}
                {(project.start_date || project.end_date) && (
                  <div className="flex gap-4">
                    {project.start_date && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Início</p>
                        <p className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(project.start_date)}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Members */}
          <Card className="shadow-none">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Membros</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              {project.project_members.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum membro adicionado.</p>
              )}
              {project.project_members.map(pm => (
                <div key={pm.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {(memberMap[pm.user_id] ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs truncate">{memberMap[pm.user_id] ?? 'Usuário removido'}</span>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRemoveMember(pm.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {availableToAdd.length > 0 && (
                <Select onValueChange={handleAddMember}>
                  <SelectTrigger className="h-8 text-xs mt-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Plus className="h-3.5 w-3.5" /> Adicionar membro
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <UserRound className="h-3.5 w-3.5" /> {m.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Tasks (left, main column) ── */}
        <div className="order-last lg:order-first lg:col-span-2 space-y-3">
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Atividades</CardTitle>
                <Button size="sm" onClick={openNewTask}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Nova Atividade
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {project.project_tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>
                  <Button size="sm" variant="outline" onClick={openNewTask}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar atividade
                  </Button>
                </div>
              )}

              {project.project_tasks.map(task => {
                const subs = task.project_subtasks ?? []
                const isExpanded = expanded.has(task.id)
                const doneSubs = subs.filter(s => s.completed).length

                return (
                  <div key={task.id} className="rounded-lg border border-border overflow-hidden">
                    {/* Task row */}
                    <div className={`flex items-start gap-2 p-3 transition-colors ${task.completed ? 'bg-muted/30' : 'bg-background'}`}>
                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpanded(prev => {
                          const next = new Set(prev)
                          next.has(task.id) ? next.delete(task.id) : next.add(task.id)
                          return next
                        })}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                        }
                      </button>

                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleTask(task.id, !task.completed)}
                        className={`mt-0.5 shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-primary border-primary' : 'border-border hover:border-primary/60'}`}
                      >
                        {task.completed && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {task.assigned_to && memberMap[task.assigned_to] && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <UserRound className="h-3 w-3" />{memberMap[task.assigned_to]}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />{formatDate(task.due_date)}
                            </span>
                          )}
                          {subs.length > 0 && (
                            <span className="text-xs text-muted-foreground">{doneSubs}/{subs.length} sub-atividade{subs.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditTask(task)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteTaskId(task.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Subtasks (when expanded) */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20">
                        {subs.map(sub => (
                          <div key={sub.id} className="flex items-start gap-2 px-3 py-2 border-b border-border/50 last:border-0">
                            <div className="w-6 shrink-0" /> {/* indent */}
                            {/* Checkbox */}
                            <button
                              onClick={() => handleToggleSubtask(task.id, sub.id, !sub.completed)}
                              className={`mt-0.5 shrink-0 h-3.5 w-3.5 rounded border-2 flex items-center justify-center transition-colors ${sub.completed ? 'bg-primary border-primary' : 'border-border hover:border-primary/60'}`}
                            >
                              {sub.completed && <Check className="h-2 w-2 text-primary-foreground" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-tight ${sub.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {sub.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                {sub.assigned_to && memberMap[sub.assigned_to] && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <UserRound className="h-2.5 w-2.5" />{memberMap[sub.assigned_to]}
                                  </span>
                                )}
                                {sub.due_date && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-2.5 w-2.5" />{formatDate(sub.due_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-0.5">
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditSubtask(sub, task.id)}>
                                <Pencil className="h-2.5 w-2.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => { setSubtaskParentId(task.id); setDeleteSubtaskId(sub.id) }}>
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        {/* Inline quick-add */}
                        <div className="px-3 py-2">
                          {inlineTaskId === task.id ? (
                            <div className="flex items-center gap-2 pl-8">
                              <Input
                                autoFocus
                                className="h-7 text-xs flex-1"
                                placeholder="Nome da sub-atividade..."
                                value={inlineTitle}
                                onChange={(e) => setInlineTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { handleInlineAdd(task.id); }
                                  if (e.key === 'Escape') { setInlineTaskId(null); setInlineTitle('') }
                                }}
                              />
                              <Button size="sm" className="h-7 px-2" onClick={() => handleInlineAdd(task.id)} disabled={!inlineTitle.trim()}>
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setInlineTaskId(null); setInlineTitle('') }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 pl-8">
                              <button
                                onClick={() => { setInlineTaskId(task.id); setInlineTitle('') }}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" /> Adicionar sub-atividade
                              </button>
                              <button
                                onClick={() => openNewSubtask(task.id)}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                              >
                                (avançado)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Edit Project Dialog ── */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Projeto</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={2} value={projectForm.description ?? ''} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={projectForm.status} onValueChange={(v) => setProjectForm({ ...projectForm, status: v as ProjectStatus })}>
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
              <Select value={projectForm.priority} onValueChange={(v) => setProjectForm({ ...projectForm, priority: v as ProjectPriority })}>
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
              <Input type="date" value={projectForm.start_date ?? ''} onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Prazo Final</Label>
              <Input type="date" value={projectForm.end_date ?? ''} onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value || null })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Objetivos</Label>
              <Textarea rows={3} placeholder="O que esse projeto busca alcançar..." value={projectForm.objectives ?? ''} onChange={(e) => setProjectForm({ ...projectForm, objectives: e.target.value || null })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Escopo</Label>
              <Textarea rows={3} placeholder="O que está dentro (e fora) do escopo..." value={projectForm.scope ?? ''} onChange={(e) => setProjectForm({ ...projectForm, scope: e.target.value || null })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Entregáveis</Label>
              <Textarea rows={3} placeholder="O que será entregue ao final..." value={projectForm.deliverables ?? ''} onChange={(e) => setProjectForm({ ...projectForm, deliverables: e.target.value || null })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Riscos</Label>
              <Textarea rows={3} placeholder="Riscos identificados e mitigações..." value={projectForm.risks ?? ''} onChange={(e) => setProjectForm({ ...projectForm, risks: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProjectOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateProject} disabled={saving || !projectForm.title.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Task Dialog ── */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingTask ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={2} value={taskForm.description ?? ''} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value || null })} />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={taskForm.assigned_to ?? 'none'} onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {allMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input type="date" value={taskForm.due_date ?? ''} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTask} disabled={saving || !taskForm.title.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Subtask Dialog ── */}
      <Dialog open={subtaskDialogOpen} onOpenChange={setSubtaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingSubtask ? 'Editar Sub-Atividade' : 'Nova Sub-Atividade'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={subtaskForm.title} onChange={(e) => setSubtaskForm({ ...subtaskForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={subtaskForm.assigned_to ?? 'none'} onValueChange={(v) => setSubtaskForm({ ...subtaskForm, assigned_to: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {allMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input type="date" value={subtaskForm.due_date ?? ''} onChange={(e) => setSubtaskForm({ ...subtaskForm, due_date: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubtaskDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSubtask} disabled={saving || !subtaskForm.title.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirms ── */}
      <AlertDialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>Todas as atividades e sub-atividades serão removidas. Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTaskId} onOpenChange={(o) => !o && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atividade?</AlertDialogTitle>
            <AlertDialogDescription>As sub-atividades também serão removidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AI Import Dialog ── */}
      <Dialog open={aiDialogOpen} onOpenChange={(o) => { if (!aiLoading && !aiCreating) setAiDialogOpen(o) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Importar Tarefas via IA
            </DialogTitle>
          </DialogHeader>

          {aiStep === 'upload' && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Faça upload de um PDF (contrato, briefing, escopo, etc.) e o GPT-4o vai gerar as atividades automaticamente.
              </p>

              {/* Drop zone */}
              <label
                htmlFor="ai-pdf-input"
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${aiFile ? 'border-purple-400 bg-purple-50' : 'border-border hover:border-purple-300 hover:bg-muted/40'}`}
              >
                <Upload className={`h-8 w-8 ${aiFile ? 'text-purple-600' : 'text-muted-foreground'}`} />
                {aiFile ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-purple-700">{aiFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{(aiFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium">Clique para selecionar o PDF</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Máx. 10 MB</p>
                  </div>
                )}
                <input
                  id="ai-pdf-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setAiFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {aiFile && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setAiFile(null)}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Remover arquivo
                </Button>
              )}
            </div>
          )}

          {aiStep === 'preview' && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {aiTasks.length} atividade{aiTasks.length !== 1 ? 's' : ''} gerada{aiTasks.length !== 1 ? 's' : ''}. Selecione as que deseja criar:
                </p>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setAiSelected(aiSelected.size === aiTasks.length ? new Set() : new Set(aiTasks.map((_, i) => i)))}
                >
                  {aiSelected.size === aiTasks.length ? 'Desmarcar todas' : 'Selecionar todas'}
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {aiTasks.map((task, i) => (
                  <div
                    key={i}
                    onClick={() => setAiSelected(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors ${aiSelected.has(i) ? 'border-purple-300 bg-purple-50' : 'border-border bg-background opacity-50'}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center ${aiSelected.has(i) ? 'bg-purple-600 border-purple-600' : 'border-border'}`}>
                        {aiSelected.has(i) && <Check className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
                        )}
                        {task.assigned_to_hint && (
                          <p className="text-xs text-purple-600 mt-0.5 flex items-center gap-1">
                            <UserRound className="h-3 w-3" /> {task.assigned_to_hint}
                          </p>
                        )}
                        {task.subtasks.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.subtasks.length} sub-atividade{task.subtasks.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {aiStep === 'preview' && (
              <Button variant="outline" size="sm" onClick={() => setAiStep('upload')}>
                ← Voltar
              </Button>
            )}
            <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={aiLoading || aiCreating}>
              Cancelar
            </Button>
            {aiStep === 'upload' ? (
              <Button
                onClick={handleAiGenerate}
                disabled={!aiFile || aiLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {aiLoading
                  ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Analisando...</>
                  : <><Sparkles className="mr-1.5 h-4 w-4" /> Gerar Tarefas</>
                }
              </Button>
            ) : (
              <Button
                onClick={handleAiCreate}
                disabled={aiSelected.size === 0 || aiCreating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {aiCreating
                  ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Criando...</>
                  : `Criar ${aiSelected.size} atividade${aiSelected.size !== 1 ? 's' : ''}`
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSubtaskId} onOpenChange={(o) => !o && setDeleteSubtaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sub-atividade?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubtask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
