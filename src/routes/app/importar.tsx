import { Link, createFileRoute } from '@tanstack/react-router'
import { useCallback, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, CircleDashed, Copy, FileCode2, FileImage, FileText, FileWarning, Loader2, Sparkles, Trash2, UploadCloud, XCircle } from 'lucide-react'
import { HOJE, categoriasDespesa, categoriasReceita, empresas, notasFiscais, parceiros } from '@/data/fixtures'
import { addDays, brl, centsToInput, dataBR, formatCnpj, parseBRL } from '@/lib/format'
import { buildChave, cnpjCheckDigits } from '@/lib/fiscal-validators'
import { OBRIGATORIOS, buscarDuplicata, lerNFeXml, validar, xmlExemplo, type Campo, type CampoChave, type Extracao, type Resultado } from '@/lib/nfe-xml'
import { Badge, Botao, Card, CardHeader, PageHeader, type Tom } from '@/components/ui'

export const Route = createFileRoute('/app/importar')({
  component: ImportarPage,
})

type Estado = 'processando' | 'revisao' | 'incompleto' | 'duplicado' | 'erro' | 'aguardando-ia' | 'aprovado' | 'descartado'

type Item = {
  id: string
  nome: string
  tamanho: number
  formato: 'XML' | 'PDF' | 'Imagem' | 'Outro'
  estado: Estado
  mensagem?: string
  resultado?: Resultado
  /** Values as extracted, kept for the audit trail of corrections. */
  original?: Extracao
  extracao?: Extracao
  confirmados: CampoChave[]
  duplicataDe?: string | null
  aprovadoEm?: string
}

const MAX_BYTES = 10 * 1024 * 1024

const estados: Record<Estado, { rotulo: string; tom: Tom }> = {
  processando: { rotulo: 'Processando', tom: 'info' },
  revisao: { rotulo: 'Aguardando aprovação', tom: 'atencao' },
  incompleto: { rotulo: 'Informações incompletas', tom: 'atencao' },
  duplicado: { rotulo: 'Duplicado', tom: 'negativo' },
  erro: { rotulo: 'Erro na leitura', tom: 'negativo' },
  'aguardando-ia': { rotulo: 'Aguardando leitura com IA', tom: 'neutro' },
  aprovado: { rotulo: 'Aprovado', tom: 'positivo' },
  descartado: { rotulo: 'Descartado', tom: 'neutro' },
}

const rotulos: Record<CampoChave, string> = {
  tipo: 'Tipo de documento',
  direcao: 'Direção da operação',
  numero: 'Número da nota',
  serie: 'Série',
  chave: 'Chave de acesso',
  emitenteNome: 'Emitente (fornecedor/prestador)',
  emitenteDoc: 'CPF/CNPJ do emitente',
  destinatarioNome: 'Destinatário (cliente)',
  destinatarioDoc: 'CPF/CNPJ do destinatário',
  emissao: 'Data de emissão',
  vencimento: 'Data de vencimento',
  descricao: 'Descrição dos produtos/serviços',
  valorProdutos: 'Valor dos produtos/serviços',
  desconto: 'Descontos',
  frete: 'Frete',
  outrasDespesas: 'Outras despesas',
  valorBruto: 'Valor total da nota (bruto)',
  valorLiquido: 'Valor líquido informado',
  valorFinanceiro: 'Valor previsto para pagamento/recebimento',
  tributos: 'Tributos destacados',
  formaPagamento: 'Forma de pagamento',
  categoria: 'Categoria financeira (sugestão)',
}

const MONETARIOS: CampoChave[] = ['valorProdutos', 'desconto', 'frete', 'outrasDespesas', 'valorBruto', 'valorLiquido', 'valorFinanceiro']
const DATAS: CampoChave[] = ['emissao', 'vencimento']

const secoes: Array<{ titulo: string; campos: CampoChave[] }> = [
  { titulo: 'Identificação', campos: ['tipo', 'direcao', 'numero', 'serie', 'chave'] },
  { titulo: 'Partes', campos: ['emitenteNome', 'emitenteDoc', 'destinatarioNome', 'destinatarioDoc'] },
  { titulo: 'Datas', campos: ['emissao', 'vencimento'] },
  { titulo: 'Valores', campos: ['valorProdutos', 'desconto', 'frete', 'outrasDespesas', 'valorBruto', 'valorLiquido', 'valorFinanceiro', 'tributos'] },
  { titulo: 'Classificação', campos: ['descricao', 'formaPagamento', 'categoria'] },
]

