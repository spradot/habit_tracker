import type { MuscleGroup } from './types'

export const EXERCISE_MUSCLE_MAP: Record<string, MuscleGroup[]> = {
  // Chest
  'Bench Press': ['chest', 'triceps', 'shoulders'],
  'Incline Bench Press': ['chest', 'shoulders', 'triceps'],
  'Incline Dumbbell Press': ['chest', 'shoulders', 'triceps'],
  'Chest Press': ['chest', 'triceps', 'shoulders'],
  'Cable Fly': ['chest'],
  'Dumbbell Fly': ['chest'],
  'Dips': ['chest', 'triceps'],
  'Weighted Push-ups': ['chest', 'triceps'],
  'Push-ups': ['chest', 'triceps'],
  'Chest Pull': ['chest', 'back'],

  // Back
  'Lat Pulldown': ['back', 'biceps'],
  'Lat Pulldown Machine': ['back', 'biceps'],
  'Pull-ups': ['back', 'biceps'],
  'Barbell Row': ['back', 'biceps'],
  'Pendlay Row': ['back', 'biceps'],
  'Row Machine': ['back', 'biceps'],
  'Cable Row': ['back', 'biceps'],
  'Unilateral Dumbbell Row': ['back', 'biceps'],
  'Dumbbell Row': ['back', 'biceps'],
  'Face Pull': ['shoulders', 'back'],
  'Neutral-grip Pulldown': ['back', 'biceps'],
  'Seated Row': ['back', 'biceps'],
  'T-Bar Row': ['back', 'biceps'],

  // Shoulders
  'Overhead Press': ['shoulders', 'triceps'],
  'Military Press': ['shoulders', 'triceps'],
  'Dumbbell Shoulder Press': ['shoulders', 'triceps'],
  'Lateral Raise': ['shoulders'],
  'Front Raise': ['shoulders'],
  'Rear Delt Fly': ['shoulders', 'back'],
  'Arnold Press': ['shoulders', 'triceps'],

  // Biceps
  'Barbell Curl': ['biceps'],
  'Z-Bar Curl': ['biceps'],
  'EZ Bar Curl': ['biceps'],
  'Dumbbell Curl': ['biceps'],
  'Hammer Curl': ['biceps'],
  'Concentration Curl': ['biceps'],
  'Cable Curl': ['biceps'],
  'Preacher Curl': ['biceps'],

  // Triceps
  'Tricep Pushdown': ['triceps'],
  'Tricep Pushdown (cable)': ['triceps'],
  'Tricep Extension': ['triceps'],
  'French Press': ['triceps'],
  'Skullcrusher': ['triceps'],
  'Overhead Tricep Extension': ['triceps'],
  'Tricep Dip': ['triceps', 'chest'],
  'Close-Grip Bench Press': ['triceps', 'chest'],

  // Abs / Core
  'Ab Crunch': ['abs'],
  'Crunch': ['abs'],
  'Weighted Decline Crunch': ['abs'],
  'Decline Crunch': ['abs'],
  'Plank': ['abs'],
  'Cable Crunch': ['abs'],
  'Leg Raise': ['abs'],
  'Russian Twist': ['abs'],
  'Hanging Leg Raise': ['abs'],
  'Mountain Climber': ['abs', 'cardio'],

  // Quads / Legs
  'Squat': ['quads', 'glutes'],
  'Barbell Back Squat': ['quads', 'glutes'],
  'Front Squat': ['quads', 'glutes'],
  'Leg Press': ['quads', 'glutes'],
  'Leg Extension': ['quads'],
  'Seated Leg Contraction': ['quads'],
  'Lunges': ['quads', 'glutes'],
  'Dumbbell Lunges': ['quads', 'glutes'],
  'Bulgarian Split Squat': ['quads', 'glutes'],
  'Hack Squat': ['quads'],

  // Hamstrings / Glutes
  'Romanian Deadlift': ['hamstrings', 'glutes'],
  'RDL': ['hamstrings', 'glutes'],
  'Leg Curl': ['hamstrings'],
  'Seated Leg Curl': ['hamstrings'],
  'Hip Thrust': ['glutes'],
  'Deadlift': ['hamstrings', 'glutes', 'back'],
  'Sumo Deadlift': ['hamstrings', 'glutes', 'back'],
  'Good Morning': ['hamstrings', 'glutes'],

  // Calves
  'Calf Raise': ['calves'],
  'Standing Calf Raise': ['calves'],
  'Seated Calf Raise': ['calves'],

  // Cardio
  'Running': ['cardio'],
  'Treadmill': ['cardio'],
  'Cycling': ['cardio'],
  'Elliptical': ['cardio'],
  'Jump Rope': ['cardio'],
  'HIIT': ['cardio'],
  'Swimming': ['cardio'],
  'Rowing Machine': ['cardio', 'back'],
}

export function getMuscleGroups(exerciseName: string): MuscleGroup[] {
  const exact = EXERCISE_MUSCLE_MAP[exerciseName]
  if (exact) return exact
  // Fuzzy match: find first key that the name starts with or contains
  const lower = exerciseName.toLowerCase()
  for (const [key, groups] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return groups
  }
  return ['other']
}

