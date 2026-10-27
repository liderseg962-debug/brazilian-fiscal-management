import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, BadgeCheck, CalendarClock, FileCheck2, FileSearch, GitCompareArrows, LineChart, Lock, Receipt, ScanText, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/')({
  component: Landing,
})

const recursos = [
  { Icone: ScanText, titulo: 'Leitura inteligente de notas', texto: 'XML, PDF e documentos digitalizados viram lançamentos estruturados, com confiança por campo e conferência antes de qualquer gravação.' },
  { Icone: LineChart, titulo: 'Dashboard que separa os conceitos', texto: 'Receita lançada não é dinheiro recebido. Cada indicador mostra como é calculado e abre os registros que o compõem.' },
  { Icone: CalendarClock, titulo: 'Recorrências sem retrabalho', texto: 'Aluguel, folha, softwares e contratos geram previsões automaticamente, sem duplicar lançamentos e com histórico preservado.' },
  { Icone: GitCompareArrows, titulo: 'Conciliação com o extrato', texto: 'Importação de OFX e CSV com sugestões de correspondência para você confirmar. Nada é alterado em silêncio.' },
  { Icone: Receipt, titulo: 'Área do contador', texto: 'Acesso com prazo e permissões, fechamento mensal por etapas e exportação organizada por empresa, ano e mês.' },
  { Icone: FileSearch, titulo: 'Central fiscal e pendências', texto: 'Regras tributárias versionadas por vigência e fonte oficial, preparadas para a transição CBS/IBS.' },
]

const principios = [
  { Icone: Sparkles, titulo: 'A IA sugere, não inventa', texto: 'Campos ausentes ficam pendentes, com o motivo explicado. Valor líquido nunca é presumido.' },
  { Icone: BadgeCheck, titulo: 'Regras determinísticas', texto: 'CNPJ, chave de acesso, datas e somas são validados por regra, independentemente da IA.' },
  { Icone: FileCheck2, titulo: 'Uma nota, uma obrigação', texto: 'Deduplicação por chave de acesso ou pela combinação CNPJ, número, série, data, tipo e valor.' },
  { Icone: Lock, titulo: 'Dados isolados por empresa', texto: 'Permissões por módulo e ação, documentos privados e trilha de auditoria de cada alteração.' },
]

function Preview() {
  const barras = [62, 70, 58, 76, 69, 81, 74, 88, 79, 92, 85, 96]
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl shadow-navy-950/60 backdrop-blur">
      <div className="rounded-xl bg-white p-5 text-ink">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Visão de outubro de 2026</p>
          <span className="rounded-full bg-warn-50 px-2 py-0.5 text-[11px] font-medium text-warn-700 ring-1 ring-warn-500/30">6 notas em conferência</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Receitas lançadas', 'R$ 162.418,30', 'bg-navy-700'],
            ['Efetivamente recebido', 'R$ 131.902,77', 'bg-ok-600'],
            ['Contas a pagar', 'R$ 48.215,90', 'bg-warn-500'],
            ['Vencidas', 'R$ 3.120,00', 'bg-risk-600'],
          ].map(([t, v, c]) => (
            <div key={t} className="relative overflow-hidden rounded-lg border border-line p-3">
              <span className={`absolute inset-y-0 left-0 w-1 ${c}`} />
              <p className="text-[11px] text-muted">{t}</p>
              <p className="num mt-1 text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex h-32 items-end gap-1.5">
          {barras.map((h, i) => (
            <div key={i} className="flex flex-1 items-end gap-0.5">
              <div className="flex-1 rounded-t bg-navy-700" style={{ height: `${h}%` }} />
              <div className="flex-1 rounded-t bg-brand-100" style={{ height: `${h * 0.72}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-line bg-canvas p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium">NF-e nº 48213 · Hikvision do Brasil</span>
            <span className="rounded-full bg-ok-50 px-2 py-0.5 font-medium text-ok-700">XML · 99%</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-muted">
            <span>
              Total <b className="num block text-ink">R$ 8.288,80</b>
            </span>
            <span>
              Líquido <b className="block text-warn-700">Pendente</b>
            </span>
            <span>
              Vencimento <b className="num block text-ink">11/11/2026</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }}
        />
        <div aria-hidden="true" className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-600/30 blur-3xl" />
        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Logo />
          <nav className="flex items-center gap-6 text-sm text-slate-300">
            <a href="#recursos" className="hidden hover:text-white sm:inline">
              Recursos
            </a>
            <a href="#principios" className="hidden hover:text-white sm:inline">
              Princípios
            </a>
            <Link to="/app" className="rounded-lg bg-white px-4 py-2 font-medium text-navy-900 hover:bg-brand-50">
              Abrir o painel
            </Link>
          </nav>
        </header>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-10 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-100">
              <ShieldCheck className="h-3.5 w-3.5" /> Gestão fiscal, financeira e contábil para empresas brasileiras
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              O centro de controle fiscal e financeiro da sua empresa.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Notas fiscais, contas a pagar e a receber, fluxo de caixa e o contador no mesmo lugar, com inteligência artificial que lê seus documentos e prepara os lançamentos para a sua conferência.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app" className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-3 font-medium text-white hover:bg-brand-600">
                Explorar o Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/app/importar" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-3 font-medium text-white hover:bg-white/5">
                Testar a leitura de notas
              </Link>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6 text-sm">
              {[
                ['17', 'módulos integrados'],
                ['R$ 1.234,56', 'padrão brasileiro'],
                ['100%', 'lançamentos auditáveis'],
              ].map(([v, t]) => (
                <div key={t}>
                  <dt className="num text-xl font-semibold text-white">{v}</dt>
                  <dd className="mt-1 text-slate-400">{t}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Preview />
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-600">Recursos</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Responda, a qualquer momento, quanto a empresa faturou, recebeu, gastou e ainda deve.</h2>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {recursos.map(({ Icone, titulo, texto }) => (
            <div key={titulo} className="bg-white p-7">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icone className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-semibold text-ink">{titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="principios" className="bg-canvas">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-600">Princípios</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">Confiável antes de ser automático.</h2>
            <p className="mt-4 leading-relaxed text-muted">
              O Nexo Fiscal ajuda na organização, na conformidade e na identificação de riscos. Ele não substitui a escrituração contábil, as declarações oficiais nem a responsabilidade técnica do seu contador, e deixa isso claro em cada tela.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {principios.map(({ Icone, titulo, texto }) => (
              <div key={titulo} className="rounded-xl border border-line bg-white p-6">
                <Icone className="h-5 w-5 text-navy-700" />
                <h3 className="mt-4 font-semibold text-ink">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-navy-900 px-8 py-10 text-white md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Veja o painel com dados de exemplo.</h2>
            <p className="mt-2 text-slate-300">Filtros, indicadores, notas fiscais e a conferência de documentos já estão navegáveis.</p>
          </div>
          <Link to="/app" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 font-medium text-navy-900 hover:bg-brand-50">
            Abrir o painel <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted">
          <span className="text-ink">
            <Logo />
          </span>
          <p>Informações gerenciais. Não substitui a escrituração contábil oficial.</p>
        </div>
      </footer>
    </div>
  )
}
