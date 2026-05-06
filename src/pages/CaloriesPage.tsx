import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Trash2, ChevronLeft, ChevronRight, Sparkles, Loader, Check, AlertCircle } from 'lucide-react'
import { foodStore, settingsStore } from '../storage'
import { searchFood } from '../foodApi'
import { analyzeMealText } from '../gemini'
import type { MealAnalysis } from '../gemini'
import { checkCalorieAlert } from '../notifications'
import { today, nowTime, uid, fmtDate } from '../utils'
import type { FoodEntry } from '../types'
import type { FoodResult } from '../foodApi'
import Card from '../components/Card'
import RingProgress from '../components/RingProgress'

export default function CaloriesPage() {
  const settings = settingsStore.get()
  const goal = settings.goals.calories
  const proteinGoal = settings.goals.protein

  const [date, setDate] = useState(today())
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [custom, setCustom] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', serving: '100' })

  // AI meal description state
  const [mealText, setMealText] = useState('')
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'preview' | 'error'>('idle')
  const [aiResult, setAiResult] = useState<MealAnalysis | null>(null)
  const [aiError, setAiError] = useState('')

  const reload = useCallback(() => setEntries(foodStore.forDate(date)), [date])
  useEffect(() => { reload() }, [reload])

  const totalCals = entries.reduce((s, e) => s + e.calories, 0)
  const totalProtein = entries.reduce((s, e) => s + e.protein, 0)
  const totalCarbs = entries.reduce((s, e) => s + e.carbs, 0)
  const totalFat = entries.reduce((s, e) => s + e.fat, 0)

  const shiftDate = (days: number) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  const doSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    const res = await searchFood(query)
    setResults(res)
    setSearching(false)
  }

  const addFromResult = (r: FoodResult) => {
    const entry: FoodEntry = {
      id: uid(), date, time: nowTime(),
      name: r.name, calories: r.calories, protein: r.protein,
      carbs: r.carbs, fat: r.fat, servingSize: r.servingSize, barcode: r.barcode,
    }
    foodStore.add(entry)
    reload()
    setResults([])
    setQuery('')
    if (settings.notificationsEnabled) checkCalorieAlert(totalCals + r.calories, goal, settings.calorieAlertPercent)
  }

  const addCustom = () => {
    if (!custom.name || !custom.calories) return
    const entry: FoodEntry = {
      id: uid(), date, time: nowTime(),
      name: custom.name,
      calories: Number(custom.calories),
      protein: Number(custom.protein) || 0,
      carbs: Number(custom.carbs) || 0,
      fat: Number(custom.fat) || 0,
      servingSize: Number(custom.serving) || 100,
    }
    foodStore.add(entry)
    reload()
    setShowAdd(false)
    setCustom({ name: '', calories: '', protein: '', carbs: '', fat: '', serving: '100' })
  }

  const analyzeWithAI = async () => {
    if (!mealText.trim()) return
    setAiState('loading')
    setAiResult(null)
    setAiError('')
    try {
      const result = await analyzeMealText(mealText, settings.deepseekApiKey)
      setAiResult(result)
      setAiState('preview')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Analysis failed.')
      setAiState('error')
    }
  }

  const confirmAiMeal = () => {
    if (!aiResult) return
    const entry: FoodEntry = {
      id: uid(), date, time: nowTime(),
      name: aiResult.name,
      calories: aiResult.calories,
      protein: aiResult.protein,
      carbs: aiResult.carbs,
      fat: aiResult.fat,
      servingSize: 0,
    }
    foodStore.add(entry)
    reload()
    if (settings.notificationsEnabled) checkCalorieAlert(totalCals + aiResult.calories, goal, settings.calorieAlertPercent)
    setMealText('')
    setAiResult(null)
    setAiState('idle')
  }

  const remove = (id: string) => { foodStore.remove(id); reload() }

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

      {/* AI meal description */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles size={15} className="text-amber-400" />
          Describe your meal
        </div>
        <textarea
          className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none resize-none leading-relaxed"
          rows={3}
          placeholder={'e.g. "2 scrambled eggs, bowl of oatmeal with banana, black coffee"'}
          value={mealText}
          onChange={e => { setMealText(e.target.value); if (aiState !== 'idle') setAiState('idle') }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyzeWithAI() }}
        />

        {aiState === 'idle' && (
          <button
            onClick={analyzeWithAI}
            disabled={!mealText.trim()}
            className="w-full bg-amber-500 disabled:opacity-40 rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-2"
          >
            <Sparkles size={14} /> Analyze with AI
          </button>
        )}

        {aiState === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-400">
            <Loader size={15} className="animate-spin" /> Analyzing…
          </div>
        )}

        {aiState === 'error' && (
          <div className="flex items-start gap-2 text-rose-400 text-xs bg-rose-950 rounded-xl p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {aiError}
          </div>
        )}

        {aiState === 'preview' && aiResult && (
          <div className="space-y-2">
            <div className="bg-slate-700 rounded-xl p-3 space-y-1.5">
              <p className="text-sm font-medium">{aiResult.name}</p>
              <div className="grid grid-cols-4 gap-1 text-center">
                <MacroChip label="kcal" value={aiResult.calories} color="text-emerald-400" />
                <MacroChip label="protein g" value={aiResult.protein} color="text-blue-400" />
                <MacroChip label="carbs g" value={aiResult.carbs} color="text-amber-400" />
                <MacroChip label="fat g" value={aiResult.fat} color="text-rose-400" />
              </div>
              {aiResult.feedback && (
                <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-600 pt-2 mt-1">{aiResult.feedback}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAiState('idle')} className="flex-1 bg-slate-700 rounded-xl py-2 text-sm">Edit</button>
              <button onClick={confirmAiMeal} className="flex-1 bg-emerald-600 rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-1.5">
                <Check size={14} /> Add to log
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Search */}
      <Card>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
            placeholder="Search food (Open Food Facts)…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
          />
          <button onClick={doSearch} disabled={searching} className="bg-emerald-600 px-3 py-2 rounded-xl text-sm">
            {searching ? '…' : <Search size={16} />}
          </button>
          <button onClick={() => setShowAdd(v => !v)} className="bg-slate-600 px-3 py-2 rounded-xl text-sm">
            <Plus size={16} />
          </button>
        </div>

        {results.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <li key={i} className="flex items-center justify-between py-1.5 border-b border-slate-700 last:border-0">
                <div>
                  <p className="text-sm">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.calories} kcal · {r.servingSize}g</p>
                </div>
                <button onClick={() => addFromResult(r)} className="text-emerald-400 px-2 py-1 text-sm">+ Add</button>
              </li>
            ))}
          </ul>
        )}

        {showAdd && (
          <div className="mt-3 space-y-2">
            <input className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Food name *" value={custom.name} onChange={e => setCustom(v => ({ ...v, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input className="bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Calories *" type="number" value={custom.calories} onChange={e => setCustom(v => ({ ...v, calories: e.target.value }))} />
              <input className="bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Protein (g)" type="number" value={custom.protein} onChange={e => setCustom(v => ({ ...v, protein: e.target.value }))} />
              <input className="bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Carbs (g)" type="number" value={custom.carbs} onChange={e => setCustom(v => ({ ...v, carbs: e.target.value }))} />
              <input className="bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" placeholder="Fat (g)" type="number" value={custom.fat} onChange={e => setCustom(v => ({ ...v, fat: e.target.value }))} />
            </div>
            <button onClick={addCustom} className="w-full bg-emerald-600 rounded-xl py-2 text-sm font-medium">Add Custom Food</button>
          </div>
        )}
      </Card>

      {/* Entry list */}
      <div className="space-y-2">
        {entries.length === 0 && <p className="text-center text-slate-500 py-8 text-sm">No food logged yet</p>}
        {entries.map(e => (
          <Card key={e.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{e.name}</p>
              <p className="text-xs text-slate-400">{e.time} · {e.calories} kcal · P:{e.protein}g C:{e.carbs}g F:{e.fat}g</p>
            </div>
            <button onClick={() => remove(e.id)} className="text-slate-500 active:text-rose-400 p-1">
              <Trash2 size={16} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-800 rounded-lg py-1.5 px-1 text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
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
