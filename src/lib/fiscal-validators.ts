// Deterministic validation rules for Brazilian fiscal identifiers.
// These run on every extracted/edited document, independent of any AI suggestion.

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function cnpjCheckDigits(base12: string): string {
  const calc = (digits: string, weights: number[]) => {
    const sum = digits.split('').reduce((acc, d, i) => acc + Number(d) * weights[i], 0)
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d1 = calc(base12, w1)
  const d2 = calc(base12 + d1, w2)
  return `${d1}${d2}`
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  return cnpjCheckDigits(d.slice(0, 12)) === d.slice(12)
}

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
    const r = (sum * 10) % 11
    return r === 10 ? 0 : r
  }
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
}

export function isValidCpfCnpj(value: string): boolean {
  const d = onlyDigits(value)
  return d.length === 11 ? isValidCpf(d) : isValidCnpj(d)
}

/** Modulo-11 check digit of a 43-digit NF-e/NFC-e/CT-e access key. */
export function chaveCheckDigit(base43: string): number {
  let weight = 2
  let sum = 0
  for (let i = base43.length - 1; i >= 0; i--) {
    sum += Number(base43[i]) * weight
    weight = weight === 9 ? 2 : weight + 1
  }
  const r = sum % 11
  return r < 2 ? 0 : 11 - r
}

export function isValidChave(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 44) return false
  return chaveCheckDigit(d.slice(0, 43)) === Number(d[43])
}

/** Builds a structurally valid access key (used for sample data). */
export function buildChave(p: {
  cUF: string
  aamm: string
  cnpj: string
  modelo: string
  serie: number
  numero: number
  codigo: number
}): string {
  const base =
    p.cUF.padStart(2, '0') +
    p.aamm +
    onlyDigits(p.cnpj).padStart(14, '0') +
    p.modelo +
    String(p.serie).padStart(3, '0') +
    String(p.numero).padStart(9, '0') +
    '1' +
    String(p.codigo).padStart(8, '0')
  return base + chaveCheckDigit(base)
}
