import { useState } from 'react'
import { TrendingDown, FlaskConical, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { dataTDEE, formulaTDEE, goalSuggestions } from '../tdee'
import { foodStore, weightStore, settingsStore } from '../storage'
import type { GoalSuggestion } from '../tdee'
import Card from './Card'

const CONFIDENCE_COLOR = { low: 'text-amber-400', medium: 'text-blue-400', high: 'text-emerald-400' }
const CONFIDENCE_LABEL = { low: 'Low (< 6 days)', medium: 'Medium (6–9 days)', high: 'High (10+ days)' }

interface Props {
  onGoalApplied: (calories: number) => void
}

export default function TDEECard({ onGoalApplied }: Props) {
  const settings = settingsStore.get()
  const [expanded, setExpanded] = useState(false)
  const [applied, setApplied] = useState<number | null>(null)

  const allWeights = weightStore.getAll()
  const allFood    = foodStore.getAll()

  const dataResult = dataTDEE(allWeights, allFood, 14)
  const p = settings.personal
  const latestWeight = allWeights.sort((a, b) => a.date.localeCompare(b.date)).at(-1)

  const formulaResult = p && latestWeight
    ? formulaTDEE(latestWeight.weight, p.heightCm, p.age, p.sex, p.activity)
    : null

  // Prefer data-derived TDEE; fall back to formula
  const tdee = dataResult?.tdee ?? formulaResult
  const source = dataResult ? 'data' : formulaResult ? 'formula' : null

  if (!tdee || !source) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-sm font-medium mb-1">
          <TrendingDown size={15} className="text-blue-400" /> TDEE Calculator
        </div>
        <p className="text-xs text-slate-400">
          {allWeights.length < 2
            ? 'Log at least 2 weight entries to activate.'
            : 'Fill in personal stats in Settings for a formula estimate.'}
        </p>
      </Card>
    )
  }

  const suggestions = goalSuggestions(tdee)

  const apply = (s: GoalSuggestion) => {
    const updated = { ...settings, goals: { ...settings.goals, calories: s.calories } }
    settingsStore.save(updated)
    onGoalApplied(s.calories)
    setApplied(s.calories)
    setTimeout(() => setApplied(null), 2500)
  }

  return (
    <Card className="space-y-3">
      {/* Header */}
      <button className="flex items-center justify-between w-full" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingDown size={15} className="text-blue-400" /> TDEE Calculator
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 ${source === 'data' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {source === 'data' ? 'from your data' : 'formula estimate'}
          </span>
        </div>
        {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>

      {/* TDEE + deficit row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-700 rounded-xl py-2">
          <p className="text-lg font-bold text-blue-400">{tdee.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400">TDEE kcal</p>
        </div>
        <div className="bg-slate-700 rounded-xl py-2">
          <p className="text-lg font-bold">{settings.goals.calories.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400">current goal</p>
        </div>
        <div className="bg-slate-700 rounded-xl py-2">
          <p className={`text-lg font-bold ${tdee - settings.goals.calories > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {tdee - settings.goals.calories > 0 ? '−' : '+'}{Math.abs(tdee - settings.goals.calories)}
          </p>
          <p className="text-[10px] text-slate-400">deficit</p>
        </div>
      </div>

      {/* Data confidence badge */}
      {dataResult && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <FlaskConical size={11} />
            {dataResult.daysUsed} days of data ·{' '}
            <span className={CONFIDENCE_COLOR[dataResult.confidence]}>{CONFIDENCE_LABEL[dataResult.confidence]}</span>
          </span>
          <span className={dataResult.weightChangePer7Days < 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {dataResult.weightChangePer7Days > 0 ? '+' : ''}{dataResult.weightChangePer7Days} kg/wk
          </span>
        </div>
      )}

      {/* Expanded: breakdown + goal suggestions */}
      {expanded && (
        <div className="space-y-3 border-t border-slate-700 pt-3">
          {dataResult && (
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>Avg calories logged: <span className="text-white">{dataResult.avgCalories} kcal/day</span></p>
              <p>Weight trend: <span className="text-white">{dataResult.weightChangePer7Days} kg / week</span></p>
              <p>Implied deficit: <span className="text-white">{Math.round(-dataResult.weightChangePer7Days * 7700 / 7)} kcal/day</span></p>
              <p>Back-calculated TDEE: <span className="text-blue-400 font-medium">{dataResult.tdee} kcal</span></p>
            </div>
          )}

          {formulaResult && (
            <p className="text-xs text-slate-500">
              Formula TDEE (Mifflin-St Jeor): <span className="text-slate-300">{formulaResult} kcal</span>
              {dataResult && <span className="text-slate-500"> · {Math.abs(formulaResult - dataResult.tdee)} kcal diff</span>}
            </p>
          )}

          <p className="text-xs font-medium text-slate-300">Set a new calorie goal:</p>
          <div className="space-y-2">
            {suggestions.map(s => (
              <button key={s.label} onClick={() => apply(s)}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  applied === s.calories ? 'bg-emerald-700' : 'bg-slate-700 active:bg-slate-600'
                }`}>
                <span>{s.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs">~{s.weeklyLossKg} kg/wk</span>
                  <span className="font-medium">{s.calories.toLocaleString()} kcal</span>
                  {applied === s.calories && <Check size={14} className="text-emerald-300" />}
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">Tapping a goal saves it immediately. Recalculates as you log more data.</p>
        </div>
      )}
    </Card>
  )
}
