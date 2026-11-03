import { useState } from 'react'
import { Plus, Trash2, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { mealStore } from '../storage'
import { today, uid } from '../utils'
import Card from './Card'

export const DOW = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function shiftDay(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MealPlanner({ onChange }: { onChange: () => void }) {
  const [meal, setMeal] = useState(mealStore.get())
  const [item, setItem] = useState('')

  const apply = (fn: Parameters<typeof mealStore.update>[0]) => {
    mealStore.update(fn)
    setMeal(mealStore.get())
    onChange()
  }
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today(), i))
  const pending = meal.shopping.filter(i => !i.checked).length

  const addItem = () => {
    const text = item.trim()
    if (!text) return
    apply(m => ({ ...m, shopping: [...m.shopping, { id: uid(), text, checked: false }] }))
    setItem('')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <Card>
        <h2 className="font-semibold flex items-center gap-2 mb-1"><UtensilsCrossed size={18} className="text-emerald-400" /> Almuerzos de la semana</h2>
        <p className="text-xs text-slate-400 mb-4">Qué vas a llevar cada día. Lo de mañana se muestra en tu checklist.</p>
        <div className="space-y-2">
          {days.map((d, i) => {
            const dow = new Date(d + 'T12:00:00').getDay()
            return (
              <label key={d} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-slate-300">
                  {i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DOW[dow]}
                </span>
                <input value={meal.lunches[d] ?? ''} placeholder="Sin planificar"
                  aria-label={`Almuerzo ${DOW[dow]} ${d}`}
                  onChange={e => apply(m => ({ ...m, lunches: { ...m.lunches, [d]: e.target.value } }))}
                  className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-slate-700 text-sm placeholder:text-slate-500" />
              </label>
            )
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="font-semibold flex items-center gap-2"><ShoppingCart size={18} className="text-emerald-400" /> Lista de compras</h2>
          <span className="text-xs text-slate-400">{pending} pendientes</span>
        </div>
        <label className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mb-4">
          Día de compras
          <select value={meal.shoppingDow}
            onChange={e => apply(m => ({ ...m, shoppingDow: Number(e.target.value) }))}
            className="h-9 px-2 rounded-lg bg-slate-700 text-sm text-slate-200">
            {DOW.map((n, i) => <option key={n} value={i}>{n}</option>)}
          </select>
          <span>(aviso ese día y el anterior)</span>
        </label>

        <form onSubmit={e => { e.preventDefault(); addItem() }} className="flex gap-2 mb-3">
          <input value={item} onChange={e => setItem(e.target.value)} placeholder="Añadir producto…"
            aria-label="Nuevo producto"
            className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-slate-700 text-sm placeholder:text-slate-500" />
          <button type="submit" aria-label="Añadir producto"
            className="w-10 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center"><Plus size={18} /></button>
        </form>

        <ul className="space-y-1">
          {meal.shopping.map(s => (
            <li key={s.id} className="flex items-center gap-3 min-h-10">
              <input type="checkbox" checked={s.checked} aria-label={s.text}
                onChange={() => apply(m => ({ ...m, shopping: m.shopping.map(x => x.id === s.id ? { ...x, checked: !x.checked } : x) }))}
                className="w-5 h-5 accent-emerald-500 shrink-0" />
              <span className={`flex-1 text-sm ${s.checked ? 'line-through text-slate-500' : ''}`}>{s.text}</span>
              <button aria-label={`Quitar ${s.text}`}
                onClick={() => apply(m => ({ ...m, shopping: m.shopping.filter(x => x.id !== s.id) }))}
                className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
            </li>
          ))}
          {meal.shopping.length === 0 && <li className="text-sm text-slate-500 py-2">La lista está vacía.</li>}
        </ul>
        {meal.shopping.some(s => s.checked) && (
          <button onClick={() => apply(m => ({ ...m, shopping: m.shopping.filter(x => !x.checked) }))}
            className="mt-3 h-10 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm text-slate-200">
            Limpiar comprados
          </button>
        )}
      </Card>
    </div>
  )
}
