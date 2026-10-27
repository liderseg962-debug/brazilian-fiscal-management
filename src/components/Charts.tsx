import { useEffect, useState } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { brl, brlCompact } from '@/lib/format'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)
ChartJS.defaults.font.family = '"IBM Plex Sans", system-ui, sans-serif'
ChartJS.defaults.color = '#5b6b82'

export const cores = {
  navy: '#1b3b69',
  azul: '#2f74d8',
  azulClaro: '#9cc0f0',
  verde: '#1a8a4f',
  vermelho: '#c62f2f',
  ambar: '#d99400',
  cinza: '#c5cedb',
}

// All series hold integer cents; axes and tooltips convert to reais.
const tooltipBRL = (eixo: 'x' | 'y') => ({
  callbacks: {
    label: (ctx: { dataset: { label?: string }; parsed: { x: number; y: number } }) =>
      `${ctx.dataset.label ? `${ctx.dataset.label}: ` : ''}${brl(ctx.parsed[eixo] ?? 0)}`,
  },
})

function useMontado() {
  const [m, setM] = useState(false)
  useEffect(() => setM(true), [])
  return m
}

function Placeholder({ altura }: { altura: number }) {
  return <div style={{ height: altura }} className="animate-pulse rounded-lg bg-canvas" />
}

type TabelaAlt = { rotulos: string[]; series: Array<{ nome: string; valores: number[] }> }

function TabelaAcessivel({ titulo, dados }: { titulo: string; dados: TabelaAlt }) {
  return (
    <table className="sr-only">
      <caption>{titulo}</caption>
      <thead>
        <tr>
          <th>Item</th>
          {dados.series.map((s) => (
            <th key={s.nome}>{s.nome}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dados.rotulos.map((r, i) => (
          <tr key={r}>
            <th>{r}</th>
            {dados.series.map((s) => (
              <td key={s.nome}>{brl(s.valores[i] ?? 0)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const eixoBRL = {
  grid: { color: '#eef1f5' },
  border: { display: false },
  ticks: { callback: (v: string | number) => brlCompact(Number(v)) },
}

export function GraficoBarras({
  titulo,
  rotulos,
  series,
  horizontal = false,
  altura = 280,
  empilhado = false,
}: {
  titulo: string
  rotulos: string[]
  series: Array<{ nome: string; valores: number[]; cor: string; tipo?: 'bar' | 'line' }>
  horizontal?: boolean
  altura?: number
  empilhado?: boolean
}) {
  const montado = useMontado()
  const data = {
    labels: rotulos,
    datasets: series.map((s) =>
      s.tipo === 'line'
        ? { type: 'line' as const, label: s.nome, data: s.valores, borderColor: s.cor, backgroundColor: s.cor, borderWidth: 2, pointRadius: 3, tension: 0.3 }
        : { type: 'bar' as const, label: s.nome, data: s.valores, backgroundColor: s.cor, borderRadius: 4, maxBarThickness: horizontal ? 18 : 28 },
    ),
  } as ChartData<'bar'>
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: { display: series.length > 1, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } },
      tooltip: tooltipBRL(horizontal ? 'x' : 'y') as never,
    },
    scales: horizontal
      ? { x: { ...eixoBRL, stacked: empilhado }, y: { grid: { display: false }, border: { display: false }, stacked: empilhado } }
      : { y: { ...eixoBRL, stacked: empilhado }, x: { grid: { display: false }, border: { display: false }, stacked: empilhado } },
  }
  return (
    <figure>
      <div style={{ height: altura }}>{montado ? <Bar data={data} options={options} aria-label={titulo} role="img" /> : <Placeholder altura={altura} />}</div>
      <TabelaAcessivel titulo={titulo} dados={{ rotulos, series: series.map((s) => ({ nome: s.nome, valores: s.valores })) }} />
    </figure>
  )
}

export function GraficoLinha({ titulo, rotulos, valores, cor = cores.azul, altura = 240, destacarFuturo }: { titulo: string; rotulos: string[]; valores: number[]; cor?: string; altura?: number; destacarFuturo?: number }) {
  const montado = useMontado()
  const data: ChartData<'line'> = {
    labels: rotulos,
    datasets: [
      {
        label: 'Saldo',
        data: valores,
        borderColor: cor,
        backgroundColor: 'rgba(47,116,216,0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: cor,
        segment: destacarFuturo !== undefined ? { borderDash: (c) => (c.p1DataIndex > destacarFuturo ? [5, 4] : undefined) } : undefined,
      },
    ],
  }
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipBRL('y') as never },
    scales: { y: eixoBRL, x: { grid: { display: false }, border: { display: false } } },
  }
  return (
    <figure>
      <div style={{ height: altura }}>{montado ? <Line data={data} options={options} aria-label={titulo} role="img" /> : <Placeholder altura={altura} />}</div>
      <TabelaAcessivel titulo={titulo} dados={{ rotulos, series: [{ nome: 'Saldo', valores }] }} />
    </figure>
  )
}

export function GraficoRosca({ titulo, rotulos, valores, coresFatias, altura = 200 }: { titulo: string; rotulos: string[]; valores: number[]; coresFatias: string[]; altura?: number }) {
  const montado = useMontado()
  const data: ChartData<'doughnut'> = { labels: rotulos, datasets: [{ data: valores, backgroundColor: coresFatias, borderWidth: 2, borderColor: '#fff' }] }
  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${brl(Number(c.parsed))}` } } },
  }
  return (
    <figure>
      <div style={{ height: altura }}>{montado ? <Doughnut data={data} options={options} aria-label={titulo} role="img" /> : <Placeholder altura={altura} />}</div>
      <TabelaAcessivel titulo={titulo} dados={{ rotulos, series: [{ nome: 'Valor', valores }] }} />
    </figure>
  )
}
