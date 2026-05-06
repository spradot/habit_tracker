import { useState } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
import { settingsStore, DEFAULT_SETTINGS } from '../storage'
import { requestPermission } from '../notifications'
import { ACTIVITY_LABELS } from '../tdee'
import type { Settings, PersonalStats } from '../types'
import Card from '../components/Card'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(settingsStore.get())
  const [saved, setSaved] = useState(false)

  const update = (patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch }))
  const updateGoals = (patch: Partial<Settings['goals']>) => setSettings(s => ({ ...s, goals: { ...s.goals, ...patch } }))
  const updatePersonal = (patch: Partial<PersonalStats>) => setSettings(s => ({
    ...s, personal: { age: 30, heightCm: 175, sex: 'male', activity: 'moderate', ...s.personal, ...patch }
  }))

  const save = () => {
    settingsStore.save(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleNotifications = async () => {
    if (!settings.notificationsEnabled) {
      const granted = await requestPermission()
      if (granted) update({ notificationsEnabled: true })
      else alert('Please allow notifications in your browser/OS settings.')
    } else {
      update({ notificationsEnabled: false })
    }
  }

  const reset = () => {
    if (confirm('Reset all settings to defaults?')) {
      setSettings(DEFAULT_SETTINGS)
      settingsStore.save(DEFAULT_SETTINGS)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Settings</h2>

      {/* Daily goals */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Daily Goals</p>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Calorie goal (kcal)</label>
          <input
            className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
            type="number" value={settings.goals.calories}
            onChange={e => updateGoals({ calories: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Protein goal (g)</label>
          <input
            className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
            type="number" value={settings.goals.protein}
            onChange={e => updateGoals({ protein: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Daily steps goal</label>
          <input
            className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
            type="number" value={settings.goals.steps ?? 8000}
            onChange={e => updateGoals({ steps: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Calorie alert threshold (%)</label>
          <input
            className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
            type="number" min={50} max={99} value={settings.calorieAlertPercent}
            onChange={e => update({ calorieAlertPercent: Number(e.target.value) })}
          />
          <p className="text-xs text-slate-500 mt-1">Get notified when you reach this % of your calorie goal</p>
        </div>
      </Card>

      {/* Personal stats — needed for formula TDEE */}
      <Card className="space-y-3">
        <div>
          <p className="text-sm font-medium">Personal stats</p>
          <p className="text-xs text-slate-400 mt-0.5">Used for formula-based TDEE on the Dashboard</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Age</label>
            <input className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" type="number"
              placeholder="30" value={settings.personal?.age ?? ''}
              onChange={e => updatePersonal({ age: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Height (cm)</label>
            <input className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none" type="number"
              placeholder="175" value={settings.personal?.heightCm ?? ''}
              onChange={e => updatePersonal({ heightCm: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['male', 'female'] as const).map(s => (
            <button key={s} onClick={() => updatePersonal({ sex: s })}
              className={`py-1.5 rounded-xl text-sm font-medium capitalize ${settings.personal?.sex === s ? 'bg-emerald-600' : 'bg-slate-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Activity level</label>
          <select className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none"
            value={settings.personal?.activity ?? 'moderate'}
            onChange={e => updatePersonal({ activity: e.target.value as PersonalStats['activity'] })}>
            {(Object.entries(ACTIVITY_LABELS) as [PersonalStats['activity'], string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Units */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Units</p>
        <div className="grid grid-cols-2 gap-2">
          {(['kg', 'lbs'] as const).map(u => (
            <button key={u} onClick={() => update({ weightUnit: u })}
              className={`py-2 rounded-xl text-sm font-medium ${settings.weightUnit === u ? 'bg-emerald-600' : 'bg-slate-700'}`}>
              {u}
            </button>
          ))}
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <button className="flex items-center justify-between w-full" onClick={toggleNotifications}>
          <div>
            <p className="text-sm font-medium">Push Notifications</p>
            <p className="text-xs text-slate-400">Alerts when approaching calorie limit</p>
          </div>
          {settings.notificationsEnabled
            ? <Bell size={20} className="text-emerald-400" />
            : <BellOff size={20} className="text-slate-500" />}
        </button>
      </Card>

      {/* DeepSeek API */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">DeepSeek AI</p>
        <p className="text-xs text-slate-400">Get AI-powered weekly insights on your progress. Get a key at <span className="text-emerald-400">platform.deepseek.com</span></p>
        <input
          className="w-full bg-slate-700 rounded-xl px-3 py-2 text-sm outline-none font-mono"
          type="password"
          placeholder="sk-…"
          value={settings.deepseekApiKey}
          onChange={e => update({ deepseekApiKey: e.target.value })}
        />
      </Card>

      {/* Save */}
      <button onClick={save} className={`w-full rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${saved ? 'bg-emerald-700' : 'bg-emerald-600'}`}>
        {saved ? <><Check size={16} /> Saved!</> : 'Save Settings'}
      </button>

      <button onClick={reset} className="w-full text-slate-500 text-xs py-2">Reset to defaults</button>

      {/* About */}
      <Card>
        <p className="text-xs text-slate-400 space-y-1">
          <strong className="text-slate-300 block">HabitTrack v0.1.0</strong>
          All data stored locally on device. No account needed.<br />
          Food data: Open Food Facts (CC BY-SA 4.0)<br />
          AI: DeepSeek — deepseek-chat
        </p>
      </Card>
    </div>
  )
}
