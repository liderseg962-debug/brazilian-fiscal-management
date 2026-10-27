// Client-side NF-e XML extraction + deterministic validation.
// XML is structured data, so no AI is involved here: every value is read from a
// specific tag, and anything absent stays null with a stated reason.
import { HOJE, empresas, notasFiscais, type TipoDocumento } from '@/data/fixtures'
import type { Cents } from './format'
import { brl } from './format'
import { isValidChave, isValidCpfCnpj, onlyDigits } from './fiscal-validators'

export type Fonte = 'xml' | 'regra' | 'usuario'

export type Campo<T> = {
  valor: T | null
  /** 0–1. Below 0.8 forces manual review. */
  confianca: number
  fonte: Fonte
  motivo?: string
}

export type Extracao = {
  tipo: Campo<TipoDocumento>
  direcao: Campo<'entrada' | 'saida'>
  numero: Campo<string>
  serie: Campo<string>
  chave: Campo<string>
  emitenteNome: Campo<string>
  emitenteDoc: Campo<string>
  destinatarioNome: Campo<string>
  destinatarioDoc: Campo<string>
  emissao: Campo<string>
  vencimento: Campo<string>
  descricao: Campo<string>
  valorProdutos: Campo<Cents>
  desconto: Campo<Cents>
  frete: Campo<Cents>
  outrasDespesas: Campo<Cents>
  valorBruto: Campo<Cents>
  valorLiquido: Campo<Cents>
  valorFinanceiro: Campo<Cents>
  tributos: Campo<string>
  formaPagamento: Campo<string>
  categoria: Campo<string>
}

export type CampoChave = keyof Extracao

export type Verificacao = { nivel: 'erro' | 'alerta' | 'ok'; texto: string; campo?: CampoChave }

const xml = <T,>(valor: T | null, motivo?: string): Campo<T> =>
  valor === null || valor === '' ? { valor: null, confianca: 0, fonte: 'xml', motivo: motivo ?? 'Não encontrado no XML' } : { valor, confianca: 0.99, fonte: 'xml' }

function txt(el: Element | Document | null | undefined, tag: string): string | null {
  if (!el) return null
  const found = el.getElementsByTagName(tag)[0]
  const t = found?.textContent?.trim()
  return t ? t : null
}

