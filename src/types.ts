export interface FoodEntry {
  id: string
  date: string          // YYYY-MM-DD
  time: string          // HH:MM
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: number   // grams
  barcode?: string
}

export interface ExerciseSet {
  reps: number
  weight: number        // kg
  unit: 'kg' | 'lbs'
}

export interface ExerciseEntry {
  id: string
  date: string
  name: string
  category: 'cardio' | 'strength' | 'mobility'
  sets: ExerciseSet[]
  durationMin?: number  // for cardio
  notes?: string
  pr?: boolean
}

export interface WeightEntry {
  id: string
  date: string
  time: string
  weight: number        // kg
  notes?: string
}

export interface StepsEntry {
  id: string
  date: string
  steps: number
  source?: string       // 'mi_fitness' | 'manual'
}

export interface DailyGoals {
  calories: number      // kcal
  protein: number       // g
  waterGlasses: number
  steps: number
}

export interface PersonalStats {
  age: number
  heightCm: number
  sex: 'male' | 'female'
  activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
}

export interface Settings {
  goals: DailyGoals
  weightUnit: 'kg' | 'lbs'
  geminiApiKey: string
  notificationsEnabled: boolean
  calorieAlertPercent: number
  personal?: PersonalStats
}

export interface FoodCacheEntry {
  barcode: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: number
  cachedAt: number
}
