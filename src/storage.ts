import type { FoodEntry, ExerciseEntry, WeightEntry, StepsEntry, Settings, FoodCacheEntry } from './types'
import { supabase } from './supabase'

const KEYS = {
  food: 'ht_food',
  exercise: 'ht_exercise',
  weight: 'ht_weight',
  steps: 'ht_steps',
  settings: 'ht_settings',
  foodCache: 'ht_food_cache',
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
  geminiApiKey: '',
  notificationsEnabled: false,
  calorieAlertPercent: 80,
}

export const settingsStore = {
  get: (): Settings => load<Settings>(KEYS.settings, DEFAULT_SETTINGS),
  save: (s: Settings) => save(KEYS.settings, s),
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
