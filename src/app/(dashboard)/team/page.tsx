'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Shield, User, Code2, AlertTriangle, Mail, Briefcase, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import {
  getTeam, getCurrentProfile, inviteTeamMember, removeTeamMember, updateMemberRole,
} from '@/services/team'
import { useTranslations } from 'next-intl'
import type { Profile, UserRole } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  founder: Shield, manager: Briefcase, financial: BarChart2, developer: Code2, employee: User,
}
const ROLE_COLORS: Record<UserRole, string> = {
  founder: 'text-primary', manager: 'text-orange-500', financial: 'text-emerald-500',
  developer: 'text-blue-500', employee: 'text-muted-foreground',
}
const ROLE_KEYS: UserRole[] = ['founder', 'manager', 'financial', 'developer', 'employee']

export default function TeamPage() {
  const { toast } = useToast()
  const t  = useTranslations('team')
  const tc = useTranslations('common')
  const [members, setMembers]               = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(false)
  const [inviteOpen, setInviteOpen]         = useState(false)
  const [inviteForm, setInviteForm]         = useState({ full_name: '', email: '', role: 'employee' as UserRole })
  const [inviting, setInviting]             = useState(false)
  const [removeId, setRemoveId]             = useState<string | null>(null)
  const [removing, setRemoving]             = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [team, profile] = await Promise.all([getTeam(), getCurrentProfile()])
      setMembers(team); setCurrentProfile(profile); setError(false)
    } catch { setError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const isFounder    = currentProfile?.role === 'founder'
  const founderCount = members.filter((m) => m.role === 'founder').length

  async function handleInvite() {
    if (!inviteForm.full_name || !inviteForm.email) return
    setInviting(true)
    try {
      await inviteTeamMember(inviteForm.full_name, inviteForm.email, inviteForm.role)
      toast({ title: t('invite.successTitle'), description: t('invite.successDescription', { email: inviteForm.email }) })
      setInviteOpen(false)
      setInviteForm({ full_name: '', email: '', role: 'employee' })
      load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('invite.errorTitle')
      toast({ title: t('invite.errorTitle'), description: msg, variant: 'destructive' })
    } finally { setInviting(false) }
  }

  async function handleRemove() {
    if (!removeId) return
    setRemoving(true)
    try {
      await removeTeamMember(removeId)
      toast({ title: t('toast.memberRemoved') })
      setRemoveId(null); load()
    } catch {
      toast({ title: t('toast.removeError'), variant: 'destructive' })
    } finally { setRemoving(false) }
  }

  async function handleRoleChange(id: string, newRole: UserRole) {
    try {
      await updateMemberRole(id, newRole)
      setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role: newRole } : m))
      toast({ title: t('toast.roleUpdated') })
    } catch {
      toast({ title: t('toast.roleError'), variant: 'destructive' })
    }
  }

  const memberToRemove = members.find((m) => m.id === removeId)
  const canRemove = (m: Profile) =>
    isFounder && m.id !== currentProfile?.id && !(m.role === 'founder' && founderCount <= 1)

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
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading ? '—' : t('memberCount', { count: members.length })}
        </p>
        {isFounder && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> {t('inviteMember')}
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : members.length === 0 ? (
          <p className="col-span-3 text-sm text-muted-foreground py-6">{t('noMembers')}</p>
        ) : (
          members.map((member) => {
            const RoleIcon    = ROLE_ICONS[member.role]
            const roleColor   = ROLE_COLORS[member.role]
            const isSelf      = member.id === currentProfile?.id
            const isLastFounder = member.role === 'founder' && founderCount <= 1

            return (
              <Card key={member.id} className={isSelf ? 'border-primary/40 bg-primary/5' : ''}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">
                          {member.full_name}
                          {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">{t('self')}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    {canRemove(member) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setRemoveId(member.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <RoleIcon className={`h-3.5 w-3.5 shrink-0 ${roleColor}`} />
                    {isFounder && !isSelf && !isLastFounder ? (
                      <Select value={member.role} onValueChange={(v) => handleRoleChange(member.id, v as UserRole)}>
                        <SelectTrigger className="h-7 text-xs border-none bg-transparent px-1 w-auto gap-1 focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_KEYS.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">{t(`roles.${r}.label`)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`text-xs font-medium ${roleColor}`}>{t(`roles.${member.role}.label`)}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('inviteMember')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('form.fullName')}</Label>
              <Input placeholder={t('form.fullNamePlaceholder')} value={inviteForm.full_name} onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.email')}</Label>
              <Input type="email" placeholder={t('form.emailPlaceholder')} value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.access')}</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_KEYS.map((r) => (
                    <SelectItem key={r} value={r}>{t(`roles.${r}.label`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t(`roles.${inviteForm.role}.desc`)}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              {t('emailInfo')}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteForm.full_name || !inviteForm.email}>
              {inviting ? t('invite.sending') : t('invite.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeTitle', { name: memberToRemove?.full_name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('removeDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removing ? t('removing') : t('removeAccess')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
