'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Shield, User, Code2, AlertTriangle, Mail } from 'lucide-react'
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
import type { Profile, UserRole } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
  founder:  { label: 'Founder', icon: Shield, color: 'text-primary' },
  developer:{ label: 'Developer', icon: Code2, color: 'text-blue-600' },
  employee: { label: 'Funcionário', icon: User, color: 'text-muted-foreground' },
}

const INVITE_ROLES: { value: UserRole; label: string }[] = [
  { value: 'founder', label: 'Founder' },
  { value: 'developer', label: 'Developer / TI' },
  { value: 'employee', label: 'Funcionário' },
]

export default function TeamPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({ full_name: '', email: '', role: 'employee' as UserRole })
  const [inviting, setInviting] = useState(false)

  // Remove confirm
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [team, profile] = await Promise.all([getTeam(), getCurrentProfile()])
      setMembers(team)
      setCurrentProfile(profile)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const isFounder = currentProfile?.role === 'founder'
  const founderCount = members.filter((m) => m.role === 'founder').length

  async function handleInvite() {
    if (!inviteForm.full_name || !inviteForm.email) return
    setInviting(true)
    try {
      await inviteTeamMember(inviteForm.full_name, inviteForm.email, inviteForm.role)
      toast({ title: 'Convite enviado!', description: `Um e-mail foi enviado para ${inviteForm.email}.` })
      setInviteOpen(false)
      setInviteForm({ full_name: '', email: '', role: 'employee' })
      load()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao convidar'
      toast({ title: 'Erro ao convidar', description: msg, variant: 'destructive' })
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove() {
    if (!removeId) return
    setRemoving(true)
    try {
      await removeTeamMember(removeId)
      toast({ title: 'Membro removido' })
      setRemoveId(null)
      load()
    } catch {
      toast({ title: 'Erro ao remover membro', variant: 'destructive' })
    } finally {
      setRemoving(false)
    }
  }

  async function handleRoleChange(id: string, newRole: UserRole) {
    try {
      await updateMemberRole(id, newRole)
      setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role: newRole } : m))
      toast({ title: 'Função atualizada' })
    } catch {
      toast({ title: 'Erro ao atualizar função', variant: 'destructive' })
    }
  }

  const memberToRemove = members.find((m) => m.id === removeId)
  const canRemove = (m: Profile) =>
    isFounder &&
    m.id !== currentProfile?.id &&
    !(m.role === 'founder' && founderCount <= 1)

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Erro ao carregar equipe.</p>
        <Button size="sm" variant="outline" onClick={load}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {loading ? '—' : `${members.length} membro${members.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isFounder && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Convidar membro
          </Button>
        )}
      </div>

      {/* Members list */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : members.length === 0 ? (
          <p className="col-span-3 text-sm text-muted-foreground py-6">Nenhum membro encontrado.</p>
        ) : (
          members.map((member) => {
            const cfg = ROLE_CONFIG[member.role]
            const RoleIcon = cfg.icon
            const isSelf = member.id === currentProfile?.id
            const isLastFounder = member.role === 'founder' && founderCount <= 1

            return (
              <Card key={member.id} className={isSelf ? 'border-primary/40 bg-primary/5' : ''}>
                <CardContent className="p-4 space-y-3">
                  {/* Avatar + name */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase">
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">
                          {member.full_name}
                          {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Remove button */}
                    {canRemove(member) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRemoveId(member.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Role */}
                  <div className="flex items-center gap-1.5">
                    <RoleIcon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
                    {isFounder && !isSelf && !isLastFounder ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.id, v as UserRole)}
                      >
                        <SelectTrigger className="h-7 text-xs border-none bg-transparent px-1 w-auto gap-1 focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INVITE_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value} className="text-xs">
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Convidar membro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input
                placeholder="João Silva"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="joao@empresa.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Acesso</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {inviteForm.role === 'founder' && 'Acesso total ao sistema.'}
                {inviteForm.role === 'developer' && 'Acesso a Dashboard, Demandas e Documentação.'}
                {inviteForm.role === 'employee' && 'Acesso a Dashboard e Demandas.'}
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              A pessoa receberá um e-mail com um link para criar a senha e acessar o sistema.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteForm.full_name || !inviteForm.email}
            >
              {inviting ? 'Enviando...' : 'Enviar convite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {memberToRemove?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso ao sistema será revogado imediatamente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Removendo...' : 'Remover acesso'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
