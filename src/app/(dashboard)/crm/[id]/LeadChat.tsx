'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, Check, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import {
  getLeadChatHistory, sendLeadChatMessage, executeLeadAction, clearLeadChat,
} from '@/services/crmAssistant'
import type { CrmToolCall } from '@/services/crmAssistant'

interface ToolCall extends CrmToolCall {
  status: 'pending' | 'confirmed' | 'rejected'
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

const AUTO_EXECUTE_TOOLS = new Set([
  'mudar_estagio_lead',
  'atualizar_lead',
  'registrar_interacao',
  'criar_tarefa_followup',
])

function useActionLabel() {
  const t = useTranslations('crmDetail.chat.toolLabel')
  return (type: string, params: Record<string, unknown>): string => {
    switch (type) {
      case 'mudar_estagio_lead':
        return t('mudar_estagio_lead', { stage: String(params.new_stage) })
      case 'fechar_negocio':
        return params.loss_reason
          ? t('fechar_negocio_reason', { resultado: String(params.resultado), reason: String(params.loss_reason) })
          : t('fechar_negocio', { resultado: String(params.resultado) })
      case 'atualizar_lead':
        return t('atualizar_lead', { fields: Object.keys(params).join(', ') })
      case 'registrar_interacao':
        return t('registrar_interacao', { type: String(params.type), content: String(params.content) })
      case 'criar_tarefa_followup':
        return t('criar_tarefa_followup', { title: String(params.title), due: String(params.due_date) })
      default:
        return type
    }
  }
}

export function LeadChat({ leadId, onLeadChanged }: { leadId: string; onLeadChanged: () => void }) {
  const { toast } = useToast()
  const t = useTranslations('crmDetail.chat')
  const getActionLabel = useActionLabel()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true)
      try {
        const data = await getLeadChatHistory(leadId)
        setMessages(data.map((m) => ({ id: m.id, role: m.role, content: m.content })))
      } catch { /* ignore */ }
      finally { setLoadingHistory(false) }
    }
    void loadHistory()
  }, [leadId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const data = await sendLeadChatMessage(leadId, text, 'gpt-4o', history)

      const autoResults: Record<number, 'confirmed' | 'pending'> = {}
      await Promise.all(data.tool_calls.map(async (tc, i) => {
        if (!AUTO_EXECUTE_TOOLS.has(tc.type)) return
        try {
          const result = await executeLeadAction(leadId, tc)
          if (result.success) {
            autoResults[i] = 'confirmed'
            onLeadChanged()
          } else {
            toast({ title: t('actionFailed', { message: result.message }), variant: 'destructive' })
          }
        } catch (e) {
          toast({ title: e instanceof Error ? e.message : t('actionError'), variant: 'destructive' })
        }
      }))

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        toolCalls: data.tool_calls.map((tc, i) => ({ ...tc, status: autoResults[i] ?? 'pending' })),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t('sendError'), variant: 'destructive' })
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, leadId, toast, onLeadChanged, t])

  async function confirmAction(msgId: string, callIdx: number) {
    const msg = messages.find((m) => m.id === msgId)
    const toolCall = msg?.toolCalls?.[callIdx]
    if (!toolCall) return

    setMessages((prev) => prev.map((m) => m.id === msgId ? {
      ...m, toolCalls: m.toolCalls?.map((tc, i) => i === callIdx ? { ...tc, status: 'confirmed' as const } : tc),
    } : m))

    try {
      const result = await executeLeadAction(leadId, toolCall)
      if (!result.success) throw new Error(result.message)
      toast({ title: result.message })
      onLeadChanged()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : t('actionError'), variant: 'destructive' })
      setMessages((prev) => prev.map((m) => m.id === msgId ? {
        ...m, toolCalls: m.toolCalls?.map((tc, i) => i === callIdx ? { ...tc, status: 'pending' as const } : tc),
      } : m))
    }
  }

  function rejectAction(msgId: string, callIdx: number) {
    setMessages((prev) => prev.map((m) => m.id === msgId ? {
      ...m, toolCalls: m.toolCalls?.map((tc, i) => i === callIdx ? { ...tc, status: 'rejected' as const } : tc),
    } : m))
  }

  async function clearChat() {
    setMessages([])
    await clearLeadChat(leadId).catch(() => {})
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 10rem)' }}>
      <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('title')}</span>
        </div>
        {!loadingHistory && messages.length > 0 && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={clearChat}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Bot className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">{t('emptyTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('emptyDesc')}</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[85%] space-y-2 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.content && (
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              )}
              {msg.toolCalls?.map((tc, i) => (
                <Card key={i} className={`w-full text-xs border ${
                  tc.status === 'confirmed' ? 'border-emerald-500/40 bg-emerald-500/5'
                  : tc.status === 'rejected' ? 'border-border opacity-50'
                  : 'border-amber-500/40 bg-amber-500/5'
                }`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{getActionLabel(tc.type, tc.params)}</p>
                      {tc.status === 'confirmed' && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                      {tc.status === 'rejected' && <X className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                    </div>
                    {tc.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-6 text-xs px-2.5" onClick={() => confirmAction(msg.id, i)}>{t('confirm')}</Button>
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2.5" onClick={() => rejectAction(msg.id, i)}>{t('cancel')}</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            {msg.role === 'user' && (
              <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center mt-0.5">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-3 border-t border-border shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder={t('placeholder')}
            className="min-h-[52px] max-h-[120px] text-sm resize-none"
            disabled={loading}
          />
          <Button className="h-9 w-9 p-0 shrink-0" onClick={() => void send()} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
