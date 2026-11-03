import { useState } from 'react'
import {
  Dumbbell, ChefHat, Music, NotebookPen, Activity, Flame, Check, Plus, Minus,
  ChevronLeft, ChevronRight, ShoppingCart, AlertCircle, type LucideIcon,
} from 'lucide-react'
import { habitStore, exerciseStore, mealStore } from '../storage'
import { today } from '../utils'
import type { HabitDef } from '../types'
import Card from '../components/Card'
import JournalCard from '../components/JournalCard'
import MealPlanner from '../components/MealPlanner'

const HABIT_ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell, chef: ChefHat, music: Music, notebook: NotebookPen, activity: Activity,
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekDays(date: string): string[] {
  const d = new Date(date + 'T12:00:00')
  const monday = shiftDate(date, -((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => shiftDate(monday, i))
}

function longDate(date: string): string {
  const s = new Date(date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function HabitsPage() {
  const [date, setDate] = useState(today())
  const [view, setView] = useState<'today' | 'plan'>('today')
  const [, setTick] = useState(0)
  const refresh = () => setTick(t => t + 1)

  const habits = habitStore.getDefs()
  const isToday = date === today()
  const week = weekDays(date)
  const doneCount = habits.filter(h => habitStore.isDone(h, date)).length
  const pct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0

  const strengthDays = week.filter(d => exerciseStore.forDate(d).some(e => e.category === 'strength')).length
  const gym = habits.find(h => h.weeklyTarget)

  const meal = mealStore.get()
  const dow = new Date().getDay()
  const pendingItems = meal.shopping.filter(i => !i.checked).length
  const lunchPrep = habits.find(h => h.id === 'lunch_prep')
  const banners: { text: string; Icon: LucideIcon }[] = []
  if (isToday) {
    if (dow === meal.shoppingDow) banners.push({ text: `Hoy es día de compras (${pendingItems} productos pendientes en la lista).`, Icon: ShoppingCart })
    else if ((dow + 1) % 7 === meal.shoppingDow) banners.push({ text: `Mañana es día de compras: revisa la lista (${pendingItems} pendientes).`, Icon: ShoppingCart })
    if (lunchPrep && !habitStore.isDone(lunchPrep, date) && !mealStore.lunchFor(shiftDate(date, 1)))
      banners.push({ text: 'Aún no definiste el almuerzo de mañana.', Icon: AlertCircle })
  }

  const set = (h: HabitDef, v: number) => { habitStore.setValue(h.id, date, v); refresh() }

  return (
    <div className="p-4 md:p-8 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{isToday ? 'Hoy' : longDate(date)}</h1>
          <p className="text-sm text-slate-400">{isToday ? longDate(date) : 'Registro de un día anterior'}</p>
        </div>
        <div className="flex items-center gap-1">
          <button aria-label="Día anterior" onClick={() => setDate(shiftDate(date, -1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"><ChevronLeft size={18} /></button>
          {!isToday && (
            <button onClick={() => setDate(today())}
              className="px-3 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-emerald-400">Hoy</button>
          )}
          <button aria-label="Día siguiente" disabled={isToday} onClick={() => setDate(shiftDate(date, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      </header>

      <div className="flex gap-1 p-1 rounded-xl bg-slate-800 w-fit">
        {([['today', 'Checklist'], ['plan', 'Almuerzos y compras']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            className={`h-9 px-4 rounded-lg text-sm transition-colors ${view === id ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'plan' && <MealPlanner onChange={refresh} />}

      {view === 'today' && banners.map(b => (
        <button key={b.text} onClick={() => setView('plan')}
          className="w-full flex items-center gap-3 text-left p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm hover:bg-amber-500/15">
          <b.Icon size={18} className="shrink-0" />
          <span className="flex-1">{b.text}</span>
          <span className="text-xs underline">Abrir</span>
        </button>
      ))}

      <div className={`grid gap-4 lg:grid-cols-[1fr_20rem] items-start ${view === 'today' ? '' : 'hidden'}`}>
        <section className="space-y-3">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">{doneCount} de {habits.length} completados</span>
              <span className="text-sm font-semibold text-emerald-400">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </Card>

          {habits.map(h => h.auto === 'journal'
            ? <JournalCard key={`${h.id}-${date}`} date={date} onChange={refresh} />
            : <HabitCard key={h.id} habit={h} date={date} onSet={v => set(h, v)}
                note={h.id === 'lunch_prep' ? lunchNote(date) : undefined} onPlan={() => setView('plan')} />
          )}
        </section>

        <aside className="space-y-3">
          <Card>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Esta semana</h2>
            <div className="space-y-2.5">
              {habits.map(h => (
                <div key={h.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 truncate">{h.name}</span>
                  <div className="flex gap-1 shrink-0">
                    {week.map(d => (
                      <span key={d} title={d}
                        className={`w-4 h-4 shrink-0 rounded ${habitStore.isDone(h, d) ? 'bg-emerald-500' : d > today() ? 'border border-slate-700' : 'bg-slate-700'} ${d === date ? 'ring-1 ring-slate-300' : ''}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-1 mt-2 text-[10px] text-slate-500">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(l => <span key={l} className="w-4 shrink-0 text-center">{l}</span>)}
            </div>
          </Card>

          {gym?.weeklyTarget && (
            <Card>
              <h2 className="text-sm font-semibold text-slate-300 mb-1">Fuerza semanal</h2>
              <p className="text-2xl font-bold">
                {strengthDays}<span className="text-base text-slate-400"> / {gym.weeklyTarget[0]}-{gym.weeklyTarget[1]}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {strengthDays >= gym.weeklyTarget[0]
                  ? 'Meta mínima cumplida. El resto de días, cardio suave.'
                  : `Faltan ${gym.weeklyTarget[0] - strengthDays} sesiones de fuerza para el mínimo.`}
              </p>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}

function lunchNote(date: string): string {
  const next = mealStore.lunchFor(shiftDate(date, 1))
  return next ? `Mañana: ${next}` : 'Mañana: sin planificar'
}

function HabitCard({ habit: h, date, onSet, note, onPlan }: {
  habit: HabitDef; date: string; onSet: (v: number) => void; note?: string; onPlan: () => void
}) {
  const Icon = HABIT_ICONS[h.icon] ?? Check
  const done = habitStore.isDone(h, date)
  const value = habitStore.valueFor(h.id, date)
  const streak = habitStore.streak(h)
  const autoDone = h.auto === 'exercise' && done && value < h.target
  const progress = h.kind === 'check' ? (done ? 100 : 0) : Math.min(100, (value / h.target) * 100)

  return (
    <Card className={`transition-colors ${done ? 'border border-emerald-500/40' : 'border border-transparent'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl shrink-0 ${done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{h.name}</h3>
            {h.priority === 'high' && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">Prioridad</span>
            )}
            {streak > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-orange-400"><Flame size={13} />{streak}</span>
            )}
          </div>
          {h.description && <p className="text-xs text-slate-400 mt-0.5">{h.description}</p>}
          {note && (
            <button onClick={onPlan} className="text-xs text-emerald-400 hover:underline mt-1 text-left">{note}</button>
          )}
          {autoDone && <p className="text-xs text-emerald-400 mt-1">Completado por un entrenamiento registrado hoy</p>}
        </div>

        {h.kind === 'check' && (
          <button
            aria-label={done ? 'Desmarcar' : 'Marcar como hecho'}
            disabled={autoDone}
            onClick={() => onSet(value >= 1 ? 0 : 1)}
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-600 text-transparent hover:border-emerald-500'
            }`}
          >
            <Check size={22} />
          </button>
        )}
      </div>

      {h.kind !== 'check' && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-slate-300">
              <span className="font-semibold">{value}</span> / {h.target} {h.unit}
            </span>
            {done && <Check size={16} className="text-emerald-400" />}
          </div>
          <div className="h-2 rounded-full bg-slate-700 overflow-hidden mb-3">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {h.kind === 'count' ? (
              <>
                <Step onClick={() => onSet(value - 1)} aria="Restar uno"><Minus size={16} /></Step>
                <Step onClick={() => onSet(value + 1)} aria="Sumar uno"><Plus size={16} /></Step>
                {!done && <Step primary onClick={() => onSet(h.target)}>Completar {h.target}</Step>}
              </>
            ) : (
              <>
                <Step onClick={() => onSet(value - 5)} aria="Restar 5 minutos"><Minus size={16} /></Step>
                <Step onClick={() => onSet(value + 5)}>+5</Step>
                <Step onClick={() => onSet(value + 10)}>+10</Step>
                {!done && <Step primary onClick={() => onSet(h.target)}>Completar {h.target} min</Step>}
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

function Step({ children, onClick, primary, aria }: {
  children: React.ReactNode; onClick: () => void; primary?: boolean; aria?: string
}) {
  return (
    <button aria-label={aria} onClick={onClick}
      className={`min-w-11 h-10 px-3 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
        primary ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
      }`}>
      {children}
    </button>
  )
}
