'use client'

import { formatCurrency } from '@/lib/utils'

interface BarData {
  label: string
  value: number
}

interface ChartBarProps {
  data: BarData[]
  height?: number
}

export function ChartBar({ data, height = 160 }: ChartBarProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="font-mono text-xs text-text-muted">sem dados</span>
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className="flex items-end gap-2 w-full" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.value / maxValue) * 100
        // Minimo 4% para barras com valor > 0 ficarem visiveis
        const barPct = d.value > 0 ? Math.max(pct, 4) : 0

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
            {/* Valor — aparece no hover */}
            <span className="text-[10px] font-mono text-text-muted opacity-0 group-hover:opacity-100 transition-opacity truncate">
              {d.value > 0 ? formatCurrency(d.value) : ''}
            </span>

            {/* Barra */}
            <div className="w-full flex justify-center" style={{ height: height - 40 }}>
              <div
                className="w-full max-w-[40px] rounded-t-md bg-orange/80 hover:bg-orange transition-all duration-300 ease-out self-end"
                style={{ height: `${barPct}%` }}
              />
            </div>

            {/* Label */}
            <span className="text-[10px] text-text-muted truncate w-full text-center">
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
