'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, BarChart3, Users, Sparkles, Kanban, Shield, KeyRound, ChevronDown, TrendingUp, Zap, Globe, LayoutDashboard, DollarSign, ListTodo, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT  = '#6366f1'
const ACCENT2 = '#a855f7'
const BORDER  = 'rgba(255,255,255,0.07)'
const TEXT2   = 'rgba(255,255,255,0.5)'
const TEXT3   = 'rgba(255,255,255,0.25)'

// ── Animations ────────────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const fadeUp  = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }
const fadeIn  = { hidden: { opacity: 0 },        visible: { opacity: 1,   transition: { duration: 0.5 } } }

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: BarChart3, title: 'Financeiro em tempo real',      desc: 'MRR, DRE, Runway, Burn Rate e CAC calculados automaticamente. Alertas inteligentes quando algo sai da rota.',                              color: '#60a5fa', glow: 'rgba(96,165,250,0.12)'  },
  { icon: Users,     title: 'Clientes com margem real',      desc: 'Receita, custo, lucro e margem por cliente em tempo real. Saiba exatamente quem gera — e quem consome — valor.',                          color: '#a78bfa', glow: 'rgba(167,139,250,0.12)' },
  { icon: Sparkles,  title: 'IA que trabalha por você',      desc: 'Importa qualquer documento — PDF, Word, imagem — e a IA estrutura todas as tarefas do projeto em segundos.',                               color: '#34d399', glow: 'rgba(52,211,153,0.12)'  },
  { icon: Kanban,    title: 'Kanban com impacto financeiro', desc: 'Cada tarefa tem valor. Veja o risco financeiro das demandas antes que virem problema real.',                                                color: '#fb923c', glow: 'rgba(251,146,60,0.12)'  },
  { icon: Shield,    title: 'Acesso por perfil',             desc: 'Founder vê tudo. Dev vê o que precisa. Colaborador só o dele. Controle total, sem complexidade.',                                          color: '#f472b6', glow: 'rgba(244,114,182,0.12)' },
  { icon: KeyRound,  title: 'API Keys por cliente',          desc: 'Cada cliente registra suas próprias chaves de IA. Criptografia AES-256-GCM. Segurança enterprise.',                                        color: '#22d3ee', glow: 'rgba(34,211,238,0.12)'  },
]

const STEPS = [
  { num: '01', title: 'Configure sua equipe',              desc: 'Convide colaboradores e defina o nível de acesso de cada um. Founder, dev ou funcionário — cada perfil vê o que precisa e nada mais.',   icon: Users      },
  { num: '02', title: 'Cadastre clientes e projetos',      desc: 'Adicione clientes com metas financeiras, projetos com atividades e vincule tudo ao financeiro em tempo real.',                             icon: TrendingUp },
  { num: '03', title: 'Deixe a IA e os dados trabalharem', desc: 'Importe documentos, gere tarefas automaticamente com IA e acompanhe tudo em um só lugar. O L Board faz o pesado.',                        icon: Sparkles   },
]

const TESTIMONIALS = [
  { name: 'Mariana Costa', role: 'CEO · Agência Pixel',     text: 'O L Board substituiu 4 ferramentas que usávamos. Agora temos tudo em um lugar e a equipe parou de reclamar de sistemas.', avatar: 'MC', color: '#6366f1' },
  { name: 'Rafael Mendes', role: 'Founder · TechFlow',      text: 'A visão de DRE em tempo real mudou como tomamos decisões. Antes dependíamos de planilhas que atrasavam 15 dias.',           avatar: 'RM', color: '#a855f7' },
  { name: 'Juliana Alves', role: 'Gestora · Studio Criativo', text: 'A IA que gera tarefas a partir de briefings economiza horas por projeto. Implementamos em uma tarde.',                    avatar: 'JA', color: '#22d3ee' },
]

