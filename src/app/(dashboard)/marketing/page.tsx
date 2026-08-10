'use client'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  Plus, Pencil, Trash2, AlertTriangle, Megaphone, Users, Target, TrendingUp, MousePointerClick, Wallet,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, summarizeCampaigns } from '@/services/marketing'
import { formatCurrency, formatPercent } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { RevealGroup, RevealItem } from '@/components/motion/Reveal'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import type { MarketingCampaign, MarketingCampaignFormData, MarketingCampaignStatus, MarketingChannel } from '@/types'

const CHANNELS: MarketingChannel[] = ['paid_search', 'paid_social', 'seo', 'content', 'email', 'referral', 'other']
const STATUSES: MarketingCampaignStatus[] = ['planning', 'active', 'paused', 'completed']

const EMPTY_FORM: MarketingCampaignFormData = {
  name: '', channel: 'paid_social', status: 'active',
  start_date: new Date().toISOString().split('T')[0], end_date: null,
  investment: 0, traffic: 0, leads_generated: 0, conversions: 0, revenue_generated: 0, notes: null,
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

function KpiCard({ label, value, icon: Icon, format }: {
  label: string; value: number; icon: ComponentType<{ className?: string }>
  format: (v: number) => string
}) {
  return (
    <Card>
      <CardHeader className="pb-1 flex flex-row items-center justify-between">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <AnimatedNumber value={value} format={format} className="text-lg font-bold" />
      </CardContent>
    </Card>
  )
}

export default function MarketingPage() {
  const { toast } = useToast()
  const t  = useTranslations('marketing')
  const tc = useTranslations('common')

  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [filterStatus, setFilterStatus] = useState<MarketingCampaignStatus | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]     = useState<MarketingCampaign | null>(null)
  const [form, setForm]           = useState<MarketingCampaignFormData>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setCampaigns(await getCampaigns()); setError(false) }
    catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openNew() { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true) }
  function openEdit(c: MarketingCampaign) {
    setEditing(c)
    setForm({
      name: c.name, channel: c.channel, status: c.status,
      start_date: c.start_date, end_date: c.end_date,
      investment: c.investment, traffic: c.traffic, leads_generated: c.leads_generated,
      conversions: c.conversions, revenue_generated: c.revenue_generated, notes: c.notes,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) { await updateCampaign(editing.id, form); toast({ title: t('toast.updated') }) }
      else { await createCampaign(form); toast({ title: t('toast.created') }) }
      setDialogOpen(false); load()
    } catch { toast({ title: t('toast.saveError'), variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    try { await deleteCampaign(deleteId); toast({ title: t('toast.deleted') }); load() }
    catch { toast({ title: t('toast.deleteError'), variant: 'destructive' }) }
    finally { setDeleteId(null) }
  }

  const filtered = useMemo(
    () => filterStatus === 'all' ? campaigns : campaigns.filter((c) => c.status === filterStatus),
    [campaigns, filterStatus]
  )

  const summary = useMemo(() => summarizeCampaigns(campaigns), [campaigns])
  const chartData = summary.byChannel.map((c) => ({
    channel: t(`channel.${c.channel}`), investment: c.investment, revenue: c.revenue,
  }))

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
    <div className="space-y-6">
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <RevealGroup className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <RevealItem><KpiCard label={t('kpi.investment')} value={summary.totalInvestment} icon={Wallet} format={formatCurrency} /></RevealItem>
          <RevealItem><KpiCard label={t('kpi.revenue')} value={summary.totalRevenue} icon={TrendingUp} format={formatCurrency} /></RevealItem>
          <RevealItem><KpiCard label={t('kpi.leads')} value={summary.totalLeads} icon={Users} format={(v) => String(Math.round(v))} /></RevealItem>
          <RevealItem><KpiCard label={t('kpi.cac')} value={summary.cac} icon={Target} format={formatCurrency} /></RevealItem>
          <RevealItem><KpiCard label={t('kpi.roi')} value={summary.roi} icon={TrendingUp} format={formatPercent} /></RevealItem>
          <RevealItem><KpiCard label={t('kpi.conversionRate')} value={summary.conversionRate} icon={MousePointerClick} format={formatPercent} /></RevealItem>
        </RevealGroup>
      )}

      {!loading && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">{t('chartTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="investment" name={t('kpi.investment')} fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name={t('kpi.revenue')} fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {(['all', ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? tc('all') : t(`status.${s}`)}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> {t('newCampaign')}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 flex flex-col items-center gap-2 text-center">
              <Megaphone className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('notFound')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">{t('columns.name')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('columns.channel')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('columns.status')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('columns.investment')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('columns.leads')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('columns.conversions')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('columns.revenue')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t(`channel.${c.channel}`)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {t(`status.${c.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(c.investment)}</td>
                      <td className="px-4 py-3 text-right">{c.leads_generated}</td>
                      <td className="px-4 py-3 text-right">{c.conversions}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(c.revenue_generated)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editing ? t('editCampaign') : t('newCampaign')}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>{t('form.name')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.channel')}</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as MarketingChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((ch) => <SelectItem key={ch} value={ch}>{t(`channel.${ch}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.status')}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as MarketingCampaignStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.startDate')}</Label>
                <Input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.endDate')}</Label>
                <Input type="date" value={form.end_date ?? ''} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.investment')}</Label>
                <Input type="number" value={form.investment} onChange={(e) => setForm({ ...form, investment: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.revenue')}</Label>
                <Input type="number" value={form.revenue_generated} onChange={(e) => setForm({ ...form, revenue_generated: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.traffic')}</Label>
                <Input type="number" value={form.traffic} onChange={(e) => setForm({ ...form, traffic: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('form.leads')}</Label>
                <Input type="number" value={form.leads_generated} onChange={(e) => setForm({ ...form, leads_generated: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>{t('form.conversions')}</Label>
                <Input type="number" value={form.conversions} onChange={(e) => setForm({ ...form, conversions: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>{t('form.notes')}</Label>
                <Textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>{saving ? tc('saving') : tc('save')}</Button>
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
