import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileCode2, FileText, Link2 } from 'lucide-react'
import { empresaById, lancamentoById, notaById, realizado, statusFinanceiro, type Tributos } from '@/data/fixtures'
import { brl, dataBR, formatChave, formatCnpj, mesLongo } from '@/lib/format'
import { isValidChave, isValidCnpj } from '@/lib/fiscal-validators'
import { emAberto } from '@/lib/finance'
import { Badge, Card, CardHeader, Campo, PageHeader, StatusFinanceiroBadge, StatusNotaBadge } from '@/components/ui'

export const Route = createFileRoute('/app/notas/$notaId')({
  loader: ({ params }) => {
    const nota = notaById.get(params.notaId)
    if (!nota) throw notFound()
    return { notaId: nota.id }
  },
  component: NotaDetalhe,
  notFoundComponent: () => (
    <Card className="p-10 text-center">
      <p className="font-medium">Nota fiscal não encontrada</p>
      <p className="mt-1 text-sm text-muted">O documento pode ter sido removido ou você não tem acesso a ele.</p>
      <Link to="/app/notas" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline">
        Voltar para Notas Fiscais
      </Link>
    </Card>
  ),
})

const rotulosTributos: Array<[keyof Tributos, string, 'destacado' | 'retido']> = [
  ['icms', 'ICMS', 'destacado'],
  ['ipi', 'IPI', 'destacado'],
  ['pis', 'PIS', 'destacado'],
  ['cofins', 'COFINS', 'destacado'],
  ['iss', 'ISS', 'destacado'],
  ['issRetido', 'ISS retido', 'retido'],
  ['inssRetido', 'INSS retido', 'retido'],
  ['irrfRetido', 'IRRF retido', 'retido'],
  ['pisCofinsCsllRetido', 'PIS/COFINS/CSLL retidos', 'retido'],
]