const FAQ_ITEMS = [
  { q: 'O L Board funciona para qualquer tipo de negócio?', a: 'Sim. Foi projetado para ser flexível. Funciona para agências, startups, consultorias, empresas de serviços e qualquer negócio que precise gerenciar clientes, financeiro e equipes.' },
  { q: 'Minha equipe precisa de treinamento?',              a: 'Não. A interface é intuitiva e cada membro vê apenas o que é relevante para seu perfil. A maioria está operando no mesmo dia.' },
  { q: 'Os dados ficam seguros?',                           a: 'Completamente. Utilizamos Supabase com Row Level Security, criptografia AES-256-GCM para dados sensíveis e HTTPS em todo o tráfego.' },
  { q: 'Tem versão mobile?',                                a: 'Sim. O L Board é totalmente responsivo e pode ser instalado como PWA na tela inicial do iPhone ou Android.' },
  { q: 'Como funciona o controle de acesso?',               a: 'Por perfis. Founder tem acesso total. Developer acessa dashboard, demandas e docs. Colaborador acessa dashboard e demandas. Cada convite define o perfil.' },
]

const LOGOS = ['Agência Pixel', 'TechFlow', 'Studio Criativo', 'Consulta Express', 'GrupoTech', 'StartupBR', 'Criativa Co', 'Nexus Digital']

const STATS = [
  { value: '6+',     label: 'Módulos nativos' },
  { value: 'GPT-4o', label: 'IA integrada'    },
  { value: 'AES-256', label: 'Criptografia'   },
  { value: '100%',   label: 'Mobile ready'    },
]

// Stats border classes per index: 2×2 on mobile → 4×1 on sm+
const STATS_BORDER = [
  'border-r border-b sm:border-b-0',
  'border-b sm:border-r sm:border-b-0',
  'border-r sm:border-r',
  '',
]

// ── Interactive Mockup ────────────────────────────────────────────────────────
const MOCK_SCREENS = [
  { label: 'Dashboard',  icon: LayoutDashboard, route: 'lboard.com.br/dashboard'  },
  { label: 'Clientes',   icon: Users,           route: 'lboard.com.br/clients'    },
  { label: 'Financeiro', icon: DollarSign,       route: 'lboard.com.br/financial'  },
  { label: 'Demandas',   icon: ListTodo,         route: 'lboard.com.br/demands'    },
  { label: 'Projetos',   icon: FolderKanban,     route: 'lboard.com.br/projects'   },
]

const slideVars = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 18 : -18 }),
  center: { opacity: 1, x: 0 },
  exit:   (d: number) => ({ opacity: 0, x: d > 0 ? -18 : 18 }),
}
const SLIDE_DUR = { duration: 0.34, ease: EASE }

