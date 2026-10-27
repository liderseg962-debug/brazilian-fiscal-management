import { Link, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Bell, Menu, X } from 'lucide-react'
import { menu } from '@/data/modulos'
import { HOJE } from '@/data/fixtures'
import { dataBR } from '@/lib/format'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/app')({
  component: AppLayout,
})

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const ativo = (to: string) => (to === '/app' ? pathname === '/app' || pathname === '/app/' : pathname.startsWith(to))

  return (
    <nav aria-label="Módulos" className="flex h-full flex-col bg-navy-900 text-slate-300">
      <div className="flex h-16 items-center px-5">
        <Link to="/" onClick={onNavigate} className="text-white">
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {menu.map((g) => (
          <div key={g.titulo} className="mt-5 first:mt-2">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{g.titulo}</p>
            <ul className="space-y-0.5">
              {g.modulos.map((m) => {
                const Icone = m.icone
                const on = ativo(m.to)
                return (
                  <li key={m.slug}>
                    <Link
                      // Paths come from the module catalog; unbuilt modules resolve to /app/$modulo.
                      to={m.to as never}
                      onClick={onNavigate}
                      aria-current={on ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                        on ? 'bg-white/10 font-medium text-white' : 'hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icone className={`h-4 w-4 shrink-0 ${on ? 'text-brand-500' : 'text-slate-400'}`} />
                      <span className="flex-1 truncate">{m.titulo}</span>
                      {!m.disponivel && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">M{m.marco}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-slate-400">
        <p className="font-medium text-slate-300">Lider Seg</p>
        <p>2 empresas · dados de exemplo</p>
      </div>
    </nav>
  )
}

function AppLayout() {
  const [aberto, setAberto] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => setAberto(false), [pathname])

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-navy-950/50" onClick={() => setAberto(false)} />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <Sidebar onNavigate={() => setAberto(false)} />
          </div>
          <button aria-label="Fechar menu" onClick={() => setAberto(false)} className="absolute left-[19rem] top-4 rounded-full bg-white p-1.5 text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
          <button aria-label="Abrir menu" onClick={() => setAberto(true)} className="rounded-lg p-2 text-ink hover:bg-canvas lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 rounded-full bg-warn-50 px-3 py-1 text-xs font-medium text-warn-700 ring-1 ring-warn-500/30 sm:flex">
            Ambiente com dados de exemplo · referência {dataBR(HOJE)}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button aria-label="Notificações" className="relative rounded-lg p-2 text-muted hover:bg-canvas">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-risk-600" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-navy-800 text-sm font-semibold text-white">MC</div>
              <div className="hidden text-sm leading-tight sm:block">
                <p className="font-medium text-ink">Mariana Costa</p>
                <p className="text-xs text-muted">Financeiro</p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