function estadoInicial(r: Resultado, extras: Parameters<typeof buscarDuplicata>[1]): Pick<Item, 'estado' | 'duplicataDe' | 'mensagem'> {
  const dup = r.duplicataDe ?? buscarDuplicata(r.extracao, extras)
  if (dup) return { estado: 'duplicado', duplicataDe: dup, mensagem: 'Documento já registrado. Nenhuma nova obrigação financeira será criada.' }
  const faltando = OBRIGATORIOS.filter((k) => r.extracao[k].valor === null)
  if (faltando.length) return { estado: 'incompleto', mensagem: `${faltando.length} campo(s) obrigatório(s) não constam no documento` }
  return { estado: 'revisao' }
}

const fmtValor = (k: CampoChave, c: Campo<unknown>) => {
  if (c.valor === null) return '—'
  if (MONETARIOS.includes(k)) return brl(c.valor as number)
  if (DATAS.includes(k)) return dataBR(c.valor as string)
  if (k === 'emitenteDoc' || k === 'destinatarioDoc') return formatCnpj(c.valor as string)
  if (k === 'direcao') return c.valor === 'entrada' ? 'Entrada (despesa)' : 'Saída (receita)'
  return String(c.valor)
}

function Confianca({ c }: { c: Campo<unknown> }) {
  if (c.fonte === 'usuario') return <Badge tom="info">Corrigido</Badge>
  if (c.valor === null) return <Badge tom="atencao">Pendente</Badge>
  const pct = Math.round(c.confianca * 100)
  const tom: Tom = c.confianca >= 0.9 ? 'positivo' : c.confianca >= 0.8 ? 'neutro' : 'atencao'
  return (
    <Badge tom={tom}>
      {c.fonte === 'xml' ? 'XML' : 'Regra'} · {pct}%
    </Badge>
  )
}

