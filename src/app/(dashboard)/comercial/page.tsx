'use client'
import { useEffect, useState } from 'react'
import { Target, Pencil, AlertTriangle, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { getCommercialSummary } from '@/services/commercial'
import { formatCurrency } from '@/lib/utils'
import type { CommercialSummary } from '@/services/commercial'
import { useTranslations } from 'next-intl'
import { RevealGroup, RevealItem } from '@/components/motion/Reveal'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

type CommercialGoals = { daily: number; weekly: number; monthly: number; semester: number }
type CommercialAchieved = { daily: boolean; weekly: boolean; monthly: boolean; semester: boolean }
const EMPTY_GOALS: CommercialGoals = { daily: 0, weekly: 0, monthly: 0, semester: 0 }
const EMPTY_ACHIEVED: CommercialAchieved = { daily: false, weekly: false, monthly: false, semester: false }
const GOALS_STORAGE_KEY = 'lboard_commercial_goals'
const ACHIEVED_STORAGE_KEY = 'lboard_commercial_goals_achieved'

function GoalCard({ label, current, target, manuallyAchieved, onToggleManual, id, tGoals }: {
  label: string; current: number; target: number
  manuallyAchieved: boolean; onToggleManual: (v: boolean) => void; id: string
  tGoals: (k: string) => string
}) {
  const pct = target > 0 ? Math.min(Math.max((current / target) * 100, 0), 100) : 0
  const isAchieved = (current >= target && target > 0) || manuallyAchieved

  const barColor = isAchieved ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-400'
  const statusLabel = isAchieved ? tGoals('achieved') : pct >= 60 ? tGoals('onTrack') : tGoals('critical')
  const statusColor = isAchieved ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'

  return (
    <Card>
      <CardHeader className="pb-1 flex flex-row items-center justify-between">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
        <Target className="h-3.5 w-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-lg font-bold">{formatCurrency(current)}</p>
          <p className="text-xs text-muted-foreground shrink-0">/ {target > 0 ? formatCurrency(target) : '—'}</p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% {tGoals('ofGoal')}</p>
          {target > 0 && <p className={`text-xs font-medium ${statusColor}`}>{statusLabel}</p>}
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <Checkbox id={id} checked={manuallyAchieved} onCheckedChange={onToggleManual} />
          <label htmlFor={id} className="text-xs text-muted-foreground cursor-pointer select-none">
            {tGoals('manualCheck')}
          </label>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ComercialPage() {
  const t  = useTranslations('comercial')
  const tg = useTranslations('comercial.goals')
  const tc = useTranslations('common')

  const [summary, setSummary] = useState<CommercialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [goals, setGoals] = useState<CommercialGoals>(EMPTY_GOALS)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [goalsForm, setGoalsForm] = useState<CommercialGoals>(EMPTY_GOALS)
  const [achieved, setAchieved] = useState<CommercialAchieved>(EMPTY_ACHIEVED)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(GOALS_STORAGE_KEY)
      setGoals(stored ? JSON.parse(stored) : EMPTY_GOALS)
    } catch {
      setGoals(EMPTY_GOALS)
    }
    try {
      const storedAchieved = localStorage.getItem(ACHIEVED_STORAGE_KEY)
      setAchieved(storedAchieved ? JSON.parse(storedAchieved) : EMPTY_ACHIEVED)
    } catch {
      setAchieved(EMPTY_ACHIEVED)
    }
  }, [])

  function openGoals() { setGoalsForm(goals); setGoalsOpen(true) }
  function saveGoals() {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goalsForm))
    setGoals(goalsForm)
    setGoalsOpen(false)
  }

  function toggleAchieved(key: keyof CommercialAchieved, value: boolean) {
    const next = { ...achieved, [key]: value }
    localStorage.setItem(ACHIEVED_STORAGE_KEY, JSON.stringify(next))
    setAchieved(next)
  }

  async function load() {
    setLoading(true)
    try {
      const s = await getCommercialSummary()
      setSummary(s)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">{t('errorLoading')}</p>
        <Button size="sm" variant="outline" onClick={load}>{tc('retry')}</Button>
      </div>
    )
  }

  const hasAnyGoal = goals.daily > 0 || goals.weekly > 0 || goals.monthly > 0 || goals.semester > 0
  const monthlyPace = goals.semester > 0 ? goals.semester / 6 : 0
  const semesterPct = goals.semester > 0 && summary
    ? Math.min(Math.max((summary.semesterTotal / goals.semester) * 100, 0), 100)
    : 0
  const semesterAchieved = semesterPct >= 100 || achieved.semester

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{tg('title')}</h2>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={openGoals}>
          <Pencil className="h-3 w-3 mr-1" />{hasAnyGoal ? tg('edit') : tg('set')}
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : summary ? (
        <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RevealItem>
            <GoalCard
              id="goal-achieved-daily" label={tg('daily')} current={summary.today} target={goals.daily}
              manuallyAchieved={achieved.daily} onToggleManual={(v) => toggleAchieved('daily', v)} tGoals={tg}
            />
          </RevealItem>
          <RevealItem>
            <GoalCard
              id="goal-achieved-weekly" label={tg('weekly')} current={summary.thisWeek} target={goals.weekly}
              manuallyAchieved={achieved.weekly} onToggleManual={(v) => toggleAchieved('weekly', v)} tGoals={tg}
            />
          </RevealItem>
          <RevealItem>
            <GoalCard
              id="goal-achieved-monthly" label={tg('monthly')} current={summary.thisMonth} target={goals.monthly}
              manuallyAchieved={achieved.monthly} onToggleManual={(v) => toggleAchieved('monthly', v)} tGoals={tg}
            />
          </RevealItem>
        </RevealGroup>
      ) : null}

      {!loading && summary && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold">{tg('semesterTitle')}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t('semesterSubtitle')}</p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <AnimatedNumber value={summary.semesterTotal} format={formatCurrency} className="text-2xl font-bold text-primary" />
              <p className="text-sm text-muted-foreground shrink-0">/ {goals.semester > 0 ? formatCurrency(goals.semester) : '—'}</p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${semesterAchieved ? 'bg-emerald-500' : semesterPct >= 60 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${semesterPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{semesterPct.toFixed(0)}% {tg('ofGoal')}</p>
              {semesterAchieved && <p className="text-xs font-medium text-emerald-600">{tg('achieved')}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox id="goal-achieved-semester" checked={achieved.semester} onCheckedChange={(v) => toggleAchieved('semester', v)} />
              <label htmlFor="goal-achieved-semester" className="text-xs text-muted-foreground cursor-pointer select-none">
                {tg('manualCheck')}
              </label>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.semesterMonthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                {monthlyPace > 0 && (
                  <ReferenceLine
                    y={monthlyPace}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: tg('monthlyPace'), position: 'insideTopRight', fontSize: 11, fill: '#f59e0b' }}
                  />
                )}
                <Bar dataKey="value" name={tg('monthly')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Dialog open={goalsOpen} onOpenChange={setGoalsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{tg('form.title')}</DialogTitle>
            <p className="text-xs text-muted-foreground">{tg('form.subtitle')}</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{tg('form.daily')}</Label>
              <Input type="number" min={0} value={goalsForm.daily} onChange={(e) => setGoalsForm({ ...goalsForm, daily: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{tg('form.weekly')}</Label>
              <Input type="number" min={0} value={goalsForm.weekly} onChange={(e) => setGoalsForm({ ...goalsForm, weekly: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{tg('form.monthly')}</Label>
              <Input type="number" min={0} value={goalsForm.monthly} onChange={(e) => setGoalsForm({ ...goalsForm, monthly: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>{tg('form.semester')}</Label>
              <Input type="number" min={0} value={goalsForm.semester} onChange={(e) => setGoalsForm({ ...goalsForm, semester: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalsOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={saveGoals}>{tc('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
