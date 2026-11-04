import { useMemo } from 'react'
import { CalendarRange } from 'lucide-react'
import { weeklyStats, weeklyFindings } from '../analytics'
import { settingsStore } from '../storage'
import Card from './Card'

const TONE = { good: 'text-emerald-400', warn: 'text-amber-400', info: 'text-slate-400' }
const DOT = { good: 'bg-emerald-400', warn: 'bg-amber-400', info: 'bg-slate-500' }

const fmt = (n: number | null, digits = 0) =>
  n == null ? '—' : n.toLocaleString('es-CL', { maximumFractionDigits: digits, minimumFractionDigits: digits })

export default function WeeklyPanel() {
  const stats = useMemo(() => weeklyStats(8), [])
  const findings = useMemo(() => weeklyFindings(stats), [stats])
  const unit = settingsStore.get().weightUnit
  const toUnit = (kg: number | null) => (kg == null ? null : unit === 'lbs' ? kg * 2.20462 : kg)

  // Newest first reads better on a phone
  const rows = [...stats].reverse()

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarRange size={15} className="text-blue-400" /> Resumen semanal
      </div>

      <ul className="space-y-1.5">
        {findings.map((f, i) => (
          <li key={i} className="flex gap-2 text-xs leading-relaxed">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT[f.tone]}`} />
            <span className={TONE[f.tone]}>{f.text}</span>
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[420px]">
          <thead>
            <tr className="text-slate-500 text-left">
              <th className="font-normal py-1 px-1">Semana</th>
              <th className="font-normal px-1 text-right">kcal</th>
              <th className="font-normal px-1 text-right">Prot</th>
              <th className="font-normal px-1 text-right">Pasos</th>
              <th className="font-normal px-1 text-right">Entr.</th>
              <th className="font-normal px-1 text-right">Peso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(w => (
              <tr key={w.start} className="border-t border-slate-700/60">
                <td className="py-1.5 px-1 text-slate-300">
                  {w.start.slice(5).replace('-', '/')}
                  {w.isCurrent && <span className="ml-1 text-[10px] text-blue-400">hoy</span>}
                </td>
                <td className={`px-1 text-right ${w.foodDays < 4 && w.avgKcal != null ? 'text-amber-400' : ''}`}>
                  {fmt(w.avgKcal)}
                  {w.avgKcal != null && <span className="text-slate-500"> ({w.foodDays}d)</span>}
                </td>
                <td className="px-1 text-right">{fmt(w.avgProtein)}</td>
                <td className="px-1 text-right">{fmt(w.avgSteps)}</td>
                <td className="px-1 text-right">{w.trainingDays || '—'}</td>
                <td className="px-1 text-right">{fmt(toUnit(w.avgWeight), 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">
        kcal y proteína promedian solo días con comida completa (2+ comidas y 50% de la meta); entre paréntesis, cuántos días.
        En ámbar: menos de 4 días, poco fiable. Peso = promedio de pesajes de la semana.
      </p>
    </Card>
  )
}
