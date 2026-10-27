// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE DATA (Milestone 1)
// Every screen reads from this module only. Milestone 2 replaces these exports
// with database queries (Netlify Database + Drizzle) keeping the same shapes.
// Data is generated deterministically from a seed so SSR and client match.
// ─────────────────────────────────────────────────────────────────────────────
import { addDays, addMonths, lastDayOfMonth, monthRange, type Cents } from '@/lib/format'
import { buildChave, cnpjCheckDigits } from '@/lib/fiscal-validators'

/** Reference "today" for the sample dataset. */
export const HOJE = '2026-10-16'
export const MES_ATUAL = HOJE.slice(0, 7)
export const PRIMEIRO_MES = '2025-11'
export const ULTIMO_MES = '2027-01'

// ── deterministic PRNG ──────────────────────────────────────────────────────
let seed = 20261016
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const between = (min: number, max: number) => Math.round(min + rand() * (max - min))
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]

function cnpj(base8: string, filial = '0001'): string {
  const b12 = base8 + filial
  return b12 + cnpjCheckDigits(b12)
}

// ── types ───────────────────────────────────────────────────────────────────
export type Empresa = {
  id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  regime: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
  municipio: string
  uf: string
}

export type Parceiro = {
  id: string
  nome: string
  documento: string
  tipo: 'cliente' | 'fornecedor'
  municipio: string
}

export type Natureza = 'pagar' | 'receber'
export type StatusFinanceiro = 'aberto' | 'vencido' | 'parcial' | 'liquidado' | 'cancelado'

export type Pagamento = { data: string; valor: Cents; conta: string }

export type Lancamento = {
  id: string
  empresaId: string
  natureza: Natureza
  descricao: string
  parceiroId: string
  categoria: string
  centroCusto: string
  tipoDespesa: 'fixa' | 'variavel' | null
  recorrenciaId: string | null
  /** Valor previsto para pagamento/recebimento (não é o valor da nota). */
  valor: Cents
  pagamentos: Pagamento[]
  emissao: string
  competencia: string
  vencimento: string
  cancelado: boolean
  notaId: string | null
  comprovante: boolean
}

export type StatusNota =
  | 'Importada'
  | 'Aguardando conferência'
  | 'Aprovada'
  | 'Pendente de informação'
  | 'Vinculada a conta a pagar'
  | 'Vinculada a conta a receber'
  | 'Parcialmente paga'
  | 'Paga ou recebida'
  | 'Cancelada'
  | 'Em divergência'

export type TipoDocumento = 'NF-e' | 'NFS-e' | 'NFC-e' | 'CT-e' | 'NF3-e'

export type Tributos = {
  icms: Cents
  ipi: Cents
  pis: Cents
  cofins: Cents
  iss: Cents
  irrfRetido: Cents
  inssRetido: Cents
  pisCofinsCsllRetido: Cents
  issRetido: Cents
}

export type ItemNota = { descricao: string; quantidade: number; unitario: Cents; total: Cents }

export type HistoricoEvento = { data: string; usuario: string; acao: string; detalhe?: string }

export type NotaFiscal = {
  id: string
  empresaId: string
  tipo: TipoDocumento
  /** entrada = documento recebido (compra/serviço tomado); saida = emitido pela empresa */
  direcao: 'entrada' | 'saida'
  numero: number
  serie: number
  chave: string | null
  emitente: { nome: string; documento: string }
  destinatario: { nome: string; documento: string }
  parceiroId: string
  emissao: string
  competencia: string
  vencimento: string | null
  itens: ItemNota[]
  valorProdutos: Cents
  desconto: Cents
  frete: Cents
  outrasDespesas: Cents
  tributos: Tributos
  valorBruto: Cents
  /** Valor líquido informado no documento; null quando o documento não informa. */
  valorLiquido: Cents | null
  formaPagamento: string
  condicaoPagamento: string
  categoria: string
  centroCusto: string
  status: StatusNota
  lancamentoId: string | null
  arquivos: { xml: boolean; pdf: boolean }
  origem: 'XML importado' | 'PDF lido por IA' | 'Cadastro manual'
  pendencias: string[]
  historico: HistoricoEvento[]
}

