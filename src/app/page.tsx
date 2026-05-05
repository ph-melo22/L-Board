import Link from 'next/link'
import { ArrowRight, BarChart3, Users, Sparkles, Kanban, Shield, KeyRound } from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Visão Financeira Completa',
    desc: 'MRR, DRE, Runway, Burn Rate e CAC calculados automaticamente. Alertas inteligentes quando algo sai da rota.',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.12)',
  },
  {
    icon: Users,
    title: 'Clientes com Margem Real',
    desc: 'Receita, custo, lucro e margem por cliente em tempo real. Saiba exatamente quem gera valor para o negócio.',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.12)',
  },
  {
    icon: Sparkles,
    title: 'IA que Trabalha por Você',
    desc: 'Importa qualquer documento — PDF, Word, imagem — e a IA estrutura todas as tarefas do projeto em segundos.',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.12)',
  },
  {
    icon: Kanban,
    title: 'Kanban com Impacto Financeiro',
    desc: 'Cada tarefa tem um valor associado. Veja o risco financeiro das demandas pendentes antes que virem problema.',
    color: '#fb923c',
    glow: 'rgba(251,146,60,0.12)',
  },
  {
    icon: Shield,
    title: 'Acesso por Perfil',
    desc: 'Founder vê tudo. Dev vê o que precisa. Colaborador só o que for dele. Controle total sem complexidade.',
    color: '#f472b6',
    glow: 'rgba(244,114,182,0.12)',
  },
  {
    icon: KeyRound,
    title: 'API Keys por Cliente',
    desc: 'Cada cliente registra suas próprias chaves de IA. Criptografia AES-256-GCM. Segurança de nível enterprise.',
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.12)',
  },
]

const STATS = [
  { value: '6+', label: 'Módulos integrados' },
  { value: 'AES-256', label: 'Criptografia' },
  { value: '100%', label: 'Mobile first' },
  { value: 'GPT-4o', label: 'IA integrada' },
]

export default function LandingPage() {
  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'var(--font-inter, system-ui, sans-serif)' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        background: 'rgba(0,0,0,0.7)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, background: '#fff', borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', fontWeight: 800, fontSize: 15,
            }}>L</div>
            <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.3px' }}>Board</span>
          </div>
          <Link href="/auth/login" style={{
            background: '#fff', color: '#000', padding: '7px 18px',
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            Entrar <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 500, zIndex: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(120,80,220,0.28), transparent)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 100, padding: '5px 14px',
            fontSize: 12, fontWeight: 500,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: 36,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(10px)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Hub Operacional · lboard.com.br
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(40px, 7vw, 80px)',
            fontWeight: 800, lineHeight: 1.08,
            letterSpacing: '-2px', margin: '0 0 24px',
            background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.5) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Controle total.<br />Sem complexidade.
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.6, margin: '0 auto 44px',
            maxWidth: 520, fontWeight: 400,
          }}>
            O hub operacional que reúne financeiro, clientes, demandas e projetos — com IA integrada e visão em tempo real do que realmente importa.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fff', color: '#000',
              padding: '13px 28px', borderRadius: 10,
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 0 40px rgba(255,255,255,0.1)',
            }}>
              Começar agora <ArrowRight size={15} />
            </Link>
            <Link href="#features" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
              padding: '13px 28px', borderRadius: 10,
              fontSize: 14, fontWeight: 500, textDecoration: 'none',
              background: 'rgba(255,255,255,0.03)',
            }}>
              Ver funcionalidades
            </Link>
          </div>
        </div>

        {/* Fade bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, zIndex: 1,
          background: 'linear-gradient(to bottom, transparent, #000)',
        }} />
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto', padding: '0 24px',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              padding: '28px 24px', textAlign: 'center',
              borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <p style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-1px' }}>{s.value}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 400 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800,
            letterSpacing: '-1.5px', margin: '0 0 16px',
            background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.5) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Tudo que você precisa.<br />Nada que você não precisa.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, maxWidth: 440, margin: '0 auto' }}>
            Cada módulo foi pensado para times que precisam de clareza, não de dashboards bonitos.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 1,
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} style={{
                padding: '36px 32px',
                background: 'rgba(255,255,255,0.02)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Card glow */}
                <div style={{
                  position: 'absolute', top: -40, left: -40,
                  width: 160, height: 160, borderRadius: '50%',
                  background: f.glow, filter: 'blur(40px)', pointerEvents: 'none',
                }} />
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, color: f.color,
                }}>
                  <Icon size={18} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── CTA Final ──────────────────────────────────────────────────── */}
      <section style={{ padding: '0 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{
          borderRadius: 20, overflow: 'hidden', position: 'relative',
          padding: '80px 40px', textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600, height: 300,
            background: 'radial-gradient(ellipse, rgba(120,80,220,0.2), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontSize: 'clamp(24px, 4vw, 44px)', fontWeight: 800,
              letterSpacing: '-1.5px', margin: '0 0 16px',
              background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.6) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Pronto para ter o controle real<br />do seu negócio?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, marginBottom: 36 }}>
              Acesse agora e comece a enxergar o que antes estava invisível.
            </p>
            <Link href="/auth/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fff', color: '#000',
              padding: '14px 32px', borderRadius: 10,
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 0 60px rgba(255,255,255,0.15)',
            }}>
              Entrar no L Board <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '28px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        maxWidth: 1100, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, background: '#fff', borderRadius: 5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#000', fontWeight: 800, fontSize: 12,
          }}>L</div>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Board</span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
          © {new Date().getFullYear()} L Board · lboard.com.br
        </p>
      </footer>

    </div>
  )
}
