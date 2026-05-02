'use client'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'

const pageTitles: Record<string, { title: string; description: string }> = {
  '/dashboard': { title: 'Dashboard', description: 'Visão geral do negócio' },
  '/clients': { title: 'Clientes', description: 'Gestão da base de clientes' },
  '/financial': { title: 'Financeiro', description: 'Receitas, despesas e fluxo de caixa' },
  '/contador': { title: 'Contador', description: 'Dashboard financeiro executivo' },
  '/demands': { title: 'Demandas', description: 'Tarefas e entregas do time' },
  '/founder': { title: 'Founder Board', description: 'OKRs, projetos e notas estratégicas' },
  '/docs': { title: 'Documentação', description: 'Relatório técnico v0.1 beta' },
  '/team': { title: 'Equipe', description: 'Membros, convites e permissões' },
  '/projects': { title: 'Projetos', description: 'Gestão de projetos e atividades' },
}

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname()

  const match = Object.entries(pageTitles).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )

  const { title, description } = match?.[1] ?? { title: 'L Board', description: '' }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold truncate">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>
    </header>
  )
}