// ── master data ─────────────────────────────────────────────────────────────
export const empresas: Empresa[] = [
  {
    id: 'emp-1',
    razaoSocial: 'Lider Seg Serviços de Segurança Ltda.',
    nomeFantasia: 'Lider Seg',
    cnpj: cnpj('28417305'),
    regime: 'Lucro Presumido',
    municipio: 'São Paulo',
    uf: 'SP',
  },
  {
    id: 'emp-2',
    razaoSocial: 'Lider Seg Tecnologia e Monitoramento Ltda.',
    nomeFantasia: 'Lider Seg Tech',
    cnpj: cnpj('39102846'),
    regime: 'Simples Nacional',
    municipio: 'Campinas',
    uf: 'SP',
  },
]

const fornecedoresBase: Array<[string, string, string]> = [
  ['Imobiliária Paulista Administração', '11203948', 'São Paulo'],
  ['Enel Distribuição São Paulo', '61695227', 'São Paulo'],
  ['Sabesp', '43776517', 'São Paulo'],
  ['Vivo Empresas', '02558157', 'São Paulo'],
  ['Exato Contabilidade', '17330291', 'São Paulo'],
  ['Totvs Cloud', '53113791', 'São Paulo'],
  ['Porto Seguro Empresas', '61198164', 'São Paulo'],
  ['Posto Ipiranga Marginal', '33337122', 'São Paulo'],
  ['Kalunga Comércio', '43283811', 'São Paulo'],
  ['Limpeza Total Distribuidora', '20118473', 'Guarulhos'],
  ['Hikvision do Brasil', '22672405', 'Barueri'],
  ['Agência Pixel Mkt', '30552817', 'São Paulo'],
  ['Mecânica Rota Certa', '14488305', 'Osasco'],
  ['Ana Ribeiro Consultoria', '41920374', 'São Paulo'],
  ['Banco Itaú Unibanco', '60701190', 'São Paulo'],
  ['Folha de Pagamento (interno)', '28417305', 'São Paulo'],
]

const clientesBase: Array<[string, string, string]> = [
  ['Condomínio Parque das Flores', '07341298', 'São Paulo'],
  ['Shopping Vila Nova', '12907735', 'São Paulo'],
  ['Hospital Santa Lúcia', '50612984', 'Santo André'],
  ['Logística Rápida Transportes', '23854107', 'Guarulhos'],
  ['Colégio Horizonte', '09485162', 'São Paulo'],
  ['Indústria Metalúrgica Forte', '45120638', 'São Bernardo do Campo'],
  ['Rede Mercado Bom Preço', '31748209', 'Campinas'],
]

export const parceiros: Parceiro[] = [
  ...fornecedoresBase.map(([nome, b, mun], i) => ({
    id: `for-${i + 1}`,
    nome,
    documento: cnpj(b),
    tipo: 'fornecedor' as const,
    municipio: mun,
  })),
  ...clientesBase.map(([nome, b, mun], i) => ({
    id: `cli-${i + 1}`,
    nome,
    documento: cnpj(b),
    tipo: 'cliente' as const,
    municipio: mun,
  })),
]

export const parceiroById = new Map(parceiros.map((p) => [p.id, p]))
export const empresaById = new Map(empresas.map((e) => [e.id, e]))

export const categoriasDespesa = [
  'Folha de pagamento',
  'Freelancers e prestadores',
  'Impostos e contribuições',
  'Aluguel',
  'Energia elétrica',
  'Água',
  'Internet e telefonia',
  'Combustível',
  'Manutenção',
  'Materiais de consumo',
  'Material de limpeza',
  'Honorários contábeis',
  'Tarifas bancárias',
  'Marketing',
  'Equipamentos',
  'Seguros',
  'Softwares e assinaturas',
] as const

export const categoriasReceita = ['Vigilância patrimonial', 'Monitoramento eletrônico', 'Portaria remota', 'Instalação de sistemas'] as const

export const centrosCusto = ['Administrativo', 'Operações', 'Comercial', 'Tecnologia'] as const
export const contasBancarias = ['Itaú — Conta corrente 12345-6', 'Banco do Brasil — 98765-0']

/** Saldo de abertura gerencial informado em 01/11/2025 (soma das contas). */
export const SALDO_ABERTURA: Cents = 18_540_000

// ── recurring commitments ───────────────────────────────────────────────────
type Recorrencia = {
  id: string
  descricao: string
  fornecedor: string
  categoria: string
  centroCusto: string
  base: Cents
  variacao: number // 0 = valor fixo
  dia: number
  tipoDoc: TipoDocumento | null
}

