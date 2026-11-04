import { foodStore, exerciseStore, weightStore, stepsStore, settingsStore, isFoodDayComplete } from './storage'
import { localDateStr } from './utils'

export interface WeekStat {
  start: string            // Monday, YYYY-MM-DD
  end: string              // Sunday
  isCurrent: boolean
  foodDays: number         // days with food fully logged (see isFoodDayComplete)
  avgKcal: number | null   // only over complete food days
  avgProtein: number | null
  avgCarbs: number | null
  avgFat: number | null
  avgSteps: number | null
  stepsDays: number
  trainingDays: number
  avgWeight: number | null // kg, mean of weigh-ins in the week
  weighIns: number
}

function mondayOf(d: Date): Date {
  const m = new Date(d)
  m.setHours(12, 0, 0, 0)
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
  return m
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

/** Last `weeks` calendar weeks (Mon–Sun), oldest first. */
export function weeklyStats(weeks = 8): WeekStat[] {
  const goal = settingsStore.get().goals.calories
  const food = foodStore.getAll()
  const exercise = exerciseStore.getAll()
  const weights = weightStore.getAll()
  const steps = stepsStore.getAll()

  const thisMonday = mondayOf(new Date())
  const out: WeekStat[] = []

  for (let w = weeks - 1; w >= 0; w--) {
    const mon = new Date(thisMonday)
    mon.setDate(mon.getDate() - w * 7)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon)
      d.setDate(d.getDate() + i)
      return localDateStr(d)
    })
    const inWeek = (date: string) => date >= days[0] && date <= days[6]

    const completeDays = days
      .map(d => food.filter(f => f.date === d))
      .filter(meals => isFoodDayComplete(meals, goal))
    const sum = (key: 'calories' | 'protein' | 'carbs' | 'fat') =>
      avg(completeDays.map(meals => meals.reduce((s, f) => s + f[key], 0)))

    const weekSteps = steps.filter(s => inWeek(s.date) && s.steps > 0)
    const weekWeights = weights.filter(x => inWeek(x.date))

    out.push({
      start: days[0],
      end: days[6],
      isCurrent: w === 0,
      foodDays: completeDays.length,
      avgKcal: sum('calories'),
      avgProtein: sum('protein'),
      avgCarbs: sum('carbs'),
      avgFat: sum('fat'),
      avgSteps: avg(weekSteps.map(s => s.steps)),
      stepsDays: weekSteps.length,
      trainingDays: new Set(exercise.filter(e => inWeek(e.date)).map(e => e.date)).size,
      avgWeight: avg(weekWeights.map(x => x.weight)),
      weighIns: weekWeights.length,
    })
  }
  return out
}

export interface Finding { tone: 'good' | 'warn' | 'info'; text: string }

/** Short, rule-based read of the weekly table. No AI call involved. */
export function weeklyFindings(stats: WeekStat[]): Finding[] {
  const s = settingsStore.get()
  const out: Finding[] = []
  const withFood = stats.filter(w => w.avgKcal != null)
  const withWeight = stats.filter(w => w.avgWeight != null)

  if (withWeight.length >= 2) {
    const a = withWeight[0], b = withWeight[withWeight.length - 1]
    const delta = (b.avgWeight as number) - (a.avgWeight as number)
    out.push({
      tone: delta > 0.3 ? 'warn' : delta < -0.3 ? 'good' : 'info',
      text: `Peso (promedio semanal): ${(a.avgWeight as number).toFixed(1)} → ${(b.avgWeight as number).toFixed(1)} kg (${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg en ${withWeight.length} semanas con datos).`,
    })
  }

  const last = withFood[withFood.length - 1]
  if (last && last.avgProtein != null) {
    const gap = s.goals.protein - last.avgProtein
    out.push({
      tone: gap > 15 ? 'warn' : 'good',
      text: gap > 0
        ? `Proteína: ${Math.round(last.avgProtein)} g/día vs meta ${s.goals.protein} g (faltan ${Math.round(gap)} g).`
        : `Proteína: ${Math.round(last.avgProtein)} g/día, meta de ${s.goals.protein} g cumplida.`,
    })
  }

  const lastSteps = [...stats].reverse().find(w => w.avgSteps != null)
  if (lastSteps && lastSteps.avgSteps != null) {
    const goal = s.goals.steps ?? 8000
    out.push({
      tone: lastSteps.avgSteps >= goal ? 'good' : 'warn',
      text: `Pasos: ${Math.round(lastSteps.avgSteps).toLocaleString()} al día vs meta ${goal.toLocaleString()}.`,
    })
  }

  const recent = stats.slice(-4)
  const trainWeeks = recent.filter(w => w.trainingDays >= 2).length
  out.push({
    tone: trainWeeks >= 3 ? 'good' : 'warn',
    text: `Entrenamiento: ${trainWeeks} de las últimas ${recent.length} semanas con 2+ días.`,
  })

  const incomplete = stats.filter(w => !w.isCurrent && w.foodDays < 4).length
  if (incomplete > 0) {
    out.push({
      tone: 'info',
      text: `${incomplete} de ${stats.length - 1} semanas pasadas tienen menos de 4 días de comida completa, así que sus promedios son poco fiables.`,
    })
  }
  return out
}
