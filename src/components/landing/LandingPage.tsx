'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, BarChart3, Users, Sparkles, Kanban, Shield, KeyRound, ChevronDown, TrendingUp, Zap, Globe } from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT = '#6366f1'
const ACCENT2 = '#a855f7'
const BORDER = 'rgba(255,255,255,0.07)'
const TEXT2 = 'rgba(255,255,255,0.5)'
const TEXT3 = 'rgba(255,255,255,0.25)'

// ── Animation variants ────────────────────────────────────────────────────────
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } }

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: BarChart3, title: 'Financeiro em tempo real', desc: 'MRR, DRE, Runway, Burn Rate e CAC calculados automaticamente. Alertas inteligentes quando algo sai da rota.', color: '#60a5fa', glow: 'rgba(96,165,250,0.13)' },
  { icon: Users, title: 'Clientes com margem real', desc: 'Receita, custo, lucro e margem por cliente em tempo real. Saiba exatamente quem gera — e quem consome — valor.', color: '#a78bfa', glow: 'rgba(167,139,250,0.13)' },
  { icon: Sparkles, title: 'IA que trabalha por você', desc: 'Importa qualquer documento — PDF, Word, imagem — e a IA estrutura todas as tarefas do projeto em segundos.', color: '#34d399', glow: 'rgba(52,211,153,0.13)' },
  { icon: Kanban, title: 'Kanban com impacto financeiro', desc: 'Cada tarefa tem valor. Veja o risco financeiro das demandas antes que virem problema real.', color: '#fb923c', glow: 'rgba(251,146,60,0.13)' },
  { icon: Shield, title: 'Acesso por perfil', desc: 'Founder vê tudo. Dev vê o que precisa. Colaborador só o dele. Controle total, sem complexidade.', color: '#f472b6', glow: 'rgba(244,114,182,0.13)' },
  { icon: KeyRound, title: 'API Keys por cliente', desc: 'Cada cliente registra suas próprias chaves de IA. Criptografia AES-256-GCM. Segurança enterprise.', color: '#22d3ee', glow: 'rgba(34,211,238,0.13)' },
]

const STEPS = [
  { num: '01', title: 'Configure sua equipe', desc: 'Convide colaboradores e defina o nível de acesso de cada um. Founder, dev ou funcionário — cada perfil vê o que precisa e nada mais.', icon: Users },
  { num: '02', title: 'Cadastre clientes e projetos', desc: 'Adicione clientes com metas financeiras, projetos com atividades e vincule tudo ao financeiro em tempo real.', icon: TrendingUp },
  { num: '03', title: 'Deixe a IA e os dados trabalharem', desc: 'Importe documentos, gere tarefas automaticamente com IA e acompanhe tudo em um só lugar. O L Board faz o pesado.', icon: Sparkles },
]

const TESTIMONIALS = [
  { name: 'Mariana Costa', role: 'CEO · Agência Pixel', text: 'O L Board substituiu 4 ferramentas que usávamos. Agora temos tudo em um lugar e a equipe parou de reclamar de sistemas.', avatar: 'MC', color: '#6366f1' },
  { name: 'Rafael Mendes', role: 'Founder · TechFlow', text: 'A visão de DRE em tempo real mudou como tomamos decisões. Antes dependíamos de planilhas que atrasavam 15 dias.', avatar: 'RM', color: '#a855f7' },
  { name: 'Juliana Alves', role: 'Gestora · Studio Criativo', text: 'A IA que gera tarefas a partir de briefings economiza horas por projeto. Implementamos em uma tarde.', avatar: 'JA', color: '#22d3ee' },
]

const FAQ_ITEMS = [
  { q: 'O L Board funciona para qualquer tipo de negócio?', a: 'Sim. Foi projetado para ser flexível. Funciona para agências, startups, consultorias, empresas de serviços e qualquer negócio que precise gerenciar clientes, financeiro e equipes.' },
  { q: 'Minha equipe precisa de treinamento?', a: 'Não. A interface é intuitiva e cada membro vê apenas o que é relevante para seu perfil. A maioria está operando no mesmo dia.' },
  { q: 'Os dados ficam seguros?', a: 'Completamente. Utilizamos Supabase com Row Level Security, criptografia AES-256-GCM para dados sensíveis e HTTPS em todo o tráfego.' },
  { q: 'Tem versão mobile?', a: 'Sim. O L Board é totalmente responsivo e pode ser instalado como PWA na tela inicial do iPhone ou Android.' },
  { q: 'Como funciona o controle de acesso?', a: 'Por perfis. Founder tem acesso total. Developer acessa dashboard, demandas e docs. Colaborador acessa dashboard e demandas. Cada convite define o perfil.' },
]