// The user's 4-day split pre-loaded as the default plan
export const DEFAULT_PLAN_TEMPLATES = [
  {
    id: 'push',
    name: 'Torso Empuje (Push)',
    isRest: false,
    exercises: [
      { name: 'Bench Press', muscleGroups: ['chest', 'triceps', 'shoulders'] as MuscleGroup[], targetSets: 4, targetReps: 8, isCore: true },
      { name: 'Incline Dumbbell Press', muscleGroups: ['chest', 'shoulders', 'triceps'] as MuscleGroup[], targetSets: 3, targetReps: 10, isCore: true },
      { name: 'Overhead Press', muscleGroups: ['shoulders', 'triceps'] as MuscleGroup[], targetSets: 3, targetReps: 10, isCore: true },
      { name: 'Dips', muscleGroups: ['chest', 'triceps'] as MuscleGroup[], targetSets: 3, targetReps: 12, isCore: false },
      { name: 'French Press', muscleGroups: ['triceps'] as MuscleGroup[], targetSets: 3, targetReps: 11, isCore: false },
      { name: 'Tricep Pushdown', muscleGroups: ['triceps'] as MuscleGroup[], targetSets: 3, targetReps: 12, isCore: false },
      { name: 'Lateral Raise', muscleGroups: ['shoulders'] as MuscleGroup[], targetSets: 4, targetReps: 13, isCore: false },
    ],
  },
  {
    id: 'legs',
    name: 'Pierna (Legs)',
    isRest: false,
    exercises: [
      { name: 'Squat', muscleGroups: ['quads', 'glutes'] as MuscleGroup[], targetSets: 4, targetReps: 8, isCore: true },
      { name: 'Romanian Deadlift', muscleGroups: ['hamstrings', 'glutes'] as MuscleGroup[], targetSets: 3, targetReps: 10, isCore: true },
      { name: 'Leg Press', muscleGroups: ['quads', 'glutes'] as MuscleGroup[], targetSets: 3, targetReps: 12, isCore: true },
      { name: 'Leg Extension', muscleGroups: ['quads'] as MuscleGroup[], targetSets: 3, targetReps: 13, isCore: false },
      { name: 'Leg Curl', muscleGroups: ['hamstrings'] as MuscleGroup[], targetSets: 3, targetReps: 13, isCore: false },
      { name: 'Calf Raise', muscleGroups: ['calves'] as MuscleGroup[], targetSets: 4, targetReps: 17, isCore: false },
    ],
  },
  {
    id: 'pull',
    name: 'Torso Tirón (Pull)',
    isRest: false,
    exercises: [
      { name: 'Lat Pulldown', muscleGroups: ['back', 'biceps'] as MuscleGroup[], targetSets: 4, targetReps: 8, isCore: true },
      { name: 'Row Machine', muscleGroups: ['back', 'biceps'] as MuscleGroup[], targetSets: 4, targetReps: 10, isCore: true },
      { name: 'Dumbbell Row', muscleGroups: ['back', 'biceps'] as MuscleGroup[], targetSets: 3, targetReps: 11, isCore: true },
      { name: 'Face Pull', muscleGroups: ['shoulders', 'back'] as MuscleGroup[], targetSets: 3, targetReps: 17, isCore: false },
      { name: 'Z-Bar Curl', muscleGroups: ['biceps'] as MuscleGroup[], targetSets: 3, targetReps: 10, isCore: false },
      { name: 'Hammer Curl', muscleGroups: ['biceps'] as MuscleGroup[], targetSets: 3, targetReps: 12, isCore: false },
    ],
  },
  {
    id: 'fullbody',
    name: 'Cuerpo Completo / Puntos Débiles',
    isRest: false,
    exercises: [
      { name: 'Incline Dumbbell Press', muscleGroups: ['chest', 'shoulders'] as MuscleGroup[], targetSets: 3, targetReps: 10, isCore: true },
      { name: 'Neutral-grip Pulldown', muscleGroups: ['back', 'biceps'] as MuscleGroup[], targetSets: 3, targetReps: 12, isCore: true },
      { name: 'Dumbbell Lunges', muscleGroups: ['quads', 'glutes'] as MuscleGroup[], targetSets: 3, targetReps: 11, isCore: true },
      { name: 'Cable Fly', muscleGroups: ['chest'] as MuscleGroup[], targetSets: 3, targetReps: 13, isCore: false },
      { name: 'Dumbbell Curl', muscleGroups: ['biceps'] as MuscleGroup[], targetSets: 3, targetReps: 11, isCore: false },
      { name: 'Overhead Tricep Extension', muscleGroups: ['triceps'] as MuscleGroup[], targetSets: 3, targetReps: 11, isCore: false },
      { name: 'Plank', muscleGroups: ['abs'] as MuscleGroup[], targetSets: 3, targetReps: 60, isCore: false },
    ],
  },
  {
    id: 'rest',
    name: 'Rest',
    isRest: true,
    exercises: [],
  },
]
