// Pure financial rules shared by cards, charts and tables, so every view of a
// period is computed from the same filtered record set.
import {
  HOJE,
  MES_ATUAL,
  SALDO_ABERTURA,
  STATUS_EM_CONFERENCIA,
  lancamentos,
  notasFiscais,
  parceiroById,
  realizado,
  statusFinanceiro,
  type Lancamento,
  type NotaFiscal,
  type StatusFinanceiro,
} from '@/data/fixtures'
import { addDays, addMonths, lastDayOfMonth, monthRange, type Cents } from './format'

export type Filtros = {
  modo: 'mes' | 'intervalo'
  mes: string // YYYY-MM
  inicio: string // YYYY-MM-DD
  fim: string
  empresaId: string // '' = todas
  categoria: string
  parceiroId: string
  situacao: '' | StatusFinanceiro
  movimento: '' | 'entradas' | 'saidas'
  centroCusto: string
}

export const filtrosPadrao: Filtros = {
  modo: 'mes',
  mes: MES_ATUAL,
  inicio: `${MES_ATUAL}-01`,
  fim: lastDayOfMonth(MES_ATUAL),
  empresaId: '',
  categoria: '',
  parceiroId: '',
  situacao: '',
  movimento: '',
  centroCusto: '',
}

export function periodo(f: Filtros): { inicio: string; fim: string } {
  if (f.modo === 'mes') return { inicio: `${f.mes}-01`, fim: lastDayOfMonth(f.mes) }
  return f.inicio <= f.fim ? { inicio: f.inicio, fim: f.fim } : { inicio: f.fim, fim: f.inicio }
}

const dentro = (d: string, p: { inicio: string; fim: string }) => d >= p.inicio && d <= p.fim

/** Dimension filters (everything except the period). */
export function aplicarDimensoes(f: Filtros, base: readonly Lancamento[] = lancamentos): Lancamento[] {
  return base.filter(
    (l) =>
      (!f.empresaId || l.empresaId === f.empresaId) &&
      (!f.categoria || l.categoria === f.categoria) &&
      (!f.parceiroId || l.parceiroId === f.parceiroId) &&
      (!f.centroCusto || l.centroCusto === f.centroCusto) &&
      (!f.situacao || statusFinanceiro(l) === f.situacao) &&
      (!f.movimento || (f.movimento === 'entradas' ? l.natureza === 'receber' : l.natureza === 'pagar')),
  )
}

export const emAberto = (l: Lancamento): Cents => (l.cancelado ? 0 : Math.max(0, l.valor - realizado(l)))

export const realizadoNoPeriodo = (l: Lancamento, p: { inicio: string; fim: string }): Cents =>
  l.pagamentos.filter((pg) => dentro(pg.data, p)).reduce((s, pg) => s + pg.valor, 0)

export type Indicador = {
  chave: string
  titulo: string
  conceito: string
  valor: Cents | number
  formato: 'brl' | 'qtd'
  tom: 'neutro' | 'positivo' | 'negativo' | 'atencao'
  /** When set, valor = base + soma dos registros (e.g. projected balance). */
  base?: { rotulo: string; valor: Cents }
  registros: Array<{ id: string; descricao: string; parceiro: string; data: string; valor: Cents; status: string; href?: string }>
}

function linhasLanc(ls: Lancamento[], valor: (l: Lancamento) => Cents, data: (l: Lancamento) => string) {
  return ls
    .map((l) => ({
      id: l.id,
      descricao: l.descricao,
      parceiro: parceiroById.get(l.parceiroId)?.nome ?? '—',
      data: data(l),
      valor: valor(l),
      status: statusFinanceiro(l),
      href: l.notaId ? `/app/notas/${l.notaId}` : undefined,
    }))
    .filter((r) => r.valor !== 0)
    .sort((a, b) => (a.data < b.data ? -1 : 1))
}

const competenciaNoPeriodo = (l: Lancamento, p: { inicio: string; fim: string }) =>
  l.competencia >= p.inicio.slice(0, 7) && l.competencia <= p.fim.slice(0, 7)