export const recorrencias: Recorrencia[] = [
  { id: 'rec-1', descricao: 'Aluguel sede administrativa', fornecedor: 'for-1', categoria: 'Aluguel', centroCusto: 'Administrativo', base: 850_000, variacao: 0, dia: 5, tipoDoc: null },
  { id: 'rec-2', descricao: 'Folha de pagamento', fornecedor: 'for-16', categoria: 'Folha de pagamento', centroCusto: 'Operações', base: 4_620_000, variacao: 0.03, dia: 5, tipoDoc: null },
  { id: 'rec-3', descricao: 'Energia elétrica — sede', fornecedor: 'for-2', categoria: 'Energia elétrica', centroCusto: 'Administrativo', base: 158_000, variacao: 0.18, dia: 15, tipoDoc: 'NF3-e' },
  { id: 'rec-4', descricao: 'Água e esgoto', fornecedor: 'for-3', categoria: 'Água', centroCusto: 'Administrativo', base: 22_000, variacao: 0.15, dia: 20, tipoDoc: null },
  { id: 'rec-5', descricao: 'Internet dedicada + telefonia', fornecedor: 'for-4', categoria: 'Internet e telefonia', centroCusto: 'Tecnologia', base: 48_990, variacao: 0, dia: 10, tipoDoc: 'NFS-e' },
  { id: 'rec-6', descricao: 'Honorários contábeis', fornecedor: 'for-5', categoria: 'Honorários contábeis', centroCusto: 'Administrativo', base: 180_000, variacao: 0, dia: 10, tipoDoc: 'NFS-e' },
  { id: 'rec-7', descricao: 'ERP em nuvem', fornecedor: 'for-6', categoria: 'Softwares e assinaturas', centroCusto: 'Tecnologia', base: 124_900, variacao: 0, dia: 8, tipoDoc: 'NFS-e' },
  { id: 'rec-8', descricao: 'Seguro empresarial (parcela)', fornecedor: 'for-7', categoria: 'Seguros', centroCusto: 'Administrativo', base: 64_000, variacao: 0, dia: 25, tipoDoc: null },
]

const variaveis: Array<{ fornecedor: string; categoria: string; centroCusto: string; min: number; max: number; tipoDoc: TipoDocumento; desc: string; prob: number }> = [
  { fornecedor: 'for-8', categoria: 'Combustível', centroCusto: 'Operações', min: 180_000, max: 320_000, tipoDoc: 'NFC-e', desc: 'Abastecimento frota de rondas', prob: 1 },
  { fornecedor: 'for-9', categoria: 'Materiais de consumo', centroCusto: 'Administrativo', min: 35_000, max: 120_000, tipoDoc: 'NF-e', desc: 'Material de escritório', prob: 0.7 },
  { fornecedor: 'for-10', categoria: 'Material de limpeza', centroCusto: 'Administrativo', min: 28_000, max: 65_000, tipoDoc: 'NF-e', desc: 'Produtos de limpeza', prob: 0.6 },
  { fornecedor: 'for-11', categoria: 'Equipamentos', centroCusto: 'Tecnologia', min: 420_000, max: 1_650_000, tipoDoc: 'NF-e', desc: 'Câmeras IP e DVRs', prob: 0.45 },
  { fornecedor: 'for-12', categoria: 'Marketing', centroCusto: 'Comercial', min: 250_000, max: 600_000, tipoDoc: 'NFS-e', desc: 'Gestão de mídia e campanhas', prob: 0.6 },
  { fornecedor: 'for-13', categoria: 'Manutenção', centroCusto: 'Operações', min: 60_000, max: 380_000, tipoDoc: 'NFS-e', desc: 'Manutenção de veículos', prob: 0.55 },
  { fornecedor: 'for-14', categoria: 'Freelancers e prestadores', centroCusto: 'Tecnologia', min: 300_000, max: 850_000, tipoDoc: 'NFS-e', desc: 'Consultoria em projetos de CFTV', prob: 0.5 },
  { fornecedor: 'for-15', categoria: 'Tarifas bancárias', centroCusto: 'Administrativo', min: 8_900, max: 21_000, tipoDoc: 'NFS-e', desc: 'Tarifas e pacote de serviços', prob: 1 },
]

