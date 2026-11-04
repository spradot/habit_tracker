import type {
  FoodEntry, ExerciseEntry, WeightEntry, StepsEntry, Settings, FoodCacheEntry,
  WeeklyPlan, WorkoutTemplate, BodyMeasurement, SleepEntry, DayScore, Badge, BadgeId, RewardState,
  ExerciseLibraryEntry, HabitDef, HabitLog, JournalEntry, MealPrep,
} from './types'
import { today, last7Days, uid } from './utils'
import { getMuscleGroups, EXERCISE_MUSCLE_MAP } from './exerciseData'
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
  exerciseLibrary: 'ht_exercises_library',
  habits: 'ht_habits',
  habitLogs: 'ht_habit_logs',
  journal: 'ht_journal',
  mealPrep: 'ht_meal_prep',
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

  /** @deprecated Manual food entry was removed; meals are imported from Fitia via Health Connect. */
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
      muscle_groups: getMuscleGroups(entry.name),
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
      muscle_groups: getMuscleGroups(entry.name),
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

// ── Exercise Library ──────────────────────────────────────────────────────────
export const exerciseLibraryStore = {
  getAll: () => load<ExerciseLibraryEntry[]>(KEYS.exerciseLibrary, []),
  save: (entries: ExerciseLibraryEntry[]) => save(KEYS.exerciseLibrary, entries),

  findByName: (name: string): ExerciseLibraryEntry | undefined => {
    const lower = name.toLowerCase()
    return exerciseLibraryStore.getAll().find(e => e.name.toLowerCase() === lower)
  },

  add: (entry: ExerciseLibraryEntry) => {
    exerciseLibraryStore.save([...exerciseLibraryStore.getAll(), entry])
    supabase?.from('exercises').insert({
      id: entry.id, name: entry.name,
      muscle_groups: entry.muscleGroups, category: entry.category,
    }).then(({ error }) => { if (error) console.warn('Supabase exercises insert:', error.message) })
  },

  update: (entry: ExerciseLibraryEntry) => {
    exerciseLibraryStore.save(exerciseLibraryStore.getAll().map(e => e.id === entry.id ? entry : e))
    supabase?.from('exercises').update({
      name: entry.name, muscle_groups: entry.muscleGroups, category: entry.category,
    }).eq('id', entry.id)
      .then(({ error }) => { if (error) console.warn('Supabase exercises update:', error.message) })
  },

  remove: (id: string) => {
    exerciseLibraryStore.save(exerciseLibraryStore.getAll().filter(e => e.id !== id))
    supabase?.from('exercises').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('Supabase exercises delete:', error.message) })
  },

  seedIfEmpty: () => {
    if (exerciseLibraryStore.getAll().length > 0) return
    const entries: ExerciseLibraryEntry[] = Object.entries(EXERCISE_MUSCLE_MAP).map(([name, muscleGroups]) => ({
      id: uid(),
      name,
      muscleGroups,
      category: (muscleGroups.includes('cardio') ? 'cardio' : 'strength') as ExerciseLibraryEntry['category'],
    }))
    exerciseLibraryStore.save(entries)
    if (supabase) {
      supabase.from('exercises').upsert(
        entries.map(e => ({ id: e.id, name: e.name, muscle_groups: e.muscleGroups, category: e.category }))
      ).then(({ error }) => { if (error) console.warn('Supabase exercises seed:', error.message) })
    }
  },

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('exercises').select('*').order('name')
    if (error || !data || data.length === 0) return
    const entries: ExerciseLibraryEntry[] = data.map(r => ({
      id: r.id, name: r.name,
      muscleGroups: r.muscle_groups ?? [],
      category: r.category ?? 'strength',
    }))
    save(KEYS.exerciseLibrary, entries)
  },
}

// ── Sync all on app start ─────────────────────────────────────────────────────
export async function syncAllFromRemote() {
  await Promise.all([
    foodStore.syncFromRemote(),
    exerciseStore.syncFromRemote(),
    weightStore.syncFromRemote(),
    stepsStore.syncFromRemote(),
    workoutPlanStore.syncFromRemote(),
    bodyMeasurementStore.syncFromRemote(),
    sleepStore.syncFromRemote(),
    dayScoreStore.syncFromRemote(),
    exerciseLibraryStore.syncFromRemote(),
    habitStore.syncFromRemote(),
    journalStore.syncFromRemote(),
    mealStore.syncFromRemote(),
  ])
}