function cents(s: string | null): Cents | null {
  if (s === null) return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

const TPAG: Record<string, string> = {
  '01': 'Dinheiro',
  '03': 'Cartão de crédito',
  '04': 'Cartão de débito',
  '15': 'Boleto bancário',
  '16': 'Depósito bancário',
  '17': 'PIX',
  '18': 'Transferência',
  '90': 'Sem pagamento',
  '99': 'Outros',
}

const PALAVRAS_CATEGORIA: Array<[RegExp, string]> = [
  [/c[âa]mera|dvr|nvr|cftv|sensor|alarme|equipamento|monitor/i, 'Equipamentos'],
  [/gasolina|diesel|etanol|combust/i, 'Combustível'],
  [/papel|caneta|toner|escrit/i, 'Materiais de consumo'],
  [/detergente|desinfetante|limpeza|sab[ãa]o/i, 'Material de limpeza'],
  [/pneu|pe[çc]a|manuten|reparo|[óo]leo/i, 'Manutenção'],
  [/software|licen[çc]a|assinatura|cloud|nuvem/i, 'Softwares e assinaturas'],
  [/energia|kwh/i, 'Energia elétrica'],
  [/internet|telefon|link dedicado/i, 'Internet e telefonia'],
]

export type Resultado = {
  extracao: Extracao
  itens: Array<{ descricao: string; quantidade: number; unitario: Cents; total: Cents }>
  duplicataDe: string | null
}

export function lerNFeXml(conteudo: string): Resultado | { erro: string } {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(conteudo, 'application/xml')
  } catch {
    return { erro: 'Não foi possível interpretar o arquivo como XML.' }
  }
  if (doc.getElementsByTagName('parsererror').length) return { erro: 'XML malformado: o arquivo está corrompido ou incompleto.' }
  const inf = doc.getElementsByTagName('infNFe')[0]
  if (!inf) {
    if (doc.getElementsByTagName('CompNfse').length || doc.getElementsByTagName('Nfse').length)
      return { erro: 'XML de NFS-e identificado. A leitura de leiautes municipais de NFS-e chega junto com o processamento no servidor.' }
    return { erro: 'Este XML não é uma NF-e/NFC-e (elemento infNFe ausente).' }
  }

  const ide = inf.getElementsByTagName('ide')[0]
  const emit = inf.getElementsByTagName('emit')[0]
  const dest = inf.getElementsByTagName('dest')[0]
  const tot = inf.getElementsByTagName('ICMSTot')[0]

  const chaveAttr = onlyDigits(inf.getAttribute('Id') ?? '')
  const modelo = txt(ide, 'mod')
  const tipo: TipoDocumento | null = modelo === '55' ? 'NF-e' : modelo === '65' ? 'NFC-e' : null

  const emitDoc = txt(emit, 'CNPJ') ?? txt(emit, 'CPF')
  const destDoc = txt(dest, 'CNPJ') ?? txt(dest, 'CPF')
  const empresaCnpjs = new Set(empresas.map((e) => e.cnpj))
  const direcao: 'entrada' | 'saida' | null = emitDoc && empresaCnpjs.has(emitDoc) ? 'saida' : destDoc && empresaCnpjs.has(destDoc) ? 'entrada' : null

  const itens = [...inf.getElementsByTagName('det')].map((d) => ({
    descricao: txt(d, 'xProd') ?? '(sem descrição)',
    quantidade: Number(txt(d, 'qCom') ?? '1'),
    unitario: cents(txt(d, 'vUnCom')) ?? 0,
    total: cents(txt(d, 'vProd')) ?? 0,
  }))

  const dups = [...inf.getElementsByTagName('dup')].map((d) => ({ venc: txt(d, 'dVenc'), valor: cents(txt(d, 'vDup')) ?? 0 }))
  const somaDups = dups.reduce((s, d) => s + d.valor, 0)
  const tPag = txt(inf.getElementsByTagName('pag')[0], 'tPag')

  const icms = cents(txt(tot, 'vICMS'))
  const ipi = cents(txt(tot, 'vIPI'))
  const pis = cents(txt(tot, 'vPIS'))
  const cofins = cents(txt(tot, 'vCOFINS'))
  const tribTexto = [
    ['ICMS', icms],
    ['IPI', ipi],
    ['PIS', pis],
    ['COFINS', cofins],
  ]
    .filter(([, v]) => (v as number) > 0)
    .map(([n, v]) => `${n} ${brl(v as number)}`)
    .join(' · ')

  const descricao = itens.map((i) => i.descricao).join('; ')
  const sugestao = PALAVRAS_CATEGORIA.find(([re]) => re.test(descricao))?.[1] ?? null

  const extracao: Extracao = {
    tipo: xml(tipo, modelo ? `Modelo ${modelo} não suportado nesta leitura` : 'Modelo do documento ausente'),
    direcao: direcao
      ? { valor: direcao, confianca: 0.99, fonte: 'regra' }
      : { valor: null, confianca: 0, fonte: 'regra', motivo: 'Nem o emitente nem o destinatário são empresas cadastradas' },
    numero: xml(txt(ide, 'nNF')),
    serie: xml(txt(ide, 'serie')),
    chave: xml(chaveAttr.length ? chaveAttr : null, 'Atributo Id da infNFe ausente'),
    emitenteNome: xml(txt(emit, 'xNome')),
    emitenteDoc: xml(emitDoc),
    destinatarioNome: xml(txt(dest, 'xNome')),
    destinatarioDoc: xml(destDoc),
    emissao: xml((txt(ide, 'dhEmi') ?? txt(ide, 'dEmi'))?.slice(0, 10) ?? null),
    vencimento: dups.length
      ? xml(dups.map((d) => d.venc).filter(Boolean).sort()[0] ?? null)
      : { valor: null, confianca: 0, fonte: 'xml', motivo: 'O XML não traz duplicatas (cobr/dup): vencimento não informado no documento' },
    descricao: xml(descricao || null),
    valorProdutos: xml(cents(txt(tot, 'vProd'))),
    desconto: xml(cents(txt(tot, 'vDesc')) ?? 0),
    frete: xml(cents(txt(tot, 'vFrete')) ?? 0),
    outrasDespesas: xml(cents(txt(tot, 'vOutro')) ?? 0),
    valorBruto: xml(cents(txt(tot, 'vNF')), 'Valor total (vNF) ausente'),
    valorLiquido: { valor: null, confianca: 0, fonte: 'xml', motivo: 'A NF-e informa apenas o valor total (vNF); não há valor líquido explícito no documento. Preencha somente se houver retenções a considerar.' },
    valorFinanceiro: dups.length
      ? { valor: somaDups, confianca: 0.95, fonte: 'xml', motivo: `Soma de ${dups.length} duplicata(s) informada(s) no XML` }
      : { valor: null, confianca: 0, fonte: 'xml', motivo: 'Sem duplicatas no XML: confirme o valor a pagar/receber' },
    tributos: xml(tribTexto || null, 'Nenhum tributo destacado'),
    formaPagamento: xml(tPag ? (TPAG[tPag] ?? `Código ${tPag}`) : null),
    categoria: sugestao
      ? { valor: sugestao, confianca: 0.6, fonte: 'regra', motivo: 'Sugestão por palavras-chave na descrição dos itens. Confirme a categoria.' }
      : { valor: null, confianca: 0, fonte: 'regra', motivo: 'Sem sugestão segura: informe a categoria' },
  }

  return { extracao, itens, duplicataDe: buscarDuplicata(extracao) }
}