const contratosClientes: Array<{ cliente: string; categoria: string; base: number; empresaId: string }> = [
  { cliente: 'cli-1', categoria: 'Vigilância patrimonial', base: 2_480_000, empresaId: 'emp-1' },
  { cliente: 'cli-2', categoria: 'Vigilância patrimonial', base: 4_350_000, empresaId: 'emp-1' },
  { cliente: 'cli-3', categoria: 'Monitoramento eletrônico', base: 1_890_000, empresaId: 'emp-2' },
  { cliente: 'cli-4', categoria: 'Portaria remota', base: 1_260_000, empresaId: 'emp-2' },
  { cliente: 'cli-5', categoria: 'Vigilância patrimonial', base: 1_740_000, empresaId: 'emp-1' },
  { cliente: 'cli-6', categoria: 'Monitoramento eletrônico', base: 980_000, empresaId: 'emp-2' },
  { cliente: 'cli-7', categoria: 'Portaria remota', base: 1_520_000, empresaId: 'emp-2' },
]

// ── generation ──────────────────────────────────────────────────────────────
const lancamentosGerados: Lancamento[] = []
const notasGeradas: NotaFiscal[] = []
const seqNota = { saida: 1840, entrada: 0 }

function day(ym: string, d: number) {
  const max = Number(lastDayOfMonth(ym).slice(8))
  return `${ym}-${String(Math.min(d, max)).padStart(2, '0')}`
}

function gerarPagamentos(natureza: Natureza, valor: Cents, vencimento: string): Pagamento[] {
  const conta = natureza === 'receber' ? contasBancarias[0] : pick(contasBancarias)
  if (vencimento > HOJE) {
    // Algumas antecipações apenas em contas a pagar próximas.
    return []
  }
  const r = rand()
  const inadimplencia = natureza === 'receber' ? 0.1 : vencimento.slice(0, 7) === MES_ATUAL ? 0.22 : 0.04
  if (r < inadimplencia) return []
  if (r < inadimplencia + 0.06) {
    const parcial = Math.round(valor * pick([0.3, 0.4, 0.5]))
    return [{ data: addDays(vencimento, between(0, 3)), valor: parcial, conta }]
  }
  const data = addDays(vencimento, between(-2, natureza === 'receber' ? 6 : 2))
  return [{ data: data > HOJE ? HOJE : data, valor, conta }]
}

function zeroTributos(): Tributos {
  return { icms: 0, ipi: 0, pis: 0, cofins: 0, iss: 0, irrfRetido: 0, inssRetido: 0, pisCofinsCsllRetido: 0, issRetido: 0 }
}

function criarNota(params: {
  lanc: Lancamento
  tipo: TipoDocumento
  direcao: 'entrada' | 'saida'
  bruto: Cents
  itens: ItemNota[]
}): NotaFiscal {
  const { lanc, tipo, direcao, bruto } = params
  const empresa = empresaById.get(lanc.empresaId)!
  const parceiro = parceiroById.get(lanc.parceiroId)!
  const numero = direcao === 'saida' ? ++seqNota.saida : between(1000, 999999)
  const serie = tipo === 'NFS-e' ? 1 : between(1, 3)
  const modelo = tipo === 'NF-e' ? '55' : tipo === 'NFC-e' ? '65' : tipo === 'CT-e' ? '57' : tipo === 'NF3-e' ? '66' : ''
  const emitente = direcao === 'saida' ? { nome: empresa.razaoSocial, documento: empresa.cnpj } : { nome: parceiro.nome, documento: parceiro.documento }
  const destinatario = direcao === 'saida' ? { nome: parceiro.nome, documento: parceiro.documento } : { nome: empresa.razaoSocial, documento: empresa.cnpj }
  const chave = modelo
    ? buildChave({ cUF: '35', aamm: lanc.emissao.slice(2, 4) + lanc.emissao.slice(5, 7), cnpj: emitente.documento, modelo, serie, numero, codigo: between(10000000, 99999999) })
    : null

  const tributos = zeroTributos()
  let liquido: Cents | null = bruto
  if (tipo === 'NFS-e') {
    tributos.iss = Math.round(bruto * 0.05)
    if (direcao === 'saida' && bruto > 1_000_000) {
      // Retenções destacadas na nota emitida para tomadores PJ.
      tributos.inssRetido = Math.round(bruto * 0.11)
      tributos.irrfRetido = Math.round(bruto * 0.01)
      tributos.pisCofinsCsllRetido = Math.round(bruto * 0.0465)
      liquido = bruto - tributos.inssRetido - tributos.irrfRetido - tributos.pisCofinsCsllRetido
    }
  } else if (tipo === 'NF-e') {
    tributos.icms = Math.round(bruto * 0.18)
    tributos.pis = Math.round(bruto * 0.0165)
    tributos.cofins = Math.round(bruto * 0.076)
  }

  return {
    id: `nf-${notasGeradas.length + 1}`,
    empresaId: lanc.empresaId,
    tipo,
    direcao,
    numero,
    serie,
    chave,
    emitente,
    destinatario,
    parceiroId: lanc.parceiroId,
    emissao: lanc.emissao,
    competencia: lanc.competencia,
    vencimento: tipo === 'NFC-e' ? null : lanc.vencimento,
    itens: params.itens,
    valorProdutos: bruto,
    desconto: 0,
    frete: 0,
    outrasDespesas: 0,
    tributos,
    valorBruto: bruto,
    valorLiquido: liquido,
    formaPagamento: direcao === 'saida' ? 'Boleto bancário' : pick(['Boleto bancário', 'PIX', 'Transferência']),
    condicaoPagamento: tipo === 'NFC-e' ? 'À vista' : direcao === 'saida' ? '30 dias' : 'Vencimento único',
    categoria: lanc.categoria,
    centroCusto: lanc.centroCusto,
    status: 'Aprovada',
    lancamentoId: lanc.id,
    arquivos: { xml: tipo !== 'NFS-e' || rand() > 0.3, pdf: rand() > 0.08 },
    origem: tipo === 'NFS-e' && rand() > 0.5 ? 'PDF lido por IA' : direcao === 'saida' ? 'XML importado' : pick(['XML importado', 'PDF lido por IA', 'Cadastro manual'] as const),
    pendencias: [],
    historico: [],
  }
}

