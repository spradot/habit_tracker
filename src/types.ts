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
  durationSec?: number  // for time-based sets (plank, holds)
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
  deepseekApiKey: string
  notificationsEnabled: boolean
  calorieAlertPercent: number
  personal?: PersonalStats
  goalWeightKg?: number
  recompNote?: string
}

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'abs' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'cardio' | 'other'

export interface PlannedExercise {
  name: string
  muscleGroups: MuscleGroup[]
  targetSets: number
  targetReps: number
  targetWeightKg?: number
  isCore?: boolean        // core exercises count for full compliance; optional = bonus only
  notes?: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  exercises: PlannedExercise[]
  isRest: boolean
}

export interface WeeklyPlan {
  id: string
  name: string
  schedule: Record<number, string>   // 0=Sun..6=Sat -> WorkoutTemplate.id (empty = floating)
  templates: WorkoutTemplate[]
  floating: boolean                  // true = no fixed day assignments, match by exercise overlap
  createdAt: string
  active: boolean
}

export interface DayScore {
  date: string
  points: number
  breakdown: {
    stepsPoints: number
    exercisePoints: number
    caloriePoints: number
    prPoints: number
    planCompliancePoints: number
    streakBonus: number
  }
}

export type BadgeId =
  | 'first_workout' | 'first_pr' | 'week_warrior'
  | 'calorie_sniper' | 'step_master' | 'recomp_start' | 'minus_5kg'

export interface Badge { id: BadgeId; earnedAt: string }

export interface RewardState {
  totalPoints: number
  weekPoints: number
  currentStreak: number
  longestStreak: number
  level: number
  badges: Badge[]
}

export interface BodyMeasurement {
  id: string
  date: string
  waistCm?: number
  bellyCm?: number
  chestCm?: number
  leftArmCm?: number
  rightArmCm?: number
  hipsAndButtocksCm?: number
  notes?: string
}

export interface ExerciseLibraryEntry {
  id: string
  name: string
  muscleGroups: MuscleGroup[]
  category: 'strength' | 'cardio' | 'mobility'
}

export interface SleepEntry {
  id: string
  date: string           // wake-up date
  bedtimeISO: string
  wakeISO: string
  qualityScore?: 1 | 2 | 3 | 4 | 5
  notes?: string
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
