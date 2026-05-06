import type { FoodCacheEntry } from './types'
import { foodCache } from './storage'

interface OFFProduct {
  product_name?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
  product_quantity?: number
}

interface OFFResponse {
  status: number
  product?: OFFProduct
}

interface SearchProduct {
  id: string
  product_name?: string
  nutriments?: {
    'energy-kcal_serving'?: number
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
  serving_quantity?: number
}

interface OFFSearchResponse {
  products?: SearchProduct[]
}

export interface FoodResult {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: number
  barcode?: string
}

const BASE = 'https://world.openfoodfacts.org'

export async function lookupBarcode(barcode: string): Promise<FoodResult | null> {
  const cached = foodCache.get(barcode)
  if (cached) return toResult(cached)

  try {
    const res = await fetch(`${BASE}/api/v0/product/${barcode}.json`)
    const data: OFFResponse = await res.json()
    if (data.status !== 1 || !data.product) return null

    const p = data.product
    const n = p.nutriments ?? {}
    const entry: FoodCacheEntry = {
      barcode,
      name: p.product_name ?? 'Unknown',
      calories: n['energy-kcal_100g'] ?? 0,
      protein: n.proteins_100g ?? 0,
      carbs: n.carbohydrates_100g ?? 0,
      fat: n.fat_100g ?? 0,
      servingSize: p.product_quantity ?? 100,
      cachedAt: Date.now(),
    }
    foodCache.set(entry)
    return toResult(entry)
  } catch {
    return null
  }
}

export async function searchFood(query: string): Promise<FoodResult[]> {
  try {
    const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=id,product_name,nutriments,serving_quantity`
    const res = await fetch(url)
    const data: OFFSearchResponse = await res.json()
    const products = data.products ?? []

    return products
      .filter((p): p is SearchProduct & { product_name: string } => !!p.product_name)
      .map(p => {
        const n = p.nutriments ?? {}
        const kcal100 = n['energy-kcal_100g'] ?? 0
        const serving = p.serving_quantity ?? 100
        return {
          name: p.product_name,
          calories: Math.round((kcal100 * serving) / 100),
          protein: Math.round(((n.proteins_100g ?? 0) * serving) / 100),
          carbs: Math.round(((n.carbohydrates_100g ?? 0) * serving) / 100),
          fat: Math.round(((n.fat_100g ?? 0) * serving) / 100),
          servingSize: serving,
          barcode: p.id,
        }
      })
  } catch {
    return []
  }
}

function toResult(e: FoodCacheEntry): FoodResult {
  return {
    name: e.name,
    calories: e.calories,
    protein: e.protein,
    carbs: e.carbs,
    fat: e.fat,
    servingSize: e.servingSize,
    barcode: e.barcode,
  }
}
