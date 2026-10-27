// Monetary values are always integer cents to avoid floating-point rounding.
export type Cents = number

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function brl(cents: Cents): string {
  return brlFormatter.format(cents / 100)
}

export function brlCompact(cents: Cents): string {
  const v = cents / 100
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return brl(cents)
}

/** ISO date (YYYY-MM-DD) → DD/MM/AAAA */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** YYYY-MM → "out/26" */
export function mesCurto(ym: string): string {
  const [y, m] = ym.split('-')
  return `${MESES[Number(m) - 1]}/${y.slice(2)}`
}

/** YYYY-MM → "outubro de 2026" */
export function mesLongo(ym: string): string {
  const [y, m] = ym.split('-')
  return `${MESES_LONGOS[Number(m) - 1]} de ${y}`
}

export function formatCnpj(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatChave(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, '$1 ')
}

/** Parses "1.234,56" or "1234.56" into cents. Returns null when not a number. */
export function parseBRL(input: string): Cents | null {
  const s = input.trim().replace(/[R$\s]/g, '')
  if (!s) return null
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

/** Converts cents to an editable "1234,56" string. */
export function centsToInput(cents: Cents | null): string {
  if (cents === null) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

// --- date helpers on ISO strings (timezone-free) ---

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m, 0, 12))
  return d.toISOString().slice(0, 10)
}

export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1, 12))
  return d.toISOString().slice(0, 7)
}

export function monthRange(fromYm: string, toYm: string): string[] {
  const out: string[] = []
  let cur = fromYm
  while (cur <= toYm) {
    out.push(cur)
    cur = addMonths(cur, 1)
  }
  return out
}
