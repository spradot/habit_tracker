import type { WeightEntry, FoodEntry } from './types'

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentary (desk job, no gym)',
  light:       'Light (1–3× / week)',
  moderate:    'Moderate (4–5× / week)',
  active:      'Active (daily training)',
  very_active: 'Very active (2× / day)',
}

// ── Mifflin-St Jeor BMR → TDEE ───────────────────────────────────────────────
export function formulaTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  activity: ActivityLevel
): number {
  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity])
}

export interface DataTDEEResult {
  tdee: number
  avgCalories: number
  weightChangePer7Days: number  // kg, negative = loss
  daysUsed: number
  confidence: 'low' | 'medium' | 'high'
}

// ── Back-calculate TDEE from logged data ─────────────────────────────────────
// Uses linear regression on weight to reduce noise from water fluctuations.
export function dataTDEE(
  weightEntries: WeightEntry[],
  foodEntries: FoodEntry[],
  windowDays = 14
): DataTDEEResult | null {
  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 3) return null

  // Use last N days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const recentWeights = sorted.filter(e => e.date >= cutoffStr)
  if (recentWeights.length < 2) return null

  // Linear regression on weight over time to smooth water noise
  const dayIndex = (date: string) =>
    Math.floor((new Date(date).getTime() - new Date(recentWeights[0].date).getTime()) / 86_400_000)

  const xs = recentWeights.map(e => dayIndex(e.date))
  const ys = recentWeights.map(e => e.weight)
  const n = xs.length
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sumX2 = xs.reduce((s, x) => s + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) // kg/day

  // Days that have both calorie and weight data
  const weightDates = new Set(recentWeights.map(e => e.date))
  const daysWithBoth = [...weightDates].filter(d => {
    const cals = foodEntries.filter(f => f.date === d).reduce((s, f) => s + f.calories, 0)
    return cals > 0
  })
  if (daysWithBoth.length < 3) return null

  const totalCals = daysWithBoth.reduce((s, d) => {
    return s + foodEntries.filter(f => f.date === d).reduce((ss, f) => ss + f.calories, 0)
  }, 0)
  const avgCalories = Math.round(totalCals / daysWithBoth.length)

  // TDEE = avg calories − (slope × 7700)
  // slope is negative when losing → deficit is positive
  const dailyDeficit = -slope * 7700
  const tdee = Math.round(avgCalories + dailyDeficit)

  const confidence: DataTDEEResult['confidence'] =
    daysWithBoth.length >= 10 ? 'high' :
    daysWithBoth.length >= 6  ? 'medium' : 'low'

  return {
    tdee,
    avgCalories,
    weightChangePer7Days: Math.round(slope * 7 * 100) / 100,
    daysUsed: daysWithBoth.length,
    confidence,
  }
}

// ── Goal suggestions ──────────────────────────────────────────────────────────
export interface GoalSuggestion {
  label: string
  calories: number
  weeklyLossKg: number
}

export function goalSuggestions(tdee: number): GoalSuggestion[] {
  return [
    { label: 'Gentle (−250)',   calories: tdee - 250,  weeklyLossKg: 0.23 },
    { label: 'Moderate (−500)', calories: tdee - 500,  weeklyLossKg: 0.45 },
    { label: 'Aggressive (−750)', calories: tdee - 750, weeklyLossKg: 0.68 },
  ]
}
