import { Capacitor, registerPlugin } from '@capacitor/core'
import { Health } from '@capgo/capacitor-health'
import { foodStore, stepsStore, weightStore } from './storage'
import { supabase } from './supabase'
import type { FoodEntry, WeightEntry } from './types'

// Health Connect only exists inside the native Android app (Capacitor build).
export const isNativeAndroid = () => Capacitor.getPlatform() === 'android'

// Local native plugin (android/app/.../HcNutritionPlugin.kt): full nutrition records.
interface HcMeal {
  id: string
  startDate: string
  name: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown'
  calories: number
  protein: number
  carbs: number
  fat: number
}
const HcNutrition = registerPlugin<{
  readMeals(o: { startDate: string; endDate: string }): Promise<{ meals: HcMeal[] }>
}>('HcNutrition')

const FOOD_PREFIX = 'hc_meal_'
const LEGACY_FOOD_PREFIX = 'hc_cal_' // per-day totals from the first version
const WEIGHT_PREFIX = 'hc_w_'

const MEAL_LABEL: Record<HcMeal['mealType'], string> = {
  breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Snack', unknown: 'Comida',
}

export interface HealthSyncResult {
  days: number
  stepsDays: number
  meals: number
  weights: number
}

const pad = (n: number) => String(n).padStart(2, '0')
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const round1 = (n: number) => Math.round(n * 10) / 10

async function dailySteps(start: Date, end: Date) {
  const { samples } = await Health.queryAggregated({
    dataType: 'steps',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    bucket: 'day',
    aggregation: 'sum',
  })
  const byDate = new Map<string, number>()
  for (const s of samples) {
    const date = localDate(new Date(s.startDate))
    byDate.set(date, (byDate.get(date) ?? 0) + (s.value ?? 0))
  }
  return byDate
}

function syncMeals(meals: HcMeal[], from: string) {
  const rows: FoodEntry[] = meals.map(m => {
    const d = new Date(m.startDate)
    return {
      id: `${FOOD_PREFIX}${m.id}`,
      date: localDate(d),
      time: localTime(d),
      name: m.name?.trim() ? m.name.trim() : `${MEAL_LABEL[m.mealType]} (Fitia)`,
      calories: Math.round(m.calories),
      protein: round1(m.protein),
      carbs: round1(m.carbs),
      fat: round1(m.fat),
      servingSize: 0,
    }
  })
  const keep = new Set(rows.map(r => r.id))
  // Imported entries inside the window that no longer exist in Health Connect
  // (deleted in Fitia) plus the legacy per-day totals get removed.
  const stale = foodStore.getAll().filter(e =>
    e.id.startsWith(LEGACY_FOOD_PREFIX) || (e.id.startsWith(FOOD_PREFIX) && e.date >= from && !keep.has(e.id)))
  const staleIds = new Set(stale.map(e => e.id))

  foodStore.save([
    ...foodStore.getAll().filter(e => !keep.has(e.id) && !staleIds.has(e.id)),
    ...rows,
  ])

  if (supabase) {
    if (staleIds.size) {
      supabase.from('food_entries').delete().in('id', [...staleIds])
        .then(({ error }) => { if (error) console.warn('Supabase food delete:', error.message) })
    }
    if (rows.length) {
      supabase.from('food_entries').upsert(rows.map(r => ({
        id: r.id, date: r.date, time: r.time, name: r.name, calories: r.calories,
        protein: r.protein, carbs: r.carbs, fat: r.fat, serving_size: r.servingSize, barcode: null,
      }))).then(({ error }) => { if (error) console.warn('Supabase food upsert:', error.message) })
    }
  }
  return rows.length
}

async function syncWeights(start: Date, end: Date) {
  const { samples } = await Health.readSamples({
    dataType: 'weight',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    limit: 500,
    ascending: true,
  })
  const rows: WeightEntry[] = samples
    .filter(s => s.value > 0)
    .map(s => {
      const d = new Date(s.startDate)
      return {
        id: `${WEIGHT_PREFIX}${s.platformId ?? d.getTime()}`,
        date: localDate(d),
        time: localTime(d),
        weight: round1(s.value), // kilograms
      }
    })
  if (!rows.length) return 0
  const ids = new Set(rows.map(r => r.id))
  weightStore.save([...weightStore.getAll().filter(e => !ids.has(e.id)), ...rows])
  supabase?.from('weight_entries').upsert(rows.map(r => ({
    id: r.id, date: r.date, time: r.time, weight: r.weight, notes: null,
  }))).then(({ error }) => { if (error) console.warn('Supabase weight upsert:', error.message) })
  return rows.length
}

/**
 * Pulls steps (Mi Fitness), meals with macros (Fitia) and weight from Health Connect
 * for the last `days` days. Idempotent: entries use stable IDs, so re-running updates
 * them instead of duplicating.
 */
export async function syncHealthConnect(days = 14): Promise<HealthSyncResult> {
  const avail = await Health.isAvailable()
  if (!avail.available) throw new Error(avail.reason ?? 'Health Connect no está disponible en este dispositivo')

  const status = await Health.requestAuthorization({ read: ['steps', 'dietaryEnergyConsumed', 'weight'] })
  const granted = new Set(status.readAuthorized)
  if (!granted.size) throw new Error('Permisos de Health Connect denegados')

  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  let stepsDays = 0
  let meals = 0
  let weights = 0

  if (granted.has('steps')) {
    for (const [date, value] of await dailySteps(start, end)) {
      const n = Math.round(value)
      if (n <= 0) continue
      const existing = stepsStore.forDate(date)
      stepsStore.set({ id: existing?.id ?? `hc_steps_${date}`, date, steps: n, source: 'mi_fitness' })
      stepsDays++
    }
  }

  if (granted.has('dietaryEnergyConsumed')) {
    const res = await HcNutrition.readMeals({ startDate: start.toISOString(), endDate: end.toISOString() })
    meals = syncMeals(res.meals, localDate(start))
  }

  if (granted.has('weight')) weights = await syncWeights(start, end)

  return { days, stepsDays, meals, weights }
}
