import { Link, createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Download, FileCode2, FileText, Search, Upload } from 'lucide-react'
import { PRIMEIRO_MES, MES_ATUAL, categoriasDespesa, categoriasReceita, empresas, notasFiscais, type NotaFiscal, type StatusNota } from '@/data/fixtures'
import { brl, dataBR, formatCnpj, mesLongo, monthRange } from '@/lib/format'
import { onlyDigits } from '@/lib/fiscal-validators'
import { Badge, Botao, Card, PageHeader, StatusNotaBadge, Vazio } from '@/components/ui'

export const Route = createFileRoute('/app/notas/')({
  component: NotasPage,
})

const STATUS: StatusNota[] = [
  'Importada',
  'Aguardando conferência',
  'Aprovada',
  'Pendente de informação',
  'Vinculada a conta a pagar',
  'Vinculada a conta a receber',
  'Parcialmente paga',
  'Paga ou recebida',
  'Cancelada',
  'Em divergência',
]

const POR_PAGINA = 15

type FiltrosNota = { busca: string; mes: string; direcao: '' | 'entrada' | 'saida'; tipo: string; status: string; categoria: string; empresaId: string }
const vazio: FiltrosNota = { busca: '', mes: '', direcao: '', tipo: '', status: '', categoria: '', empresaId: '' }

function filtrar(f: FiltrosNota): NotaFiscal[] {
  const termo = f.busca.trim().toLowerCase()
  const termoDig = onlyDigits(termo)
  return notasFiscais.filter((n) => {
    if (f.mes && n.emissao.slice(0, 7) !== f.mes) return false
    if (f.direcao && n.direcao !== f.direcao) return false
    if (f.tipo && n.tipo !== f.tipo) return false
    if (f.status && n.status !== f.status) return false
    if (f.categoria && n.categoria !== f.categoria) return false
    if (f.empresaId && n.empresaId !== f.empresaId) return false
    if (!termo) return true
    const parte = n.direcao === 'entrada' ? n.emitente : n.destinatario
    return (
      parte.nome.toLowerCase().includes(termo) ||
      String(n.numero) === termo ||
      (termoDig.length >= 4 && (parte.documento.includes(termoDig) || (n.chave ?? '').includes(termoDig))) ||
      brl(n.valorBruto).includes(termo)
    )
  })
}

