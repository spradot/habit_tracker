import type { FoodEntry, ExerciseEntry, WeightEntry } from './types'

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

const ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

// Models tried in order — all free-tier on AI Studio keys
const MODELS = [
  'gemini-3-flash-preview',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

function geminiUrl(key: string, model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
}

const QUOTA_MSG =
  '429 quota exceeded. Your key may be from Google Cloud Console (limit: 0 free calls). ' +
  'Get a free key from aistudio.google.com instead, then paste it in Settings.'

async function callModel(key: string, model: string, prompt: string): Promise<string> {
  const res = await fetch(geminiUrl(key, model), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })

  const data = await res.json() as GeminiResponse & { error?: { message?: string; code?: number } }

  if (data.error?.code === 429) throw Object.assign(new Error(QUOTA_MSG), { quota: true })
  if (data.error) throw new Error(`Gemini error ${data.error.code ?? ''}: ${data.error.message ?? 'unknown'}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  const finishReason = (data.candidates?.[0] as { finishReason?: string } | undefined)?.finishReason
  if (!text && finishReason && finishReason !== 'STOP') {
    throw new Error(`Response blocked (reason: ${finishReason}). Try rephrasing.`)
  }

  return text
}

async function callGemini(key: string, prompt: string): Promise<string> {
  let lastError: Error = new Error('No models available.')
  for (const model of MODELS) {
    try {
      return await callModel(key, model, prompt)
    } catch (err) {
      lastError = err as Error
      // If quota on this model, try next; otherwise throw immediately
      if (!(err as { quota?: boolean }).quota) throw err
    }
  }
  throw lastError
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
  if (!key) throw new Error('No Gemini API key configured.')

  const prompt = `You are a clinical nutritionist. Analyze this meal description: "${description}".

Rules:
1. Estimate calories and macros as accurately as possible using standard nutritional values.
2. Always round total calories UP to the nearest 10 (ceiling, never down).
3. Calculate total macros in grams.
4. Summarize what was eaten as a short meal name (max 6 words).
5. Respond ONLY with flat JSON, no markdown, no code fences:
{
  "name": "short meal label",
  "calorias": number,
  "proteina": number,
  "carbos": number,
  "grasa": number,
  "feedback": "Per-item breakdown + total + one short critique"
}`

  const raw = await callGemini(key, prompt)

  // Extract the first {...} block regardless of surrounding markdown/text
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`Gemini returned no JSON.\n\nRaw response:\n${raw || '(empty)'}`)

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
    throw new Error(`Could not parse Gemini response as JSON.\n\nRaw:\n${raw}`)
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

export async function getWeightLossInsight(
  apiKey: string,
  food: FoodEntry[],
  exercise: ExerciseEntry[],
  weight: WeightEntry[],
  dailyCalorieGoal: number
): Promise<string> {
  const key = apiKey || ENV_KEY || ''
  if (!key) return 'Add a Gemini API key in Settings to get AI insights.'

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
    return await callGemini(key, prompt) || 'No response from Gemini.'
  } catch {
    return 'Could not reach Gemini API. Check your connection or API key.'
  }
}
