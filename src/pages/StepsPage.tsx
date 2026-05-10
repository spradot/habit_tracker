import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Footprints, Check, Trash2, Trophy } from 'lucide-react'
import { stepsStore, settingsStore, refreshTodayScore } from '../storage'
import { today, uid, fmtDate, last7Days } from '../utils'
import type { StepsEntry } from '../types'
import Card from '../components/Card'
import RingProgress from '../components/RingProgress'
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'

export default function StepsPage() {
  const settings = settingsStore.get()
  const goal = settings.goals.steps ?? 8000

  const [date, setDate] = useState(today())
  const [entry, setEntry] = useState<StepsEntry | null>(null)
  const [input, setInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [allEntries, setAllEntries] = useState<StepsEntry[]>([])

  const reload = useCallback(() => {
    const all = stepsStore.getAll().sort((a, b) => a.date.localeCompare(b.date))
    setAllEntries(all)
    setEntry(stepsStore.forDate(date))
  }, [date])

  useEffect(() => {
    reload()
    setInput('')
    setSaved(false)
  }, [reload])

  const shiftDate = (days: number) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  const save = () => {
    const n = Number(input)
    if (!n) return
    stepsStore.set({ id: entry?.id ?? uid(), date, steps: n, source: 'manual' })
    reload()
    refreshTodayScore()
    setInput('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const remove = () => {
    stepsStore.remove(date)
    reload()
    refreshTodayScore()
  }

  // Weekly chart — last 14 days
  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    return d.toISOString().slice(0, 10)
  })
  const chartData = days14.map(d => ({
    day: d.slice(5).replace('-', '/'),
    steps: allEntries.find(e => e.date === d)?.steps ?? 0,
    isToday: d === today(),
  }))

  // Stats
  const daysLogged = allEntries.length
  const bestDay = allEntries.reduce((best, e) => e.steps > (best?.steps ?? 0) ? e : best, null as StepsEntry | null)
  const last7 = last7Days()
  const avg7 = Math.round(
    last7.reduce((s, d) => s + (allEntries.find(e => e.date === d)?.steps ?? 0), 0) /
    Math.max(last7.filter(d => allEntries.find(e => e.date === d)).length, 1)
  )
  const daysHitGoal = allEntries.filter(e => e.steps >= goal).length

  const steps = entry?.steps ?? 0
  const pct = Math.round((steps / goal) * 100)

  return (
    <div className="p-4 space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => shiftDate(-1)} className="p-2 text-slate-400 active:text-white">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium">{date === today() ? 'Today' : fmtDate(date)}</span>
        <button onClick={() => shiftDate(1)} disabled={date >= today()} className="p-2 text-slate-400 disabled:opacity-30">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Ring + entry */}
      <Card className="flex items-center gap-4">
        <RingProgress
          value={steps} max={goal} size={90}
          color="#60a5fa"
          label={steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps ? `${steps}` : '0'}
          sublabel="steps"
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{steps.toLocaleString()}</p>
              <p className="text-xs text-slate-400">goal: {goal.toLocaleString()} · {pct}%</p>
            </div>
            {steps >= goal && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <Trophy size={14} /> Goal hit!
              </span>
            )}
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${steps >= goal ? 'bg-emerald-400' : 'bg-blue-400'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          {entry && (
            <p className="text-[10px] text-slate-500">
              Source: {entry.source ?? 'manual'} · tap Edit to update
            </p>
          )}
        </div>
      </Card>

      {/* Input */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">{entry ? 'Update steps' : 'Log steps'}</p>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none"
            type="number"
            placeholder={entry ? entry.steps.toLocaleString() : `e.g. ${goal.toLocaleString()}`}
            value={input}
            onChange={e => { setInput(e.target.value); setSaved(false) }}
            onKeyDown={e => e.key === 'Enter' && save()}
          />
          <button
            onClick={save}
            disabled={!input}
            className={`px-4 rounded-xl text-sm font-medium flex items-center gap-1.5 disabled:opacity-40 transition-colors ${saved ? 'bg-emerald-700' : 'bg-emerald-600'}`}
          >
            {saved ? <><Check size={14} /> Saved</> : 'Save'}
          </button>
          {entry && (
            <button onClick={remove} className="text-slate-500 active:text-rose-400 px-2">
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">Check Mi Fitness app for your step count, then enter it here.</p>
      </Card>

      {/* 14-day chart */}
      {allEntries.length >= 2 && (
        <Card>
          <p className="text-xs text-slate-400 mb-3">Last 14 days</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={1} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [Number(v).toLocaleString(), 'Steps']}
              />
              <ReferenceLine y={goal} stroke="#60a5fa" strokeDasharray="4 4" label={{ value: 'goal', fill: '#60a5fa', fontSize: 10 }} />
              <Bar dataKey="steps" radius={[3, 3, 0, 0]}
                fill="#60a5fa"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Stats row */}
      {daysLogged > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center py-2">
            <p className="text-xl font-bold text-blue-400">{avg7.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">avg / day (7d)</p>
          </Card>
          <Card className="text-center py-2">
            <p className="text-xl font-bold text-emerald-400">{daysHitGoal}</p>
            <p className="text-[10px] text-slate-400">days at goal</p>
          </Card>
          <Card className="text-center py-2">
            <p className="text-xl font-bold text-amber-400">{bestDay ? (bestDay.steps >= 1000 ? `${(bestDay.steps / 1000).toFixed(1)}k` : bestDay.steps) : '—'}</p>
            <p className="text-[10px] text-slate-400">best day</p>
          </Card>
        </div>
      )}

      {/* History */}
      {allEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 font-medium px-1">History</p>
          {[...allEntries].reverse().slice(0, 30).map(e => (
            <Card key={e.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Footprints size={15} className={e.steps >= goal ? 'text-emerald-400' : 'text-blue-400'} />
                <div>
                  <p className="text-sm font-medium">{e.steps.toLocaleString()} steps</p>
                  <p className="text-xs text-slate-400">{fmtDate(e.date)} · {Math.round((e.steps / goal) * 100)}% of goal</p>
                </div>
              </div>
              {e.steps >= goal && <Trophy size={14} className="text-emerald-400" />}
            </Card>
          ))}
        </div>
      )}

      {allEntries.length === 0 && (
        <p className="text-center text-slate-500 py-8 text-sm">No steps logged yet</p>
      )}
    </div>
  )
}