// ── Habits ────────────────────────────────────────────────────────────────────
export const DEFAULT_HABITS: HabitDef[] = [
  { id: 'gym', name: 'Gimnasio', description: 'Fuerza 3-4x por semana, el resto cardio suave para sumar pasos',
    icon: 'dumbbell', kind: 'check', target: 1, auto: 'exercise', weeklyTarget: [3, 4], priority: 'high', order: 1 },
  { id: 'lunch_prep', name: 'Almuerzo de mañana listo', description: 'Dejar preparado el almuerzo del día siguiente',
    icon: 'chef', kind: 'check', target: 1, priority: 'high', order: 2 },
  { id: 'piano', name: 'Piano', description: '30 minutos al día',
    icon: 'music', kind: 'minutes', target: 30, unit: 'min', priority: 'high', order: 3 },
  { id: 'journal', name: 'Planificación y diario', description: 'Priorizar tareas y registrar trabajo, proyectos y hábitos',
    icon: 'notebook', kind: 'check', target: 1, auto: 'journal', priority: 'normal', order: 4 },
  { id: 'pushups', name: 'Flexiones', description: '10 al día para seguir fuerza y core',
    icon: 'activity', kind: 'count', target: 10, unit: 'reps', priority: 'normal', order: 5 },
]

export const habitStore = {
  getDefs: (): HabitDef[] => {
    const stored = load<HabitDef[] | null>(KEYS.habits, null)
    if (stored) {
      // pick up `auto` rules added to default habits after the user's copy was first saved
      return stored.filter(h => !h.archived).sort((a, b) => a.order - b.order)
        .map(h => ({ ...h, auto: h.auto ?? DEFAULT_HABITS.find(d => d.id === h.id)?.auto }))
    }
    save(KEYS.habits, DEFAULT_HABITS)
    return DEFAULT_HABITS
  },

  getLogs: () => load<HabitLog[]>(KEYS.habitLogs, []),

  valueFor: (habitId: string, date: string): number =>
    habitStore.getLogs().find(l => l.habitId === habitId && l.date === date)?.value ?? 0,

  setValue: (habitId: string, date: string, value: number) => {
    const id = `${habitId}_${date}`
    const rest = habitStore.getLogs().filter(l => l.id !== id)
    const v = Math.max(0, value)
    save(KEYS.habitLogs, v > 0 ? [...rest, { id, habitId, date, value: v }] : rest)
    if (v > 0) {
      supabase?.from('habit_logs').upsert({ id, habit_id: habitId, date, value: v })
        .then(({ error }) => { if (error) console.warn('Supabase habit_logs upsert:', error.message) })
    } else {
      supabase?.from('habit_logs').delete().eq('id', id)
        .then(({ error }) => { if (error) console.warn('Supabase habit_logs delete:', error.message) })
    }
  },

  isDone: (h: HabitDef, date: string): boolean => {
    if (h.auto === 'exercise' && exerciseStore.forDate(date).length > 0) return true
    if (h.auto === 'journal' && journalStore.hasContent(date)) return true
    return habitStore.valueFor(h.id, date) >= h.target
  },

  streak: (h: HabitDef): number => {
    const d = new Date()
    let n = 0
    // today still pending doesn't break the streak
    if (!habitStore.isDone(h, today())) d.setDate(d.getDate() - 1)
    for (let i = 0; i < 400; i++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!habitStore.isDone(h, key)) break
      n++
      d.setDate(d.getDate() - 1)
    }
    return n
  },

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('habit_logs').select('*')
    if (error || !data) return
    save(KEYS.habitLogs, data.map(r => ({ id: r.id, habitId: r.habit_id, date: r.date, value: r.value } as HabitLog)))
  },
}