function ScreenDashboard() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>Dashboard</span>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginTop: 1 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 8 }}>
        {[['MRR','R$ 48k','+12%','#4ade80'],['Clientes','24','+3','#4ade80'],['Lucro','R$ 28k','+8%','#4ade80'],['Margem','68%','+2%','#4ade80']].map(([l,v,d,c]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 7px' }}>
            <div style={{ fontSize: 5.5, color: TEXT3, marginBottom: 3, fontWeight: 600, letterSpacing: '0.04em' }}>{l}</div>
            <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 2 }}>{v}</div>
            <div style={{ fontSize: 5.5, color: c as string, fontWeight: 600 }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '7px 9px', marginBottom: 7 }}>
        <div style={{ fontSize: 6, color: TEXT3, marginBottom: 6, fontWeight: 600 }}>Receita vs Custos — 8 meses</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 46 }}>
          {[[55,35],[70,40],[60,38],[80,45],[75,42],[90,50],[85,48],[100,55]].map(([r,c],i) => (
            <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <div style={{ flex: 1, height: `${r}%`, background: `linear-gradient(to top, ${ACCENT}, rgba(99,102,241,0.4))`, borderRadius: '2px 2px 0 0' }} />
              <div style={{ flex: 1, height: `${c}%`, background: 'rgba(168,85,247,0.45)', borderRadius: '2px 2px 0 0' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><div style={{ width: 6, height: 6, background: ACCENT, borderRadius: 1 }} /><span style={{ fontSize: 5.5, color: TEXT3 }}>Receita</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><div style={{ width: 6, height: 6, background: 'rgba(168,85,247,0.6)', borderRadius: 1 }} /><span style={{ fontSize: 5.5, color: TEXT3 }}>Custos</span></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {[['CAC','R$ 820'],['LTV','R$ 9.6k'],['Runway','14 meses'],['Burn','R$ 20k/m']].map(([l,v]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '5px 8px' }}>
            <div style={{ fontSize: 5.5, color: TEXT3, marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 9, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function ScreenClientes() {
  const rows = [
    { name: 'Agência Pixel',     rev: 'R$ 12k',  margin: 74, status: 'Ativo',    sc: '#4ade80' },
    { name: 'TechFlow',          rev: 'R$ 8.5k', margin: 61, status: 'Ativo',    sc: '#4ade80' },
    { name: 'Studio Criativo',   rev: 'R$ 6.2k', margin: 58, status: 'Em risco', sc: '#fb923c' },
    { name: 'Consulta Express',  rev: 'R$ 4.8k', margin: 45, status: 'Ativo',    sc: '#4ade80' },
  ]
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>Clientes</span>
        <div style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, borderRadius: 4, padding: '2px 7px', fontSize: 6, fontWeight: 700, color: '#fff' }}>+ Novo</div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '4px 8px', marginBottom: 9, fontSize: 7, color: TEXT3, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 7, color: TEXT3 }}>🔍</span> Buscar cliente...
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 52px 46px', gap: 4, padding: '0 4px 5px', borderBottom: `1px solid ${BORDER}`, marginBottom: 3 }}>
        {['Cliente','Receita','Margem','Status'].map(h => (
          <span key={h} style={{ fontSize: 5.5, color: TEXT3, fontWeight: 700, letterSpacing: '0.05em' }}>{h}</span>
        ))}
      </div>
      {rows.map((r) => (
        <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 52px 46px', gap: 4, padding: '5px 4px', borderBottom: `1px solid rgba(255,255,255,0.04)`, alignItems: 'center' }}>
          <span style={{ fontSize: 7.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{r.rev}</span>
          <div>
            <div style={{ fontSize: 5.5, color: TEXT3, marginBottom: 2 }}>{r.margin}%</div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${r.margin}%`, background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`, borderRadius: 99 }} />
            </div>
          </div>
          <span style={{ fontSize: 5.5, color: r.sc, background: `${r.sc}22`, padding: '2px 5px', borderRadius: 3, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.status}</span>
        </div>
      ))}
    </>
  )
}

function ScreenFinanceiro() {
  const txs = [
    { label: 'TechFlow — Mensalidade',     value: '+R$ 8.5k', c: '#4ade80' },
    { label: 'AWS — Infraestrutura',        value: '-R$ 1.2k', c: '#f87171' },
    { label: 'Agência Pixel — Sprint',      value: '+R$ 4.2k', c: '#4ade80' },
    { label: 'Salários — Equipe',           value: '-R$ 12k',  c: '#f87171' },
    { label: 'Studio Criativo — Projeto',   value: '+R$ 6.2k', c: '#4ade80' },
  ]
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 9 }}>Financeiro</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginBottom: 10 }}>
        {[['Receita','R$ 48.2k','#4ade80'],['Despesas','R$ 20.1k','#f87171'],['Lucro','R$ 28.1k','#818cf8']].map(([l,v,c]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '6px 8px' }}>
            <div style={{ fontSize: 5.5, color: TEXT3, marginBottom: 3, fontWeight: 600 }}>{l}</div>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: c as string }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 6, color: TEXT3, marginBottom: 6, fontWeight: 700, letterSpacing: '0.07em' }}>ÚLTIMAS TRANSAÇÕES</div>
      {txs.map((t) => (
        <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4.5px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '64%' }}>{t.label}</span>
          <span style={{ fontSize: 7.5, fontWeight: 700, color: t.c, flexShrink: 0 }}>{t.value}</span>
        </div>
      ))}
    </>
  )
}