function exportarCSV(notas: NotaFiscal[]) {
  const cab = ['Tipo', 'Direção', 'Número', 'Série', 'Chave de acesso', 'Emissão', 'Competência', 'Vencimento', 'Emitente', 'CNPJ emitente', 'Destinatário', 'CNPJ destinatário', 'Valor bruto', 'Valor líquido', 'Categoria', 'Centro de custo', 'Situação']
  const v = (c: number | null) => (c === null ? '' : (c / 100).toFixed(2).replace('.', ','))
  const linhas = notas.map((n) => [
    n.tipo,
    n.direcao === 'entrada' ? 'Entrada' : 'Saída',
    n.numero,
    n.serie,
    n.chave ?? '',
    dataBR(n.emissao),
    n.competencia.split('-').reverse().join('/'),
    dataBR(n.vencimento),
    n.emitente.nome,
    formatCnpj(n.emitente.documento),
    n.destinatario.nome,
    formatCnpj(n.destinatario.documento),
    v(n.valorBruto),
    v(n.valorLiquido),
    n.categoria,
    n.centroCusto,
    n.status,
  ])
  const csv = [cab, ...linhas].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notas-fiscais-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function NotasPage() {
  const [f, setF] = useState<FiltrosNota>(vazio)
  const [pagina, setPagina] = useState(1)
  const up = <K extends keyof FiltrosNota>(k: K, v: FiltrosNota[K]) => {
    setF({ ...f, [k]: v })
    setPagina(1)
  }

  const lista = useMemo(() => filtrar(f), [f])
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const pag = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const validas = lista.filter((n) => n.status !== 'Cancelada')
  const totalEntrada = validas.filter((n) => n.direcao === 'entrada').reduce((s, n) => s + n.valorBruto, 0)
  const totalSaida = validas.filter((n) => n.direcao === 'saida').reduce((s, n) => s + n.valorBruto, 0)
  const canceladas = lista.length - validas.length
  const conferencia = lista.filter((n) => ['Importada', 'Aguardando conferência', 'Pendente de informação', 'Em divergência'].includes(n.status)).length

  return (
    <>
      <PageHeader
        titulo="Notas Fiscais"
        descricao="Documentos fiscais de entrada (recebidos de fornecedores) e de saída (emitidos pela empresa). Notas canceladas permanecem no histórico, mas não entram nos totais."
        acoes={
          <>
            <Botao variante="secundario" onClick={() => exportarCSV(lista)} disabled={lista.length === 0}>
              <Download className="h-4 w-4" /> Exportar CSV
            </Botao>
            <Link to="/app/importar" className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-navy-700">
              <Upload className="h-4 w-4" /> Importar documentos
            </Link>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Documentos encontrados', lista.length.toLocaleString('pt-BR'), ''],
          ['Saídas (valor bruto)', brl(totalSaida), 'text-ok-700'],
          ['Entradas (valor bruto)', brl(totalEntrada), 'text-ink'],
          ['Em conferência · canceladas', `${conferencia} · ${canceladas}`, 'text-warn-700'],
        ].map(([t, v, c]) => (
          <Card key={t} className="px-4 py-3">
            <p className="text-xs font-medium text-muted">{t}</p>
            <p className={`num mt-1 text-lg font-semibold ${c}`}>{v}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-line p-4 md:grid-cols-3 xl:grid-cols-[2fr_repeat(6,1fr)]">
          <label className="relative block md:col-span-3 xl:col-span-1">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="field pl-9" placeholder="Número, CNPJ, chave, nome ou valor" value={f.busca} onChange={(e) => up('busca', e.target.value)} />
          </label>
          <select aria-label="Mês de emissão" className="field" value={f.mes} onChange={(e) => up('mes', e.target.value)}>
            <option value="">Todos os meses</option>
            {monthRange(PRIMEIRO_MES, MES_ATUAL)
              .reverse()
              .map((m) => (
                <option key={m} value={m}>
                  {mesLongo(m)}
                </option>
              ))}
          </select>
          <select aria-label="Direção" className="field" value={f.direcao} onChange={(e) => up('direcao', e.target.value as FiltrosNota['direcao'])}>
            <option value="">Entrada e saída</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
          <select aria-label="Tipo de documento" className="field" value={f.tipo} onChange={(e) => up('tipo', e.target.value)}>
            <option value="">Todos os tipos</option>
            {['NF-e', 'NFS-e', 'NFC-e', 'NF3-e', 'CT-e'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select aria-label="Situação" className="field" value={f.status} onChange={(e) => up('status', e.target.value)}>
            <option value="">Todas as situações</option>
            {STATUS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select aria-label="Categoria" className="field" value={f.categoria} onChange={(e) => up('categoria', e.target.value)}>
            <option value="">Todas as categorias</option>
            {[...categoriasReceita, ...categoriasDespesa].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select aria-label="Empresa" className="field" value={f.empresaId} onChange={(e) => up('empresaId', e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nomeFantasia}
              </option>
            ))}
          </select>
        </div>

        {lista.length === 0 ? (
          <Vazio titulo="Nenhuma nota encontrada" texto="Ajuste os filtros ou importe novos documentos XML ou PDF." acao={<Botao variante="secundario" onClick={() => setF(vazio)}>Limpar filtros</Botao>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Documento</th>
                  <th className="px-3 py-2.5 font-medium">Emitente / destinatário</th>
                  <th className="px-3 py-2.5 font-medium">Emissão</th>
                  <th className="px-3 py-2.5 font-medium">Vencimento</th>
                  <th className="px-3 py-2.5 font-medium">Categoria</th>
                  <th className="px-3 py-2.5 text-right font-medium">Valor bruto</th>
                  <th className="px-3 py-2.5 font-medium">Arquivos</th>
                  <th className="px-4 py-2.5 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pag.map((n) => {
                  const parte = n.direcao === 'entrada' ? n.emitente : n.destinatario
                  return (
                    <tr key={n.id} className={`group hover:bg-canvas/60 ${n.status === 'Cancelada' ? 'text-muted' : ''}`}>
                      <td className="px-4 py-3">
                        <Link to="/app/notas/$notaId" params={{ notaId: n.id }} className="font-medium text-brand-600 group-hover:underline">
                          {n.tipo} nº {n.numero}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                          <Badge tom={n.direcao === 'saida' ? 'positivo' : 'info'}>{n.direcao === 'saida' ? 'Saída' : 'Entrada'}</Badge>
                          série {n.serie}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="max-w-[260px] truncate font-medium text-ink">{parte.nome}</p>
                        <p className="num text-xs text-muted">{formatCnpj(parte.documento)}</p>
                      </td>
                      <td className="num px-3 py-3">{dataBR(n.emissao)}</td>
                      <td className="num px-3 py-3">{dataBR(n.vencimento)}</td>
                      <td className="px-3 py-3 text-muted">{n.categoria}</td>
                      <td className={`num px-3 py-3 text-right font-medium ${n.status === 'Cancelada' ? 'line-through' : 'text-ink'}`}>{brl(n.valorBruto)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5 text-muted">
                          <FileCode2 className={`h-4 w-4 ${n.arquivos.xml ? 'text-navy-700' : 'opacity-25'}`} aria-label={n.arquivos.xml ? 'XML disponível' : 'Sem XML'} />
                          <FileText className={`h-4 w-4 ${n.arquivos.pdf ? 'text-navy-700' : 'opacity-25'}`} aria-label={n.arquivos.pdf ? 'PDF disponível' : 'Sem PDF'} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusNotaBadge status={n.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {lista.length > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
            <span>
              {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, lista.length)} de {lista.length}
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
    </>
  )
}