// ── Journal (planificación diaria) ────────────────────────────────────────────
const journalTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export const journalStore = {
  getAll: () => load<JournalEntry[]>(KEYS.journal, []),

  forDate: (date: string): JournalEntry =>
    journalStore.getAll().find(e => e.date === date) ??
    { date, priorities: [], work: '', personal: '', updatedAt: '' },

  hasContent: (date: string): boolean => {
    const e = journalStore.getAll().find(x => x.date === date)
    return !!e && (e.priorities.some(p => p.text.trim()) || !!e.work.trim() || !!e.personal.trim())
  },

  save: (entry: JournalEntry) => {
    const next = { ...entry, updatedAt: new Date().toISOString() }
    save(KEYS.journal, [...journalStore.getAll().filter(e => e.date !== entry.date), next])
    // debounce remote writes while typing
    clearTimeout(journalTimers[entry.date])
    journalTimers[entry.date] = setTimeout(() => {
      supabase?.from('journal_entries').upsert({
        date: next.date, priorities: next.priorities, work: next.work,
        personal: next.personal, updated_at: next.updatedAt,
      }).then(({ error }) => { if (error) console.warn('Supabase journal upsert:', error.message) })
    }, 700)
  },

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('journal_entries').select('*')
    if (error || !data) return
    const byDate = new Map(journalStore.getAll().map(e => [e.date, e]))
    for (const r of data) {
      const local = byDate.get(r.date)
      if (!local || (r.updated_at ?? '') > local.updatedAt) {
        byDate.set(r.date, {
          date: r.date, priorities: r.priorities ?? [], work: r.work ?? '',
          personal: r.personal ?? '', updatedAt: r.updated_at ?? '',
        })
      }
    }
    save(KEYS.journal, [...byDate.values()])
  },
}

// ── Meal prep (almuerzos + compras) ───────────────────────────────────────────
const DEFAULT_MEAL_PREP: MealPrep = { lunches: {}, shoppingDow: 6, shopping: [], updatedAt: '' }
let mealTimer: ReturnType<typeof setTimeout> | undefined

export const mealStore = {
  get: (): MealPrep => ({ ...DEFAULT_MEAL_PREP, ...load<Partial<MealPrep>>(KEYS.mealPrep, {}) }),

  update: (fn: (m: MealPrep) => MealPrep) => {
    const next = { ...fn(mealStore.get()), updatedAt: new Date().toISOString() }
    save(KEYS.mealPrep, next)
    clearTimeout(mealTimer)
    mealTimer = setTimeout(() => {
      supabase?.from('meal_prep').upsert({ id: 'main', data: next, updated_at: next.updatedAt })
        .then(({ error }) => { if (error) console.warn('Supabase meal_prep upsert:', error.message) })
    }, 700)
  },

  lunchFor: (date: string): string => mealStore.get().lunches[date]?.trim() ?? '',

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('meal_prep').select('*').eq('id', 'main').maybeSingle()
    if (error || !data?.data) return
    const remote = data.data as MealPrep
    if ((remote.updatedAt ?? '') > mealStore.get().updatedAt) save(KEYS.mealPrep, remote)
  },
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
    if (plan.active) {
      supabase?.from('workout_plans').update({ active: false }).neq('id', plan.id)
        .then(({ error }) => { if (error) console.warn('Supabase plan deactivate:', error.message) })
    }
    supabase?.from('workout_plans').insert({
      id: plan.id, name: plan.name, schedule: plan.schedule,
      templates: plan.templates, floating: plan.floating, active: plan.active,
    }).then(({ error }) => { if (error) console.warn('Supabase plan insert:', error.message) })
  },

  setActive: (id: string) => {
    workoutPlanStore.save(
      workoutPlanStore.getAll().map(p => ({ ...p, active: p.id === id }))
    )
    supabase?.from('workout_plans').update({ active: false }).neq('id', id)
      .then(({ error }) => { if (error) console.warn('Supabase plan deactivate:', error.message) })
    supabase?.from('workout_plans').update({ active: true }).eq('id', id)
      .then(({ error }) => { if (error) console.warn('Supabase plan activate:', error.message) })
  },

  remove: (id: string) => {
    workoutPlanStore.save(workoutPlanStore.getAll().filter(p => p.id !== id))
    supabase?.from('workout_plans').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('Supabase plan delete:', error.message) })
  },

  getTemplateForDay: (dow: number): WorkoutTemplate | null => {
    const plan = workoutPlanStore.getActive()
    if (!plan || plan.floating) return null
    const templateId = plan.schedule[dow]
    return plan.templates.find(t => t.id === templateId) ?? null
  },

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

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('workout_plans').select('*')
    if (error || !data) return
    const plans: WeeklyPlan[] = data.map(r => ({
      id: r.id, name: r.name, schedule: r.schedule,
      templates: r.templates, floating: r.floating, active: r.active,
      createdAt: r.created_at,
    }))
    save(KEYS.workoutPlans, plans)
  },
}