function ScreenDemandas() {
  const cols = [
    { title: 'Backlog',      color: TEXT3,      cards: [{ label: 'Integração Stripe', p: 'Alta', pc: '#f87171' }, { label: 'Redesign onboarding', p: 'Média', pc: '#fb923c' }] },
    { title: 'Em Progresso', color: '#818cf8',  cards: [{ label: 'Dashboard v2', p: 'Alta', pc: '#f87171' }, { label: 'API de relatórios', p: 'Média', pc: '#fb923c' }] },
    { title: 'Revisão',      color: '#4ade80',  cards: [{ label: 'Módulo financeiro', p: 'Alta', pc: '#f87171' }, { label: 'Autenticação SSO', p: 'Baixa', pc: '#a3e635' }] },
  ]
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 9 }}>Demandas</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
        {cols.map((col) => (
          <div key={col.title}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              <span style={{ fontSize: 7, fontWeight: 700, color: col.color }}>{col.title}</span>
            </div>
            {col.cards.map((card) => (
              <div key={card.label} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '7px 8px', marginBottom: 4 }}>
                <div style={{ fontSize: 7, fontWeight: 600, marginBottom: 5, lineHeight: 1.35 }}>{card.label}</div>
                <span style={{ fontSize: 5.5, color: card.pc, background: `${card.pc}22`, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>{card.p}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

function ScreenProjetos() {
  const projects = [
    { name: 'App Mobile v2',       client: 'TechFlow',        pct: 72, status: 'Em andamento', sc: '#818cf8' },
    { name: 'Site Institucional',  client: 'Agência Pixel',   pct: 91, status: 'Revisão',      sc: '#fb923c' },
    { name: 'CRM Integração',      client: 'Studio Criativo', pct: 38, status: 'Em andamento', sc: '#818cf8' },
    { name: 'Dashboard Analytics', client: 'Consulta Exp.',   pct: 15, status: 'Iniciando',    sc: '#4ade80' },
  ]
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 9 }}>Projetos</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginBottom: 10 }}>
        {[['Ativos','4','#818cf8'],['Entregues','12','#4ade80'],['Em atraso','1','#f87171']].map(([l,v,c]) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '5px 7px' }}>
            <div style={{ fontSize: 5.5, color: TEXT3, marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: c as string }}>{v}</div>
          </div>
        ))}
      </div>
      {projects.map((p) => (
        <div key={p.name} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <div>
              <span style={{ fontSize: 7.5, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: 6, color: TEXT3, marginLeft: 5 }}>{p.client}</span>
            </div>
            <span style={{ fontSize: 5.5, color: p.sc, background: `${p.sc}22`, padding: '1px 5px', borderRadius: 3, fontWeight: 600, flexShrink: 0 }}>{p.status}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${p.pct}%` }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
                style={{ height: '100%', background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`, borderRadius: 99 }}
              />
            </div>
            <span style={{ fontSize: 6, color: TEXT3, minWidth: 22, textAlign: 'right', fontWeight: 600 }}>{p.pct}%</span>
          </div>
        </div>
      ))}
    </>
  )
}

const SCREEN_COMPONENTS = [ScreenDashboard, ScreenClientes, ScreenFinanceiro, ScreenDemandas, ScreenProjetos]
const MOCKUP_H = 344

