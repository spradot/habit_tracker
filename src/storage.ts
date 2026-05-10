import type {
  FoodEntry, ExerciseEntry, WeightEntry, StepsEntry, Settings, FoodCacheEntry,
  WeeklyPlan, WorkoutTemplate, BodyMeasurement, SleepEntry, DayScore, Badge, BadgeId, RewardState,
} from './types'
import { today, last7Days } from './utils'
import { supabase } from './supabase'

const KEYS = {
  food: 'ht_food',
  exercise: 'ht_exercise',
  weight: 'ht_weight',
  steps: 'ht_steps',
  settings: 'ht_settings',
  foodCache: 'ht_food_cache',
  workoutPlans: 'ht_workout_plans',
  bodyMeasurements: 'ht_body_measurements',
  sleep: 'ht_sleep',
  dayScores: 'ht_day_scores',
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ── Food ─────────────────────────────────────────────────────────────────────
export const foodStore = {
  getAll: () => load<FoodEntry[]>(KEYS.food, []),
  save: (entries: FoodEntry[]) => save(KEYS.food, entries),

  add: (entry: FoodEntry) => {
    const all = foodStore.getAll()
    foodStore.save([...all, entry])
    supabase?.from('food_entries').insert({
      id: entry.id, date: entry.date, time: entry.time,
      name: entry.name, calories: entry.calories,
      protein: entry.protein, carbs: entry.carbs, fat: entry.fat,
      serving_size: entry.servingSize, barcode: entry.barcode ?? null,
    }).then(({ error }) => { if (error) console.warn('Supabase food insert:', error.message) })
  },

  remove: (id: string) => {
    foodStore.save(foodStore.getAll().filter(e => e.id !== id))
    supabase?.from('food_entries').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('Supabase food delete:', error.message) })
  },

  forDate: (date: string) => foodStore.getAll().filter(e => e.date === date),

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('food_entries').select('*').order('date').order('time')
    if (error || !data) return
    const entries: FoodEntry[] = data.map(r => ({
      id: r.id, date: r.date, time: r.time, name: r.name,
      calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat,
      servingSize: r.serving_size, barcode: r.barcode ?? undefined,
    }))
    save(KEYS.food, entries)
  },
}

// ── Exercise ──────────────────────────────────────────────────────────────────
export const exerciseStore = {
  getAll: () => load<ExerciseEntry[]>(KEYS.exercise, []),
  save: (entries: ExerciseEntry[]) => save(KEYS.exercise, entries),

  add: (entry: ExerciseEntry) => {
    const all = exerciseStore.getAll()
    exerciseStore.save([...all, entry])
    supabase?.from('exercise_entries').insert({
      id: entry.id, date: entry.date, name: entry.name,
      category: entry.category, sets: entry.sets,
      duration_min: entry.durationMin ?? null,
      notes: entry.notes ?? null, pr: entry.pr ?? false,
    }).then(({ error }) => { if (error) console.warn('Supabase exercise insert:', error.message) })
  },

  remove: (id: string) => {
    exerciseStore.save(exerciseStore.getAll().filter(e => e.id !== id))
    supabase?.from('exercise_entries').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('Supabase exercise delete:', error.message) })
  },

  update: (entry: ExerciseEntry) => {
    exerciseStore.save(exerciseStore.getAll().map(e => e.id === entry.id ? entry : e))
    supabase?.from('exercise_entries').update({
      sets: entry.sets, duration_min: entry.durationMin ?? null,
      notes: entry.notes ?? null, pr: entry.pr ?? false,
    }).eq('id', entry.id)
      .then(({ error }) => { if (error) console.warn('Supabase exercise update:', error.message) })
  },

  forDate: (date: string) => exerciseStore.getAll().filter(e => e.date === date),

  getPR: (name: string): number => {
    const entries = exerciseStore.getAll().filter(e => e.name === name)
    let max = 0
    for (const e of entries) {
      for (const s of e.sets) {
        if (s.weight > max) max = s.weight
      }
    }
    return max
  },

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('exercise_entries').select('*').order('date')
    if (error || !data) return
    const entries: ExerciseEntry[] = data.map(r => ({
      id: r.id, date: r.date, name: r.name,
      category: r.category, sets: r.sets,
      durationMin: r.duration_min ?? undefined,
      notes: r.notes ?? undefined, pr: r.pr ?? false,
    }))
    save(KEYS.exercise, entries)
  },
}

