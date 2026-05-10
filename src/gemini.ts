import OpenAI from 'openai'
import type { FoodEntry, ExerciseEntry, WeightEntry, MuscleGroup, WorkoutTemplate, BodyMeasurement, SleepEntry } from './types'

const ENV_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined

function makeClient(key: string) {
  return new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: key,
    dangerouslyAllowBrowser: true,
  })
}

async function callDeepSeek(key: string, prompt: string): Promise<string> {
  const client = makeClient(key)
  const res = await client.chat.completions.create({
    model: 'deepseek-v4-flash',
    messages: [{ role: 'user', content: prompt }],
  })
  return res.choices?.[0]?.message?.content?.trim() ?? ''
}

export interface MealAnalysis {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  feedback: string
}

export async function analyzeMealText(
  description: string,
  apiKey: string
): Promise<MealAnalysis> {
  const key = apiKey || ENV_KEY || ''
  if (!key) throw new Error('No DeepSeek API key configured.')

  const prompt = `You are a clinical nutritionist. Analyze this meal description: "${description}".

Rules:
1. Estimate calories and macros as accurately as possible using standard nutritional values.
2. Always round total calories UP to the nearest 10 (ceiling, never down).
3. Calculate total macros in grams.
5. Provide one short critique, based on Connor McGregor style: be direct, a bit cheeky, and brutally honest. Focus on how the meal could be improved for weight loss.
5. Respond ONLY with flat JSON, no markdown, no code fences:
{
  "name": "short meal label",
  "calorias": number,
  "proteina": number,
  "carbos": number,
  "grasa": number,
  "feedback": "Per-item breakdown + total + one short critique"
}`

  const raw = await callDeepSeek(key, prompt)

  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Model returned no JSON.\n\nRaw response:\n${raw || '(empty)'}`)

  interface RawAnalysis {
    name?: string
    calorias?: number
    proteina?: number
    carbos?: number
    grasa?: number
    feedback?: string
  }

  let parsed: RawAnalysis
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error(`Could not parse model response as JSON.\n\nRaw:\n${raw}`)
  }

  return {
    name: parsed.name ?? description.slice(0, 40),
    calories: parsed.calorias ?? 0,
    protein: parsed.proteina ?? 0,
    carbs: parsed.carbos ?? 0,
    fat: parsed.grasa ?? 0,
    feedback: parsed.feedback ?? '',
  }
}

export interface WorkoutRecommendation {
  suggestedDay: string
  musclesGap: MuscleGroup[]
  suggestedExercises: { name: string; sets: number; reps: number; rationale: string }[]
  rationale: string
  intensity: 'light' | 'moderate' | 'heavy'
}

const SUNDAY_SHOULDERS_FALLBACK: WorkoutRecommendation = {
  suggestedDay: 'Shoulders & Arms',
  musclesGap: ['shoulders', 'biceps', 'triceps'],
  suggestedExercises: [
    { name: 'Lateral Raise', sets: 3, reps: 15, rationale: 'Builds shoulder width to visually reduce chest' },
    { name: 'Overhead Press', sets: 3, reps: 10, rationale: 'Primary shoulder mass builder' },
    { name: 'Front Raise', sets: 2, reps: 15, rationale: 'Anterior delt for balanced shoulder development' },
    { name: 'Hammer Curl', sets: 3, reps: 12, rationale: 'Biceps + brachialis thickness' },
    { name: 'Tricep Pushdown', sets: 3, reps: 15, rationale: 'Tricep isolation, arm definition' },
    { name: 'Face Pull', sets: 3, reps: 15, rationale: 'Rear delt health and posture' },
  ],
  rationale: 'You trained chest, back, core, and legs this week. Shoulders and arms had zero direct work. Developed lateral delts visually narrow perceived chest width — key for gynecomastia appearance. Today is recovery-appropriate for upper-body accessory work.',
  intensity: 'moderate',
}

export async function getWorkoutRecommendation(
  apiKey: string,
  weekExercises: ExerciseEntry[],
  currentWeightKg: number | null,
  goalWeightKg: number,
  recompNote: string,
  todayDayName: string,
  activePlanTemplate: WorkoutTemplate | null
): Promise<WorkoutRecommendation> {
  const key = apiKey || ENV_KEY || ''
  if (!key) return SUNDAY_SHOULDERS_FALLBACK

  // Group exercises by date
  const byDate: Record<string, string[]> = {}
  for (const e of weekExercises) {
    if (!byDate[e.date]) byDate[e.date] = []
    const maxWeight = e.sets.length ? Math.max(...e.sets.map(s => s.weight)) : 0
    byDate[e.date].push(`${e.name}${maxWeight > 0 ? ` (${maxWeight}kg)` : ''}`)
  }
  const weekSummary = Object.entries(byDate)
    .map(([d, names]) => `${d}: ${names.join(', ')}`)
    .join('\n')

  const plannedExercises = activePlanTemplate
    ? `Active plan template for today: ${activePlanTemplate.name} — ${activePlanTemplate.exercises.map(e => e.name).join(', ')}`
    : 'No active workout plan set.'

  const prompt = `You are a body recomposition coach. Analyze this week's training and recommend what to do today (${todayDayName}).

Goal: ${recompNote || 'body recomposition, fat loss, muscle gain'}
Current weight: ${currentWeightKg ?? 'unknown'} kg → Target: ${goalWeightKg} kg

Week's exercises:
${weekSummary || 'No exercises logged this week.'}

${plannedExercises}

Instructions:
1. Identify which major muscle groups (chest, back, shoulders, biceps, triceps, abs, quads, hamstrings, glutes, calves) have NOT been trained this week
2. Recommend 4-6 exercises targeting the gap muscles
3. For gynecomastia/chest appearance: prioritize shoulders (lateral delts create V-taper illusion), then arms
4. Set appropriate intensity given fatigue from the week
5. Respond ONLY with flat JSON, no markdown:
{
  "suggestedDay": "short label e.g. Shoulders & Arms",
  "musclesGap": ["shoulder","biceps","triceps"],
  "suggestedExercises": [
    {"name":"Lateral Raise","sets":3,"reps":15,"rationale":"brief reason"}
  ],
  "rationale": "1-2 sentence explanation",
  "intensity": "light|moderate|heavy"
}`

  try {
    const raw = await callDeepSeek(key, prompt)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return SUNDAY_SHOULDERS_FALLBACK
    const parsed = JSON.parse(match[0]) as WorkoutRecommendation
    return parsed
  } catch {
    return SUNDAY_SHOULDERS_FALLBACK
  }
}

export async function getRecompositionInsight(
  apiKey: string,
  food: FoodEntry[],
  exercises: ExerciseEntry[],
  weights: WeightEntry[],
  measurements: BodyMeasurement[],
  sleep: SleepEntry[],
  goalCalories: number,
  goalWeightKg: number,
  recompNote: string
): Promise<string> {
  const key = apiKey || ENV_KEY || ''
  if (!key) return 'Add a DeepSeek API key in Settings to get AI insights.'

  const totalCals = food.reduce((s, f) => s + f.calories, 0)
  const totalProtein = food.reduce((s, f) => s + f.protein, 0)
  const days = food.length > 0 ? Math.max(new Set(food.map(f => f.date)).size, 1) : 7
  const latestWeight = weights.length ? weights[weights.length - 1].weight : null
  const startWeight = weights.length ? weights[0].weight : null
  const kgLost = startWeight && latestWeight ? Math.round((startWeight - latestWeight) * 10) / 10 : 0
  const kgToGo = latestWeight ? Math.round((latestWeight - goalWeightKg) * 10) / 10 : null

  const firstM = measurements.length ? measurements[0] : null
  const lastM = measurements.length ? measurements[measurements.length - 1] : null
  const waistDelta = firstM?.waistCm && lastM?.waistCm
    ? Math.round((lastM.waistCm - firstM.waistCm) * 10) / 10 : null
  const bellyDelta = firstM?.bellyCm && lastM?.bellyCm
    ? Math.round((lastM.bellyCm - firstM.bellyCm) * 10) / 10 : null

  const avgSleep = sleep.length ? Math.round(
    sleep.map(s => (new Date(s.wakeISO).getTime() - new Date(s.bedtimeISO).getTime()) / 3_600_000)
      .reduce((a, b) => a + b, 0) / sleep.length * 10
  ) / 10 : null

  const prompt = `You are a body recomposition coach. Give 4 bullet insights and 1 concrete next action. Max 150 words. Be direct and specific.

Goal: ${recompNote || 'reach 80kg, reduce belly fat, gynecomastia appearance'}
Target weight: ${goalWeightKg} kg

Data:
- Current weight: ${latestWeight ?? 'unknown'} kg | Lost: ${kgLost} kg | Remaining: ${kgToGo ?? '?'} kg
- Avg daily calories: ${Math.round(totalCals / days)} kcal (goal: ${goalCalories})
- Avg daily protein: ${Math.round(totalProtein / days)}g
- Exercise sessions (7d): ${exercises.length} — ${[...new Set(exercises.map(e => e.name))].slice(0, 5).join(', ') || 'none'}
- Waist change: ${waistDelta !== null ? `${waistDelta > 0 ? '+' : ''}${waistDelta} cm` : 'not measured'}
- Belly change: ${bellyDelta !== null ? `${bellyDelta > 0 ? '+' : ''}${bellyDelta} cm` : 'not measured'}
- Avg sleep: ${avgSleep ?? 'not tracked'} hours

Focus on recomposition (simultaneous fat loss + muscle preservation), not just calorie counting.`

  try {
    return await callDeepSeek(key, prompt) || 'No response from model.'
  } catch {
    return 'Could not reach DeepSeek API. Check your connection or API key.'
  }
}

export async function getWeightLossInsight(
  apiKey: string,
  food: FoodEntry[],
  exercise: ExerciseEntry[],
  weight: WeightEntry[],
  dailyCalorieGoal: number
): Promise<string> {
  const key = apiKey || ENV_KEY || ''
  if (!key) return 'Add a DeepSeek API key in Settings to get AI insights.'

  const totalCals = food.reduce((s, f) => s + f.calories, 0)
  const totalProtein = food.reduce((s, f) => s + f.protein, 0)
  const latestWeight = weight.length ? weight[weight.length - 1].weight : null
  const oldWeight = weight.length >= 2 ? weight[weight.length - 8]?.weight ?? weight[0].weight : null

  const prompt = `You are a concise weight-loss coach. Given this week's data, give 3 bullet-point insights and 1 recommendation. Be specific and actionable. Max 120 words.

Data:
- Average daily calories: ${Math.round(totalCals / 7)} kcal (goal: ${dailyCalorieGoal})
- Average daily protein: ${Math.round(totalProtein / 7)}g
- Current weight: ${latestWeight ?? 'unknown'} kg
- Weight 7 days ago: ${oldWeight ?? 'unknown'} kg
- Exercise sessions this week: ${exercise.length}
- Exercise types: ${[...new Set(exercise.map(e => e.name))].join(', ') || 'none logged'}

Keep it short, direct, and motivating.`

  try {
    return await callDeepSeek(key, prompt) || 'No response from model.'
  } catch {
    return 'Could not reach DeepSeek API. Check your connection or API key.'
  }
}
