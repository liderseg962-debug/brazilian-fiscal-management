import { Link, createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ChevronRight, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import {
  HOJE,
  MES_ATUAL,
  PRIMEIRO_MES,
  ULTIMO_MES,
  categoriasDespesa,
  categoriasReceita,
  centrosCusto,
  empresas,
  parceiros,
} from '@/data/fixtures'
import { composicaoPeriodo, filtrosPadrao, indicadores, periodo, projecao, serieMensal, type Filtros, type Indicador } from '@/lib/finance'
import { brl, dataBR, formatCnpj, mesCurto, mesLongo, monthRange } from '@/lib/format'
import { Badge, Botao, Card, CardHeader, Dica, PageHeader, StatusQualquer, Vazio } from '@/components/ui'
import { GraficoBarras, GraficoLinha, GraficoRosca, cores } from '@/components/Charts'

export const Route = createFileRoute('/app/')({
  component: Dashboard,
})

const meses = monthRange(PRIMEIRO_MES, ULTIMO_MES).reverse()

function Select({ rotulo, value, onChange, children }: { rotulo: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="label">{rotulo}</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  )
}

function BarraFiltros({ f, set }: { f: Filtros; set: (f: Filtros) => void }) {
  const [mais, setMais] = useState(false)
  const up = <K extends keyof Filtros>(k: K, v: Filtros[K]) => set({ ...f, [k]: v })
  const ativos = (['empresaId', 'categoria', 'parceiroId', 'situacao', 'movimento', 'centroCusto'] as const).filter((k) => f[k]).length

  return (
    <Card className="mb-6 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_auto] lg:items-end">
        <div>
          <span className="label">Período</span>
          <div className="inline-flex rounded-lg border border-line p-0.5 text-sm">
            {(['mes', 'intervalo'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => up('modo', m)}
                className={`rounded-md px-3 py-1.5 ${f.modo === m ? 'bg-navy-900 text-white' : 'text-muted hover:text-ink'}`}
              >
                {m === 'mes' ? 'Mês' : 'Intervalo'}
              </button>
            ))}
          </div>
        </div>
        {f.modo === 'mes' ? (
          <Select rotulo="Mês e ano" value={f.mes} onChange={(v) => up('mes', v)}>
            {meses.map((m) => (
              <option key={m} value={m}>
                {mesLongo(m)}
                {m > MES_ATUAL ? ' (previsão)' : ''}
              </option>
            ))}
          </Select>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:col-span-1">
            <label>
              <span className="label">De</span>
              <input type="date" className="field" value={f.inicio} onChange={(e) => up('inicio', e.target.value)} />
            </label>
            <label>
              <span className="label">Até</span>
              <input type="date" className="field" value={f.fim} onChange={(e) => up('fim', e.target.value)} />
            </label>
          </div>
        )}
        <Select rotulo="Empresa / CNPJ" value={f.empresaId} onChange={(v) => up('empresaId', v)}>
          <option value="">Todas as empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nomeFantasia} · {formatCnpj(e.cnpj)}
            </option>
          ))}
        </Select>
        <Select rotulo="Tipo de movimentação" value={f.movimento} onChange={(v) => up('movimento', v as Filtros['movimento'])}>
          <option value="">Entradas e saídas</option>
          <option value="entradas">Somente entradas</option>
          <option value="saidas">Somente saídas</option>
        </Select>
        <div className="flex gap-2">
          <Botao variante="secundario" onClick={() => setMais((v) => !v)} aria-expanded={mais}>
            <SlidersHorizontal className="h-4 w-4" />
            Mais filtros{ativos ? ` (${ativos})` : ''}
          </Botao>
          <Botao variante="fantasma" onClick={() => set(filtrosPadrao)} aria-label="Limpar filtros">
            <RotateCcw className="h-4 w-4" />
          </Botao>
        </div>
      </div>
      {mais && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select rotulo="Categoria financeira" value={f.categoria} onChange={(v) => up('categoria', v)}>
            <option value="">Todas</option>
            <optgroup label="Receitas">
              {categoriasReceita.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </optgroup>
            <optgroup label="Despesas">
              {categoriasDespesa.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </optgroup>
          </Select>
          <Select rotulo="Cliente ou fornecedor" value={f.parceiroId} onChange={(v) => up('parceiroId', v)}>
            <option value="">Todos</option>
            <optgroup label="Clientes">
              {parceiros.filter((p) => p.tipo === 'cliente').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </optgroup>
            <optgroup label="Fornecedores">
              {parceiros.filter((p) => p.tipo === 'fornecedor').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </optgroup>
          </Select>
          <Select rotulo="Situação de pagamento" value={f.situacao} onChange={(v) => up('situacao', v as Filtros['situacao'])}>
            <option value="">Todas</option>
            <option value="aberto">Em aberto</option>
            <option value="vencido">Vencido</option>
            <option value="parcial">Parcial</option>
            <option value="liquidado">Liquidado</option>
          </Select>
          <Select rotulo="Centro de custo" value={f.centroCusto} onChange={(v) => up('centroCusto', v)}>
            <option value="">Todos</option>
            {centrosCusto.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
      )}
    </Card>
  )
}

const corTom: Record<Indicador['tom'], string> = {
  neutro: 'bg-navy-700',
  positivo: 'bg-ok-600',
  negativo: 'bg-risk-600',
  atencao: 'bg-warn-500',
}

function CardIndicador({ ind, onAbrir, destaque }: { ind: Indicador; onAbrir: () => void; destaque?: boolean }) {
  const clicavel = ind.registros.length > 0
  const valor = ind.formato === 'brl' ? brl(ind.valor) : ind.valor.toLocaleString('pt-BR')
  return (
    <Card className={`relative overflow-hidden ${destaque ? 'sm:col-span-2' : ''}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${corTom[ind.tom]}`} aria-hidden="true" />
      <button
        type="button"
        disabled={!clicavel}
        onClick={onAbrir}
        className="flex h-full w-full flex-col p-4 pl-5 text-left transition enabled:hover:bg-canvas/60 disabled:cursor-default"
      >
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
          {ind.titulo}
          <Dica texto={ind.conceito} />
        </span>
        <span className={`num mt-2 font-semibold tracking-tight text-ink ${destaque ? 'text-[28px]' : 'text-[22px]'}`}>{valor}</span>
        <span className="mt-auto flex items-center gap-1 pt-2 text-xs text-muted">
          {clicavel ? (
            <>
              {ind.registros.length} {ind.registros.length === 1 ? 'registro' : 'registros'}
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          ) : ind.chave === 'saldo-atual' ? (
            `Posição em ${dataBR(HOJE)}`
          ) : (
            'Nenhum registro no período'
          )}
        </span>
      </button>
    </Card>
  )
}

function PainelRegistros({ ind, onFechar, rotuloPeriodo }: { ind: Indicador; onFechar: () => void; rotuloPeriodo: string }) {
  const total = ind.registros.reduce((s, r) => s + r.valor, 0)
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={ind.titulo}>
      <button aria-label="Fechar" className="absolute inset-0 bg-navy-950/40" onClick={onFechar} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{rotuloPeriodo}</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{ind.titulo}</h2>
            <p className="mt-1 text-sm text-muted">{ind.conceito}</p>
          </div>
          <button onClick={onFechar} className="rounded-lg p-2 text-muted hover:bg-canvas" aria-label="Fechar painel">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-canvas text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-6 py-2.5 font-medium">Registro</th>
                <th className="px-3 py-2.5 font-medium">Data</th>
                <th className="px-3 py-2.5 font-medium">Situação</th>
                <th className="px-6 py-2.5 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ind.registros.map((r) => (
                <tr key={r.id + r.status} className="hover:bg-canvas/60">
                  <td className="px-6 py-3">
                    {r.href ? (
                      <Link to="/app/notas/$notaId" params={{ notaId: r.href.split('/').pop()! }} className="font-medium text-brand-600 hover:underline">
                        {r.descricao}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink">{r.descricao}</span>
                    )}
                    <p className="text-xs text-muted">{r.parceiro}</p>
                  </td>
                  <td className="num px-3 py-3 text-muted">{dataBR(r.data)}</td>
                  <td className="px-3 py-3">
                    <StatusQualquer status={r.status} />
                  </td>
                  <td className={`num px-6 py-3 text-right font-medium ${r.valor < 0 ? 'text-risk-700' : 'text-ink'}`}>{ind.formato === 'brl' || r.valor ? brl(r.valor) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ind.formato === 'brl' && (
          <footer className="space-y-1.5 border-t border-line bg-canvas px-6 py-4 text-sm">
            {ind.base && (
              <>
                <div className="flex justify-between text-muted">
                  <span>{ind.base.rotulo}</span>
                  <span className="num">{brl(ind.base.valor)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>(+) entradas e (−) saídas dos {ind.registros.length} títulos</span>
                  <span className="num">{brl(total)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted">{ind.base ? 'Resultado' : `Soma dos ${ind.registros.length} registros`}</span>
              <span className="num text-base font-semibold text-ink">{brl((ind.base?.valor ?? 0) + total)}</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

function Dashboard() {
  const [f, setF] = useState<Filtros>(filtrosPadrao)
  const [aberto, setAberto] = useState<Indicador | null>(null)

  const p = periodo(f)
  const rotuloPeriodo = f.modo === 'mes' ? mesLongo(f.mes) : `${dataBR(p.inicio)} a ${dataBR(p.fim)}`

  const inds = useMemo(() => indicadores(f), [f])
  const serie = useMemo(() => serieMensal(f), [f])
  const comp = useMemo(() => composicaoPeriodo(f), [f])
  const proj = useMemo(() => projecao(f), [f])
  const porChave = Object.fromEntries(inds.map((i) => [i.chave, i])) as Record<string, Indicador>

  const resultado = (porChave['receitas-lancadas'].valor as number) - (porChave['despesas-lancadas'].valor as number)
  const caixaPeriodo = (porChave['recebido'].valor as number) - (porChave['pago'].valor as number)
  const idxAtual = serie.findIndex((s) => s.ym === MES_ATUAL)

  const grupos: Array<{ titulo: string; chaves: string[] }> = [
    { titulo: 'Competência — o que foi lançado', chaves: ['receitas-lancadas', 'despesas-lancadas'] },
    { titulo: 'Caixa — o que efetivamente movimentou', chaves: ['recebido', 'pago'] },
    { titulo: 'Em aberto e riscos', chaves: ['receber-aberto', 'pagar-aberto', 'vencidas'] },
  ]

  return (
    <>
      <PageHeader
        titulo="Dashboard"
        descricao="Visão executiva da empresa. Passe o cursor sobre o ícone de cada indicador para ver como ele é calculado e clique para abrir os registros que compõem o valor."
        acoes={<Badge tom="info">Período: {rotuloPeriodo}</Badge>}
      />
      <BarraFiltros f={f} set={setF} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardIndicador ind={porChave['saldo-atual']} onAbrir={() => setAberto(porChave['saldo-atual'])} destaque />
        <CardIndicador ind={porChave['previsao-mes']} onAbrir={() => setAberto(porChave['previsao-mes'])} destaque />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr_1.5fr]">
        {grupos.map((g) => (
          <div key={g.titulo}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{g.titulo}</h2>
            <div className={`grid gap-4 ${g.chaves.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 xl:grid-cols-1'}`}>
              {g.chaves.map((k) => (
                <CardIndicador key={k} ind={porChave[k]} onAbrir={() => setAberto(porChave[k])} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardIndicador ind={porChave['notas-conferencia']} onAbrir={() => setAberto(porChave['notas-conferencia'])} />
        <CardIndicador ind={porChave['docs-contador']} onAbrir={() => setAberto(porChave['docs-contador'])} />
        <Card className="p-4 pl-5 sm:col-span-2">
          <p className="text-[13px] font-medium text-muted">Leitura do período</p>
          <dl className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="flex items-center gap-1.5 text-muted">
                Resultado gerencial <Dica texto="Receitas lançadas − despesas lançadas por competência. Não é lucro contábil." />
              </dt>
              <dd className={`num mt-1 text-lg font-semibold ${resultado >= 0 ? 'text-ok-700' : 'text-risk-700'}`}>{brl(resultado)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-muted">
                Geração de caixa <Dica texto="Recebido − pago no período. Não inclui transferências entre contas próprias." />
              </dt>
              <dd className={`num mt-1 text-lg font-semibold ${caixaPeriodo >= 0 ? 'text-ok-700' : 'text-risk-700'}`}>{brl(caixaPeriodo)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader titulo="Receitas × despesas por mês" descricao="Valores lançados por competência nos últimos 12 meses até o período selecionado, com o resultado gerencial." />
          <div className="p-5">
            <GraficoBarras
              titulo="Receitas e despesas por mês"
              rotulos={serie.map((s) => mesCurto(s.ym) + (s.futuro ? '*' : ''))}
              series={[
                { nome: 'Receitas lançadas', valores: serie.map((s) => s.receitas), cor: cores.navy },
                { nome: 'Despesas lançadas', valores: serie.map((s) => s.despesas), cor: cores.azulClaro },
                { nome: 'Resultado gerencial', valores: serie.map((s) => s.receitas - s.despesas), cor: cores.verde, tipo: 'line' },
              ]}
              altura={300}
            />
            {serie.some((s) => s.futuro) && <p className="mt-2 text-xs text-muted">* Meses futuros contêm apenas previsões (recorrências e contratos).</p>}
          </div>
        </Card>
        <Card>
          <CardHeader titulo="Fixas × variáveis" descricao={`Despesas lançadas em ${rotuloPeriodo}`} />
          <div className="p-5">
            {comp.fixas + comp.variaveis === 0 ? (
              <Vazio titulo="Sem despesas" texto="Nenhuma despesa corresponde aos filtros." />
            ) : (
              <>
                <GraficoRosca titulo="Despesas fixas e variáveis" rotulos={['Fixas', 'Variáveis']} valores={[comp.fixas, comp.variaveis]} coresFatias={[cores.navy, cores.azulClaro]} />
                <ul className="mt-4 space-y-2 text-sm">
                  {[
                    ['Fixas', comp.fixas, cores.navy],
                    ['Variáveis', comp.variaveis, cores.azulClaro],
                  ].map(([n, v, c]) => (
                    <li key={n as string} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c as string }} />
                        {n}
                      </span>
                      <span className="num font-medium">
                        {brl(v as number)} <span className="text-muted">({Math.round(((v as number) / (comp.fixas + comp.variaveis)) * 100)}%)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader titulo="Evolução do saldo gerencial" descricao="Saldo ao fim de cada mês a partir dos pagamentos e recebimentos registrados. Ainda não conciliado com extrato bancário." />
          <div className="p-5">
            <GraficoLinha titulo="Evolução do saldo" rotulos={serie.map((s) => mesCurto(s.ym))} valores={serie.map((s) => s.saldo)} destacarFuturo={idxAtual >= 0 ? idxAtual : undefined} />
          </div>
        </Card>
        <Card>
          <CardHeader titulo="Projeção de caixa" descricao={`Títulos em aberto com vencimento após ${dataBR(HOJE)}`} />
          <div className="p-5">
            <GraficoBarras
              titulo="Projeção de entradas e saídas"
              rotulos={proj.map((x) => `${x.dias} dias`)}
              series={[
                { nome: 'Entradas previstas', valores: proj.map((x) => x.entradas), cor: cores.verde },
                { nome: 'Saídas previstas', valores: proj.map((x) => x.saidas), cor: cores.vermelho },
              ]}
              altura={200}
            />
            <dl className="mt-4 space-y-1.5 text-sm">
              {proj.map((x) => (
                <div key={x.dias} className="flex justify-between">
                  <dt className="text-muted">Saldo projetado em {x.dias} dias</dt>
                  <dd className={`num font-medium ${x.saldoProjetado < 0 ? 'text-risk-700' : 'text-ink'}`}>{brl(x.saldoProjetado)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {[
          { t: 'Despesas por categoria', d: comp.porCategoria, c: cores.navy },
          { t: 'Receitas por cliente', d: comp.porCliente, c: cores.verde },
          { t: 'Despesas por fornecedor', d: comp.porFornecedor, c: cores.azul },
        ].map((g) => (
          <Card key={g.t}>
            <CardHeader titulo={g.t} descricao={`Lançado em ${rotuloPeriodo}`} />
            <div className="p-5">
              {g.d.length === 0 ? (
                <Vazio titulo="Nada para exibir" texto="Nenhum lançamento corresponde aos filtros selecionados." />
              ) : (
                <GraficoBarras titulo={g.t} rotulos={g.d.map(([n]) => (n.length > 24 ? `${n.slice(0, 23)}…` : n))} series={[{ nome: g.t, valores: g.d.map(([, v]) => v), cor: g.c }]} horizontal altura={Math.max(160, g.d.length * 34)} />
              )}
            </div>
          </Card>
        ))}
      </div>

      {aberto && <PainelRegistros ind={aberto} onFechar={() => setAberto(null)} rotuloPeriodo={rotuloPeriodo} />}
    </>
  )
}
