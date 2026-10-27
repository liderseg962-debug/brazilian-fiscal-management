import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { MES_ATUAL, PRIMEIRO_MES, ULTIMO_MES, empresas, lancamentos, parceiroById, realizado, statusFinanceiro, type Natureza, type StatusFinanceiro } from '@/data/fixtures'
import { emAberto } from '@/lib/finance'
import { brl, dataBR, mesLongo, monthRange } from '@/lib/format'
import { Badge, Botao, Card, PageHeader, StatusFinanceiroBadge, Vazio, rotuloFinanceiro } from '@/components/ui'

const POR_PAGINA = 20

export function LancamentosPage({ natureza }: { natureza: Natureza }) {
  const pagar = natureza === 'pagar'
  const [mes, setMes] = useState(MES_ATUAL)
  const [status, setStatus] = useState<'' | StatusFinanceiro>('')
  const [tipo, setTipo] = useState<'' | 'fixa' | 'variavel'>('')
  const [empresaId, setEmpresaId] = useState('')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)

  const base = useMemo(() => lancamentos.filter((l) => l.natureza === natureza), [natureza])
  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return base
      .filter(
        (l) =>
          (!mes || l.vencimento.slice(0, 7) === mes) &&
          (!status || statusFinanceiro(l) === status) &&
          (!tipo || l.tipoDespesa === tipo) &&
          (!empresaId || l.empresaId === empresaId) &&
          (!t || l.descricao.toLowerCase().includes(t) || (parceiroById.get(l.parceiroId)?.nome ?? '').toLowerCase().includes(t) || l.categoria.toLowerCase().includes(t)),
      )
      .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1))
  }, [base, mes, status, tipo, empresaId, busca])

  const validos = lista.filter((l) => !l.cancelado)
  const previsto = validos.reduce((s, l) => s + l.valor, 0)
  const feito = validos.reduce((s, l) => s + realizado(l), 0)
  const aberto = validos.reduce((s, l) => s + emAberto(l), 0)
  const vencido = validos.filter((l) => statusFinanceiro(l) === 'vencido').reduce((s, l) => s + emAberto(l), 0)
  const pag = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPagina(1)
  }

  return (
    <>
      <PageHeader
        titulo={pagar ? 'Despesas e Contas a Pagar' : 'Receitas e Contas a Receber'}
        descricao={
          pagar
            ? 'Obrigações da empresa por vencimento. O valor previsto, o valor pago e o saldo em aberto são acompanhados separadamente; pagamentos parciais ficam registrados.'
            : 'Títulos a receber por vencimento. Diferencia o valor previsto (líquido de retenções) do dinheiro efetivamente recebido, inclusive recebimentos parciais.'
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Valor previsto', brl(previsto), 'text-ink'],
          [pagar ? 'Efetivamente pago' : 'Efetivamente recebido', brl(feito), 'text-ok-700'],
          ['Saldo em aberto', brl(aberto), 'text-warn-700'],
          ['Vencido e não quitado', brl(vencido), 'text-risk-700'],
        ].map(([t, v, c]) => (
          <Card key={t} className="px-4 py-3">
            <p className="text-xs font-medium text-muted">{t}</p>
            <p className={`num mt-1 text-lg font-semibold ${c}`}>{v}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-line p-4 md:grid-cols-3 xl:grid-cols-[2fr_repeat(4,1fr)]">
          <label className="relative block md:col-span-3 xl:col-span-1">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="field pl-9" placeholder={pagar ? 'Descrição, fornecedor ou categoria' : 'Descrição, cliente ou categoria'} value={busca} onChange={(e) => reset(setBusca)(e.target.value)} />
          </label>
          <select aria-label="Mês de vencimento" className="field" value={mes} onChange={(e) => reset(setMes)(e.target.value)}>
            <option value="">Todos os vencimentos</option>
            {monthRange(PRIMEIRO_MES, ULTIMO_MES)
              .reverse()
              .map((m) => (
                <option key={m} value={m}>
                  Vencimento em {mesLongo(m)}
                </option>
              ))}
          </select>
          <select aria-label="Situação" className="field" value={status} onChange={(e) => reset(setStatus)(e.target.value as StatusFinanceiro | '')}>
            <option value="">Todas as situações</option>
            {(Object.keys(rotuloFinanceiro) as StatusFinanceiro[]).map((s) => (
              <option key={s} value={s}>
                {rotuloFinanceiro[s]}
              </option>
            ))}
          </select>
          {pagar ? (
            <select aria-label="Tipo de despesa" className="field" value={tipo} onChange={(e) => reset(setTipo)(e.target.value as '' | 'fixa' | 'variavel')}>
              <option value="">Fixas e variáveis</option>
              <option value="fixa">Somente fixas</option>
              <option value="variavel">Somente variáveis</option>
            </select>
          ) : (
            <span className="hidden xl:block" />
          )}
          <select aria-label="Empresa" className="field" value={empresaId} onChange={(e) => reset(setEmpresaId)(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nomeFantasia}
              </option>
            ))}
          </select>
        </div>

        {lista.length === 0 ? (
          <Vazio titulo="Nenhum lançamento encontrado" texto="Ajuste os filtros de período, situação ou busca." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Descrição</th>
                  <th className="px-3 py-2.5 font-medium">Categoria · centro de custo</th>
                  <th className="px-3 py-2.5 font-medium">Competência</th>
                  <th className="px-3 py-2.5 font-medium">Vencimento</th>
                  <th className="px-3 py-2.5 text-right font-medium">Previsto</th>
                  <th className="px-3 py-2.5 text-right font-medium">{pagar ? 'Pago' : 'Recebido'}</th>
                  <th className="px-3 py-2.5 text-right font-medium">Em aberto</th>
                  <th className="px-4 py-2.5 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pag.map((l) => (
                  <tr key={l.id} className={`hover:bg-canvas/60 ${l.cancelado ? 'text-muted' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{l.descricao}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted">
                        {parceiroById.get(l.parceiroId)?.nome}
                        {l.tipoDespesa === 'fixa' && <Badge tom="info">Recorrente</Badge>}
                        {l.notaId && (
                          <Link to="/app/notas/$notaId" params={{ notaId: l.notaId }} className="text-brand-600 hover:underline">
                            ver nota
                          </Link>
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {l.categoria} · {l.centroCusto}
                    </td>
                    <td className="num px-3 py-3 text-muted">{l.competencia.split('-').reverse().join('/')}</td>
                    <td className="num px-3 py-3">{dataBR(l.vencimento)}</td>
                    <td className={`num px-3 py-3 text-right ${l.cancelado ? 'line-through' : ''}`}>{brl(l.valor)}</td>
                    <td className="num px-3 py-3 text-right text-ok-700">{realizado(l) ? brl(realizado(l)) : '—'}</td>
                    <td className="num px-3 py-3 text-right font-medium">{emAberto(l) ? brl(emAberto(l)) : '—'}</td>
                    <td className="px-4 py-3">
                      <StatusFinanceiroBadge status={statusFinanceiro(l)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lista.length > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
            <span>
              {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, lista.length)} de {lista.length} lançamentos
            </span>
            <div className="flex items-center gap-2">
              <Botao variante="secundario" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>
                Anterior
              </Botao>
              <span className="num px-2">
                {pagina} / {totalPaginas}
              </span>
              <Botao variante="secundario" disabled={pagina === totalPaginas} onClick={() => setPagina(pagina + 1)}>
                Próxima
              </Botao>
            </div>
          </footer>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">O registro de pagamentos e recebimentos, o cadastro de despesas e a anexação de comprovantes chegam com a gravação em banco de dados, com histórico de auditoria de cada alteração.</p>
    </>
  )
}
