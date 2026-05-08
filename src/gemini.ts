import OpenAI from 'openai'
import type { FoodEntry, ExerciseEntry, WeightEntry } from './types'

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
