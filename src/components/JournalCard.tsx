import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { journalStore } from '../storage'
import type { JournalEntry } from '../types'
import Card from './Card'

const MAX_PRIORITIES = 5

export default function JournalCard({ date, onChange }: { date: string; onChange: () => void }) {
  const [entry, setEntry] = useState<JournalEntry>(() => journalStore.forDate(date))

  const update = (patch: Partial<JournalEntry>) => {
    const next = { ...entry, ...patch }
    setEntry(next)
    journalStore.save(next)
    onChange()
  }
  const setPriority = (i: number, p: Partial<JournalEntry['priorities'][number]>) =>
    update({ priorities: entry.priorities.map((x, j) => (j === i ? { ...x, ...p } : x)) })

  return (
    <Card>
      <h2 className="font-semibold mb-1">Planificación y diario</h2>
      <p className="text-xs text-slate-400 mb-4">Cuenta como hecho en cuanto escribas algo.</p>

      <div className="mb-4">
        <span className="text-xs font-medium text-slate-300">Prioridades del día</span>
        <div className="mt-2 space-y-2">
          {entry.priorities.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="checkbox" aria-label={`Prioridad ${i + 1} completada`} checked={p.done}
                onChange={e => setPriority(i, { done: e.target.checked })}
                className="w-5 h-5 accent-emerald-500 shrink-0" />
              <input aria-label={`Prioridad ${i + 1}`} value={p.text} placeholder={`Prioridad ${i + 1}`}
                onChange={e => setPriority(i, { text: e.target.value })}
                className={`flex-1 min-w-0 h-10 px-3 rounded-lg bg-slate-700 text-sm placeholder:text-slate-500 ${p.done ? 'line-through text-slate-400' : ''}`} />
              <button aria-label={`Quitar prioridad ${i + 1}`}
                onClick={() => update({ priorities: entry.priorities.filter((_, j) => j !== i) })}
                className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>
          ))}
          {entry.priorities.length < MAX_PRIORITIES && (
            <button onClick={() => update({ priorities: [...entry.priorities, { text: '', done: false }] })}
              className="flex items-center gap-1.5 h-10 text-sm text-emerald-400 hover:text-emerald-300">
              <Plus size={16} /> Añadir prioridad
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-300">Trabajo</span>
          <textarea value={entry.work} rows={4} placeholder="Qué avancé, qué quedó pendiente…"
            onChange={e => update({ work: e.target.value })}
            className="mt-1.5 w-full p-3 rounded-lg bg-slate-700 text-sm placeholder:text-slate-500 resize-y" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-300">Proyectos personales y hábitos</span>
          <textarea value={entry.personal} rows={4} placeholder="Piano, proyectos, cómo me sentí…"
            onChange={e => update({ personal: e.target.value })}
            className="mt-1.5 w-full p-3 rounded-lg bg-slate-700 text-sm placeholder:text-slate-500 resize-y" />
        </label>
      </div>
    </Card>
  )
}