/** Cash position from realized movements up to a date (no bank reconciliation yet). */
export function saldoEm(data: string, f?: Pick<Filtros, 'empresaId'>): Cents {
  let saldo = SALDO_ABERTURA
  for (const l of lancamentos) {
    if (f?.empresaId && l.empresaId !== f.empresaId) continue
    for (const pg of l.pagamentos) {
      if (pg.data <= data) saldo += l.natureza === 'receber' ? pg.valor : -pg.valor
    }
  }
  return saldo
}

export function notasNoPeriodo(f: Filtros): NotaFiscal[] {
  const p = periodo(f)
  return notasFiscais.filter(
    (n) =>
      dentro(n.emissao, p) &&
      (!f.empresaId || n.empresaId === f.empresaId) &&
      (!f.categoria || n.categoria === f.categoria) &&
      (!f.parceiroId || n.parceiroId === f.parceiroId) &&
      (!f.centroCusto || n.centroCusto === f.centroCusto) &&
      (!f.movimento || (f.movimento === 'entradas' ? n.direcao === 'saida' : n.direcao === 'entrada')),
  )
}

export function indicadores(f: Filtros): Indicador[] {
  const p = periodo(f)
  const ls = aplicarDimensoes(f).filter((l) => !l.cancelado)
  const receber = ls.filter((l) => l.natureza === 'receber')
  const pagar = ls.filter((l) => l.natureza === 'pagar')

  const recLanc = receber.filter((l) => competenciaNoPeriodo(l, p))
  const despLanc = pagar.filter((l) => competenciaNoPeriodo(l, p))
  const recebidos = receber.filter((l) => realizadoNoPeriodo(l, p) > 0)
  const pagos = pagar.filter((l) => realizadoNoPeriodo(l, p) > 0)
  const pagarAberto = pagar.filter((l) => dentro(l.vencimento, p) && emAberto(l) > 0)
  const receberAberto = receber.filter((l) => dentro(l.vencimento, p) && emAberto(l) > 0)
  const vencidas = pagar.filter((l) => l.vencimento < HOJE && dentro(l.vencimento, p) && emAberto(l) > 0)

  const fimMes = lastDayOfMonth(MES_ATUAL)
  const saldoAtual = saldoEm(HOJE, f)
  const aVencerMes = aplicarDimensoes({ ...f, situacao: '' }).filter((l) => !l.cancelado && l.vencimento <= fimMes && emAberto(l) > 0)
  const previsao = aVencerMes.reduce((s, l) => s + (l.natureza === 'receber' ? emAberto(l) : -emAberto(l)), saldoAtual)

  const notas = notasNoPeriodo(f)
  const emConferencia = notas.filter((n) => STATUS_EM_CONFERENCIA.includes(n.status))
  const semComprovante = pagar.filter((l) => realizadoNoPeriodo(l, p) > 0 && !l.comprovante)
  const semXml = notas.filter((n) => n.tipo === 'NF-e' && !n.arquivos.xml)

  const soma = (arr: Lancamento[], fn: (l: Lancamento) => Cents) => arr.reduce((s, l) => s + fn(l), 0)

  return [
    {
      chave: 'receitas-lancadas',
      titulo: 'Receitas lançadas',
      conceito: 'Valor previsto de recebimento das receitas com competência no período. Não significa dinheiro recebido.',
      valor: soma(recLanc, (l) => l.valor),
      formato: 'brl',
      tom: 'neutro',
      registros: linhasLanc(recLanc, (l) => l.valor, (l) => l.vencimento),
    },
    {
      chave: 'recebido',
      titulo: 'Efetivamente recebido',
      conceito: 'Soma dos recebimentos registrados com data dentro do período, inclusive parciais.',
      valor: soma(recebidos, (l) => realizadoNoPeriodo(l, p)),
      formato: 'brl',
      tom: 'positivo',
      registros: linhasLanc(recebidos, (l) => realizadoNoPeriodo(l, p), (l) => l.pagamentos.at(-1)?.data ?? l.vencimento),
    },
    {
      chave: 'despesas-lancadas',
      titulo: 'Despesas lançadas',
      conceito: 'Valor previsto das despesas com competência no período. Não significa valor pago.',
      valor: soma(despLanc, (l) => l.valor),
      formato: 'brl',
      tom: 'neutro',
      registros: linhasLanc(despLanc, (l) => l.valor, (l) => l.vencimento),
    },
    {
      chave: 'pago',
      titulo: 'Efetivamente pago',
      conceito: 'Soma dos pagamentos registrados com data dentro do período, inclusive parciais.',
      valor: soma(pagos, (l) => realizadoNoPeriodo(l, p)),
      formato: 'brl',
      tom: 'negativo',
      registros: linhasLanc(pagos, (l) => realizadoNoPeriodo(l, p), (l) => l.pagamentos.at(-1)?.data ?? l.vencimento),
    },
    {
      chave: 'pagar-aberto',
      titulo: 'Contas a pagar em aberto',
      conceito: 'Saldo ainda não pago das obrigações com vencimento no período.',
      valor: soma(pagarAberto, emAberto),
      formato: 'brl',
      tom: 'atencao',
      registros: linhasLanc(pagarAberto, emAberto, (l) => l.vencimento),
    },
    {
      chave: 'receber-aberto',
      titulo: 'Contas a receber em aberto',
      conceito: 'Saldo ainda não recebido dos títulos com vencimento no período.',
      valor: soma(receberAberto, emAberto),
      formato: 'brl',
      tom: 'atencao',
      registros: linhasLanc(receberAberto, emAberto, (l) => l.vencimento),
    },
    {
      chave: 'saldo-atual',
      titulo: 'Saldo gerencial atual',
      conceito: 'Saldo de abertura informado + recebimentos − pagamentos registrados até hoje. Ainda não conciliado com extrato bancário.',
      valor: saldoAtual,
      formato: 'brl',
      tom: 'neutro',
      registros: [],
    },
    {
      chave: 'previsao-mes',
      titulo: 'Previsão para o fim do mês',
      conceito: 'Saldo gerencial atual + títulos a receber − títulos a pagar em aberto com vencimento até o último dia do mês corrente (inclui vencidos).',
      valor: previsao,
      formato: 'brl',
      tom: previsao >= 0 ? 'neutro' : 'negativo',
      base: { rotulo: 'Saldo gerencial atual', valor: saldoAtual },
      registros: linhasLanc(aVencerMes, (l) => (l.natureza === 'receber' ? emAberto(l) : -emAberto(l)), (l) => l.vencimento),
    },
    {
      chave: 'vencidas',
      titulo: 'Despesas vencidas',
      conceito: 'Obrigações com vencimento no período, anterior a hoje, ainda não quitadas.',
      valor: soma(vencidas, emAberto),
      formato: 'brl',
      tom: 'negativo',
      registros: linhasLanc(vencidas, emAberto, (l) => l.vencimento),
    },
    {
      chave: 'notas-conferencia',
      titulo: 'Notas aguardando conferência',
      conceito: 'Documentos emitidos no período com status Importada, Aguardando conferência, Pendente de informação ou Em divergência.',
      valor: emConferencia.length,
      formato: 'qtd',
      tom: 'atencao',
      registros: emConferencia.map((n) => ({
        id: n.id,
        descricao: `${n.tipo} nº ${n.numero}`,
        parceiro: n.direcao === 'entrada' ? n.emitente.nome : n.destinatario.nome,
        data: n.emissao,
        valor: n.valorBruto,
        status: n.status,
        href: `/app/notas/${n.id}`,
      })),
    },
    {
      chave: 'docs-contador',
      titulo: 'Documentos pendentes para o contador',
      conceito: 'Pagamentos do período sem comprovante anexado e NF-e sem XML original.',
      valor: semComprovante.length + semXml.length,
      formato: 'qtd',
      tom: 'atencao',
      registros: [
        ...linhasLanc(semComprovante, (l) => realizadoNoPeriodo(l, p), (l) => l.pagamentos.at(-1)?.data ?? l.vencimento).map((r) => ({ ...r, status: 'Sem comprovante' })),
        ...semXml.map((n) => ({ id: n.id, descricao: `${n.tipo} nº ${n.numero}`, parceiro: n.emitente.nome, data: n.emissao, valor: n.valorBruto, status: 'Sem XML', href: `/app/notas/${n.id}` })),
      ],
    },
  ]
}