/** Duplicate check: access key first; otherwise CNPJ + number + series + date + type + amount. */
export function buscarDuplicata(e: Extracao, extras: Array<{ id: string; chave: string | null; emitenteDoc: string; numero: string; serie: string; emissao: string; tipo: string; valor: number }> = []): string | null {
  const base = [
    ...notasFiscais.map((n) => ({ id: n.id, chave: n.chave, emitenteDoc: n.emitente.documento, numero: String(n.numero), serie: String(n.serie), emissao: n.emissao, tipo: n.tipo, valor: n.valorBruto })),
    ...extras,
  ]
  if (e.chave.valor) {
    const hit = base.find((n) => n.chave === e.chave.valor)
    if (hit) return hit.id
  }
  const hit = base.find(
    (n) =>
      n.emitenteDoc === e.emitenteDoc.valor &&
      n.numero === e.numero.valor &&
      n.serie === e.serie.valor &&
      n.emissao === e.emissao.valor &&
      n.tipo === e.tipo.valor &&
      n.valor === e.valorBruto.valor,
  )
  return hit?.id ?? null
}

export function validar(e: Extracao, itens: Resultado['itens']): Verificacao[] {
  const out: Verificacao[] = []
  const v = (k: CampoChave) => e[k].valor

  if (e.chave.valor) {
    if (!isValidChave(e.chave.valor)) out.push({ nivel: 'erro', texto: 'Chave de acesso inválida (dígito verificador não confere)', campo: 'chave' })
    else {
      const c = e.chave.valor
      if (e.emitenteDoc.valor && c.slice(6, 20) !== onlyDigits(e.emitenteDoc.valor).padStart(14, '0')) out.push({ nivel: 'erro', texto: 'CNPJ do emitente difere do contido na chave de acesso', campo: 'emitenteDoc' })
      if (e.numero.valor && Number(c.slice(25, 34)) !== Number(e.numero.valor)) out.push({ nivel: 'erro', texto: 'Número da nota difere do contido na chave de acesso', campo: 'numero' })
      if (e.serie.valor && Number(c.slice(22, 25)) !== Number(e.serie.valor)) out.push({ nivel: 'erro', texto: 'Série difere da contida na chave de acesso', campo: 'serie' })
      if (!out.some((o) => o.campo === 'chave')) out.push({ nivel: 'ok', texto: 'Chave de acesso válida e coerente com emitente, número e série' })
    }
  }
  for (const [k, rot] of [
    ['emitenteDoc', 'emitente'],
    ['destinatarioDoc', 'destinatário'],
  ] as const) {
    const d = e[k].valor
    if (!d) out.push({ nivel: 'erro', texto: `CPF/CNPJ do ${rot} ausente`, campo: k })
    else if (!isValidCpfCnpj(d)) out.push({ nivel: 'erro', texto: `CPF/CNPJ do ${rot} inválido`, campo: k })
  }
  if (!e.direcao.valor) out.push({ nivel: 'erro', texto: 'Documento não pertence a nenhuma empresa cadastrada', campo: 'direcao' })

  const emissao = v('emissao') as string | null
  const venc = v('vencimento') as string | null
  if (!emissao) out.push({ nivel: 'erro', texto: 'Data de emissão ausente', campo: 'emissao' })
  else if (emissao > HOJE) out.push({ nivel: 'erro', texto: 'Data de emissão no futuro', campo: 'emissao' })
  if (emissao && venc && venc < emissao) out.push({ nivel: 'erro', texto: 'Vencimento anterior à emissão', campo: 'vencimento' })

  const prod = (v('valorProdutos') as number | null) ?? 0
  const bruto = v('valorBruto') as number | null
  const calc = prod - ((v('desconto') as number) ?? 0) + ((v('frete') as number) ?? 0) + ((v('outrasDespesas') as number) ?? 0)
  if (bruto === null) out.push({ nivel: 'erro', texto: 'Valor total ausente', campo: 'valorBruto' })
  else if (Math.abs(calc - bruto) > 1) {
    // IPI/ST also compose vNF; flag for review rather than treat as error.
    out.push({ nivel: 'alerta', texto: `Produtos − descontos + frete + outras (${brl(calc)}) difere do total ${brl(bruto)}. Verifique IPI/ST ou divergência.`, campo: 'valorBruto' })
  } else out.push({ nivel: 'ok', texto: 'Composição do valor total confere' })

  const somaItens = itens.reduce((s, i) => s + i.total, 0)
  if (itens.length && Math.abs(somaItens - prod) > 1) out.push({ nivel: 'alerta', texto: `Soma dos itens (${brl(somaItens)}) difere do valor dos produtos (${brl(prod)})`, campo: 'valorProdutos' })

  const fin = v('valorFinanceiro') as number | null
  if (fin === null) out.push({ nivel: 'alerta', texto: 'Valor a pagar/receber não informado no documento', campo: 'valorFinanceiro' })
  else if (bruto !== null && fin !== bruto) out.push({ nivel: 'alerta', texto: `Valor financeiro (${brl(fin)}) diferente do total da nota (${brl(bruto)}). Confirme entrada à vista, retenções ou parcelamento.`, campo: 'valorFinanceiro' })

  if (!e.categoria.valor) out.push({ nivel: 'alerta', texto: 'Categoria financeira não definida', campo: 'categoria' })
  return out
}