// ── Body Measurements ─────────────────────────────────────────────────────────
export const bodyMeasurementStore = {
  getAll: () => load<BodyMeasurement[]>(KEYS.bodyMeasurements, []),
  save: (entries: BodyMeasurement[]) => save(KEYS.bodyMeasurements, entries),

  add: (e: BodyMeasurement) => {
    bodyMeasurementStore.save([...bodyMeasurementStore.getAll(), e])
    supabase?.from('body_measurements').insert({
      id: e.id, date: e.date,
      waist_cm: e.waistCm ?? null,
      belly_cm: e.bellyCm ?? null,
      chest_cm: e.chestCm ?? null,
      left_arm_cm: e.leftArmCm ?? null,
      right_arm_cm: e.rightArmCm ?? null,
      hips_and_buttocks_cm: e.hipsAndButtocksCm ?? null,
      notes: e.notes ?? null,
    }).then(({ error }) => { if (error) console.warn('Supabase measurement insert:', error.message) })
  },

  remove: (id: string) => {
    bodyMeasurementStore.save(bodyMeasurementStore.getAll().filter(e => e.id !== id))
    supabase?.from('body_measurements').delete().eq('id', id)
      .then(({ error }) => { if (error) console.warn('Supabase measurement delete:', error.message) })
  },

  latest: (): BodyMeasurement | null => {
    const all = bodyMeasurementStore.getAll().sort((a, b) => a.date.localeCompare(b.date))
    return all.at(-1) ?? null
  },
  first: (): BodyMeasurement | null => {
    const all = bodyMeasurementStore.getAll().sort((a, b) => a.date.localeCompare(b.date))
    return all[0] ?? null
  },

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('body_measurements').select('*').order('date')
    if (error || !data) return
    const entries: BodyMeasurement[] = data.map(r => ({
      id: r.id, date: r.date,
      waistCm: r.waist_cm ?? undefined,
      bellyCm: r.belly_cm ?? undefined,
      chestCm: r.chest_cm ?? undefined,
      leftArmCm: r.left_arm_cm ?? undefined,
      rightArmCm: r.right_arm_cm ?? undefined,
      hipsAndButtocksCm: r.hips_and_buttocks_cm ?? undefined,
      notes: r.notes ?? undefined,
    }))
    save(KEYS.bodyMeasurements, entries)
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
    supabase?.from('sleep_entries').upsert({
      id: entry.id, date: entry.date,
      bedtime_iso: entry.bedtimeISO,
      wake_iso: entry.wakeISO,
      quality_score: entry.qualityScore ?? null,
      notes: entry.notes ?? null,
    }).then(({ error }) => { if (error) console.warn('Supabase sleep upsert:', error.message) })
  },

  remove: (date: string) => {
    const entry = sleepStore.forDate(date)
    sleepStore.save(sleepStore.getAll().filter(e => e.date !== date))
    if (entry) supabase?.from('sleep_entries').delete().eq('id', entry.id)
      .then(({ error }) => { if (error) console.warn('Supabase sleep delete:', error.message) })
  },

  avgDurationHours: (dates: string[]): number => {
    const entries = sleepStore.getAll().filter(e => dates.includes(e.date))
    if (!entries.length) return 0
    const durations = entries.map(e =>
      (new Date(e.wakeISO).getTime() - new Date(e.bedtimeISO).getTime()) / 3_600_000
    )
    return Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10
  },

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('sleep_entries').select('*').order('date')
    if (error || !data) return
    const entries: SleepEntry[] = data.map(r => ({
      id: r.id, date: r.date,
      bedtimeISO: r.bedtime_iso,
      wakeISO: r.wake_iso,
      qualityScore: r.quality_score ?? undefined,
      notes: r.notes ?? undefined,
    }))
    save(KEYS.sleep, entries)
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
    supabase?.from('day_scores').upsert({
      date: score.date,
      points: score.points,
      steps_points: score.breakdown.stepsPoints,
      exercise_points: score.breakdown.exercisePoints,
      calorie_points: score.breakdown.caloriePoints,
      pr_points: score.breakdown.prPoints,
      plan_compliance_points: score.breakdown.planCompliancePoints,
      streak_bonus: score.breakdown.streakBonus,
      updated_at: new Date().toISOString(),
    }).then(({ error }) => { if (error) console.warn('Supabase day_scores upsert:', error.message) })
  },

  forDate: (date: string): DayScore | null =>
    dayScoreStore.getAll().find(s => s.date === date) ?? null,

  syncFromRemote: async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('day_scores').select('*').order('date')
    if (error || !data) return
    const scores: DayScore[] = data.map(r => ({
      date: r.date,
      points: r.points,
      breakdown: {
        stepsPoints: r.steps_points,
        exercisePoints: r.exercise_points,
        caloriePoints: r.calorie_points,
        prPoints: r.pr_points,
        planCompliancePoints: r.plan_compliance_points,
        streakBonus: r.streak_bonus,
      },
    }))
    save(KEYS.dayScores, scores)
  },

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

