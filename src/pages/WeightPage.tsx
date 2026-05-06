import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingDown, TrendingUp, Minus, Footprints } from 'lucide-react'
import { weightStore, stepsStore, foodStore, exerciseStore, settingsStore } from '../storage'
import { today, nowTime, uid, fmtDate, last7Days, kgToLbs } from '../utils'
import type { WeightEntry, StepsEntry } from '../types'
import Card from '../components/Card'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, ScatterChart, Scatter, ZAxis,
} from 'recharts'

export default function WeightPage() {
  const settings = settingsStore.get()
  const unit = settings.weightUnit
  const stepsGoal = settings.goals.steps ?? 8000
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [stepsEntries, setStepsEntries] = useState<StepsEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ weight: '', steps: '', notes: '', time: nowTime() })

  const reload = () => {
    setEntries(weightStore.getAll())
    setStepsEntries(stepsStore.getAll())
  }
  useEffect(() => { reload() }, [])

  const convert = (kg: number) => unit === 'lbs' ? kgToLbs(kg) : kg

  const saveEntry = () => {
    if (!form.weight && !form.steps) return
    if (form.weight) {
      const entry: WeightEntry = {
        id: uid(), date: today(), time: form.time,
        weight: unit === 'lbs' ? Math.round(Number(form.weight) / 2.20462 * 10) / 10 : Number(form.weight),
        notes: form.notes || undefined,
      }
      weightStore.add(entry)
    }
    if (form.steps) {
      stepsStore.set({ id: uid(), date: today(), steps: Number(form.steps), source: 'manual' })
    }
    reload()
    setShowForm(false)
    setForm({ weight: '', steps: '', notes: '', time: nowTime() })
  }

  const remove = (id: string) => { weightStore.remove(id); reload() }
  const todaySteps = stepsStore.forDate(today())

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const latest = sorted.at(-1)
  const previous = sorted.at(-2)
  const diff = latest && previous ? convert(latest.weight) - convert(previous.weight) : null

  // Chart: last 30 days weight
  const weightChartData = sorted.slice(-30).map(e => ({
    date: e.date.slice(5),
    weight: convert(e.weight),
  }))

  // Correlation: daily calories vs weight the next day
  const days7 = last7Days()
  const correlationData = days7.slice(0, -1).map(d => {
    const cals = foodStore.forDate(d).reduce((s, f) => s + f.calories, 0)
    const nextDay = days7[days7.indexOf(d) + 1]
    const wEntry = sorted.find(e => e.date === nextDay)
    return cals > 0 && wEntry ? { calories: cals, weight: convert(wEntry.weight), date: d } : null
  }).filter(Boolean)

  // Exercise volume vs weight
  const exVsWeight = days7.map(d => {
    const vol = exerciseStore.forDate(d).reduce((s, e) => s + e.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0)
    const wEntry = sorted.find(e => e.date === d)
    return wEntry ? { volume: vol, weight: convert(wEntry.weight), date: fmtDate(d) } : null
  }).filter(Boolean)

  return (
    <div className="p-4 space-y-4">
      {/* Top stats row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-slate-400 mb-1">Weight</p>
          <p className="text-3xl font-bold">{latest ? convert(latest.weight) : '—'} <span className="text-sm text-slate-400">{unit}</span></p>
          {diff !== null && (
            <div className={`flex items-center gap-1 text-xs mt-1 ${diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {diff < 0 ? <TrendingDown size={13} /> : diff > 0 ? <TrendingUp size={13} /> : <Minus size={13} />}
              {diff > 0 ? '+' : ''}{diff.toFixed(1)} {unit}
            </div>
          )}
        </Card>
        <Card>
          <p className="text-xs text-slate-400 mb-1">Steps today</p>
          <div className="flex items-end gap-1">
            <p className="text-3xl font-bold">{todaySteps ? todaySteps.steps.toLocaleString() : '—'}</p>
            {todaySteps && <p className="text-xs text-slate-400 mb-1">/ {stepsGoal.toLocaleString()}</p>}
          </div>
          {todaySteps && (
            <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${todaySteps.steps >= stepsGoal ? 'bg-emerald-400' : 'bg-blue-400'}`}
                style={{ width: `${Math.min((todaySteps.steps / stepsGoal) * 100, 100)}%` }}
              />
            </div>
          )}
        </Card>
      </div>

      <button onClick={() => setShowForm(v => !v)} className="w-full bg-emerald-600 rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-medium">
        <Plus size={18} /> Log morning check-in
      </button>

      {/* Form */}
      {showForm && (
        <Card className="space-y-3">
          <p className="text-sm font-medium">Morning check-in</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Weight ({unit})</label>
              <input className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" type="number" step="0.1" placeholder="e.g. 82.5" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Time</label>
              <input className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1"><Footprints size={11} /> Steps (from Mi Fitness app)</label>
            <input className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" type="number" placeholder={`goal: ${stepsGoal.toLocaleString()}`} value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} />
          </div>
          <input className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <p className="text-xs text-slate-400">💡 6am before workout · check Mi Fitness for yesterday's steps</p>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-700 rounded-xl py-2 text-sm">Cancel</button>
            <button onClick={saveEntry} className="flex-1 bg-emerald-600 rounded-xl py-2 text-sm font-medium">Save</button>
          </div>
        </Card>
      )}

      {/* Weight trend chart */}
      {weightChartData.length >= 2 && (
        <Card>
          <p className="text-xs text-slate-400 mb-3">Weight trend (last 30 days)</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                domain={['auto', 'auto']}
                width={35}
              />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="#34d399" strokeWidth={2} dot={false} name={`Weight (${unit})`} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Steps chart */}
      {stepsEntries.length >= 2 && (
        <Card>
          <p className="text-xs text-slate-400 mb-3">Steps (last 14 days)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={[...stepsEntries].sort((a,b) => a.date.localeCompare(b.date)).slice(-14).map(e => ({ day: e.date.slice(5), steps: e.steps }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={38} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={stepsGoal} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'goal', fill: '#34d399', fontSize: 10 }} />
              <Line type="monotone" dataKey="steps" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} name="Steps" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Calories vs weight correlation */}
      {correlationData.length >= 2 && (
        <Card>
          <p className="text-xs text-slate-400 mb-1">Calories → next-day weight (7d)</p>
          <p className="text-[10px] text-slate-500 mb-3">Higher calories = higher weight next morning?</p>
          <ResponsiveContainer width="100%" height={130}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="calories" name="Calories" unit=" kcal" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis dataKey="weight" name="Weight" unit={` ${unit}`} domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} width={38} />
              <ZAxis range={[40, 40]} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={correlationData as object[]} fill="#f59e0b" />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Exercise volume vs weight */}
      {exVsWeight.length >= 2 && (
        <Card>
          <p className="text-xs text-slate-400 mb-3">Exercise volume vs weight (7d)</p>
          <ResponsiveContainer width="100%" height={130}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="volume" name="Volume" unit=" kg" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis dataKey="weight" name="Weight" unit={` ${unit}`} domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} width={38} />
              <ZAxis range={[40, 40]} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={exVsWeight as object[]} fill="#818cf8" />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* History list */}
      <div className="space-y-2">
        <p className="text-xs text-slate-400 font-medium px-1">History</p>
        {sorted.slice().reverse().slice(0, 20).map(e => (
          <Card key={e.id} className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium">{convert(e.weight)} {unit}</p>
                {stepsStore.forDate(e.date) && (
                  <span className="flex items-center gap-1 text-xs text-blue-400">
                    <Footprints size={11} />{stepsStore.forDate(e.date)!.steps.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{fmtDate(e.date)} · {e.time}{e.notes && ` · ${e.notes}`}</p>
            </div>
            <button onClick={() => remove(e.id)} className="text-slate-500 active:text-rose-400 p-1"><Trash2 size={16} /></button>
          </Card>
        ))}
        {entries.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No weight entries yet</p>}
      </div>
    </div>
  )
}