function ImportarPage() {
  const [itens, setItens] = useState<Item[]>([])
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  const aprovadosComoBase = useCallback(
    (lista: Item[]) =>
      lista
        .filter((i) => i.estado === 'aprovado' && i.extracao)
        .map((i) => ({
          id: i.id,
          chave: i.extracao!.chave.valor,
          emitenteDoc: i.extracao!.emitenteDoc.valor ?? '',
          numero: i.extracao!.numero.valor ?? '',
          serie: i.extracao!.serie.valor ?? '',
          emissao: i.extracao!.emissao.valor ?? '',
          tipo: i.extracao!.tipo.valor ?? '',
          valor: i.extracao!.valorBruto.valor ?? 0,
        })),
    [],
  )

  const atualizar = (id: string, patch: Partial<Item> | ((i: Item) => Partial<Item>)) =>
    setItens((l) => l.map((i) => (i.id === id ? { ...i, ...(typeof patch === 'function' ? patch(i) : patch) } : i)))

  const processarTexto = (id: string, conteudo: string) => {
    const r = lerNFeXml(conteudo)
    setItens((l) =>
      l.map((i) => {
        if (i.id !== id) return i
        if ('erro' in r) return { ...i, estado: 'erro', mensagem: r.erro }
        return { ...i, resultado: r, original: r.extracao, extracao: r.extracao, ...estadoInicial(r, aprovadosComoBase(l)) }
      }),
    )
  }

  const adicionar = async (arquivos: Array<{ nome: string; tamanho: number; tipo: string; ler: () => Promise<ArrayBuffer> }>) => {
    const novos: Item[] = arquivos.map((a) => {
      const ext = a.nome.split('.').pop()?.toLowerCase() ?? ''
      const formato: Item['formato'] = ext === 'xml' ? 'XML' : ext === 'pdf' ? 'PDF' : ['png', 'jpg', 'jpeg', 'webp', 'tif', 'tiff'].includes(ext) ? 'Imagem' : 'Outro'
      return { id: `arq-${++seq.current}`, nome: a.nome, tamanho: a.tamanho, formato, estado: 'processando', confirmados: [] }
    })
    setItens((l) => [...novos, ...l])
    if (!selecionado && novos[0]) setSelecionado(novos[0].id)

    // Each file is processed independently so one failure never blocks the batch.
    await Promise.all(
      novos.map(async (item, idx) => {
        const a = arquivos[idx]
        if (a.tamanho > MAX_BYTES) return atualizar(item.id, { estado: 'erro', mensagem: 'Arquivo acima de 10 MB.' })
        if (item.formato === 'Outro') return atualizar(item.id, { estado: 'erro', mensagem: 'Formato não suportado. Envie XML, PDF ou imagem (PNG/JPG).' })
        const buf = await a.ler().catch(() => null)
        if (!buf) return atualizar(item.id, { estado: 'erro', mensagem: 'Não foi possível ler o arquivo.' })
        const bytes = new Uint8Array(buf.slice(0, 8))
        if (item.formato === 'PDF') {
          const ok = String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-'
          return atualizar(item.id, ok
            ? { estado: 'aguardando-ia', mensagem: 'PDF íntegro. A interpretação do texto e o OCR com IA ainda não estão ativos; o arquivo não foi lido e nenhum dado foi inventado.' }
            : { estado: 'erro', mensagem: 'O arquivo tem extensão .pdf, mas não é um PDF válido (corrompido ou renomeado).' })
        }
        if (item.formato === 'Imagem') return atualizar(item.id, { estado: 'aguardando-ia', mensagem: 'Imagem recebida. O OCR com IA ainda não está ativo; nenhum dado foi extraído.' })
        processarTexto(item.id, new TextDecoder('utf-8').decode(buf))
      }),
    )
  }

  const onArquivos = (files: FileList | null) => {
    if (!files?.length) return
    adicionar([...files].map((f) => ({ nome: f.name, tamanho: f.size, tipo: f.type, ler: () => f.arrayBuffer() })))
  }

  const exemplos = useMemo(() => {
    const emp2 = empresas[1]
    const hik = parceiros.find((p) => p.id === 'for-11')!
    const emissao = addDays(HOJE, -2)
    const novaChave = buildChave({ cUF: '35', aamm: emissao.slice(2, 4) + emissao.slice(5, 7), cnpj: hik.documento, modelo: '55', serie: 1, numero: 48213, codigo: 73019284 })
    const existente = notasFiscais.find((n) => n.tipo === 'NF-e' && n.direcao === 'entrada' && n.chave && n.status === 'Paga ou recebida')!
    const semCadastro = '458712030001' + cnpjCheckDigits('458712030001')
    const chaveIncompleta = buildChave({ cUF: '35', aamm: emissao.slice(2, 4) + emissao.slice(5, 7), cnpj: semCadastro, modelo: '55', serie: 2, numero: 9921, codigo: 55102938 })
    return [
      {
        nome: 'NFe-48213-hikvision.xml',
        titulo: 'NF-e de fornecedor',
        desc: 'XML completo, com duplicatas e frete.',
        xml: xmlExemplo({
          chave: novaChave, numero: 48213, serie: 1, emitCnpj: hik.documento, emitNome: hik.nome, destCnpj: emp2.cnpj, destNome: emp2.razaoSocial, emissao,
          itens: [{ xProd: 'Câmera IP bullet 4MP', q: 12, vUn: 489.9 }, { xProd: 'NVR 16 canais', q: 1, vUn: 2390 }],
          frete: 180, dups: [{ venc: addDays(emissao, 28), valor: 4144.4 }, { venc: addDays(emissao, 56), valor: 4144.4 }], tPag: '15',
        }),
      },
      {
        nome: `NFe-${existente.numero}-reimportada.xml`,
        titulo: 'Nota já lançada',
        desc: 'Mesmo documento importado novamente.',
        xml: xmlExemplo({
          chave: existente.chave!, numero: existente.numero, serie: existente.serie, emitCnpj: existente.emitente.documento, emitNome: existente.emitente.nome,
          destCnpj: existente.destinatario.documento, destNome: existente.destinatario.nome, emissao: existente.emissao,
          itens: existente.itens.map((i) => ({ xProd: i.descricao, q: i.quantidade, vUn: i.unitario / 100 })),
        }),
      },
      {
        nome: 'NFe-9921-sem-cobranca.xml',
        titulo: 'Informações ausentes',
        desc: 'Sem vencimento nem forma de pagamento.',
        xml: xmlExemplo({
          chave: chaveIncompleta, numero: 9921, serie: 2, emitCnpj: semCadastro, emitNome: 'Distribuidora Sem Cadastro Ltda.', destCnpj: empresas[0].cnpj, destNome: empresas[0].razaoSocial, emissao,
          itens: [{ xProd: 'Serviço diverso conforme pedido', q: 1, vUn: 1875.5 }],
        }),
      },
    ]
  }, [])

  const carregarExemplo = (e: (typeof exemplos)[number]) => {
    const bytes = new TextEncoder().encode(e.xml)
    adicionar([{ nome: e.nome, tamanho: bytes.byteLength, tipo: 'application/xml', ler: async () => bytes.buffer as ArrayBuffer }])
  }

  const contagem = (e: Estado[]) => itens.filter((i) => e.includes(i.estado)).length
  const painel = [
    { rotulo: 'Arquivos recebidos', valor: itens.length, Icone: UploadCloud, cor: 'text-navy-700' },
    { rotulo: 'Processados', valor: itens.length - contagem(['processando']), Icone: CheckCircle2, cor: 'text-navy-700' },
    { rotulo: 'Aguardando aprovação', valor: contagem(['revisao']), Icone: CircleDashed, cor: 'text-warn-700' },
    { rotulo: 'Incompletos', valor: contagem(['incompleto']), Icone: FileWarning, cor: 'text-warn-700' },
    { rotulo: 'Duplicados', valor: contagem(['duplicado']), Icone: Copy, cor: 'text-risk-700' },
    { rotulo: 'Com erro', valor: contagem(['erro']), Icone: XCircle, cor: 'text-risk-700' },
    { rotulo: 'Aprovados', valor: contagem(['aprovado']), Icone: Check, cor: 'text-ok-700' },
  ]

  const atual = itens.find((i) => i.id === selecionado) ?? null

  return (
    <>
      <PageHeader
        titulo="Leitura de documentos"
        descricao="Envie um ou vários XMLs, PDFs ou imagens de notas fiscais. Cada arquivo é processado individualmente, validado com regras determinísticas, verificado contra duplicidades e só gera lançamento após a sua conferência."
      />

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastando(false)
            onArquivos(e.dataTransfer.files)
          }}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${arrastando ? 'border-brand-500 bg-brand-50' : 'border-line bg-white'}`}
        >
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="mt-3 font-medium text-ink">Arraste os arquivos para cá</p>
          <p className="mt-1 text-sm text-muted">XML da NF-e/NFC-e, PDF (DANFE, NFS-e, boletos) ou imagens digitalizadas · até 10 MB por arquivo</p>
          <Botao className="mt-4" onClick={() => inputRef.current?.click()}>
            Selecionar no computador
          </Botao>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xml,.pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,application/xml,text/xml,application/pdf,image/*"
            className="hidden"
            onChange={(e) => {
              onArquivos(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <Card>
          <CardHeader titulo="Experimente com documentos de exemplo" descricao="XMLs gerados no navegador e lidos pelo mesmo leitor real usado para os seus arquivos." />
          <ul className="divide-y divide-line">
            {exemplos.map((e) => (
              <li key={e.nome} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{e.titulo}</p>
                  <p className="text-xs text-muted">{e.desc}</p>
                </div>
                <Botao variante="secundario" onClick={() => carregarExemplo(e)}>
                  Carregar
                </Botao>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 border-t border-line bg-canvas px-5 py-3 text-xs text-muted">
            <Sparkles className="h-4 w-4 shrink-0 text-brand-600" />
            <p>
              <strong className="font-medium text-ink">Ativo agora:</strong> leitura estruturada de XML, validações e deduplicação.{' '}
              <strong className="font-medium text-ink">Próximo passo:</strong> interpretação de PDFs e OCR com IA no servidor.
            </p>
          </div>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {painel.map(({ rotulo, valor, Icone, cor }) => (
          <Card key={rotulo} className="px-4 py-3">
            <Icone className={`h-4 w-4 ${cor}`} />
            <p className="num mt-2 text-xl font-semibold text-ink">{valor}</p>
            <p className="text-xs text-muted">{rotulo}</p>
          </Card>
        ))}
      </div>

      {itens.length === 0 ? (
        <Card className="px-6 py-12 text-center text-sm text-muted">Nenhum arquivo nesta sessão. Envie documentos ou carregue um exemplo para ver o fluxo de conferência.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(300px,1fr)_2.2fr]">
          <Card className="self-start">
            <CardHeader titulo="Lote em processamento" descricao={`${itens.length} arquivo(s)`} />
            <ul className="max-h-[640px] divide-y divide-line overflow-y-auto">
              {itens.map((i) => {
                const Icone = i.formato === 'XML' ? FileCode2 : i.formato === 'PDF' ? FileText : i.formato === 'Imagem' ? FileImage : FileWarning
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => setSelecionado(i.id)}
                      className={`flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-canvas ${selecionado === i.id ? 'bg-brand-50' : ''}`}
                    >
                      {i.estado === 'processando' ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-600" /> : <Icone className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{i.nome}</span>
                        <span className="text-xs text-muted">
                          {i.formato} · {(i.tamanho / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB
                        </span>
                      </span>
                      <Badge tom={estados[i.estado].tom}>{estados[i.estado].rotulo}</Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          {atual ? <Conferencia key={atual.id} item={atual} onChange={(p) => atualizar(atual.id, p)} /> : <Card className="p-10 text-center text-sm text-muted">Selecione um arquivo para conferir.</Card>}
        </div>
      )}
    </>
  )
}

function Conferencia({ item, onChange }: { item: Item; onChange: (p: Partial<Item>) => void }) {
  const [justificativa, setJustificativa] = useState('')

  if (!item.extracao || !item.resultado) {
    const tom = item.estado === 'erro' ? 'border-risk-600/20 bg-risk-50 text-risk-700' : 'border-line bg-white text-muted'
    return (
      <Card className="p-6">
        <h2 className="font-semibold text-ink">{item.nome}</h2>
        <div className={`mt-4 flex gap-3 rounded-lg border p-4 text-sm ${tom}`}>
          {item.estado === 'erro' ? <XCircle className="h-5 w-5 shrink-0" /> : item.estado === 'processando' ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <CircleDashed className="h-5 w-5 shrink-0" />}
          <p>{item.estado === 'processando' ? 'Lendo o arquivo…' : item.mensagem}</p>
        </div>
      </Card>
    )
  }

  const e = item.extracao
  const verificacoes = validar(e, item.resultado.itens)
  const erros = verificacoes.filter((v) => v.nivel === 'erro')
  const faltando = OBRIGATORIOS.filter((k) => e[k].valor === null)
  const precisaConfirmar = (Object.keys(e) as CampoChave[]).filter((k) => e[k].valor !== null && e[k].fonte !== 'usuario' && e[k].confianca < 0.8 && !item.confirmados.includes(k))
  const bloqueado = item.estado === 'duplicado' || item.estado === 'aprovado' || item.estado === 'descartado'
  const podeAprovar = !bloqueado && erros.length === 0 && faltando.length === 0 && precisaConfirmar.length === 0
  const corrigidos = (Object.keys(e) as CampoChave[]).filter((k) => e[k].fonte === 'usuario')
  const natureza = e.direcao.valor === 'saida' ? 'conta a receber' : 'conta a pagar'

  const editar = (k: CampoChave, bruto: string) => {
    let valor: unknown = bruto.trim() === '' ? null : bruto
    if (MONETARIOS.includes(k)) valor = parseBRL(bruto)
    if (k === 'emitenteDoc' || k === 'destinatarioDoc' || k === 'chave') valor = bruto.replace(/\D/g, '') || null
    const novo: Extracao = { ...e, [k]: { valor, confianca: 1, fonte: 'usuario', motivo: undefined } as Campo<never> }
    const faltam = OBRIGATORIOS.filter((c) => novo[c].valor === null).length
    onChange({ extracao: novo, estado: item.estado === 'incompleto' && faltam === 0 ? 'revisao' : item.estado })
  }

  return (
    <Card>
      <CardHeader
        titulo="Conferência do documento"
        descricao={item.nome}
        acao={<Badge tom={estados[item.estado].tom}>{estados[item.estado].rotulo}</Badge>}
      />

      {item.estado === 'duplicado' && (
        <div className="mx-5 mt-5 flex gap-3 rounded-lg border border-risk-600/20 bg-risk-50 p-4 text-sm text-risk-700">
          <Copy className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Documento duplicado: nenhuma nova obrigação será criada.</p>
            <p className="mt-0.5">
              {item.duplicataDe?.startsWith('nf-') ? (
                <>
                  Já registrado como{' '}
                  <Link to="/app/notas/$notaId" params={{ notaId: item.duplicataDe }} className="font-medium underline">
                    nota existente
                  </Link>
                  .
                </>
              ) : (
                'Já aprovado anteriormente nesta sessão.'
              )}{' '}
              A verificação usa a chave de acesso e, sem ela, CNPJ + número + série + data + tipo + valor.
            </p>
          </div>
        </div>
      )}

      {item.estado === 'aprovado' && (
        <div className="mx-5 mt-5 rounded-lg border border-ok-600/20 bg-ok-50 p-4 text-sm text-ok-700">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" /> Aprovado em {dataBR(item.aprovadoEm)} · {natureza} prevista de {brl(e.valorFinanceiro.valor ?? 0)} com vencimento em {dataBR(e.vencimento.valor)}
          </p>
          <p className="mt-1">A conta foi preparada como <strong>em aberto</strong>: importar um documento nunca marca pagamento ou recebimento. Nesta versão, a aprovação vale para a sessão atual; a gravação no banco de dados é a próxima etapa do produto.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6 p-5">
          {secoes.map((s) => (
            <fieldset key={s.titulo} disabled={bloqueado}>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{s.titulo}</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {s.campos.map((k) => (
                  <CampoEditavel
                    key={k}
                    chave={k}
                    campo={e[k]}
                    original={item.original?.[k]}
                    confirmado={item.confirmados.includes(k)}
                    precisaConfirmar={precisaConfirmar.includes(k)}
                    obrigatorio={OBRIGATORIOS.includes(k)}
                    erro={verificacoes.some((v) => v.nivel === 'erro' && v.campo === k)}
                    onEditar={(v) => editar(k, v)}
                    onConfirmar={() => onChange({ confirmados: [...item.confirmados, k] })}
                  />
                ))}
              </div>
            </fieldset>
          ))}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Itens ({item.resultado.itens.length})</p>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {item.resultado.itens.map((i, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{i.descricao}</td>
                      <td className="num px-3 py-2 text-right text-muted">
                        {i.quantidade.toLocaleString('pt-BR')} × {brl(i.unitario)}
                      </td>
                      <td className="num px-3 py-2 text-right font-medium">{brl(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-5 border-t border-line bg-canvas/60 p-5 lg:border-l lg:border-t-0">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Validações</p>
            <ul className="space-y-2 text-sm">
              {verificacoes.map((v) => (
                <li key={v.texto} className="flex gap-2">
                  {v.nivel === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ok-600" /> : v.nivel === 'erro' ? <XCircle className="h-4 w-4 shrink-0 text-risk-600" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-warn-500" />}
                  <span className={v.nivel === 'erro' ? 'text-risk-700' : v.nivel === 'alerta' ? 'text-warn-700' : 'text-ink'}>{v.texto}</span>
                </li>
              ))}
            </ul>
          </div>

          {!bloqueado && (
            <div className="rounded-lg border border-line bg-white p-4 text-sm">
              <p className="font-medium text-ink">Antes de aprovar</p>
              <ul className="mt-2 space-y-1 text-muted">
                <li className={faltando.length ? 'text-warn-700' : ''}>• {faltando.length ? `${faltando.length} campo(s) obrigatório(s) pendente(s)` : 'Campos obrigatórios preenchidos'}</li>
                <li className={precisaConfirmar.length ? 'text-warn-700' : ''}>• {precisaConfirmar.length ? `${precisaConfirmar.length} sugestão(ões) com baixa confiança a confirmar` : 'Sugestões confirmadas'}</li>
                <li className={erros.length ? 'text-risk-700' : ''}>• {erros.length ? `${erros.length} erro(s) de validação` : 'Sem erros de validação'}</li>
              </ul>
              <Botao className="mt-4 w-full" disabled={!podeAprovar} onClick={() => onChange({ estado: 'aprovado', aprovadoEm: HOJE })}>
                <Check className="h-4 w-4" /> Aprovar e preparar {natureza}
              </Botao>
              <div className="mt-3 space-y-2">
                <input className="field" placeholder="Justificativa para descartar" value={justificativa} onChange={(ev) => setJustificativa(ev.target.value)} />
                <Botao variante="secundario" className="w-full" disabled={justificativa.trim().length < 5} onClick={() => onChange({ estado: 'descartado', mensagem: justificativa })}>
                  <Trash2 className="h-4 w-4" /> Descartar documento
                </Botao>
              </div>
            </div>
          )}
          {item.estado === 'descartado' && <p className="rounded-lg border border-line bg-white p-4 text-sm text-muted">Descartado. Justificativa: {item.mensagem}</p>}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Trilha de correções</p>
            {corrigidos.length === 0 ? (
              <p className="text-sm text-muted">Nenhum campo corrigido. Os valores extraídos serão a versão final.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {corrigidos.map((k) => (
                  <li key={k} className="rounded-lg border border-line bg-white p-2.5">
                    <p className="font-medium text-ink">{rotulos[k]}</p>
                    <p className="text-xs text-muted">
                      Extraído: <span className="line-through">{item.original ? fmtValor(k, item.original[k]) : '—'}</span> → Final: <span className="text-ink">{fmtValor(k, e[k])}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </Card>
  )
}

function CampoEditavel({
  chave,
  campo,
  original,
  confirmado,
  precisaConfirmar,
  obrigatorio,
  erro,
  onEditar,
  onConfirmar,
}: {
  chave: CampoChave
  campo: Campo<unknown>
  original?: Campo<unknown>
  confirmado: boolean
  precisaConfirmar: boolean
  obrigatorio: boolean
  erro: boolean
  onEditar: (v: string) => void
  onConfirmar: () => void
}) {
  const valorInput =
    campo.valor === null ? '' : MONETARIOS.includes(chave) ? centsToInput(campo.valor as number) : chave === 'emitenteDoc' || chave === 'destinatarioDoc' ? formatCnpj(campo.valor as string) : String(campo.valor)
  const [rascunho, setRascunho] = useState(valorInput)
  const borda = erro ? 'border-risk-600 ring-2 ring-risk-50' : campo.valor === null && obrigatorio ? 'border-warn-500' : precisaConfirmar ? 'border-warn-500' : ''
  const largo = chave === 'chave' || chave === 'descricao' || chave === 'tributos' || chave === 'emitenteNome' || chave === 'destinatarioNome'

  const commit = (v: string) => {
    if (v !== valorInput) onEditar(v)
  }

  let controle: React.ReactNode
  if (chave === 'categoria') {
    controle = (
      <select className={`field ${borda}`} value={(campo.valor as string) ?? ''} onChange={(e) => onEditar(e.target.value)}>
        <option value="">Selecione…</option>
        {[...categoriasDespesa, ...categoriasReceita].map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    )
  } else if (chave === 'direcao') {
    controle = (
      <select className={`field ${borda}`} value={(campo.valor as string) ?? ''} onChange={(e) => onEditar(e.target.value)}>
        <option value="">Selecione…</option>
        <option value="entrada">Entrada (despesa)</option>
        <option value="saida">Saída (receita)</option>
      </select>
    )
  } else if (DATAS.includes(chave)) {
    controle = <input type="date" className={`field ${borda}`} value={(campo.valor as string) ?? ''} onChange={(e) => onEditar(e.target.value)} />
  } else {
    controle = (
      <input
        className={`field ${MONETARIOS.includes(chave) || chave === 'chave' ? 'num' : ''} ${chave === 'chave' ? 'mono text-xs' : ''} ${borda}`}
        value={rascunho}
        inputMode={MONETARIOS.includes(chave) ? 'decimal' : undefined}
        placeholder={campo.valor === null ? 'Não consta no documento' : undefined}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
      />
    )
  }

  return (
    <div className={largo ? 'sm:col-span-2' : ''}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted">
          {rotulos[chave]}
          {obrigatorio && <span className="text-risk-600"> *</span>}
        </label>
        <Confianca c={campo} />
      </div>
      {controle}
      {campo.motivo && <p className={`mt-1 text-xs ${campo.valor === null ? 'text-warn-700' : 'text-muted'}`}>{campo.motivo}</p>}
      {campo.fonte === 'usuario' && original && original.valor !== null && <p className="mt-1 text-xs text-muted">Valor extraído: {fmtValor(chave, original)}</p>}
      {precisaConfirmar && !confirmado && (
        <button type="button" onClick={onConfirmar} className="mt-1 text-xs font-medium text-brand-600 hover:underline">
          Confirmar sugestão
        </button>
      )}
    </div>
  )
}