// ── series for charts ───────────────────────────────────────────────────────

export function serieMensal(f: Filtros, meses = 12) {
  const fimYm = periodo(f).fim.slice(0, 7)
  const ms = monthRange(addMonths(fimYm, -(meses - 1)), fimYm)
  const ls = aplicarDimensoes(f).filter((l) => !l.cancelado)
  return ms.map((ym) => {
    const p = { inicio: `${ym}-01`, fim: lastDayOfMonth(ym) }
    const doMes = ls.filter((l) => l.competencia === ym)
    return {
      ym,
      receitas: doMes.filter((l) => l.natureza === 'receber').reduce((s, l) => s + l.valor, 0),
      despesas: doMes.filter((l) => l.natureza === 'pagar').reduce((s, l) => s + l.valor, 0),
      recebido: ls.filter((l) => l.natureza === 'receber').reduce((s, l) => s + realizadoNoPeriodo(l, p), 0),
      pago: ls.filter((l) => l.natureza === 'pagar').reduce((s, l) => s + realizadoNoPeriodo(l, p), 0),
      saldo: saldoEm(ym === MES_ATUAL ? HOJE : p.fim, f),
      futuro: ym > MES_ATUAL,
    }
  })
}

export function agrupar(ls: Lancamento[], chave: (l: Lancamento) => string, valor: (l: Lancamento) => Cents, top = 8) {
  const m = new Map<string, Cents>()
  for (const l of ls) m.set(chave(l), (m.get(chave(l)) ?? 0) + valor(l))
  const arr = [...m.entries()].sort((a, b) => b[1] - a[1])
  if (arr.length <= top) return arr
  const resto = arr.slice(top - 1).reduce((s, [, v]) => s + v, 0)
  return [...arr.slice(0, top - 1), ['Demais', resto] as [string, Cents]]
}

