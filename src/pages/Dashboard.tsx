import { useState, useEffect } from 'react'
import { Dumbbell, Utensils, Scale, Sparkles, Loader, Footprints } from 'lucide-react'
import { foodStore, exerciseStore, weightStore, stepsStore, settingsStore } from '../storage'
import { getWeightLossInsight } from '../gemini'
import { today, last7Days, kgToLbs } from '../utils'
import Card from '../components/Card'
import RingProgress from '../components/RingProgress'
import TDEECard from '../components/TDEECard'
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from 'recharts'

type Tab = 'dashboard' | 'calories' | 'exercise' | 'weight' | 'steps' | 'settings'

interface Props {
  onNavigate: (tab: Tab) => void
}

export default function Dashboard({ onNavigate }: Props) {
  const settings = settingsStore.get()
  const goal = settings.goals.calories
  const unit = settings.weightUnit

  const todayFood = foodStore.forDate(today())
  const todayExercise = exerciseStore.forDate(today())
  const latestWeight = weightStore.latest()
  const days7 = last7Days()

  const totalCals = todayFood.reduce((s, f) => s + f.calories, 0)
  const convert = (kg: number) => unit === 'lbs' ? kgToLbs(kg) : kg

  const weeklyData = days7.map(d => ({
    day: d.slice(5).replace('-', '/'),
    calories: foodStore.forDate(d).reduce((s, f) => s + f.calories, 0),
    exercise: exerciseStore.forDate(d).length,
  }))

  const weeklyAvgCals = Math.round(weeklyData.reduce((s, d) => s + d.calories, 0) / 7)
  const daysWithExercise = weeklyData.filter(d => d.exercise > 0).length

  const allWeights = weightStore.getAll().sort((a, b) => a.date.localeCompare(b.date))
  const startWeight = allWeights[0]
  const currentWeight = allWeights.at(-1)
  const totalLost = startWeight && currentWeight ? convert(startWeight.weight) - convert(currentWeight.weight) : 0

  const [calorieGoal, setCalorieGoal] = useState(goal)
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)

  const stepsGoal = settings.goals.steps ?? 8000
  const todaySteps = stepsStore.forDate(today())

  const fetchInsight = async () => {
    if (!settings.openrouterApiKey) { setInsight('Add an OpenRouter API key in Settings to get AI-powered insights.'); return }
    setLoadingInsight(true)
    const week7Food = days7.flatMap(d => foodStore.forDate(d))
    const week7Ex = days7.flatMap(d => exerciseStore.forDate(d))
    const week7W = allWeights.filter(e => days7.includes(e.date))
    const text = await getWeightLossInsight(settings.openrouterApiKey, week7Food, week7Ex, week7W, goal)
    setInsight(text)
    setLoadingInsight(false)
  }

  useEffect(() => { fetchInsight() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-slate-400 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-xl font-bold">HabitTrack</h1>
        </div>
        {latestWeight && (
          <div className="text-right">
            <p className="text-2xl font-bold">{convert(latestWeight.weight)}<span className="text-sm text-slate-400 ml-1">{unit}</span></p>
            <p className="text-xs text-slate-400">{totalLost > 0 ? `↓ ${totalLost.toFixed(1)} ${unit} lost` : 'current weight'}</p>
          </div>
        )}
      </div>

      {/* Today's quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => onNavigate('calories')} className="flex flex-col items-center">
          <Card className="w-full flex flex-col items-center gap-2 py-3">
            <RingProgress value={totalCals} max={calorieGoal} size={64} label={`${Math.round(totalCals / calorieGoal * 100)}%`} />
            <div className="text-center">
              <p className="text-xs font-medium">{totalCals} kcal</p>
              <p className="text-[10px] text-slate-400">of {goal}</p>
            </div>
          </Card>
        </button>

        <button onClick={() => onNavigate('exercise')} className="flex flex-col items-center">
          <Card className="w-full flex flex-col items-center justify-center gap-2 py-3 h-full">
            <Dumbbell size={28} className={todayExercise.length ? 'text-emerald-400' : 'text-slate-500'} />
            <div className="text-center">
              <p className="text-lg font-bold">{todayExercise.length}</p>
              <p className="text-[10px] text-slate-400">exercises</p>
            </div>
          </Card>
        </button>

        <button onClick={() => onNavigate('steps')} className="flex flex-col items-center">
          <Card className="w-full flex flex-col items-center justify-center gap-2 py-3 h-full">
            <Footprints size={28} className={todaySteps ? 'text-blue-400' : 'text-slate-500'} />
            <div className="text-center">
              <p className="text-lg font-bold leading-none">
                {todaySteps ? (todaySteps.steps >= 1000 ? `${(todaySteps.steps / 1000).toFixed(1)}k` : todaySteps.steps) : '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {todaySteps ? `${Math.round((todaySteps.steps / stepsGoal) * 100)}%` : 'steps'}
              </p>
            </div>
          </Card>
        </button>
      </div>

      {/* Weekly chart */}
      <Card>
        <p className="text-xs text-slate-400 mb-3">Calories this week</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weeklyData} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="calories" fill="#34d399" radius={[4, 4, 0, 0]} name="Calories" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>Avg: {weeklyAvgCals} kcal/day</span>
          <span>{daysWithExercise}/7 days active</span>
        </div>
      </Card>

      {/* Calorie goal status */}
      <Card className="flex gap-3">
        <div className="flex-1 text-center py-1">
          <p className="text-xl font-bold text-emerald-400">{weeklyAvgCals}</p>
          <p className="text-xs text-slate-400">avg kcal/day</p>
        </div>
        <div className="w-px bg-slate-700" />
        <div className="flex-1 text-center py-1">
          <p className="text-xl font-bold">{goal}</p>
          <p className="text-xs text-slate-400">daily goal</p>
        </div>
        <div className="w-px bg-slate-700" />
        <div className="flex-1 text-center py-1">
          <p className={`text-xl font-bold ${goal - weeklyAvgCals > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {goal - weeklyAvgCals > 0 ? `-${goal - weeklyAvgCals}` : `+${weeklyAvgCals - goal}`}
          </p>
          <p className="text-xs text-slate-400">deficit/day</p>
        </div>
      </Card>

      {/* Quick-log shortcuts */}
      <div className="flex gap-2">
        <button onClick={() => onNavigate('calories')} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 rounded-2xl py-3 text-sm text-slate-300 active:bg-slate-700">
          <Utensils size={16} /> Log meal
        </button>
        <button onClick={() => onNavigate('exercise')} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 rounded-2xl py-3 text-sm text-slate-300 active:bg-slate-700">
          <Dumbbell size={16} /> Log workout
        </button>
        <button onClick={() => onNavigate('weight')} className="flex-1 flex items-center justify-center gap-2 bg-slate-800 rounded-2xl py-3 text-sm text-slate-300 active:bg-slate-700">
          <Scale size={16} /> Log weight
        </button>
      </div>

      {/* TDEE calculator */}
      <TDEECard onGoalApplied={cal => setCalorieGoal(cal)} />

      {/* AI insight */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles size={16} className="text-amber-400" />
            AI Weekly Insight
          </div>
          <button onClick={fetchInsight} disabled={loadingInsight} className="text-xs text-slate-400 active:text-white px-2 py-1">
            {loadingInsight ? <Loader size={14} className="animate-spin" /> : 'Refresh'}
          </button>
        </div>
        {loadingInsight
          ? <p className="text-sm text-slate-400">Analyzing your week…</p>
          : insight
            ? <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{insight}</p>
            : <p className="text-sm text-slate-500">Tap Refresh to get insights</p>}
      </Card>
    </div>
  )
}
