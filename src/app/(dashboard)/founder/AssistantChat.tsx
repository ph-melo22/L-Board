'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, Check, X, Cpu, Trash2, Mic, MicOff, CalendarPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

type Model = 'gpt-4o' | 'gpt-4o-mini'

interface ToolCall {
  type: string
  params: Record<string, unknown>
  status: 'pending' | 'confirmed' | 'rejected'
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

const CONTEXT_WINDOW = 128_000

const PRICING: Record<Model, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
}
const USD_BRL = 5.7

function calcCost(model: Model, promptTokens: number, completionTokens: number): number {
  const p = PRICING[model]
  return ((promptTokens * p.input + completionTokens * p.output) / 1_000_000) * USD_BRL
}

function getActionLabel(type: string, params: Record<string, unknown>): { label: string; icon: React.ReactNode } {
  switch (type) {
    case 'criar_demanda':
      return { label: `Criar demanda: "${params.title}" [${params.priority}]`, icon: null }
    case 'atualizar_status_demanda':
      return { label: `Mover "${params.demand_title}" → ${params.new_status}`, icon: null }
    case 'criar_projeto_estrategico':
      return { label: `Criar projeto estratégico: "${params.title}" [${params.status}]`, icon: null }
    case 'criar_evento_calendario':
      return { label: `Criar evento: "${params.title}" em ${params.start}`, icon: <CalendarPlus className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" /> }
    default:
      return { label: type, icon: null }
  }
}

export function AssistantChat() {
  const { toast } = useToast()
  const [model, setModel] = useState<Model>('gpt-4o')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [usage, setUsage] = useState<TokenUsage>({ promptTokens: 0, completionTokens: 0, totalTokens: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, model, history }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply as string,
        toolCalls: (data.tool_calls as { type: string; params: Record<string, unknown> }[] | undefined)?.map(tc => ({
          ...tc,
          status: 'pending' as const,
        })),
      }

      setMessages(prev => [...prev, assistantMsg])
      setUsage(prev => ({
        promptTokens: prev.promptTokens + (data.usage.prompt_tokens as number),
        completionTokens: prev.completionTokens + (data.usage.completion_tokens as number),
        totalTokens: prev.totalTokens + (data.usage.total_tokens as number),
      }))
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao enviar mensagem', variant: 'destructive' })
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, model, toast])

  async function confirmAction(msgId: string, callIdx: number) {
    const msg = messages.find(m => m.id === msgId)
    const toolCall = msg?.toolCalls?.[callIdx]
    if (!toolCall) return

    setMessages(prev => prev.map(m => m.id === msgId ? {
      ...m,
      toolCalls: m.toolCalls?.map((tc, i) => i === callIdx ? { ...tc, status: 'confirmed' as const } : tc),
    } : m))

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, history: [], execute_action: { type: toolCall.type, params: toolCall.params } }),
      })
      const data = await res.json() as { success: boolean; message: string }
      if (data.success) {
        toast({ title: data.message })
      } else {
        throw new Error(data.message)
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao executar ação', variant: 'destructive' })
      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        toolCalls: m.toolCalls?.map((tc, i) => i === callIdx ? { ...tc, status: 'pending' as const } : tc),
      } : m))
    }
  }

  function rejectAction(msgId: string, callIdx: number) {
    setMessages(prev => prev.map(m => m.id === msgId ? {
      ...m,
      toolCalls: m.toolCalls?.map((tc, i) => i === callIdx ? { ...tc, status: 'rejected' as const } : tc),
    } : m))
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const mimeType = audioChunksRef.current[0]?.type ?? 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm'
        const audioFile = new File([audioBlob], `recording.${ext}`, { type: mimeType })

        setTranscribing(true)
        try {
          const form = new FormData()
          form.append('audio', audioFile)
          const res = await fetch('/api/transcribe', { method: 'POST', body: form })
          const data = await res.json() as { text?: string; error?: string }
          if (!res.ok) throw new Error(data.error ?? 'Erro na transcrição')
          const text = data.text?.trim() ?? ''
          if (text) {
            setInput(text)
          }
        } catch (e) {
          toast({ title: e instanceof Error ? e.message : 'Erro ao transcrever áudio', variant: 'destructive' })
        } finally {
          setTranscribing(false)
        }
      }

      mediaRecorder.start()
      setRecording(true)
    } catch {
      toast({ title: 'Permissão de microfone negada', variant: 'destructive' })
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  function toggleRecording() {
    if (recording) stopRecording()
    else void startRecording()
  }

  function clearChat() {
    setMessages([])
    setUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 })
  }

  const totalCost = calcCost(model, usage.promptTokens, usage.completionTokens)
  const contextPct = Math.min((usage.totalTokens / CONTEXT_WINDOW) * 100, 100)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 14rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Layla — Assistente do Gestor</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={model} onValueChange={(v) => setModel(v as Model)}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o mini</SelectItem>
            </SelectContent>
          </Select>
          {messages.length > 0 && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={clearChat}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium">Olá! Sou a Layla, sua assistente executiva.</p>
              <p className="text-xs text-muted-foreground mt-1">Tenho acesso a todos os dados da operação. Como posso ajudar?</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'Qual o status das demandas críticas?',
                'Resuma o financeiro do mês',
                'Quais OKRs estão em risco?',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion) }}
                  className="text-xs border border-border rounded-full px-3 py-1 hover:bg-muted transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[82%] space-y-2 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.content && (
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              )}
              {msg.toolCalls?.map((tc, i) => (
                <Card key={i} className={`w-full text-xs border ${
                  tc.status === 'confirmed'
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : tc.status === 'rejected'
                    ? 'border-border opacity-50'
                    : 'border-amber-500/40 bg-amber-500/5'
                }`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5">
                        {getActionLabel(tc.type, tc.params).icon}
                        <p className="font-medium leading-snug">{getActionLabel(tc.type, tc.params).label}</p>
                      </div>
                      {tc.status === 'confirmed' && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                      {tc.status === 'rejected' && <X className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                    </div>
                    {tc.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-6 text-xs px-2.5" onClick={() => confirmAction(msg.id, i)}>
                          Confirmar
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2.5" onClick={() => rejectAction(msg.id, i)}>
                          Cancelar
                        </Button>
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

      {/* Input + token bar */}
      <div className="space-y-2 pt-3 border-t border-border shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder={recording ? 'Gravando… clique no microfone para parar' : transcribing ? 'Transcrevendo…' : 'Mensagem para a Layla… (Enter envia, Shift+Enter nova linha)'}
            className="min-h-[52px] max-h-[120px] text-sm resize-none"
            disabled={loading || recording || transcribing}
          />
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button
              type="button"
              size="icon"
              className={`h-9 w-9 p-0 transition-colors ${recording ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : ''}`}
              variant={recording ? 'default' : 'outline'}
              onClick={toggleRecording}
              disabled={loading || transcribing}
              title={recording ? 'Parar gravação' : 'Gravar áudio'}
            >
              {transcribing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : recording
                ? <MicOff className="h-4 w-4" />
                : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              className="h-9 w-9 p-0"
              onClick={() => void send()}
              disabled={loading || !input.trim() || recording || transcribing}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {usage.totalTokens > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3 w-3" />
                <span>{usage.totalTokens.toLocaleString('pt-BR')} / 128k tokens</span>
              </div>
              <span>R$ {totalCost.toFixed(4)} esta sessão</span>
            </div>
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  contextPct > 80 ? 'bg-red-500' : contextPct > 50 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${contextPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
