import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { foodStore, settingsStore } from '../storage'
import { today, fmtDate } from '../utils'
import Card from '../components/Card'
import RingProgress from '../components/RingProgress'

// Read-only view: meals are imported from Fitia via Health Connect
// (Settings → Health Connect). Manual entry was removed on purpose.
export default function CaloriesPage() {
  const settings = settingsStore.get()
  const goal = settings.goals.calories
  const proteinGoal = settings.goals.protein

  const [date, setDate] = useState(today())
  const entries = useMemo(
    () => foodStore.forDate(date).sort((a, b) => a.time.localeCompare(b.time)),
    [date],
  )

  const totalCals = entries.reduce((s, e) => s + e.calories, 0)
  const totalProtein = entries.reduce((s, e) => s + e.protein, 0)
  const totalCarbs = entries.reduce((s, e) => s + e.carbs, 0)
  const totalFat = entries.reduce((s, e) => s + e.fat, 0)

  const shiftDate = (days: number) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  return (
    <div className="p-4 space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => shiftDate(-1)} className="p-2 text-slate-400 active:text-white">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium">{date === today() ? 'Today' : fmtDate(date)}</span>
        <button onClick={() => shiftDate(1)} disabled={date >= today()} className="p-2 text-slate-400 active:text-white disabled:opacity-30">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calorie ring */}
      <Card className="flex items-center gap-4">
        <RingProgress value={totalCals} max={goal} size={90} label={`${totalCals}`} sublabel="kcal" />
        <div className="flex-1 space-y-2">
          <MacroBar label="Protein" value={totalProtein} max={proteinGoal} color="bg-blue-400" unit="g" />
          <MacroBar label="Carbs" value={totalCarbs} max={goal * 0.5 / 4} color="bg-amber-400" unit="g" />
          <MacroBar label="Fat" value={totalFat} max={goal * 0.3 / 9} color="bg-rose-400" unit="g" />
          <p className="text-xs text-slate-400">{goal - totalCals > 0 ? `${goal - totalCals} kcal remaining` : 'Over goal!'}</p>
        </div>
      </Card>

      {/* Source hint */}
      <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-800/60 rounded-xl p-3">
        <RefreshCw size={14} className="mt-0.5 shrink-0" />
        <p>Las comidas se registran en Fitia y se importan desde Ajustes → Health Connect → Sincronizar ahora.</p>
      </div>

      {/* Entry list (read-only) */}
      <div className="space-y-2">
        {entries.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">Sin comidas este día</p>}
        {entries.map(e => (
          <Card key={e.id}>
            <p className="text-sm font-medium">{e.name}</p>
            <p className="text-xs text-slate-400">{e.time} · {e.calories} kcal · P:{e.protein}g C:{e.carbs}g F:{e.fat}g</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

function MacroBar({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-0.5">
        <span>{label}</span>
        <span>{Math.round(value)}{unit}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