function NotaDetalhe() {
  const { notaId } = Route.useLoaderData()
  const n = notaById.get(notaId)!
  const empresa = empresaById.get(n.empresaId)!
  const lanc = n.lancamentoId ? lancamentoById.get(n.lancamentoId) : undefined
  const somaItens = n.itens.reduce((s, i) => s + i.total, 0)
  const totalCalculado = n.valorProdutos - n.desconto + n.frete + n.outrasDespesas
  const tributos = rotulosTributos.filter(([k]) => n.tributos[k] > 0)

  const verificacoes = [
    { ok: n.chave ? isValidChave(n.chave) : null, texto: n.chave ? 'Dígito verificador da chave de acesso' : 'Documento sem chave de acesso (NFS-e municipal)' },
    { ok: isValidCnpj(n.emitente.documento), texto: 'CNPJ do emitente válido' },
    { ok: isValidCnpj(n.destinatario.documento), texto: 'CNPJ do destinatário válido' },
    { ok: somaItens === n.valorProdutos, texto: `Soma dos itens (${brl(somaItens)}) confere com o valor dos produtos/serviços` },
    { ok: totalCalculado === n.valorBruto, texto: 'Produtos − descontos + frete + outras despesas = valor total' },
    { ok: n.valorLiquido !== null, texto: n.valorLiquido !== null ? 'Valor líquido informado no documento' : 'Valor líquido não informado no documento — pendente' },
  ]

  return (
    <>
      <PageHeader
        sobre={
          <Link to="/app/notas" className="inline-flex items-center gap-1 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Notas Fiscais
          </Link>
        }
        titulo={`${n.tipo} nº ${n.numero} · série ${n.serie}`}
        descricao={`${n.direcao === 'entrada' ? 'Documento de entrada recebido de' : 'Documento de saída emitido para'} ${n.direcao === 'entrada' ? n.emitente.nome : n.destinatario.nome} · ${empresa.nomeFantasia}`}
        acoes={
          <>
            <Badge tom={n.direcao === 'saida' ? 'positivo' : 'info'}>{n.direcao === 'saida' ? 'Saída' : 'Entrada'}</Badge>
            <StatusNotaBadge status={n.status} />
          </>
        }
      />

      {n.status === 'Cancelada' && (
        <div className="mb-6 flex gap-3 rounded-xl border border-risk-600/20 bg-risk-50 p-4 text-sm text-risk-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>Esta nota foi cancelada. Ela é mantida para histórico e auditoria, mas não compõe os totais operacionais, e a conta vinculada foi cancelada.</p>
        </div>
      )}
      {n.pendencias.length > 0 && (
        <div className="mb-6 rounded-xl border border-warn-500/30 bg-warn-50 p-4 text-sm text-warn-700">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" /> Pendências para conferência
          </p>
          <ul className="ml-6 mt-2 list-disc space-y-1">
            {n.pendencias.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-2">Nenhuma conta a pagar é gerada até a conferência ser aprovada.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader titulo="Valores" descricao="Mantidos separados: o total da nota, o líquido informado e o valor efetivamente pago ou recebido não são necessariamente iguais." />
            <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
              {[
                ['Valor total (bruto)', brl(n.valorBruto), ''],
                ['Valor líquido informado', n.valorLiquido === null ? 'Pendente' : brl(n.valorLiquido), n.valorLiquido === null ? 'text-warn-700' : ''],
                ['Valor financeiro previsto', lanc ? brl(lanc.valor) : '—', ''],
                [n.direcao === 'entrada' ? 'Efetivamente pago' : 'Efetivamente recebido', lanc ? brl(realizado(lanc)) : '—', 'text-ok-700'],
              ].map(([t, v, c]) => (
                <div key={t} className="bg-white px-5 py-4">
                  <p className="text-xs font-medium text-muted">{t}</p>
                  <p className={`num mt-1 text-lg font-semibold ${c || 'text-ink'}`}>{v}</p>
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t border-line p-5 md:grid-cols-4">
              <Campo rotulo="Produtos/serviços">
                <span className="num">{brl(n.valorProdutos)}</span>
              </Campo>
              <Campo rotulo="Descontos">
                <span className="num">{brl(n.desconto)}</span>
              </Campo>
              <Campo rotulo="Frete">
                <span className="num">{brl(n.frete)}</span>
              </Campo>
              <Campo rotulo="Outras despesas">
                <span className="num">{brl(n.outrasDespesas)}</span>
              </Campo>
            </dl>
          </Card>

          <Card>
            <CardHeader titulo="Dados do documento" />
            <dl className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <Campo rotulo="Emitente">
                {n.emitente.nome}
                <p className="num text-xs text-muted">{formatCnpj(n.emitente.documento)}</p>
              </Campo>
              <Campo rotulo="Destinatário">
                {n.destinatario.nome}
                <p className="num text-xs text-muted">{formatCnpj(n.destinatario.documento)}</p>
              </Campo>
              <Campo rotulo="Origem do cadastro">{n.origem}</Campo>
              <Campo rotulo="Data de emissão">
                <span className="num">{dataBR(n.emissao)}</span>
              </Campo>
              <Campo rotulo="Competência">{mesLongo(n.competencia)}</Campo>
              <Campo rotulo="Vencimento">{n.vencimento ? <span className="num">{dataBR(n.vencimento)}</span> : <span className="text-muted">Não informado no documento</span>}</Campo>
              <Campo rotulo="Forma de pagamento">{n.formaPagamento}</Campo>
              <Campo rotulo="Condição de pagamento">{n.condicaoPagamento}</Campo>
              <Campo rotulo="Categoria · centro de custo">
                {n.categoria} · {n.centroCusto}
              </Campo>
              <div className="sm:col-span-2 lg:col-span-3">
                <Campo rotulo="Chave de acesso">{n.chave ? <span className="mono break-all text-[13px]">{formatChave(n.chave)}</span> : <span className="text-muted">Não aplicável</span>}</Campo>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader titulo="Itens" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Descrição</th>
                    <th className="px-3 py-2.5 text-right font-medium">Qtd.</th>
                    <th className="px-3 py-2.5 text-right font-medium">Unitário</th>
                    <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {n.itens.map((i) => (
                    <tr key={i.descricao}>
                      <td className="px-5 py-3">{i.descricao}</td>
                      <td className="num px-3 py-3 text-right">{i.quantidade.toLocaleString('pt-BR')}</td>
                      <td className="num px-3 py-3 text-right">{brl(i.unitario)}</td>
                      <td className="num px-5 py-3 text-right font-medium">{brl(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader titulo="Tributos e retenções identificados" descricao="Valores conforme destacados no documento. O sistema não calcula nem deduz crédito tributário automaticamente." />
            {tributos.length === 0 ? (
              <p className="p-5 text-sm text-muted">Nenhum tributo destacado neste documento.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
                {tributos.map(([k, rot, tipo]) => (
                  <Campo key={k} rotulo={rot}>
                    <span className="num">{brl(n.tributos[k])}</span> {tipo === 'retido' && <Badge tom="atencao">retido</Badge>}
                  </Campo>
                ))}
              </dl>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader titulo={n.direcao === 'entrada' ? 'Conta a pagar vinculada' : 'Conta a receber vinculada'} />
            {lanc ? (
              <div className="space-y-3 p-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <Link2 className="h-4 w-4 text-muted" /> {lanc.id.toUpperCase()}
                  </span>
                  <StatusFinanceiroBadge status={statusFinanceiro(lanc)} />
                </div>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-muted">Vencimento</dt>
                    <dd className="num">{dataBR(lanc.vencimento)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Valor previsto</dt>
                    <dd className="num">{brl(lanc.valor)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Saldo em aberto</dt>
                    <dd className="num font-medium">{brl(emAberto(lanc))}</dd>
                  </div>
                </dl>
                {lanc.pagamentos.length > 0 && (
                  <div className="border-t border-line pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{n.direcao === 'entrada' ? 'Pagamentos' : 'Recebimentos'}</p>
                    {lanc.pagamentos.map((p) => (
                      <div key={p.data + p.valor} className="flex justify-between text-sm">
                        <span className="num">{dataBR(p.data)}</span>
                        <span className="num">{brl(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="p-5 text-sm text-muted">{n.status === 'Cancelada' ? 'Sem vínculo ativo.' : 'Nenhuma obrigação gerada. A conta será criada ou vinculada após a aprovação da conferência.'}</p>
            )}
          </Card>

          <Card>
            <CardHeader titulo="Validações determinísticas" />
            <ul className="space-y-2.5 p-5 text-sm">
              {verificacoes.map((v) => (
                <li key={v.texto} className="flex gap-2">
                  {v.ok === false ? <AlertTriangle className="h-4 w-4 shrink-0 text-risk-600" /> : <CheckCircle2 className={`h-4 w-4 shrink-0 ${v.ok ? 'text-ok-600' : 'text-muted'}`} />}
                  <span className={v.ok === false ? 'text-risk-700' : ''}>{v.texto}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader titulo="Arquivos originais" />
            <ul className="divide-y divide-line text-sm">
              {[
                { ok: n.arquivos.xml, nome: 'XML fiscal', Icone: FileCode2 },
                { ok: n.arquivos.pdf, nome: n.tipo === 'NF-e' ? 'DANFE (PDF)' : 'Documento (PDF)', Icone: FileText },
              ].map(({ ok, nome, Icone }) => (
                <li key={nome} className="flex items-center justify-between px-5 py-3">
                  <span className="flex items-center gap-2">
                    <Icone className="h-4 w-4 text-muted" /> {nome}
                  </span>
                  {ok ? <Badge tom="positivo">Anexado</Badge> : <Badge tom="atencao">Ausente</Badge>}
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-5 py-3 text-xs text-muted">O download seguro dos originais (link temporário) chega com o armazenamento privado de documentos.</p>
          </Card>

          <Card>
            <CardHeader titulo="Histórico" />
            <ol className="relative space-y-4 p-5 text-sm">
              {n.historico.map((h, i) => (
                <li key={i} className="relative pl-5">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-brand-500" />
                  <p className="font-medium text-ink">{h.acao}</p>
                  <p className="text-xs text-muted">
                    {dataBR(h.data)} · {h.usuario}
                  </p>
                  {h.detalhe && <p className="mt-0.5 text-xs text-muted">{h.detalhe}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  )
}