let seqLanc = 0
function novoLancamento(p: Omit<Lancamento, 'id' | 'pagamentos' | 'cancelado' | 'notaId' | 'comprovante'>): Lancamento {
  const l: Lancamento = {
    ...p,
    id: `lan-${++seqLanc}`,
    pagamentos: gerarPagamentos(p.natureza, p.valor, p.vencimento),
    cancelado: false,
    notaId: null,
    comprovante: false,
  }
  l.comprovante = l.pagamentos.length > 0 && rand() > 0.12
  lancamentosGerados.push(l)
  return l
}

for (const ym of monthRange(PRIMEIRO_MES, ULTIMO_MES)) {
  const futuro = ym > MES_ATUAL
  const idx = monthRange(PRIMEIRO_MES, ym).length

  // Recorrências: previsões geradas para todos os meses, inclusive futuros.
  for (const r of recorrencias) {
    const valor = r.variacao ? Math.round(r.base * (1 + (rand() - 0.5) * r.variacao)) : r.base
    const venc = day(ym, r.dia)
    const lanc = novoLancamento({
      empresaId: 'emp-1',
      natureza: 'pagar',
      descricao: r.descricao,
      parceiroId: r.fornecedor,
      categoria: r.categoria,
      centroCusto: r.centroCusto,
      tipoDespesa: 'fixa',
      recorrenciaId: r.id,
      valor,
      emissao: addDays(venc, -10),
      competencia: addMonths(ym, r.categoria === 'Folha de pagamento' ? -1 : 0),
      vencimento: venc,
    })
    if (r.tipoDoc && !futuro) {
      const nota = criarNota({ lanc, tipo: r.tipoDoc, direcao: 'entrada', bruto: valor, itens: [{ descricao: r.descricao, quantidade: 1, unitario: valor, total: valor }] })
      lanc.notaId = nota.id
      notasGeradas.push(nota)
    }
  }

  // Impostos sobre faturamento (guia), estimados — sem nota fiscal.
  if (!futuro || ym === addMonths(MES_ATUAL, 1)) {
    novoLancamento({
      empresaId: 'emp-1',
      natureza: 'pagar',
      descricao: 'Guias de tributos federais e municipais (DARF/ISS)',
      parceiroId: 'for-16',
      categoria: 'Impostos e contribuições',
      centroCusto: 'Administrativo',
      tipoDespesa: 'variavel',
      recorrenciaId: null,
      valor: between(1_150_000, 1_480_000),
      emissao: day(ym, 1),
      competencia: addMonths(ym, -1),
      vencimento: day(ym, 20),
    })
  }

  // Receitas de contratos (NFS-e de saída), com leve crescimento ao longo do ano.
  for (const c of contratosClientes) {
    if (c.cliente === 'cli-7' && idx < 4) continue // contrato iniciado em fevereiro
    const valor = Math.round(c.base * (1 + idx * 0.006) * (1 + (rand() - 0.5) * 0.04))
    const emissao = day(ym, between(1, 5))
    const lanc = novoLancamento({
      empresaId: c.empresaId,
      natureza: 'receber',
      descricao: `${c.categoria} — ${ym.slice(5)}/${ym.slice(0, 4)}`,
      parceiroId: c.cliente,
      categoria: c.categoria,
      centroCusto: 'Operações',
      tipoDespesa: null,
      recorrenciaId: null,
      valor,
      emissao,
      competencia: ym,
      vencimento: addDays(emissao, 30),
    })
    if (futuro) {
      // Previsão contratual: sem documento fiscal até a emissão real.
      lanc.valor = valor > 1_000_000 ? Math.round(valor * 0.8335) : valor
      continue
    }
    const nota = criarNota({ lanc, tipo: 'NFS-e', direcao: 'saida', bruto: valor, itens: [{ descricao: `Prestação de serviços de ${c.categoria.toLowerCase()} — competência ${ym.slice(5)}/${ym.slice(0, 4)}`, quantidade: 1, unitario: valor, total: valor }] })
    // Valor previsto de recebimento = líquido das retenções destacadas.
    lanc.valor = nota.valorLiquido ?? valor
    lanc.pagamentos = gerarPagamentos('receber', lanc.valor, lanc.vencimento)
    lanc.comprovante = lanc.pagamentos.length > 0
    lanc.notaId = nota.id
    notasGeradas.push(nota)
  }

  if (futuro) continue

  // Despesas variáveis com documento fiscal.
  for (const v of variaveis) {
    if (rand() > v.prob) continue
    const emissao = day(ym, between(2, 26))
    const valor = between(v.min, v.max)
    const lanc = novoLancamento({
      empresaId: v.categoria === 'Equipamentos' && rand() > 0.5 ? 'emp-2' : 'emp-1',
      natureza: 'pagar',
      descricao: v.desc,
      parceiroId: v.fornecedor,
      categoria: v.categoria,
      centroCusto: v.centroCusto,
      tipoDespesa: 'variavel',
      recorrenciaId: null,
      valor,
      emissao,
      competencia: ym,
      vencimento: v.tipoDoc === 'NFC-e' ? emissao : addDays(emissao, pick([14, 21, 28])),
    })
    const qtd = v.categoria === 'Equipamentos' ? between(4, 16) : 1
    const nota = criarNota({
      lanc,
      tipo: v.tipoDoc,
      direcao: 'entrada',
      bruto: valor,
      itens: [{ descricao: v.desc, quantidade: qtd, unitario: Math.round(valor / qtd), total: valor }],
    })
    lanc.notaId = nota.id
    notasGeradas.push(nota)
  }

  // Instalações avulsas (NF-e de saída de equipamentos).
  if (rand() > 0.45) {
    const emissao = day(ym, between(8, 24))
    const valor = between(650_000, 2_400_000)
    const cliente = pick(['cli-4', 'cli-6', 'cli-7', 'cli-3'])
    const lanc = novoLancamento({
      empresaId: 'emp-2',
      natureza: 'receber',
      descricao: 'Instalação de sistema de CFTV',
      parceiroId: cliente,
      categoria: 'Instalação de sistemas',
      centroCusto: 'Tecnologia',
      tipoDespesa: null,
      recorrenciaId: null,
      valor,
      emissao,
      competencia: ym,
      vencimento: addDays(emissao, 21),
    })
    const nota = criarNota({ lanc, tipo: 'NF-e', direcao: 'saida', bruto: valor, itens: [{ descricao: 'Kit CFTV com instalação', quantidade: 1, unitario: valor, total: valor }] })
    lanc.notaId = nota.id
    notasGeradas.push(nota)
  }
}