function InteractiveMockup() {
  const [cur, setCur] = useState(0)
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return
      setScale(Math.min(1, containerRef.current.offsetWidth / 480))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const go = (i: number) => {
    if (i === cur) return
    setDir(i > cur ? 1 : -1)
    setCur(i)
  }

  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => {
      setDir(1)
      setCur((c) => (c + 1) % MOCK_SCREENS.length)
    }, 4000)
    return () => clearTimeout(t)
  }, [cur, paused])

  const Screen = SCREEN_COMPONENTS[cur]

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ width: `${480 * scale}px`, height: `${MOCKUP_H * scale}px`, overflow: 'hidden', borderRadius: 14 }}>
        <div
          style={{ width: 480, transform: `scale(${scale})`, transformOrigin: 'top left', userSelect: 'none' }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {/* Progress bar */}
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
            <AnimatePresence>
              {!paused && (
                <motion.div
                  key={cur}
                  initial={{ width: '0%', opacity: 1 }}
                  animate={{ width: '100%', opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 4, ease: 'linear' }}
                  style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: `linear-gradient(90deg,${ACCENT},${ACCENT2})` }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Browser chrome */}
          <div style={{ background: '#111', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {['#ef4444','#f59e0b','#22c55e'].map((c) => (
                <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
              ))}
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 220, margin: '0 auto', overflow: 'hidden' }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={cur}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  style={{ fontSize: 7, color: TEXT3 }}
                >
                  {MOCK_SCREENS[cur].route}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', height: 282, background: '#0a0a0a' }}>
            {/* Sidebar */}
            <div style={{ width: 112, borderRight: `1px solid ${BORDER}`, padding: '10px 6px', flexShrink: 0 }}>
              <div style={{ padding: '3px 8px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 15, height: 15, background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>L</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700 }}>Board</span>
              </div>
              {MOCK_SCREENS.map((s, i) => {
                const Icon = s.icon
                const active = i === cur
                return (
                  <motion.button
                    key={s.label}
                    onClick={() => go(i)}
                    animate={{
                      background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                      color: active ? '#a5b4fc' : 'rgba(255,255,255,0.38)',
                    }}
                    whileHover={{ background: active ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.06)' }}
                    transition={{ duration: 0.18 }}
                    style={{ width: '100%', padding: '4.5px 8px', borderRadius: 5, marginBottom: 1, fontSize: 8, display: 'flex', alignItems: 'center', gap: 5.5, border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                  >
                    <Icon size={9} strokeWidth={2.2} />
                    <span style={{ fontWeight: active ? 600 : 400 }}>{s.label}</span>
                    {active && <motion.div layoutId="sidebar-dot" style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />}
                  </motion.button>
                )
              })}
            </div>

            {/* Screen content */}
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <AnimatePresence custom={dir} mode="wait">
                <motion.div
                  key={cur}
                  custom={dir}
                  variants={slideVars}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={SLIDE_DUR}
                  style={{ position: 'absolute', inset: 0, padding: '10px 11px', overflowY: 'auto' }}
                >
                  <Screen />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Dot indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, padding: '7px 0 9px', borderTop: `1px solid ${BORDER}`, background: '#0d0d0d' }}>
            {MOCK_SCREENS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => go(i)}
                animate={{
                  width: i === cur ? 20 : 6,
                  background: i === cur ? ACCENT : 'rgba(255,255,255,0.18)',
                  opacity: i === cur ? 1 : 0.6,
                }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{ height: 6, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq]   = useState<number | null>(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="bg-black text-white overflow-x-hidden" style={{ fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 inset-x-0 z-[100]"
        style={{
          borderBottom: `1px solid ${scrolled ? BORDER : 'transparent'}`,
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          background: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent',
          transition: 'background 0.4s cubic-bezier(0.22,1,0.36,1), backdrop-filter 0.4s, border-color 0.4s',
        }}
      >
        <div className="max-w-[1120px] mx-auto px-5 sm:px-7 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` }}>L</div>
            <span className="font-bold text-[15px] tracking-tight">Board</span>
          </div>

          {/* Nav links — desktop only */}
          <div className="hidden md:flex items-center gap-8">
            {['Funcionalidades', 'Como funciona', 'Depoimentos'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-[13px] no-underline transition-colors duration-200" style={{ color: TEXT2 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = TEXT2)}
              >{item}</a>
            ))}
          </div>

          {/* CTA */}
          <Link href="/auth/login" className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-lg text-[13px] font-bold no-underline shrink-0 hover:bg-white/90" style={{ transition: 'background 0.2s' }}>
            Entrar <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="min-h-screen flex items-center pt-24 pb-16 px-5 sm:px-7 relative overflow-hidden">
        {/* Grid bg */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(${BORDER} 1px,transparent 1px),linear-gradient(90deg,${BORDER} 1px,transparent 1px)`, backgroundSize: '64px 64px' }} />
        {/* Glows */}
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[min(900px,150vw)] h-[500px] pointer-events-none" style={{ background: `radial-gradient(ellipse 70% 60% at 50% 0%,rgba(99,102,241,0.25),transparent)` }} />
        <div className="absolute top-[30%] -left-[5%] w-72 h-72 pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(168,85,247,0.12),transparent 70%)' }} />
        <div className="absolute top-[20%] -right-[5%] w-72 h-72 pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(34,211,238,0.08),transparent 70%)' }} />

        <div className="max-w-[1120px] mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16 relative z-[1]">

          {/* Left — text */}
          <motion.div className="flex-1 min-w-0 text-center lg:text-left" initial="hidden" animate="visible" variants={stagger}>

            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] mb-6 sm:mb-7" style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#a5b4fc' }}>
              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
              Hub Operacional · Novo jeito de gerir
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-black leading-[1.05] tracking-[-2px] sm:tracking-[-2.5px] mb-4 sm:mb-5" style={{ fontSize: 'clamp(34px, 8vw, 76px)' }}>
              <span style={{ background: 'linear-gradient(180deg,#fff 30%,rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Tudo que o seu negócio precisa.
              </span>
              <br />
              <span style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Em um só lugar.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="leading-[1.7] mb-8 max-w-[480px] mx-auto lg:mx-0" style={{ fontSize: 'clamp(14px,1.8vw,18px)', color: TEXT2 }}>
              L Board reúne financeiro, clientes, projetos e IA em uma plataforma que funciona de verdade — para qualquer tipo de negócio.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3.5 rounded-xl text-[14px] font-bold no-underline" style={{ boxShadow: '0 0 40px rgba(255,255,255,0.08)', transition: 'opacity 0.2s' }}>
                Criar conta <ArrowRight size={14} />
              </Link>
              <a href="#como-funciona" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[14px] font-medium no-underline" style={{ border: `1px solid ${BORDER}`, color: TEXT2, background: 'rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                Ver como funciona
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center lg:justify-start gap-5 mt-7">
              {['✓ Sem cartão de crédito', '✓ Setup em minutos', '✓ 100% Mobile'].map((t) => (
                <span key={t} className="text-[12px]" style={{ color: TEXT3 }}>{t}</span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — interactive mockup */}
          <motion.div
            className="w-full sm:max-w-[480px] sm:mx-auto lg:mx-0 lg:flex-none lg:w-[480px]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative">
              <div className="absolute inset-[-30px] pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(99,102,241,0.18),transparent 70%)' }} />
              <div className="relative"><InteractiveMockup /></div>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-36 pointer-events-none" style={{ background: 'linear-gradient(to bottom,transparent,#000)' }} />
      </section>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1120px] mx-auto grid grid-cols-2 sm:grid-cols-4" style={{ borderColor: BORDER }}>
          {STATS.map((s, i) => (
            <div key={s.label} className={cn('py-6 px-4 sm:py-7 text-center', STATS_BORDER[i])} style={{ borderColor: BORDER }}>
              <p className="text-[22px] font-black mb-1 tracking-tight" style={{ background: 'linear-gradient(135deg,#fff,rgba(255,255,255,0.7))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.value}</p>
              <p className="text-[11px]" style={{ color: TEXT3 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Logos strip ────────────────────────────────────────────── */}
      <section className="py-10 sm:py-12 overflow-hidden" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <p className="text-center text-[11px] tracking-[0.1em] uppercase mb-7" style={{ color: TEXT3 }}>Confiado por equipes de todos os tamanhos</p>
        <div className="relative overflow-hidden">
          <div className="absolute left-0 inset-y-0 w-16 sm:w-24 z-[1] pointer-events-none" style={{ background: 'linear-gradient(to right,#000,transparent)' }} />
          <div className="absolute right-0 inset-y-0 w-16 sm:w-24 z-[1] pointer-events-none" style={{ background: 'linear-gradient(to left,#000,transparent)' }} />
          <motion.div animate={{ x: ['0%', '-50%'] }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }} className="flex gap-10 sm:gap-12 w-max">
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <span key={i} className="text-[14px] font-bold whitespace-nowrap px-2" style={{ color: TEXT3 }}>{logo}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="funcionalidades" className="py-16 sm:py-24 px-5 sm:px-7 max-w-[1120px] mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-12 sm:mb-16">
          <motion.p variants={fadeUp} className="text-[12px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: ACCENT }}>Funcionalidades</motion.p>
          <motion.h2 variants={fadeUp} className="font-black tracking-tight mb-4" style={{ fontSize: 'clamp(26px,4vw,50px)', letterSpacing: '-1.5px', background: 'linear-gradient(180deg,#fff 0%,rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Tudo que você precisa.<br />Nada que não precisa.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[15px] sm:text-[16px] leading-[1.65] max-w-[440px] mx-auto" style={{ color: TEXT2 }}>
            Cada módulo foi pensado para times que precisam de clareza e resultado, não de dashboards bonitos.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden"
          style={{ border: `1px solid ${BORDER}`, gap: 1, background: BORDER }}
        >
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="p-7 sm:p-8 relative overflow-hidden"
                style={{ background: '#080808', transition: 'background 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#080808' }}
              >
                <div className="absolute -top-12 -left-8 w-44 h-44 rounded-full pointer-events-none" style={{ background: f.glow, filter: 'blur(48px)' }} />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 relative" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: f.color }}>
                  <Icon size={18} />
                </div>
                <h3 className="text-[15px] font-bold mb-2.5 tracking-tight relative">{f.title}</h3>
                <p className="text-[13px] leading-[1.65] relative" style={{ color: TEXT2 }}>{f.desc}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section id="como-funciona" className="py-16 sm:py-24 px-5 sm:px-7" style={{ background: 'rgba(255,255,255,0.01)', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[1120px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-12 sm:mb-16">
            <motion.p variants={fadeUp} className="text-[12px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: ACCENT2 }}>Como funciona</motion.p>
            <motion.h2 variants={fadeUp} className="font-black tracking-tight" style={{ fontSize: 'clamp(26px,4vw,50px)', letterSpacing: '-1.5px', background: 'linear-gradient(180deg,#fff 0%,rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Simples de começar.<br />Poderoso pra crescer.
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <motion.div key={step.num} variants={fadeUp}>
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                      <Icon size={20} />
                    </div>
                    <span className="text-[11px] font-bold tracking-[0.1em]" style={{ color: TEXT3 }}>{step.num}</span>
                  </div>
                  <h3 className="text-[17px] font-bold mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-[14px] leading-[1.7]" style={{ color: TEXT2 }}>{step.desc}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <section id="depoimentos" className="py-16 sm:py-24 px-5 sm:px-7 max-w-[1120px] mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} className="text-center mb-12 sm:mb-16">
          <motion.p variants={fadeUp} className="text-[12px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: '#34d399' }}>Depoimentos</motion.p>
          <motion.h2 variants={fadeUp} className="font-black tracking-tight" style={{ fontSize: 'clamp(26px,4vw,50px)', letterSpacing: '-1.5px', background: 'linear-gradient(180deg,#fff 0%,rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Quem usa, não abre mão.
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="p-6 sm:p-7 rounded-2xl"
              style={{ border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', transition: 'transform 0.3s' }}
            >
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, i) => <span key={i} className="text-amber-400 text-[13px]">★</span>)}
              </div>
              <p className="text-[14px] leading-[1.7] mb-6 italic" style={{ color: 'rgba(255,255,255,0.75)' }}>"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0" style={{ background: `linear-gradient(135deg,${t.color},${t.color}88)` }}>{t.avatar}</div>
                <div>
                  <p className="text-[13px] font-semibold">{t.name}</p>
                  <p className="text-[11px]" style={{ color: TEXT3 }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-5 sm:px-7" style={{ borderTop: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-[680px] mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-10 sm:mb-14">
            <motion.p variants={fadeUp} className="text-[12px] font-semibold tracking-[0.12em] uppercase mb-3" style={{ color: '#fb923c' }}>FAQ</motion.p>
            <motion.h2 variants={fadeUp} className="font-black tracking-tight" style={{ fontSize: 'clamp(24px,4vw,44px)', letterSpacing: '-1.5px', background: 'linear-gradient(180deg,#fff 0%,rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Dúvidas frequentes
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="flex flex-col gap-2">
            {FAQ_ITEMS.map((item, i) => (
              <motion.div key={i} variants={fadeUp} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 sm:px-6 sm:py-[18px] flex items-center justify-between gap-4 text-left cursor-pointer bg-transparent border-none text-white"
                >
                  <span className="text-[14px] font-semibold leading-snug">{item.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
                    <ChevronDown size={16} color={TEXT2} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} style={{ overflow: 'hidden' }}>
                      <p className="px-5 pb-4 sm:px-6 sm:pb-[18px] text-[13px] leading-[1.7]" style={{ color: TEXT2 }}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Final ──────────────────────────────────────────────── */}
      <section className="px-5 sm:px-7 pb-16 sm:pb-24 max-w-[1120px] mx-auto">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="rounded-2xl sm:rounded-3xl relative overflow-hidden py-16 sm:py-[90px] px-6 sm:px-10 text-center"
          style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.04)' }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(99,102,241,0.18),transparent 70%)' }} />
          <div className="relative z-[1]">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] mb-6" style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#a5b4fc' }}>
              <Zap size={11} /> Pronto para começar?
            </div>
            <h2 className="font-black tracking-tight mb-4" style={{ fontSize: 'clamp(24px,4vw,52px)', letterSpacing: '-1.5px', background: 'linear-gradient(180deg,#fff 0%,rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Controle total do seu negócio.<br />Começa hoje.
            </h2>
            <p className="text-[15px] sm:text-[16px] mb-8 sm:mb-10 max-w-[420px] mx-auto" style={{ color: TEXT2 }}>
              Junte-se a equipes que pararam de usar 4 ferramentas diferentes e passaram a enxergar o negócio de verdade.
            </p>
            <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 bg-white text-black px-7 sm:px-9 py-3.5 sm:py-4 rounded-xl text-[14px] sm:text-[15px] font-bold no-underline w-full sm:w-auto max-w-xs sm:max-w-none" style={{ boxShadow: '0 0 60px rgba(255,255,255,0.12)', transition: 'opacity 0.2s' }}>
              Criar conta grátis <ArrowRight size={16} />
            </Link>
            <div className="flex flex-wrap justify-center gap-5 sm:gap-7 mt-7">
              {['✓ Sem custo de setup', '✓ Dados 100% seguros', '✓ Cancele quando quiser'].map((t) => (
                <span key={t} className="text-[12px]" style={{ color: TEXT3 }}>{t}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="px-5 sm:px-7 py-10 sm:py-12" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[1120px] mx-auto">
          <div className="flex flex-col sm:flex-row justify-between gap-10 sm:gap-8 mb-10">
            {/* Brand */}
            <div className="shrink-0">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[13px]" style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT2})` }}>L</div>
                <span className="font-bold text-[14px]">Board</span>
              </div>
              <p className="text-[12px] leading-[1.6] max-w-[200px]" style={{ color: TEXT3 }}>Hub operacional para qualquer tipo de negócio.</p>
            </div>

            {/* Links */}
            <div className="grid grid-cols-3 gap-6 sm:flex sm:gap-12">
              {[
                { title: 'Produto',  links: ['Funcionalidades', 'Segurança', 'Mobile'] },
                { title: 'Empresa',  links: ['Sobre', 'Documentação', 'Contato'] },
                { title: 'Acesso',   links: ['Entrar', 'Criar conta'] },
              ].map((col) => (
                <div key={col.title}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-3" style={{ color: TEXT3 }}>{col.title}</p>
                  {col.links.map((l) => (
                    <p key={l} className="text-[13px] mb-2 cursor-pointer" style={{ color: TEXT2 }}>{l}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <p className="text-[12px]" style={{ color: TEXT3 }}>© {new Date().getFullYear()} L Board · lboard.com.br</p>
            <div className="flex items-center gap-1.5">
              <Globe size={11} color={TEXT3} />
              <span className="text-[12px]" style={{ color: TEXT3 }}>Feito no Brasil</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
