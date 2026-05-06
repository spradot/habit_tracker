import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Trophy, ChevronDown, ChevronUp } from 'lucide-react'
import { exerciseStore } from '../storage'
import { today, uid, fmtDate } from '../utils'
import type { ExerciseEntry, ExerciseSet } from '../types'
import Card from '../components/Card'

const CATEGORIES = ['strength', 'cardio', 'mobility'] as const
const PRESETS = ['Bench Press', 'Squat', 'Deadlift', 'OHP', 'Pull-up', 'Dumbbell Row', 'Treadmill', 'Cycling', 'Jump Rope']

export default function ExercisePage() {
  const [date, setDate] = useState(today())
  const [entries, setEntries] = useState<ExerciseEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', category: 'strength' as ExerciseEntry['category'],
    sets: [{ reps: 0, weight: 0, unit: 'kg' }] as ExerciseSet[],
    durationMin: '', notes: '',
  })

  const reload = useCallback(() => setEntries(exerciseStore.forDate(date)), [date])
  useEffect(() => { reload() }, [reload])

  const shiftDate = (days: number) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  const addSet = () => setForm(f => ({ ...f, sets: [...f.sets, { reps: 0, weight: 0, unit: 'kg' }] }))
  const removeSet = (i: number) => setForm(f => ({ ...f, sets: f.sets.filter((_, j) => j !== i) }))
  const updateSet = (i: number, field: keyof ExerciseSet, val: string | number) => {
    setForm(f => {
      const sets = [...f.sets]
      sets[i] = { ...sets[i], [field]: typeof val === 'string' && field !== 'unit' ? Number(val) : val }
      return { ...f, sets }
    })
  }

  const save = () => {
    if (!form.name) return
    const prevPR = form.category === 'strength' ? exerciseStore.getPR(form.name) : 0
    const maxWeight = Math.max(...form.sets.map(s => s.weight), 0)
    const isPR = form.category === 'strength' && maxWeight > prevPR && maxWeight > 0

    const entry: ExerciseEntry = {
      id: uid(), date, name: form.name,
      category: form.category,
      sets: form.sets,
      durationMin: form.durationMin ? Number(form.durationMin) : undefined,
      notes: form.notes || undefined,
      pr: isPR,
    }
    exerciseStore.add(entry)
    reload()
    setShowForm(false)
    setForm({ name: '', category: 'strength', sets: [{ reps: 0, weight: 0, unit: 'kg' }], durationMin: '', notes: '' })
  }

  const remove = (id: string) => { exerciseStore.remove(id); reload() }

  return (
    <div className="p-4 space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => shiftDate(-1)} className="p-2 text-slate-400"><ChevronLeft size={20} /></button>
        <span className="text-sm font-medium">{date === today() ? 'Today' : fmtDate(date)}</span>
        <button onClick={() => shiftDate(1)} disabled={date >= today()} className="p-2 text-slate-400 disabled:opacity-30"><ChevronRight size={20} /></button>
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <Card className="flex gap-4 text-center">
          <div className="flex-1"><p className="text-xl font-bold">{entries.length}</p><p className="text-xs text-slate-400">Exercises</p></div>
          <div className="flex-1"><p className="text-xl font-bold">{entries.reduce((s, e) => s + e.sets.length, 0)}</p><p className="text-xs text-slate-400">Sets</p></div>
          <div className="flex-1"><p className="text-xl font-bold text-amber-400">{entries.filter(e => e.pr).length}</p><p className="text-xs text-slate-400">PRs</p></div>
        </Card>
      )}

      {/* Add button */}
      <button onClick={() => setShowForm(v => !v)} className="w-full bg-emerald-600 rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-medium">
        <Plus size={18} /> Log Exercise
      </button>

      {/* Form */}
      {showForm && (
        <Card className="space-y-3">
          <div className="grid grid-cols-3 gap-1">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, category: c }))}
                className={`py-1.5 rounded-lg text-xs font-medium capitalize ${form.category === c ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                {c}
              </button>
            ))}
          </div>

          <div>
            <input
              className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
              placeholder="Exercise name"
              value={form.name}
              list="presets"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <datalist id="presets">{PRESETS.map(p => <option key={p} value={p} />)}</datalist>
          </div>

          {form.category === 'cardio' ? (
            <input className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Duration (minutes)" type="number" value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin: e.target.value }))} />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 font-medium">Sets</p>
              {form.sets.map((set, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                  <input className="flex-1 bg-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none" type="number" placeholder="Reps" value={set.reps || ''} onChange={e => updateSet(i, 'reps', e.target.value)} />
                  <input className="flex-1 bg-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none" type="number" placeholder="Weight" value={set.weight || ''} onChange={e => updateSet(i, 'weight', e.target.value)} />
                  <select className="bg-slate-700 rounded-lg px-1 py-1.5 text-sm outline-none" value={set.unit} onChange={e => updateSet(i, 'unit', e.target.value)}>
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                  {form.sets.length > 1 && <button onClick={() => removeSet(i)} className="text-slate-500"><Trash2 size={14} /></button>}
                </div>
              ))}
              <button onClick={addSet} className="text-xs text-emerald-400">+ Add set</button>
            </div>
          )}

          <input className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-700 rounded-xl py-2 text-sm">Cancel</button>
            <button onClick={save} className="flex-1 bg-emerald-600 rounded-xl py-2 text-sm font-medium">Save</button>
          </div>
        </Card>
      )}

      {/* Entries */}
      <div className="space-y-2">
        {entries.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No exercise logged yet</p>}
        {entries.map(e => (
          <Card key={e.id}>
            <div className="flex items-start justify-between">
              <button className="flex-1 text-left" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{e.name}</span>
                  {e.pr && <span className="flex items-center gap-0.5 text-amber-400 text-xs"><Trophy size={12} />PR</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto capitalize ${
                    e.category === 'strength' ? 'bg-blue-900 text-blue-300' :
                    e.category === 'cardio' ? 'bg-rose-900 text-rose-300' : 'bg-purple-900 text-purple-300'
                  }`}>{e.category}</span>
                  {expandedId === e.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {e.category === 'cardio' ? `${e.durationMin} min` : `${e.sets.length} sets · ${Math.max(...e.sets.map(s => s.weight))} ${e.sets[0]?.unit ?? 'kg'} max`}
                </p>
              </button>
              <button onClick={() => remove(e.id)} className="text-slate-500 active:text-rose-400 p-1 ml-2"><Trash2 size={16} /></button>
            </div>

            {expandedId === e.id && e.sets.length > 0 && (
              <div className="mt-3 border-t border-slate-700 pt-2 space-y-1">
                {e.sets.map((s, i) => (
                  <div key={i} className="flex text-xs text-slate-300 gap-4">
                    <span className="text-slate-500">Set {i + 1}</span>
                    <span>{s.reps} reps</span>
                    <span>{s.weight} {s.unit}</span>
                    <span className="text-slate-500">{Math.round(s.reps * s.weight)} vol</span>
                  </div>
                ))}
                {e.notes && <p className="text-xs text-slate-400 mt-1 italic">{e.notes}</p>}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
