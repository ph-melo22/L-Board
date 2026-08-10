'use client'
import { useEffect, useRef, useState } from 'react'
import { Hash, Plus, Send, AlertTriangle, MessagesSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getChannels, createChannel, getMessages, sendMessage } from '@/services/communication'
import { useTranslations } from 'next-intl'
import type { CommunicationChannel, CommunicationMessage } from '@/types'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

function formatMessageTime(date: string): string {
  const d = new Date(date)
  return `${new Intl.DateTimeFormat('pt-BR').format(d)} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export default function ComunicacaoPage() {
  const { toast } = useToast()
  const t  = useTranslations('comunicacao')
  const tc = useTranslations('common')

  const [channels, setChannels] = useState<CommunicationChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [error, setError] = useState(false)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)

  const [messages, setMessages] = useState<CommunicationMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const [channelDialogOpen, setChannelDialogOpen] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDesc, setNewChannelDesc] = useState('')
  const [creatingChannel, setCreatingChannel] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  async function loadChannels() {
    setLoadingChannels(true)
    try {
      const data = await getChannels()
      setChannels(data)
      setError(false)
      if (!activeChannelId && data.length > 0) setActiveChannelId(data[0].id)
    } catch { setError(true) }
    finally { setLoadingChannels(false) }
  }

  async function loadMessages(channelId: string) {
    setLoadingMessages(true)
    try { setMessages(await getMessages(channelId)) }
    catch { toast({ title: t('toast.loadMessagesError'), variant: 'destructive' }) }
    finally { setLoadingMessages(false) }
  }

  useEffect(() => { loadChannels() }, [])
  useEffect(() => { if (activeChannelId) loadMessages(activeChannelId) }, [activeChannelId])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend() {
    const content = input.trim()
    if (!content || !activeChannelId || sending) return
    setSending(true)
    try {
      const msg = await sendMessage(activeChannelId, content)
      setMessages((prev) => [...prev, msg])
      setInput('')
    } catch { toast({ title: t('toast.sendError'), variant: 'destructive' }) }
    finally { setSending(false) }
  }

  async function handleCreateChannel() {
    if (!newChannelName.trim()) return
    setCreatingChannel(true)
    try {
      const channel = await createChannel({ name: newChannelName.trim(), description: newChannelDesc.trim() || null })
      setChannels((prev) => [...prev, channel])
      setActiveChannelId(channel.id)
      setChannelDialogOpen(false)
      setNewChannelName('')
      setNewChannelDesc('')
    } catch { toast({ title: t('toast.createChannelError'), variant: 'destructive' }) }
    finally { setCreatingChannel(false) }
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">{t('errorLoading')}</p>
        <Button size="sm" variant="outline" onClick={loadChannels}>{tc('retry')}</Button>
      </div>
    )
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Lista de canais */}
      <Card className="w-56 shrink-0 flex flex-col p-3">
        <div className="flex items-center justify-between px-1 pb-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{t('channels')}</p>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setChannelDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {loadingChannels ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
          ) : channels.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground">{t('noChannels')}</p>
          ) : (
            channels.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveChannelId(c.id)}
                className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                  activeChannelId === c.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.name}</span>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Mensagens */}
      <Card className="flex-1 flex flex-col min-w-0">
        {!activeChannel ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center p-6">
            <MessagesSquare className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('noChannelSelected')}</p>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold flex items-center gap-1.5"><Hash className="h-4 w-4 text-muted-foreground" />{activeChannel.name}</p>
              {activeChannel.description && <p className="text-xs text-muted-foreground mt-0.5">{activeChannel.description}</p>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-2/3" />)
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('noMessages')}</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-semibold">{m.profiles?.full_name ?? t('unknownAuthor')}</p>
                      <p className="text-[11px] text-muted-foreground">{formatMessageTime(m.created_at)}</p>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border p-3 flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={t('messagePlaceholder')}
                className="min-h-[40px] max-h-32 resize-none"
              />
              <Button size="icon" onClick={handleSend} disabled={sending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </Card>

      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('newChannel')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('form.channelName')}</Label>
              <Input value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder={t('form.channelNamePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('form.channelDescription')}</Label>
              <Textarea value={newChannelDesc} onChange={(e) => setNewChannelDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChannelDialogOpen(false)}>{tc('cancel')}</Button>
            <Button onClick={handleCreateChannel} disabled={creatingChannel || !newChannelName.trim()}>
              {creatingChannel ? tc('saving') : tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
