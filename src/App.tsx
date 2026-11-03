import { useState, useEffect } from 'react'
import { LayoutDashboard, Utensils, Dumbbell, Scale, Footprints, Settings, Activity, ListChecks } from 'lucide-react'
import { syncAllFromRemote, backfillScores, exerciseLibraryStore } from './storage'
import HabitsPage from './pages/HabitsPage'
import Dashboard from './pages/Dashboard'
import CaloriesPage from './pages/CaloriesPage'
import ExercisePage from './pages/ExercisePage'
import WeightPage from './pages/WeightPage'
import StepsPage from './pages/StepsPage'
import SettingsPage from './pages/SettingsPage'
import BodyHubPage from './pages/BodyHubPage'

export type Tab = 'habits' | 'dashboard' | 'calories' | 'exercise' | 'weight' | 'steps' | 'body' | 'settings'

const NAV_TABS: { id: Tab; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'habits',    label: 'Hábitos',  Icon: ListChecks },
  { id: 'dashboard', label: 'Resumen',     Icon: LayoutDashboard },
  { id: 'calories',  label: 'Calories', Icon: Utensils },
  { id: 'exercise',  label: 'Exercise', Icon: Dumbbell },
  { id: 'weight',    label: 'Weight',   Icon: Scale },
  { id: 'steps',     label: 'Steps',    Icon: Footprints },
  { id: 'body',      label: 'Body',     Icon: Activity },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('habits')

  useEffect(() => {
    exerciseLibraryStore.seedIfEmpty()
    backfillScores()
    syncAllFromRemote().then(() => {
      exerciseLibraryStore.seedIfEmpty()
      backfillScores()
    })
  }, [])

  const wide = tab === 'habits'

  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-slate-900 border-r border-slate-800 p-3 gap-1">
        <div className="px-3 py-4 text-lg font-bold text-emerald-400">HabitTrack</div>
        {NAV_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              tab === id ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <Icon size={18} strokeWidth={tab === id ? 2.5 : 1.8} />
            {label}
          </button>
        ))}
        <button
          onClick={() => setTab('settings')}
          className={`mt-auto flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            tab === 'settings' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <Settings size={18} /> Ajustes
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
        <div className={`mx-auto w-full ${wide ? 'max-w-5xl' : 'max-w-lg md:max-w-2xl'}`}>
          {tab === 'habits'    && <HabitsPage />}
          {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
          {tab === 'calories'  && <CaloriesPage />}
          {tab === 'exercise'  && <ExercisePage />}
          {tab === 'weight'    && <WeightPage />}
          {tab === 'steps'     && <StepsPage />}
          {tab === 'body'      && <BodyHubPage />}
          {tab === 'settings'  && <SettingsPage />}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 flex z-50">
        {NAV_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] transition-colors ${
              tab === id ? 'text-emerald-400' : 'text-slate-400 active:text-slate-200'
            }`}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.5 : 1.8} />
            {label}
          </button>
        ))}
        <button
          onClick={() => setTab('settings')}
          className={`px-3 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
            tab === 'settings' ? 'text-emerald-400' : 'text-slate-500 active:text-slate-200'
          }`}
        >
          <Settings size={18} strokeWidth={tab === 'settings' ? 2.5 : 1.8} />
        </button>
      </nav>
    </div>
  )
}