// ── Weight ────────────────────────────────────────────────────────────────────
export const weightStore = {
  getAll: () => load<WeightEntry[]>(KEYS.weight, []),
  save: (entries: WeightEntry[]) => save(KEYS.weight, entries),

  add: (entry: WeightEntry) => {
    const all = weightStore.getAll()
    weightStore.save([...all, entry])
    supabase?.from('weight_entries').insert({
      id: entry.id, date: entry.date, time: entry.time,
      weight: entry.weight, notes: entry.notes ?? null,
    }).then(({ error }) => { if (error) console.warn('Supabase weight insert:', error.message) })
  },

  remove: (id: string) => {
    weightStore.save(weightStore.getAll().filter(e => e.id !== id))
    supabase?.from('weight_entries').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('Supabase weight delete:', error.message) })
  },

  latest: () => {
    const all = weightStore.getAll()
    return all.length ? all[all.length - 1] : null
  },

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('weight_entries').select('*').order('date').order('time')
    if (error || !data) return
    const entries: WeightEntry[] = data.map(r => ({
      id: r.id, date: r.date, time: r.time,
      weight: r.weight, notes: r.notes ?? undefined,
    }))
    save(KEYS.weight, entries)
  },
}

// ── Steps ─────────────────────────────────────────────────────────────────────
export const stepsStore = {
  getAll: () => load<StepsEntry[]>(KEYS.steps, []),
  save: (entries: StepsEntry[]) => save(KEYS.steps, entries),

  forDate: (date: string) => stepsStore.getAll().find(e => e.date === date) ?? null,

  set: (entry: StepsEntry) => {
    // One entry per day — upsert by date
    const all = stepsStore.getAll().filter(e => e.date !== entry.date)
    stepsStore.save([...all, entry])
    supabase?.from('steps_entries').upsert({
      id: entry.id, date: entry.date, steps: entry.steps, source: entry.source ?? 'manual',
    }).then(({ error }) => { if (error) console.warn('Supabase steps upsert:', error.message) })
  },

  remove: (date: string) => {
    const entry = stepsStore.forDate(date)
    stepsStore.save(stepsStore.getAll().filter(e => e.date !== date))
    if (entry) supabase?.from('steps_entries').delete().eq('id', entry.id)
  },

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('steps_entries').select('*').order('date')
    if (error || !data) return
    const entries: StepsEntry[] = data.map(r => ({
      id: r.id, date: r.date, steps: r.steps, source: r.source,
    }))
    save(KEYS.steps, entries)
  },
}

// ── Sync all on app start ─────────────────────────────────────────────────────
export async function syncAllFromRemote() {
  await Promise.all([
    foodStore.syncFromRemote(),
    exerciseStore.syncFromRemote(),
    weightStore.syncFromRemote(),
    stepsStore.syncFromRemote(),
  ])
}

// ── Settings ──────────────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS: Settings = {
  goals: { calories: 1800, protein: 120, waterGlasses: 8, steps: 8000 },
  weightUnit: 'kg',
  deepseekApiKey: '',
  notificationsEnabled: false,
  calorieAlertPercent: 80,
}

export const settingsStore = {
  get: (): Settings => load<Settings>(KEYS.settings, DEFAULT_SETTINGS),
  save: (s: Settings) => save(KEYS.settings, s),
}

// ── Workout Plans ─────────────────────────────────────────────────────────────
export const workoutPlanStore = {
  getAll: () => load<WeeklyPlan[]>(KEYS.workoutPlans, []),
  save: (plans: WeeklyPlan[]) => save(KEYS.workoutPlans, plans),

  getActive: (): WeeklyPlan | null =>
    workoutPlanStore.getAll().find(p => p.active) ?? null,

  add: (plan: WeeklyPlan) => {
    const all = workoutPlanStore.getAll().map(p =>
      plan.active ? { ...p, active: false } : p
    )
    workoutPlanStore.save([...all, plan])
  },

  setActive: (id: string) => {
    workoutPlanStore.save(
      workoutPlanStore.getAll().map(p => ({ ...p, active: p.id === id }))
    )
  },

  remove: (id: string) =>
    workoutPlanStore.save(workoutPlanStore.getAll().filter(p => p.id !== id)),

  getTemplateForDay: (dow: number): WorkoutTemplate | null => {
    const plan = workoutPlanStore.getActive()
    if (!plan || plan.floating) return null
    const templateId = plan.schedule[dow]
    return plan.templates.find(t => t.id === templateId) ?? null
  },

  // For floating plans: find which template best matches today's logged exercises
  matchTemplate: (exerciseNames: string[]): WorkoutTemplate | null => {
    const plan = workoutPlanStore.getActive()
    if (!plan) return null
    const logged = new Set(exerciseNames.map(n => n.toLowerCase()))
    let best: WorkoutTemplate | null = null
    let bestScore = 0
    for (const tmpl of plan.templates) {
      if (tmpl.isRest) continue
      const score = tmpl.exercises.filter(e => logged.has(e.name.toLowerCase())).length
      if (score > bestScore) { bestScore = score; best = tmpl }
    }
    return bestScore >= 2 ? best : null
  },
}

