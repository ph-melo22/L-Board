'use client'
import { useEffect, useState, useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PeriodSelector } from '@/components/shared/PeriodSelector'
import { getCurrentMonthKey, toLocalDateStr } from '@/lib/period'
import { computePeriodTotals } from '@/lib/goalPeriods'
import { getAllLeadFollowUpTasks } from '@/services/crm'
import { getTeamSalesGoals, upsertSalesGoal } from '@/services/salesGoals'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import type { CrmLead, Profile, SalesGoal, SalesGoalValues, Task } from '@/types'

type GoalTier = 'daily' | 'weekly' | 'monthly' | 'semester'
const EMPTY_GOAL_FORM: SalesGoalValues = { daily: 0, weekly: 0, monthly: 0, semester: 0 }
const TIER_KEY = {
  daily: 'today', weekly: 'thisWeek', monthly: 'thisMonth', semester: 'semesterTotal',
} as const satisfies Record<GoalTier, 'today' | 'thisWeek' | 'thisMonth' | 'semesterTotal'>

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

interface TeamOverviewProps {
  team: Profile[]
  leads: CrmLead[]
}

export function TeamOverview({ team, leads }: TeamOverviewProps) {
  const { toast } = useToast()
  const t  = useTranslations('crm.team')
  const tg = useTranslations('comercial.goals')
  const tc = useTranslations('common')

  const [tasks, setTasks]       = useState<Task[]>([])
  const [goals, setGoals]       = useState<SalesGoal[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(false)
  const [period, setPeriod]     = useState(getCurrentMonthKey())
  const [goalTier, setGoalTier] = useState<GoalTier>('monthly')

  const [editingMember, setEditingMember] = useState<Profile | null>(null)
  const [goalForm, setGoalForm]           = useState<SalesGoalValues>(EMPTY_GOAL_FORM)
  const [saving, setSaving]               = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [tk, gl] = await Promise.all([getAllLeadFollowUpTasks(), getTeamSalesGoals()])
      setTasks(tk); setGoals(gl); setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const salesTeam = useMemo(() => team.filter((m) => m.role === 'sales'), [team])

  const rows = useMemo(() => salesTeam.map((member) => {
    const memberLeads = leads.filter((l) => l.owner_id === member.id)
    const won = memberLeads.filter((l) => l.stage === 'ganho')
    const lost = memberLeads.filter((l) => l.stage === 'perdido').length
    const approached = memberLeads.filter((l) => l.stage !== 'novo').length
    const openPipeline = memberLeads
      .filter((l) => l.stage !== 'ganho' && l.stage !== 'perdido')
      .reduce((acc, l) => acc + l.deal_value, 0)

    const memberLeadIds = new Set(memberLeads.map((l) => l.id))
    const memberTasks = tasks.filter((tk) => tk.lead_id && memberLeadIds.has(tk.lead_id))
    const pendingFollowUps = memberTasks.filter((tk) => tk.status !== 'done')
    const todayStr = toLocalDateStr(new Date())
    const overdueFollowUps = pendingFollowUps.filter((tk) => tk.due_date && tk.due_date < todayStr)

    const wonEntries = won
      .filter((l) => l.closed_at)
      .map((l) => ({ value: l.deal_value, date: l.closed_at!.split('T')[0] }))
    const totals = computePeriodTotals(wonEntries, period)

    const goal = goals.find((g) => g.user_id === member.id) ?? null

    return {
      member, total: memberLeads.length, approached, won: won.length, lost, openPipeline,
      pendingFollowUps: pendingFollowUps.length, overdueFollowUps: overdueFollowUps.length,
      totals, goal,
    }
  }), [salesTeam, leads, tasks, goals, period])

  const summary = useMemo(() => rows.reduce((acc, r) => ({
    approached: acc.approached + r.approached,
    won: acc.won + r.won,
    openPipeline: acc.openPipeline + r.openPipeline,
    overdueFollowUps: acc.overdueFollowUps + r.overdueFollowUps,
  }), { approached: 0, won: 0, openPipeline: 0, overdueFollowUps: 0 }), [rows])

  function openGoalDialog(member: Profile, goal: SalesGoal | null) {
    setEditingMember(member)
    setGoalForm(goal ? { daily: goal.daily, weekly: goal.weekly, monthly: goal.monthly, semester: goal.semester } : EMPTY_GOAL_FORM)
  }

  async function handleSaveGoal() {
    if (!editingMember) return
    setSaving(true)
    try {
      const updated = await upsertSalesGoal(editingMember.id, goalForm)
      setGoals((prev) => [...prev.filter((g) => g.user_id !== editingMember.id), updated])
      toast({ title: t('toast.goalUpdated') })
      setEditingMember(null)
    } catch { toast({ title: t('toast.goalError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  if (error) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2">
        <p className="text-sm font-medium">{t('errorLoading')}</p>
        <Button size="sm" variant="outline" onClick={load}>{tc('retry')}</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (salesTeam.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 text-center px-4">
        <p className="text-sm font-medium">{t('noSalesTeam')}</p>
        <p className="text-xs text-muted-foreground max-w-sm">{t('noSalesTeamHint')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodSelector value={period} onChange={setPeriod} />
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">{t('selectGoalTier')}</Label>
          <Select value={goalTier} onValueChange={(v) => setGoalTier(v as GoalTier)}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">{tg('daily')}</SelectItem>
              <SelectItem value="weekly">{tg('weekly')}</SelectItem>
              <SelectItem value="monthly">{tg('monthly')}</SelectItem>
              <SelectItem value="semester">{tg('semesterTitle')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{t('summary.approached')}</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold">{summary.approached}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{t('summary.won')}</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold text-emerald-600">{summary.won}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{t('summary.pipeline')}</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-bold">{formatCurrency(summary.openPipeline)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{t('summary.overdueFollowUps')}</CardTitle></CardHeader>
          <CardContent><p className={`text-lg font-bold ${summary.overdueFollowUps > 0 ? 'text-red-500' : ''}`}>{summary.overdueFollowUps}</p></CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t('table.member')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('table.leads')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('table.approached')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('table.won')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('table.lost')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('table.pipeline')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('table.followUps')}</th>
              <th className="px-3 py-2 text-left font-medium min-w-[160px]">{t('table.goal')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const target = row.goal?.[goalTier] ?? 0
              const current = row.totals[TIER_KEY[goalTier]]
              const pct = target > 0 ? Math.min(Math.max((current / target) * 100, 0), 100) : 0
              return (
                <tr key={row.member.id}>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{row.member.full_name}</td>
                  <td className="px-3 py-2.5 text-right">{row.total}</td>
                  <td className="px-3 py-2.5 text-right">{row.approached}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-600">{row.won}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{row.lost}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatCurrency(row.openPipeline)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {row.pendingFollowUps === 0 ? (
                      <span className="text-muted-foreground">{t('noFollowUps')}</span>
                    ) : (
                      <>
                        <span>{t('pendingFollowUps', { count: row.pendingFollowUps })}</span>
                        {row.overdueFollowUps > 0 && (
                          <span className="ml-1 text-red-500">· {t('overdueFollowUps', { count: row.overdueFollowUps })}</span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5 min-w-[160px]">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium">{formatCurrency(current)}</span>
                      <span className="text-muted-foreground">/ {target > 0 ? formatCurrency(target) : '—'}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openGoalDialog(row.member, row.goal)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editingMember} onOpenChange={(o) => !o && setEditingMember(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('goalDialog.title', { name: editingMember?.full_name ?? '' })}</DialogTitle>
            <p className="text-xs text-muted-foreground">{t('goalDialog.subtitle')}</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{tg('form.daily')}</Label>
              <Input type="number" min={0} value={goalForm.daily} onChange={(e) => setGoalForm({ ...goalForm, daily: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{tg('form.weekly')}</Label>
              <Input type="number" min={0} value={goalForm.weekly} onChange={(e) => setGoalForm({ ...goalForm, weekly: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{tg('form.monthly')}</Label>
              <Input type="number" min={0} value={goalForm.monthly} onChange={(e) => setGoalForm({ ...goalForm, monthly: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{tg('form.semester')}</Label>
              <Input type="number" min={0} value={goalForm.semester} onChange={(e) => setGoalForm({ ...goalForm, semester: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>{tc('cancel')}</Button>
            <Button onClick={handleSaveGoal} disabled={saving}>{saving ? tc('saving') : tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