/** Fields that must be present and confirmed before approval. */
export const OBRIGATORIOS: CampoChave[] = ['tipo', 'direcao', 'numero', 'serie', 'emitenteNome', 'emitenteDoc', 'destinatarioDoc', 'emissao', 'valorBruto', 'valorFinanceiro', 'vencimento', 'categoria']

// ── sample XMLs for trying the flow without a real file ─────────────────────
export function xmlExemplo(p: {
  chave: string
  numero: number
  serie: number
  emitCnpj: string
  emitNome: string
  destCnpj: string
  destNome: string
  emissao: string
  itens: Array<{ xProd: string; q: number; vUn: number }>
  frete?: number
  dups?: Array<{ venc: string; valor: number }>
  tPag?: string
}) {
  const vProd = p.itens.reduce((s, i) => s + i.q * i.vUn, 0)
  const frete = p.frete ?? 0
  const vNF = vProd + frete
  const f = (n: number) => n.toFixed(2)
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${p.chave}" versao="4.00">
<ide><cUF>35</cUF><mod>55</mod><serie>${p.serie}</serie><nNF>${p.numero}</nNF><dhEmi>${p.emissao}T10:24:00-03:00</dhEmi><tpNF>1</tpNF></ide>
<emit><CNPJ>${p.emitCnpj}</CNPJ><xNome>${p.emitNome}</xNome></emit>
<dest><CNPJ>${p.destCnpj}</CNPJ><xNome>${p.destNome}</xNome></dest>
${p.itens.map((i, n) => `<det nItem="${n + 1}"><prod><xProd>${i.xProd}</xProd><qCom>${i.q}</qCom><vUnCom>${f(i.vUn)}</vUnCom><vProd>${f(i.q * i.vUn)}</vProd></prod></det>`).join('\n')}
<total><ICMSTot><vProd>${f(vProd)}</vProd><vDesc>0.00</vDesc><vFrete>${f(frete)}</vFrete><vOutro>0.00</vOutro><vICMS>${f(vProd * 0.18)}</vICMS><vIPI>0.00</vIPI><vPIS>${f(vProd * 0.0165)}</vPIS><vCOFINS>${f(vProd * 0.076)}</vCOFINS><vNF>${f(vNF)}</vNF></ICMSTot></total>
${p.dups?.length ? `<cobr>${p.dups.map((d, n) => `<dup><nDup>${String(n + 1).padStart(3, '0')}</nDup><dVenc>${d.venc}</dVenc><vDup>${f(d.valor)}</vDup></dup>`).join('')}</cobr>` : ''}
${p.tPag ? `<pag><detPag><tPag>${p.tPag}</tPag><vPag>${f(vNF)}</vPag></detPag></pag>` : ''}
</infNFe></NFe></nfeProc>`
}
