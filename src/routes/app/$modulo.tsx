import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { CheckCircle2, Map } from 'lucide-react'
import { moduloPorSlug } from '@/data/modulos'
import { Card, PageHeader } from '@/components/ui'

export const Route = createFileRoute('/app/$modulo')({
  loader: ({ params }) => {
    const m = moduloPorSlug.get(params.modulo)
    if (!m || m.disponivel) throw notFound()
    return { slug: m.slug }
  },
  component: ModuloPlanejado,
  notFoundComponent: () => (
    <Card className="p-10 text-center">
      <p className="font-medium">Página não encontrada</p>
      <Link to="/app" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
        Voltar ao Dashboard
      </Link>
    </Card>
  ),
})

function ModuloPlanejado() {
  const { slug } = Route.useLoaderData()
  const m = moduloPorSlug.get(slug)!
  const Icone = m.icone
  return (
    <>
      <PageHeader titulo={m.titulo} descricao={m.resumo} />
      <Card className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col justify-between bg-navy-900 p-8 text-white">
            <div>
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10">
                <Icone className="h-6 w-6 text-brand-100" />
              </div>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Etapa {m.marco} do roadmap</p>
              <h2 className="mt-2 text-xl font-semibold">Em construção</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Este módulo depende da base de dados, das permissões e do histórico de auditoria. Para manter cada número confiável, ele só aparece aqui quando estiver funcional e testado.
              </p>
            </div>
            <p className="mt-8 flex items-center gap-2 text-xs text-slate-400">
              <Map className="h-4 w-4" /> O roadmap completo está documentado no projeto.
            </p>
          </div>
          <div className="p-8">
            <p className="text-sm font-semibold text-ink">O que este módulo vai entregar</p>
            <ul className="mt-4 space-y-3">
              {m.recursos?.map((r) => (
                <li key={r} className="flex gap-3 text-sm text-ink">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link to="/app" className="rounded-lg bg-navy-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-700">
                Ir para o Dashboard
              </Link>
              <Link to="/app/notas" className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-canvas">
                Ver Notas Fiscais
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}