// ── Body Measurements ─────────────────────────────────────────────────────────
export const bodyMeasurementStore = {
  getAll: () => load<BodyMeasurement[]>(KEYS.bodyMeasurements, []),
  save: (entries: BodyMeasurement[]) => save(KEYS.bodyMeasurements, entries),
  add: (e: BodyMeasurement) =>
    bodyMeasurementStore.save([...bodyMeasurementStore.getAll(), e]),
  remove: (id: string) =>
    bodyMeasurementStore.save(bodyMeasurementStore.getAll().filter(e => e.id !== id)),
  latest: (): BodyMeasurement | null => {
    const all = bodyMeasurementStore.getAll().sort((a, b) => a.date.localeCompare(b.date))
    return all.at(-1) ?? null
  },
  first: (): BodyMeasurement | null => {
    const all = bodyMeasurementStore.getAll().sort((a, b) => a.date.localeCompare(b.date))
    return all[0] ?? null
  },
}

// ── Sleep ─────────────────────────────────────────────────────────────────────
export const sleepStore = {
  getAll: () => load<SleepEntry[]>(KEYS.sleep, []),
  save: (entries: SleepEntry[]) => save(KEYS.sleep, entries),
  forDate: (date: string): SleepEntry | null =>
    sleepStore.getAll().find(e => e.date === date) ?? null,
  set: (entry: SleepEntry) => {
    const all = sleepStore.getAll().filter(e => e.date !== entry.date)
    sleepStore.save([...all, entry])
  },
  remove: (date: string) =>
    sleepStore.save(sleepStore.getAll().filter(e => e.date !== date)),
  avgDurationHours: (dates: string[]): number => {
    const entries = sleepStore.getAll().filter(e => dates.includes(e.date))
    if (!entries.length) return 0
    const durations = entries.map(e =>
      (new Date(e.wakeISO).getTime() - new Date(e.bedtimeISO).getTime()) / 3_600_000
    )
    return Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10
  },
}

// ── Day Scores / Rewards ──────────────────────────────────────────────────────
export function computeDayScore(
  date: string,
  stepsEntry: { steps: number } | null,
  stepsGoal: number,
  exercises: ExerciseEntry[],
  caloriesLogged: number,
  calorieGoal: number,
  planTemplate: WorkoutTemplate | null,
  streak: number
): DayScore {
  const stepsPoints =
    !stepsEntry ? 0 :
    stepsEntry.steps >= stepsGoal ? 20 :
    stepsEntry.steps >= stepsGoal * 0.5 ? 10 : 5

  const exercisePoints = exercises.length === 0 ? 0 :
    Math.min(10 + (exercises.length - 1) * 5, 30)

  const calRatio = calorieGoal > 0 ? caloriesLogged / calorieGoal : 0
  const caloriePoints =
    caloriesLogged === 0 ? 0 :
    calRatio >= 0.85 && calRatio <= 1.05 ? 20 :
    calRatio >= 0.70 && calRatio <= 1.15 ? 10 : 0

  const prs = exercises.filter(e => e.pr).length
  const prPoints = Math.min(prs * 10, 20)

  let planCompliancePoints = 0
  if (planTemplate && !planTemplate.isRest && exercises.length > 0) {
    const coreExercises = planTemplate.exercises.filter(e => e.isCore !== false)
    const plannedNames = new Set(coreExercises.map(e => e.name.toLowerCase()))
    if (plannedNames.size > 0) {
      const doneNames = new Set(exercises.map(e => e.name.toLowerCase()))
      const completed = [...plannedNames].filter(n => doneNames.has(n)).length
      planCompliancePoints = Math.round((completed / plannedNames.size) * 20)
    }
  }

  const streakBonus = Math.min(streak * 10, 30)

  const points = stepsPoints + exercisePoints + caloriePoints + prPoints + planCompliancePoints + streakBonus

  return {
    date,
    points,
    breakdown: { stepsPoints, exercisePoints, caloriePoints, prPoints, planCompliancePoints, streakBonus },
  }
}

function _computeLongestStreak(scores: DayScore[]): number {
  const sorted = [...scores].sort((a, b) => a.date.localeCompare(b.date))
  let longest = 0, current = 0
  for (const s of sorted) {
    if (s.points > 0) { current++; if (current > longest) longest = current }
    else current = 0
  }
  return longest
}

