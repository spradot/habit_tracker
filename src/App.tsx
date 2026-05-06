import { useState } from 'react'
import { LayoutDashboard, Utensils, Dumbbell, Scale, Footprints, Settings } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import CaloriesPage from './pages/CaloriesPage'
import ExercisePage from './pages/ExercisePage'
import WeightPage from './pages/WeightPage'
import StepsPage from './pages/StepsPage'
import SettingsPage from './pages/SettingsPage'

export type Tab = 'dashboard' | 'calories' | 'exercise' | 'weight' | 'steps' | 'settings'

const NAV_TABS: { id: Tab; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Home',     Icon: LayoutDashboard },
  { id: 'calories',  label: 'Calories', Icon: Utensils },
  { id: 'exercise',  label: 'Exercise', Icon: Dumbbell },
  { id: 'weight',    label: 'Weight',   Icon: Scale },
  { id: 'steps',     label: 'Steps',    Icon: Footprints },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto">
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
        {tab === 'calories'  && <CaloriesPage />}
        {tab === 'exercise'  && <ExercisePage />}
        {tab === 'weight'    && <WeightPage />}
        {tab === 'steps'     && <StepsPage />}
        {tab === 'settings'  && <SettingsPage />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-900 border-t border-slate-700 flex z-50">
        {NAV_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              tab === id ? 'text-emerald-400' : 'text-slate-400 active:text-slate-200'
            }`}
          >
            <Icon size={20} strokeWidth={tab === id ? 2.5 : 1.8} />
            {label}
          </button>
        ))}
        {/* Settings tucked at the end, smaller */}
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
