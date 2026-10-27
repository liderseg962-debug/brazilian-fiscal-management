import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import type { StatusFinanceiro, StatusNota } from '@/data/fixtures'

export type Tom = 'neutro' | 'positivo' | 'negativo' | 'atencao' | 'info'

const tons: Record<Tom, string> = {
  neutro: 'bg-slate-100 text-slate-700 ring-slate-200',
  positivo: 'bg-ok-50 text-ok-700 ring-ok-600/20',
  negativo: 'bg-risk-50 text-risk-700 ring-risk-600/20',
  atencao: 'bg-warn-50 text-warn-700 ring-warn-500/30',
  info: 'bg-brand-50 text-brand-600 ring-brand-500/20',
}

export function Badge({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tons[tom]}`}>{children}</span>
}

const tomNota: Record<StatusNota, Tom> = {
  Importada: 'info',
  'Aguardando conferência': 'atencao',
  Aprovada: 'info',
  'Pendente de informação': 'atencao',
  'Vinculada a conta a pagar': 'neutro',
  'Vinculada a conta a receber': 'neutro',
  'Parcialmente paga': 'atencao',
  'Paga ou recebida': 'positivo',
  Cancelada: 'negativo',
  'Em divergência': 'negativo',
}

export function StatusNotaBadge({ status }: { status: StatusNota }) {
  return <Badge tom={tomNota[status]}>{status}</Badge>
}

export const rotuloFinanceiro: Record<StatusFinanceiro, string> = {
  aberto: 'Em aberto',
  vencido: 'Vencido',
  parcial: 'Parcial',
  liquidado: 'Liquidado',
  cancelado: 'Cancelado',
}

const tomFinanceiro: Record<StatusFinanceiro, Tom> = {
  aberto: 'neutro',
  vencido: 'negativo',
  parcial: 'atencao',
  liquidado: 'positivo',
  cancelado: 'negativo',
}

export function StatusFinanceiroBadge({ status }: { status: StatusFinanceiro }) {
  return <Badge tom={tomFinanceiro[status]}>{rotuloFinanceiro[status]}</Badge>
}

/** Renders either a financial or a document status string. */
export function StatusQualquer({ status }: { status: string }) {
  if (status in tomFinanceiro) return <StatusFinanceiroBadge status={status as StatusFinanceiro} />
  if (status in tomNota) return <StatusNotaBadge status={status as StatusNota} />
  return <Badge tom="atencao">{status}</Badge>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,29,51,0.04)] ${className}`}>{children}</section>
}

export function CardHeader({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-sm text-muted">{descricao}</p>}
      </div>
      {acao}
    </header>
  )
}

export function PageHeader({ titulo, descricao, acoes, sobre }: { titulo: string; descricao?: string; acoes?: ReactNode; sobre?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {sobre && <div className="mb-1 text-sm text-muted">{sobre}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{titulo}</h1>
        {descricao && <p className="mt-1 max-w-3xl text-sm text-muted">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}

export function Dica({ texto }: { texto: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 text-muted" aria-label={texto} />
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-5 z-30 hidden w-64 -translate-x-1/2 rounded-lg bg-navy-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-white shadow-lg group-hover:block group-focus-within:block">
        {texto}
      </span>
    </span>
  )
}

export function Botao({
  children,
  variante = 'primario',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'secundario' | 'fantasma' | 'perigo' }) {
  const v = {
    primario: 'bg-navy-900 text-white hover:bg-navy-700 disabled:bg-slate-300',
    secundario: 'border border-line bg-white text-ink hover:bg-canvas disabled:text-slate-400',
    fantasma: 'text-brand-600 hover:bg-brand-50',
    perigo: 'bg-risk-600 text-white hover:bg-risk-700',
  }[variante]
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${v} ${className}`}
    >
      {children}
    </button>
  )
}

export function Vazio({ titulo, texto, acao }: { titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="font-medium text-ink">{titulo}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{texto}</p>
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

export function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{rotulo}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  )
}