// ── note statuses derived from their financial link ─────────────────────────
export function realizado(l: Lancamento): Cents {
  return l.pagamentos.reduce((s, p) => s + p.valor, 0)
}

export function statusFinanceiro(l: Lancamento): StatusFinanceiro {
  if (l.cancelado) return 'cancelado'
  const pago = realizado(l)
  if (pago >= l.valor) return 'liquidado'
  if (pago > 0) return 'parcial'
  if (l.vencimento < HOJE) return 'vencido'
  return 'aberto'
}

const lancById = new Map(lancamentosGerados.map((l) => [l.id, l]))

for (const n of notasGeradas) {
  const l = n.lancamentoId ? lancById.get(n.lancamentoId) : undefined
  const st = l ? statusFinanceiro(l) : 'aberto'
  n.status =
    st === 'liquidado' ? 'Paga ou recebida' : st === 'parcial' ? 'Parcialmente paga' : n.direcao === 'entrada' ? 'Vinculada a conta a pagar' : 'Vinculada a conta a receber'
  n.historico = [
    { data: n.emissao, usuario: n.origem === 'Cadastro manual' ? 'Mariana Costa' : 'Sistema', acao: n.origem === 'Cadastro manual' ? 'Documento cadastrado manualmente' : `Documento recebido (${n.origem})` },
    { data: addDays(n.emissao, 1), usuario: 'Mariana Costa', acao: 'Conferência aprovada', detalhe: `Categoria: ${n.categoria}` },
    { data: addDays(n.emissao, 1), usuario: 'Sistema', acao: n.direcao === 'entrada' ? 'Conta a pagar vinculada' : 'Conta a receber vinculada', detalhe: l?.id },
    ...(l?.pagamentos ?? []).map((p) => ({ data: p.data, usuario: 'Rafael Souza', acao: n.direcao === 'entrada' ? 'Pagamento registrado' : 'Recebimento registrado', detalhe: `${(p.valor / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} — ${p.conta}` })),
  ]
}