export function backfillScores() {
  const settings = load<Settings>(KEYS.settings, { goals: { calories: 1800, protein: 120, waterGlasses: 8, steps: 8000 }, weightUnit: 'kg', deepseekApiKey: '', notificationsEnabled: false, calorieAlertPercent: 80 })
  const allFood      = load<FoodEntry[]>(KEYS.food, [])
  const allExercise  = load<ExerciseEntry[]>(KEYS.exercise, [])
  const allSteps     = load<StepsEntry[]>(KEYS.steps, [])

  // Collect every date that has any activity
  const dateSet = new Set<string>([
    ...allFood.map(e => e.date),
    ...allExercise.map(e => e.date),
    ...allSteps.map(e => e.date),
  ])
  if (dateSet.size === 0) return

  const dates = [...dateSet].sort()
  const plan = workoutPlanStore.getActive()

  // Walk chronologically, tracking the running streak going into each day
  let runningStreak = 0
  const newScores: DayScore[] = []

  for (const date of dates) {
    const exercises = allExercise.filter(e => e.date === date)
    const steps     = allSteps.find(e => e.date === date) ?? null
    const foods     = allFood.filter(e => e.date === date)
    const cals      = foods.reduce((s, f) => s + f.calories, 0)

    let template: WorkoutTemplate | null = null
    if (plan) {
      if (plan.floating) {
        template = workoutPlanStore.matchTemplate(exercises.map(e => e.name))
      } else {
        const dow = new Date(date + 'T12:00:00').getDay()
        template = workoutPlanStore.getTemplateForDay(dow)
      }
    }

    const score = computeDayScore(date, steps, settings.goals.steps, exercises, cals, settings.goals.calories, template, runningStreak)
    newScores.push(score)
    runningStreak = score.points > 0 ? runningStreak + 1 : 0
  }

  // Merge with existing scores (keep any dates not in our activity set)
  const existing = load<DayScore[]>(KEYS.dayScores, []).filter(s => !dateSet.has(s.date))
  save(KEYS.dayScores, [...existing, ...newScores])

  // Batch upsert to Supabase
  if (supabase && newScores.length > 0) {
    supabase.from('day_scores').upsert(
      newScores.map(s => ({
        date: s.date,
        points: s.points,
        steps_points: s.breakdown.stepsPoints,
        exercise_points: s.breakdown.exercisePoints,
        calorie_points: s.breakdown.caloriePoints,
        pr_points: s.breakdown.prPoints,
        plan_compliance_points: s.breakdown.planCompliancePoints,
        streak_bonus: s.breakdown.streakBonus,
        updated_at: new Date().toISOString(),
      }))
    ).then(({ error }) => { if (error) console.warn('Supabase backfill upsert:', error.message) })
  }
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