const LOGOS = ['Agência Pixel', 'TechFlow', 'Studio Criativo', 'Consulta Express', 'GrupoTech', 'StartupBR', 'Criativa Co', 'Nexus Digital']

const STATS = [
  { value: '6+', label: 'Módulos nativos' },
  { value: 'GPT-4o', label: 'IA integrada' },
  { value: 'AES-256', label: 'Criptografia' },
  { value: '100%', label: 'Mobile ready' },
]

// ── Dashboard Mockup ──────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div style={{ background: '#0a0a0a', border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden', userSelect: 'none' }}>
      {/* Titlebar */}
      <div style={{ background: '#111', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ef4444', '#f59e0b', '#22c55e'].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 4, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 220, margin: '0 auto' }}>
          <span style={{ fontSize: 8, color: TEXT3 }}>lboard.com.br/dashboard</span>
        </div>
      </div>
      {/* App */}
      <div style={{ display: 'flex', height: 280 }}>
        {/* Sidebar */}
        <div style={{ width: 120, borderRight: `1px solid ${BORDER}`, padding: '10px 6px', flexShrink: 0 }}>
          <div style={{ padding: '3px 8px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 16, height: 16, background: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: '#000' }}>L</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700 }}>Board</span>
          </div>
          {[{ l: 'Dashboard', a: true }, { l: 'Clientes' }, { l: 'Financeiro' }, { l: 'Demandas' }, { l: 'Projetos' }, { l: 'Contador' }].map((item) => (
            <div key={item.l} style={{ padding: '4px 8px', borderRadius: 5, marginBottom: 1, background: item.a ? 'rgba(99,102,241,0.15)' : 'transparent', fontSize: 8, color: item.a ? '#818cf8' : TEXT2 }}>
              {item.l}
            </div>
          ))}
        </div>
        {/* Main */}
        <div style={{ flex: 1, padding: 10, overflow: 'hidden' }}>
          <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 10 }}>Dashboard</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 10 }}>
            {[['MRR', 'R$ 48k', '+12%'], ['Clientes', '24', '+3'], ['Lucro', 'R$ 28k', '+8%'], ['Margem', '68%', '+2%']].map(([l, v, d]) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 5, padding: 7 }}>
                <div style={{ fontSize: 6, color: TEXT3, marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 1 }}>{v}</div>
                <div style={{ fontSize: 6, color: '#4ade80' }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>
            <div style={{ fontSize: 7, color: TEXT3, marginBottom: 6 }}>Receita vs Custos — 8 meses</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 48 }}>
              {[[55,35],[70,40],[60,38],[80,45],[75,42],[90,50],[85,48],[100,55]].map(([r, c], i) => (
                <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <div style={{ flex: 1, height: `${r}%`, background: 'rgba(99,102,241,0.6)', borderRadius: '2px 2px 0 0' }} />
                  <div style={{ flex: 1, height: `${c}%`, background: 'rgba(168,85,247,0.4)', borderRadius: '2px 2px 0 0' }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {[['CAC', 'R$ 820'], ['LTV', 'R$ 9.6k'], ['Runway', '14 meses'], ['Burn', 'R$ 20k/m']].map(([l, v]) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '5px 8px' }}>
                <div style={{ fontSize: 6, color: TEXT3 }}>{l}</div>
                <div style={{ fontSize: 9, fontWeight: 700, marginTop: 1 }}>{v}</div>
              </div>
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
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ background: '#000', color: '#fff', overflowX: 'hidden', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        borderBottom: scrolled ? `1px solid ${BORDER}` : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        background: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent',
        transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>L</div>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>Board</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Funcionalidades', 'Como funciona', 'Depoimentos'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} style={{ fontSize: 13, color: TEXT2, textDecoration: 'none', transition: 'color 0.2s' }}>
                {item}
              </a>
            ))}
          </div>
          <Link href="/auth/login" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#fff', color: '#000',
            padding: '8px 20px', borderRadius: 8,
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>
            Entrar <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 28px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${BORDER} 1px, transparent 1px), linear-gradient(90deg, ${BORDER} 1px, transparent 1px)`, backgroundSize: '64px 64px', zIndex: 0 }} />
        {/* Glows */}
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: `radial-gradient(ellipse 70% 60% at 50% 0%, rgba(99,102,241,0.25), transparent)`, zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '-5%', width: 400, height: 400, background: `radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)`, zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '-5%', width: 400, height: 400, background: `radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%)`, zIndex: 0, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1120, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 60, position: 'relative', zIndex: 1 }}>
          {/* Left */}
          <motion.div style={{ flex: 1, minWidth: 0 }} initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid rgba(99,102,241,0.3)`, borderRadius: 100, padding: '5px 14px', fontSize: 12, color: '#a5b4fc', background: 'rgba(99,102,241,0.08)', marginBottom: 28 }}>
              <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', display: 'inline-block' }} />
              Hub Operacional · Novo jeito de gerir
            </motion.div>

            <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(38px, 6vw, 76px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2.5px', margin: '0 0 20px' }}>
              <span style={{ background: 'linear-gradient(180deg, #fff 30%, rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Tudo que o seu negócio precisa.
              </span>
              <br />
              <span style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Em um só lugar.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: TEXT2, lineHeight: 1.7, margin: '0 0 36px', maxWidth: 480 }}>
              L Board reúne financeiro, clientes, projetos e IA em uma plataforma que funciona de verdade — para qualquer tipo de negócio.
            </motion.p>

            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#000', padding: '13px 26px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 40px rgba(255,255,255,0.08)' }}>
                Criar conta <ArrowRight size={14} />
              </Link>
              <a href="#como-funciona" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${BORDER}`, color: TEXT2, padding: '13px 26px', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none', background: 'rgba(255,255,255,0.03)' }}>
                Ver como funciona
              </a>
            </motion.div>

            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 24, marginTop: 36, flexWrap: 'wrap' }}>
              {[['✓ Sem cartão de crédito'], ['✓ Setup em minutos'], ['✓ 100% Mobile']].map(([t]) => (
                <span key={t} style={{ fontSize: 12, color: TEXT3 }}>{t}</span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — Mockup */}
          <motion.div
            style={{ flex: '0 0 480px', maxWidth: 480 }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'relative' }}
            >
              <div style={{ position: 'absolute', inset: -40, background: `radial-gradient(ellipse, rgba(99,102,241,0.2), transparent 70%)`, zIndex: 0, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <DashboardMockup />
              </div>
            </motion.div>
          </motion.div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(to bottom, transparent, #000)', zIndex: 1 }} />
      </section>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <motion.section
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
        style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ padding: '26px 24px', textAlign: 'center', borderRight: i < 3 ? `1px solid ${BORDER}` : 'none' }}>
              <p style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px', background: `linear-gradient(135deg, #fff, rgba(255,255,255,0.7))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</p>
              <p style={{ fontSize: 11, color: TEXT3, margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Logos strip ────────────────────────────────────────────── */}
      <section style={{ padding: '48px 0', overflow: 'hidden', borderBottom: `1px solid ${BORDER}` }}>
        <p style={{ textAlign: 'center', fontSize: 11, color: TEXT3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 28 }}>
          Confiado por equipes de todos os tamanhos
        </p>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 120, background: 'linear-gradient(to right, #000, transparent)', zIndex: 1 }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 120, background: 'linear-gradient(to left, #000, transparent)', zIndex: 1 }} />
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'flex', gap: 48, width: 'max-content' }}
          >
            {[...LOGOS, ...LOGOS].map((logo, i) => (
              <span key={i} style={{ fontSize: 14, fontWeight: 700, color: TEXT3, letterSpacing: '-0.3px', whiteSpace: 'nowrap', padding: '0 8px' }}>
                {logo}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────────── */}
      <section id="funcionalidades" style={{ padding: '100px 28px', maxWidth: 1120, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} style={{ textAlign: 'center', marginBottom: 64 }}>
          <motion.p variants={fadeUp} style={{ fontSize: 12, color: ACCENT, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Funcionalidades</motion.p>
          <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 50px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 16px', background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Tudo que você precisa.<br />Nada que não precisa.
          </motion.h2>
          <motion.p variants={fadeUp} style={{ color: TEXT2, fontSize: 16, maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>
            Cada módulo foi pensado para times que precisam de clareza e resultado, não de dashboards bonitos.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 1, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden' }}
        >
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ background: 'rgba(255,255,255,0.04)' }}
                style={{ padding: '36px 30px', background: 'rgba(255,255,255,0.015)', borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden', transition: 'background 0.3s' }}
              >
                <div style={{ position: 'absolute', top: -50, left: -30, width: 180, height: 180, background: f.glow, borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />
                <div style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid rgba(255,255,255,0.08)`, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: f.color, position: 'relative' }}>
                  <Icon size={18} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.3px', position: 'relative' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: TEXT2, lineHeight: 1.65, margin: 0, position: 'relative' }}>{f.desc}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* ── How it works ───────────────────────────────────────────── */}
      <section id="como-funciona" style={{ padding: '100px 28px', background: 'rgba(255,255,255,0.01)', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} style={{ textAlign: 'center', marginBottom: 72 }}>
            <motion.p variants={fadeUp} style={{ fontSize: 12, color: ACCENT2, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Como funciona</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 50px)', fontWeight: 900, letterSpacing: '-1.5px', margin: 0, background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Simples de começar.<br />Poderoso pra crescer.
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
            {STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <motion.div key={step.num} variants={fadeUp} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))`, border: `1px solid rgba(99,102,241,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', flexShrink: 0 }}>
                      <Icon size={20} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: TEXT3, letterSpacing: '0.1em' }}>{step.num}</span>
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.4px' }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: TEXT2, lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div style={{ display: 'none' }} className="md:block" />
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <section id="depoimentos" style={{ padding: '100px 28px', maxWidth: 1120, margin: '0 auto' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger} style={{ textAlign: 'center', marginBottom: 64 }}>
          <motion.p variants={fadeUp} style={{ fontSize: 12, color: '#34d399', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Depoimentos</motion.p>
          <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 50px)', fontWeight: 900, letterSpacing: '-1.5px', margin: 0, background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Quem usa, não abre mão.
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              style={{ padding: '28px', border: `1px solid ${BORDER}`, borderRadius: 16, background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)', transition: 'transform 0.3s' }}
            >
              <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {[...Array(5)].map((_, i) => <span key={i} style={{ color: '#fbbf24', fontSize: 13 }}>★</span>)}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: '0 0 24px', fontStyle: 'italic' }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{t.avatar}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 11, color: TEXT3, margin: 0 }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 28px', borderTop: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ textAlign: 'center', marginBottom: 56 }}>
            <motion.p variants={fadeUp} style={{ fontSize: 12, color: '#fb923c', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>FAQ</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px', margin: 0, background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Dúvidas frequentes
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {FAQ_ITEMS.map((item, i) => (
              <motion.div key={i} variants={fadeUp} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden', marginBottom: 8 }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff', textAlign: 'left', gap: 16 }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{item.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ flexShrink: 0 }}>
                    <ChevronDown size={16} color={TEXT2} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p style={{ padding: '0 22px 18px', fontSize: 13, color: TEXT2, lineHeight: 1.7, margin: 0 }}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA Final ──────────────────────────────────────────────── */}
      <section style={{ padding: '0 28px 100px', maxWidth: 1120, margin: '0 auto' }}>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', padding: '90px 40px', textAlign: 'center', border: `1px solid rgba(99,102,241,0.2)`, background: 'rgba(99,102,241,0.04)' }}
        >
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, background: `radial-gradient(ellipse, rgba(99,102,241,0.18), transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid rgba(99,102,241,0.3)`, borderRadius: 100, padding: '5px 14px', fontSize: 12, color: '#a5b4fc', background: 'rgba(99,102,241,0.08)', marginBottom: 24 }}>
              <Zap size={11} /> Pronto para começar?
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 16px', background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Controle total do seu negócio.<br />Começa hoje.
            </h2>
            <p style={{ color: TEXT2, fontSize: 16, marginBottom: 40, maxWidth: 420, margin: '0 auto 40px' }}>
              Junte-se a equipes que pararam de usar 4 ferramentas diferentes e passaram a enxergar o negócio de verdade.
            </p>
            <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: '#000', padding: '15px 36px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 60px rgba(255,255,255,0.12)' }}>
              Criar conta grátis <ArrowRight size={16} />
            </Link>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 28, flexWrap: 'wrap' }}>
              {['✓ Sem custo de setup', '✓ Dados 100% seguros', '✓ Cancele quando quiser'].map((t) => (
                <span key={t} style={{ fontSize: 12, color: TEXT3 }}>{t}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '40px 28px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>L</div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Board</span>
              </div>
              <p style={{ fontSize: 12, color: TEXT3, maxWidth: 220, lineHeight: 1.6, margin: 0 }}>Hub operacional para qualquer tipo de negócio.</p>
            </div>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              {[
                { title: 'Produto', links: ['Funcionalidades', 'Segurança', 'Mobile'] },
                { title: 'Empresa', links: ['Sobre', 'Documentação', 'Contato'] },
                { title: 'Acesso', links: ['Entrar', 'Criar conta'] },
              ].map((col) => (
                <div key={col.title}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>{col.title}</p>
                  {col.links.map((l) => (
                    <p key={l} style={{ fontSize: 13, color: TEXT2, margin: '0 0 8px', cursor: 'pointer' }}>{l}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: TEXT3, margin: 0 }}>© {new Date().getFullYear()} L Board · lboard.com.br</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={11} color={TEXT3} />
              <span style={{ fontSize: 12, color: TEXT3 }}>Feito no Brasil</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