// Notas recentes ainda em conferência (outubro/2026): não geram obrigação até aprovação.
const notasOutubro = notasGeradas.filter((n) => n.competencia === MES_ATUAL && n.direcao === 'entrada' && n.tipo !== 'NF3-e')
const conferencia: Array<[StatusNota, string[]]> = [
  ['Aguardando conferência', ['Categoria sugerida pela IA precisa de confirmação']],
  ['Aguardando conferência', ['Confiança baixa na data de vencimento (62%)']],
  ['Importada', []],
  ['Pendente de informação', ['Valor líquido não informado no documento', 'Centro de custo não definido']],
  ['Em divergência', ['Soma dos itens (R$) difere do valor total da nota', 'Boleto anexado com valor diferente da nota']],
  ['Aguardando conferência', ['Fornecedor novo: confirmar cadastro']],
]
notasOutubro.slice(-conferencia.length).forEach((n, i) => {
  const [status, pend] = conferencia[i]
  n.status = status
  n.pendencias = pend
  if (status === 'Pendente de informação') n.valorLiquido = null
  if (status === 'Em divergência') n.itens = n.itens.map((it) => ({ ...it, total: it.total + 12_500 }))
  n.historico = [{ data: n.emissao, usuario: 'Sistema', acao: `Documento recebido (${n.origem})`, detalhe: 'Aguardando conferência humana' }]
  // Obrigação só nasce após aprovação: desvincula o lançamento gerado.
  const l = n.lancamentoId ? lancById.get(n.lancamentoId) : undefined
  if (l) {
    const pos = lancamentosGerados.indexOf(l)
    if (pos >= 0) lancamentosGerados.splice(pos, 1)
  }
  n.lancamentoId = null
})

// Duas notas canceladas: preservadas no histórico, fora dos totais operacionais.
const canceladas = notasGeradas.filter((n) => n.direcao === 'saida' && n.tipo === 'NF-e' && n.competencia < MES_ATUAL).slice(1, 3)
for (const n of canceladas) {
  n.status = 'Cancelada'
  const l = n.lancamentoId ? lancById.get(n.lancamentoId) : undefined
  if (l) {
    l.cancelado = true
    l.pagamentos = []
    l.comprovante = false
  }
  n.historico.push({ data: addDays(n.emissao, 2), usuario: 'Mariana Costa', acao: 'Nota cancelada', detalhe: 'Justificativa: erro no valor do serviço; substituída por nova emissão' })
}

export const lancamentos: readonly Lancamento[] = lancamentosGerados
export const notasFiscais: readonly NotaFiscal[] = notasGeradas.sort((a, b) => (a.emissao < b.emissao ? 1 : -1))
export const notaById = new Map(notasFiscais.map((n) => [n.id, n]))
export const lancamentoById = new Map(lancamentos.map((l) => [l.id, l]))

export const STATUS_EM_CONFERENCIA: StatusNota[] = ['Importada', 'Aguardando conferência', 'Pendente de informação', 'Em divergência']
