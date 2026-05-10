import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Trophy, ChevronDown, ChevronUp, Pencil, Sparkles, RefreshCw, ClipboardList, BookOpen, CheckCircle2, Circle } from 'lucide-react'
import { exerciseStore, workoutPlanStore, settingsStore, refreshTodayScore } from '../storage'
import { today, uid, fmtDate, last7Days } from '../utils'
import type { ExerciseEntry, ExerciseSet, WeeklyPlan, WorkoutTemplate } from '../types'
import { getWorkoutRecommendation, type WorkoutRecommendation } from '../gemini'
import { DEFAULT_PLAN_TEMPLATES } from '../exerciseData'
import Card from '../components/Card'

const CATEGORIES = ['strength', 'cardio', 'mobility'] as const
const PRESETS = ['Bench Press', 'Squat', 'Deadlift', 'OHP', 'Pull-up', 'Lat Pulldown', 'Row Machine', 'Overhead Press', 'Lateral Raise', 'Hammer Curl', 'Tricep Pushdown', 'Treadmill', 'Cycling']

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function ExercisePage() {
  const [view, setView] = useState<'log' | 'plan'>('log')
  const [date, setDate] = useState(today())
  const [entries, setEntries] = useState<ExerciseEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editSets, setEditSets] = useState<ExerciseSet[]>([])

  // Plan view state
  const [activePlan, setActivePlan] = useState<WeeklyPlan | null>(null)
  const [recommendation, setRecommendation] = useState<WorkoutRecommendation | null>(null)
  const [loadingRec, setLoadingRec] = useState(false)
  const [expandedRationale, setExpandedRationale] = useState(false)
  const [selectedDayTemplate, setSelectedDayTemplate] = useState<WorkoutTemplate | null>(null)
  const [showManagePlans, setShowManagePlans] = useState(false)
  const [weekExercises, setWeekExercises] = useState<ExerciseEntry[]>([])

  const [form, setForm] = useState({
    name: '', category: 'strength' as ExerciseEntry['category'],
    sets: [{ reps: 0, weight: 0, unit: 'kg' }] as ExerciseSet[],
    durationMin: '', notes: '',
  })

  const reload = useCallback(() => setEntries(exerciseStore.forDate(date)), [date])
  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (view === 'plan') {
      setActivePlan(workoutPlanStore.getActive())
      const days = last7Days()
      const all = exerciseStore.getAll().filter(e => days.includes(e.date))
      setWeekExercises(all)
      refreshTodayScore()
    }
  }, [view])

  const fetchRecommendation = async () => {
    setLoadingRec(true)
    try {
      const settings = settingsStore.get()
      const latestWeights = JSON.parse(localStorage.getItem('ht_weight') || '[]')
      const latestWeight = latestWeights.length ? latestWeights[latestWeights.length - 1].weight : null
      const dow = new Date().getDay()
      const todayTemplate = activePlan
        ? (activePlan.floating ? workoutPlanStore.matchTemplate(entries.map(e => e.name)) : workoutPlanStore.getTemplateForDay(dow))
        : null
      const rec = await getWorkoutRecommendation(
        settings.deepseekApiKey,
        weekExercises,
        latestWeight,
        settings.goalWeightKg ?? 80,
        settings.recompNote ?? 'reduce belly fat and gynecomastia, gain muscle',
        DAY_FULL[dow],
        todayTemplate
      )
      setRecommendation(rec)
    } finally {
      setLoadingRec(false)
    }
  }

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

  const startEdit = (e: ExerciseEntry) => { setEditSets(e.sets.map(s => ({ ...s }))); setEditingId(e.id) }
  const cancelEdit = () => setEditingId(null)
  const updateEditSet = (i: number, field: keyof ExerciseSet, val: string) => {
    setEditSets(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: field === 'unit' ? val : Number(val) }
      return next
    })
  }
  const saveEdit = (entry: ExerciseEntry) => {
    const prevPR = exerciseStore.getPR(entry.name)
    const maxWeight = Math.max(...editSets.map(s => s.weight), 0)
    const isPR = entry.category === 'strength' && maxWeight > prevPR && maxWeight > 0
    exerciseStore.update({ ...entry, sets: editSets, pr: isPR })
    setEditingId(null)
    reload()
  }

  const loadDefaultPlan = () => {
    const plan: WeeklyPlan = {
      id: uid(),
      name: 'My 4-Day Split',
      schedule: {},
      templates: DEFAULT_PLAN_TEMPLATES,
      floating: true,
      createdAt: today(),
      active: true,
    }
    workoutPlanStore.add(plan)
    setActivePlan(plan)
    setShowManagePlans(false)
  }

  // Compute week strip: for each day in last 7, what's the status
  const getWeekStrip = () => {
    const days = last7Days()
    const todayStr = today()
    return days.map(dateStr => {
      const dayExercises = weekExercises.filter(e => e.date === dateStr)
      const isPast = dateStr < todayStr
      const isToday = dateStr === todayStr
      const hasExercise = dayExercises.length > 0

      // Try to match to a template
      const matchedTemplate = activePlan && hasExercise
        ? workoutPlanStore.matchTemplate(dayExercises.map(e => e.name))
        : null

      let status: 'done' | 'today' | 'missed' | 'future'
      if (isToday) status = 'today'
      else if (hasExercise) status = 'done'
      else if (isPast) status = 'missed'
      else status = 'future'

      const d = new Date(dateStr + 'T12:00:00')
      return { dateStr, dow: d.getDay(), status, dayExercises, matchedTemplate }
    })
  }

  const startWorkoutFromRec = () => {
    if (!recommendation || recommendation.suggestedExercises.length === 0) return
    const first = recommendation.suggestedExercises[0]
    setForm({
      name: first.name,
      category: 'strength',
      sets: Array.from({ length: first.sets }, () => ({ reps: first.reps, weight: 0, unit: 'kg' as const })),
      durationMin: '',
      notes: '',
    })
    setShowForm(true)
    setView('log')
  }

  const weekStrip = getWeekStrip()

  return (
    <div className="p-4 space-y-4">
      {/* View toggle */}
      <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
        <button
          onClick={() => setView('log')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${view === 'log' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
        >
          <ClipboardList size={15} /> Log
        </button>
        <button
          onClick={() => setView('plan')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${view === 'plan' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}
        >
          <BookOpen size={15} /> Plan
        </button>
      </div>

      {/* ── LOG VIEW ── */}
      {view === 'log' && (
        <>
          {/* Date nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => shiftDate(-1)} className="p-2 text-slate-400"><ChevronLeft size={20} /></button>
            <span className="text-sm font-medium">{date === today() ? 'Today' : fmtDate(date)}</span>
            <button onClick={() => shiftDate(1)} disabled={date >= today()} className="p-2 text-slate-400 disabled:opacity-30"><ChevronRight size={20} /></button>
          </div>

          {entries.length > 0 && (
            <Card className="flex gap-4 text-center">
              <div className="flex-1"><p className="text-xl font-bold">{entries.length}</p><p className="text-xs text-slate-400">Exercises</p></div>
              <div className="flex-1"><p className="text-xl font-bold">{entries.reduce((s, e) => s + e.sets.length, 0)}</p><p className="text-xs text-slate-400">Sets</p></div>
              <div className="flex-1"><p className="text-xl font-bold text-amber-400">{entries.filter(e => e.pr).length}</p><p className="text-xs text-slate-400">PRs</p></div>
            </Card>
          )}

          <button onClick={() => setShowForm(v => !v)} className="w-full bg-emerald-600 rounded-2xl py-3 flex items-center justify-center gap-2 text-sm font-medium">
            <Plus size={18} /> Log Exercise
          </button>

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
                  <div className="mt-3 border-t border-slate-700 pt-2 space-y-2">
                    {editingId === e.id ? (
                      <>
                        {editSets.map((s, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <span className="text-xs text-slate-500 w-9">Set {i + 1}</span>
                            <input className="flex-1 bg-slate-700 rounded-lg px-2 py-1 text-sm outline-none text-center" type="number" value={s.reps || ''} onChange={ev => updateEditSet(i, 'reps', ev.target.value)} />
                            <input className="flex-1 bg-slate-700 rounded-lg px-2 py-1 text-sm outline-none text-center" type="number" value={s.weight || ''} onChange={ev => updateEditSet(i, 'weight', ev.target.value)} />
                            <select className="bg-slate-700 rounded-lg px-1 py-1 text-sm outline-none" value={s.unit} onChange={ev => updateEditSet(i, 'unit', ev.target.value)}>
                              <option value="kg">kg</option>
                              <option value="lbs">lbs</option>
                            </select>
                            {editSets.length > 1 && <button onClick={() => setEditSets(prev => prev.filter((_, j) => j !== i))} className="text-slate-500 active:text-rose-400"><Trash2 size={14} /></button>}
                          </div>
                        ))}
                        <button onClick={() => setEditSets(prev => [...prev, { reps: 0, weight: prev[prev.length - 1]?.weight ?? 0, unit: prev[prev.length - 1]?.unit ?? 'kg' }])} className="text-xs text-emerald-400">+ Add set</button>
                        <div className="flex gap-2 pt-1">
                          <button onClick={cancelEdit} className="flex-1 bg-slate-700 rounded-xl py-1.5 text-xs">Cancel</button>
                          <button onClick={() => saveEdit(e)} className="flex-1 bg-emerald-600 rounded-xl py-1.5 text-xs font-medium">Save</button>
                        </div>
                      </>
                    ) : (
                      <>
                        {e.sets.map((s, i) => (
                          <div key={i} className="flex text-xs text-slate-300 gap-4">
                            <span className="text-slate-500">Set {i + 1}</span>
                            <span>{s.reps} reps</span>
                            <span>{s.weight} {s.unit}</span>
                            <span className="text-slate-500">{Math.round(s.reps * s.weight)} vol</span>
                          </div>
                        ))}
                        {e.notes && <p className="text-xs text-slate-400 mt-1 italic">{e.notes}</p>}
                        <button onClick={() => startEdit(e)} className="flex items-center gap-1 text-xs text-slate-400 active:text-emerald-400 pt-1">
                          <Pencil size={12} /> Edit sets
                        </button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ── PLAN VIEW ── */}
      {view === 'plan' && (
        <div className="space-y-4">

          {/* A. AI Recommendation */}
          <Card className="space-y-3 border border-amber-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <p className="text-sm font-medium">Today: {DAY_FULL[new Date().getDay()]}</p>
              </div>
              <button onClick={fetchRecommendation} disabled={loadingRec} className="text-slate-400 active:text-amber-400 disabled:opacity-40">
                <RefreshCw size={15} className={loadingRec ? 'animate-spin' : ''} />
              </button>
            </div>

            {!recommendation && !loadingRec && (
              <button
                onClick={fetchRecommendation}
                className="w-full bg-amber-600/20 border border-amber-600/40 rounded-xl py-3 text-sm text-amber-300 font-medium"
              >
                <Sparkles size={14} className="inline mr-1.5" />
                Get AI workout recommendation
              </button>
            )}

            {loadingRec && (
              <p className="text-sm text-slate-400 text-center py-4">Analyzing your week...</p>
            )}

            {recommendation && (
              <>
                <div>
                  <p className="text-base font-semibold text-amber-300">{recommendation.suggestedDay}</p>
                  <p className="text-xs text-slate-400 capitalize">
                    Intensity: {recommendation.intensity}
                    {recommendation.musclesGap.length > 0 && ` · Focus: ${recommendation.musclesGap.slice(0, 3).join(', ')}`}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {recommendation.suggestedExercises.map((ex, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-slate-500 text-xs w-4">{i + 1}</span>
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-xs text-slate-400 ml-auto">{ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setExpandedRationale(v => !v)}
                  className="flex items-center gap-1 text-xs text-slate-400"
                >
                  Why this? {expandedRationale ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {expandedRationale && (
                  <p className="text-xs text-slate-400 leading-relaxed">{recommendation.rationale}</p>
                )}

                <button
                  onClick={startWorkoutFromRec}
                  className="w-full bg-emerald-600 rounded-xl py-2.5 text-sm font-medium"
                >
                  Start this workout
                </button>
              </>
            )}
          </Card>

          {/* B. Week Strip */}
          {activePlan && (
            <Card className="space-y-3">
              <p className="text-sm font-medium">This Week — {activePlan.name}</p>
              <div className="grid grid-cols-7 gap-1">
                {weekStrip.map(({ dateStr, dow, status, dayExercises, matchedTemplate }) => (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDayTemplate(selectedDayTemplate?.id === matchedTemplate?.id && dateStr === today() ? null : (matchedTemplate ?? null))}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-xs text-slate-500">{DAY_NAMES[dow]}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      status === 'done' ? 'bg-emerald-700 text-emerald-200' :
                      status === 'today' ? 'bg-amber-600 text-white' :
                      status === 'missed' ? 'bg-rose-900/60 text-rose-400' :
                      'bg-slate-700 text-slate-500'
                    }`}>
                      {status === 'done' ? <CheckCircle2 size={14} /> :
                       status === 'today' ? <Circle size={14} className="fill-current" /> :
                       dayExercises.length > 0 ? dayExercises.length : '·'}
                    </div>
                    {matchedTemplate && (
                      <span className="text-xs text-emerald-400 text-center leading-none" style={{ fontSize: '9px' }}>
                        {matchedTemplate.name.split(' ')[0]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {selectedDayTemplate && (
                <div className="border-t border-slate-700 pt-2 space-y-1">
                  <p className="text-xs font-medium text-slate-300">{selectedDayTemplate.name}</p>
                  {selectedDayTemplate.exercises.map((ex, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="text-slate-600">{i + 1}</span>
                      <span>{ex.name}</span>
                      <span className="ml-auto text-slate-500">{ex.targetSets}×{ex.targetReps}</span>
                      {!ex.isCore && <span className="text-slate-600 text-xs">opt</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* C. Manage Plans */}
          <Card className="space-y-3">
            <button
              onClick={() => setShowManagePlans(v => !v)}
              className="flex items-center justify-between w-full"
            >
              <p className="text-sm font-medium">Manage Plans</p>
              {showManagePlans ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {showManagePlans && (
              <div className="space-y-3 pt-1 border-t border-slate-700">
                {!activePlan && (
                  <button
                    onClick={loadDefaultPlan}
                    className="w-full bg-emerald-600/20 border border-emerald-600/40 rounded-xl py-3 text-sm text-emerald-300 font-medium"
                  >
                    Load My 4-Day Split (Push / Legs / Pull / Full Body)
                  </button>
                )}

                {activePlan && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">Active: <span className="text-emerald-400">{activePlan.name}</span></p>
                      <button
                        onClick={() => {
                          workoutPlanStore.remove(activePlan.id)
                          setActivePlan(null)
                        }}
                        className="text-xs text-slate-500 active:text-rose-400"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="space-y-2">
                      {activePlan.templates.filter(t => !t.isRest).map(tmpl => (
                        <div key={tmpl.id} className="bg-slate-700/50 rounded-xl p-3 space-y-1">
                          <p className="text-xs font-medium text-slate-200">{tmpl.name}</p>
                          <div className="space-y-0.5">
                            {tmpl.exercises.map((ex, i) => (
                              <div key={i} className="flex text-xs text-slate-400 gap-2">
                                <span className="text-slate-600">{i + 1}</span>
                                <span>{ex.name}</span>
                                <span className="ml-auto">{ex.targetSets}×{ex.targetReps}</span>
                                {!ex.isCore && <span className="text-slate-600">opt</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePlan && (
                  <p className="text-xs text-slate-500 text-center">
                    Floating schedule — match by exercise overlap, not fixed days
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