function _computeBadges(
  scores: DayScore[],
  exercises: ExerciseEntry[],
  measurements: BodyMeasurement[],
  weights: WeightEntry[]
): Badge[] {
  const badges: Badge[] = []
  const earned = (id: BadgeId, date: string) => badges.push({ id, earnedAt: date })

  if (exercises.length > 0) earned('first_workout', exercises[0].date)
  if (exercises.some(e => e.pr)) earned('first_pr', exercises.find(e => e.pr)!.date)

  // week_warrior: 7 consecutive days with exercisePoints > 0
  const sorted = [...scores].sort((a, b) => a.date.localeCompare(b.date))
  let streak = 0
  for (const s of sorted) {
    if (s.breakdown.exercisePoints > 0) { streak++; if (streak >= 7) { earned('week_warrior', s.date); break } }
    else streak = 0
  }

  // calorie_sniper: 7 consecutive days with caloriePoints === 20
  let calStreak = 0
  for (const s of sorted) {
    if (s.breakdown.caloriePoints === 20) { calStreak++; if (calStreak >= 7) { earned('calorie_sniper', s.date); break } }
    else calStreak = 0
  }

  // step_master: 30 days total at goal
  const stepDays = scores.filter(s => s.breakdown.stepsPoints === 20).length
  if (stepDays >= 30) earned('step_master', scores.filter(s => s.breakdown.stepsPoints === 20)[29].date)

  if (measurements.length > 0) earned('recomp_start', measurements[0].date)

  if (weights.length >= 2) {
    const first = weights[0].weight
    const last = weights[weights.length - 1].weight
    if (first - last >= 5) earned('minus_5kg', weights[weights.length - 1].date)
  }

  return badges
}

export const dayScoreStore = {
  getAll: () => load<DayScore[]>(KEYS.dayScores, []),
  save: (scores: DayScore[]) => save(KEYS.dayScores, scores),
  upsert: (score: DayScore) => {
    const all = dayScoreStore.getAll().filter(s => s.date !== score.date)
    dayScoreStore.save([...all, score])
  },
  forDate: (date: string): DayScore | null =>
    dayScoreStore.getAll().find(s => s.date === date) ?? null,

  computeRewardState: (): RewardState => {
    const scores = dayScoreStore.getAll().sort((a, b) => a.date.localeCompare(b.date))
    const totalPoints = scores.reduce((s, d) => s + d.points, 0)
    const week = last7Days()
    const weekPoints = scores.filter(s => week.includes(s.date)).reduce((s, d) => s + d.points, 0)

    const sorted = [...scores].reverse()
    let streak = 0
    for (const s of sorted) {
      if (s.points > 0) streak++
      else break
    }

    const exercises = load<ExerciseEntry[]>(KEYS.exercise, [])
    const measurements = load<BodyMeasurement[]>(KEYS.bodyMeasurements, [])
    const weights = load<WeightEntry[]>(KEYS.weight, [])

    return {
      totalPoints,
      weekPoints,
      currentStreak: streak,
      longestStreak: _computeLongestStreak(scores),
      level: Math.floor(totalPoints / 500) + 1,
      badges: _computeBadges(scores, exercises, measurements, weights),
    }
  },
}

export function refreshTodayScore() {
  const t = today()
  const settings = load<Settings>(KEYS.settings, { goals: { calories: 1800, protein: 120, waterGlasses: 8, steps: 8000 }, weightUnit: 'kg', deepseekApiKey: '', notificationsEnabled: false, calorieAlertPercent: 80 })
  const exercises = load<ExerciseEntry[]>(KEYS.exercise, []).filter(e => e.date === t)
  const steps = load<StepsEntry[]>(KEYS.steps, []).find(e => e.date === t) ?? null
  const foods = load<FoodEntry[]>(KEYS.food, []).filter(e => e.date === t)
  const cals = foods.reduce((s, f) => s + f.calories, 0)

  const plan = workoutPlanStore.getActive()
  let template: WorkoutTemplate | null = null
  if (plan) {
    if (plan.floating) {
      template = workoutPlanStore.matchTemplate(exercises.map(e => e.name))
    } else {
      const dow = new Date().getDay()
      template = workoutPlanStore.getTemplateForDay(dow)
    }
  }

  const allScores = dayScoreStore.getAll().sort((a, b) => a.date.localeCompare(b.date)).reverse()
  let streak = 0
  for (const s of allScores) {
    if (s.date === t) continue
    if (s.points > 0) streak++
    else break
  }

  const score = computeDayScore(t, steps, settings.goals.steps, exercises, cals, settings.goals.calories, template, streak)
  dayScoreStore.upsert(score)
}

// ── Food API cache ─────────────────────────────────────────────────────────────
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000

export const foodCache = {
  get: (barcode: string): FoodCacheEntry | null => {
    const all = load<Record<string, FoodCacheEntry>>(KEYS.foodCache, {})
    const entry = all[barcode]
    if (!entry) return null
    if (Date.now() - entry.cachedAt > CACHE_TTL) return null
    return entry
  },
  set: (entry: FoodCacheEntry) => {
    const all = load<Record<string, FoodCacheEntry>>(KEYS.foodCache, {})
    all[entry.barcode] = { ...entry, cachedAt: Date.now() }
    save(KEYS.foodCache, all)
  },
}