export function composicaoPeriodo(f: Filtros) {
  const p = periodo(f)
  const ls = aplicarDimensoes(f).filter((l) => !l.cancelado && competenciaNoPeriodo(l, p))
  const despesas = ls.filter((l) => l.natureza === 'pagar')
  const receitas = ls.filter((l) => l.natureza === 'receber')
  const nome = (l: Lancamento) => parceiroById.get(l.parceiroId)?.nome ?? '—'
  return {
    porCategoria: agrupar(despesas, (l) => l.categoria, (l) => l.valor),
    porCliente: agrupar(receitas, nome, (l) => l.valor, 6),
    porFornecedor: agrupar(despesas, nome, (l) => l.valor, 6),
    fixas: despesas.filter((l) => l.tipoDespesa === 'fixa').reduce((s, l) => s + l.valor, 0),
    variaveis: despesas.filter((l) => l.tipoDespesa !== 'fixa').reduce((s, l) => s + l.valor, 0),
  }
}

/** Open receivables/payables due in the next 30/60/90 days (cumulative windows). */
export function projecao(f: Filtros) {
  const ls = aplicarDimensoes({ ...f, situacao: '' }).filter((l) => !l.cancelado && emAberto(l) > 0)
  return [30, 60, 90].map((dias) => {
    const lim = addDays(HOJE, dias)
    const janela = ls.filter((l) => l.vencimento > HOJE && l.vencimento <= lim)
    const entradas = janela.filter((l) => l.natureza === 'receber').reduce((s, l) => s + emAberto(l), 0)
    const saidas = janela.filter((l) => l.natureza === 'pagar').reduce((s, l) => s + emAberto(l), 0)
    return { dias, entradas, saidas, saldoProjetado: saldoEm(HOJE, f) + entradas - saidas }
  })
}
