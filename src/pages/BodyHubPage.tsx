import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Sparkles, RefreshCw, Star, Trophy, Flame } from 'lucide-react'
import {
  weightStore, bodyMeasurementStore, sleepStore, dayScoreStore,
  settingsStore, foodStore, exerciseStore, stepsStore, refreshTodayScore,
} from '../storage'
import { getRecompositionInsight } from '../gemini'
import { today, uid, last7Days, fmtDate } from '../utils'
import type { BodyMeasurement, SleepEntry, RewardState } from '../types'
import Card from '../components/Card'
import RingProgress from '../components/RingProgress'

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function BodyHubPage() {
  const settings = settingsStore.get()
  const goalWeight = settings.goalWeightKg ?? 80

  // Weight data
  const weights = weightStore.getAll().sort((a, b) => a.date.localeCompare(b.date))
  const currentWeight = weights.at(-1)?.weight ?? null
  const startWeight = weights[0]?.weight ?? null
  const kgLost = startWeight && currentWeight ? Math.round((startWeight - currentWeight) * 10) / 10 : 0
  const kgToGo = currentWeight ? Math.round((currentWeight - goalWeight) * 10) / 10 : null
  const weeklyRate = (() => {
    if (weights.length < 2) return null
    const recent = weights.slice(-8)
    if (recent.length < 2) return null
    const days = (new Date(recent.at(-1)!.date).getTime() - new Date(recent[0].date).getTime()) / 86_400_000
    const change = recent.at(-1)!.weight - recent[0].weight
    return days > 0 ? Math.round((change / days) * 7 * 100) / 100 : null
  })()
  const weeksToGoal = weeklyRate && weeklyRate < 0 && kgToGo && kgToGo > 0
    ? Math.ceil(kgToGo / Math.abs(weeklyRate))
    : null

  // Body measurements
  const measurements = bodyMeasurementStore.getAll().sort((a, b) => a.date.localeCompare(b.date))
  const firstM = measurements[0] ?? null
  const lastM = measurements.at(-1) ?? null

  // Rewards
  const [rewardState, setRewardState] = useState<RewardState | null>(null)
  const week = last7Days()
  const weekScores = dayScoreStore.getAll().filter(s => week.includes(s.date))

  // Date navigation for measurements
  const [measureDate, setMeasureDate] = useState(today())
  const shiftMeasureDate = (days: number) => {
    const d = new Date(measureDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    const next = d.toISOString().slice(0, 10)
    setMeasureDate(next)
    setShowMeasureForm(false)
  }
  const measureDateEntry = measurements.filter(m => m.date === measureDate).at(-1) ?? null

  // Body measurement form
  const [showMeasureForm, setShowMeasureForm] = useState(false)
  const [measureForm, setMeasureForm] = useState<Omit<BodyMeasurement, 'id' | 'date'>>({
    waistCm: undefined, bellyCm: undefined, chestCm: undefined,
    leftArmCm: undefined, rightArmCm: undefined, hipsAndButtocksCm: undefined, notes: '',
  })

  // Date navigation for sleep
  const [sleepDate, setSleepDate] = useState(today())
  const shiftSleepDate = (days: number) => {
    const d = new Date(sleepDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    const next = d.toISOString().slice(0, 10)
    setSleepDate(next)
    setShowSleepForm(false)
  }

  // Sleep form
  const [showSleepForm, setShowSleepForm] = useState(false)
  const dateSleep = sleepStore.forDate(sleepDate)
  const [sleepBedtime, setSleepBedtime] = useState(dateSleep?.bedtimeISO.slice(11, 16) ?? '23:00')
  const [sleepWake, setSleepWake] = useState(dateSleep?.wakeISO.slice(11, 16) ?? '07:00')
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(dateSleep?.qualityScore ?? 3)

  useEffect(() => {
    const s = sleepStore.forDate(sleepDate)
    setSleepBedtime(s?.bedtimeISO.slice(11, 16) ?? '23:00')
    setSleepWake(s?.wakeISO.slice(11, 16) ?? '07:00')
    setSleepQuality(s?.qualityScore ?? 3)
  }, [sleepDate])

  // AI insight
  const [insight, setInsight] = useState('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [expandedBadges, setExpandedBadges] = useState(false)

  useEffect(() => {
    refreshTodayScore()
    setRewardState(dayScoreStore.computeRewardState())
  }, [])

  const saveMeasurement = () => {
    const hasData = Object.values(measureForm).some(v => v !== undefined && v !== '')
    if (!hasData) return
    bodyMeasurementStore.add({
      id: uid(),
      date: measureDate,
      ...measureForm,
    })
    setShowMeasureForm(false)
    setMeasureForm({ waistCm: undefined, bellyCm: undefined, chestCm: undefined, leftArmCm: undefined, rightArmCm: undefined, hipsAndButtocksCm: undefined, notes: '' })
    setRewardState(dayScoreStore.computeRewardState())
  }

  const saveSleep = () => {
    const prevDay = new Date(sleepDate + 'T12:00:00')
    prevDay.setDate(prevDay.getDate() - 1)
    const prevDayStr = prevDay.toISOString().slice(0, 10)
    const bedtimeDate = sleepBedtime < '12:00' ? sleepDate : prevDayStr

    const entry: SleepEntry = {
      id: uid(),
      date: sleepDate,
      bedtimeISO: `${bedtimeDate}T${sleepBedtime}:00`,
      wakeISO: `${sleepDate}T${sleepWake}:00`,
      qualityScore: sleepQuality,
    }
    sleepStore.set(entry)
    setShowSleepForm(false)
  }

  const sleepData = week.map(d => {
    const s = sleepStore.forDate(d)
    const hours = s ? (new Date(s.wakeISO).getTime() - new Date(s.bedtimeISO).getTime()) / 3_600_000 : 0
    const date = new Date(d + 'T12:00:00')
    return { day: DAY_SHORT[date.getDay()], hours: Math.round(hours * 10) / 10 }
  })

  const scoreData = week.map(d => {
    const score = dayScoreStore.forDate(d)
    const date = new Date(d + 'T12:00:00')
    return { day: DAY_SHORT[date.getDay()], points: score?.points ?? 0 }
  })

  const fetchInsight = async () => {
    setLoadingInsight(true)
    try {
      const s = settingsStore.get()
      const foods = foodStore.getAll().filter(e => week.includes(e.date))
      const exercises = exerciseStore.getAll().filter(e => week.includes(e.date))
      const allWeights = weightStore.getAll()
      const allMeasurements = bodyMeasurementStore.getAll()
      const sleepEntries = week.map(d => sleepStore.forDate(d)).filter(Boolean) as SleepEntry[]
      const result = await getRecompositionInsight(
        s.deepseekApiKey,
        foods,
        exercises,
        allWeights,
        allMeasurements,
        sleepEntries,
        s.goals.calories,
        goalWeight,
        s.recompNote ?? 'reduce belly fat and gynecomastia, gain muscle'
      )
      setInsight(result)
    } finally {
      setLoadingInsight(false)
    }
  }

  // Progress ring: value = kg lost toward goal, max = total kg to lose from start
  const progressValue = startWeight ? Math.max(startWeight - (currentWeight ?? startWeight), 0) : 0
  const progressMax = startWeight ? Math.max(startWeight - goalWeight, 0.1) : 1

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Body Hub</h2>

      {/* 1. Goal Progress */}
      <Card className="space-y-3">
        <p className="text-sm font-medium">Goal: {goalWeight} kg</p>
        <div className="flex items-center gap-4">
          <RingProgress
            value={progressValue}
            max={progressMax}
            size={90}
            color="#34d399"
            label={currentWeight ? `${currentWeight}kg` : '—'}
            sublabel="current"
          />
          <div className="flex-1 space-y-1">
            {kgToGo !== null && kgToGo > 0 && (
              <p className="text-sm"><span className="font-semibold text-emerald-400">{kgToGo} kg</span> to go</p>
            )}
            {kgLost > 0 && (
              <p className="text-xs text-slate-400">Lost {kgLost} kg so far</p>
            )}
            {weeklyRate !== null && (
              <p className="text-xs text-slate-400">
                {weeklyRate > 0 ? '+' : ''}{weeklyRate} kg/wk trend
              </p>
            )}
            {weeksToGoal && (
              <p className="text-xs text-emerald-400">~{weeksToGoal} weeks at this pace</p>
            )}
            {!currentWeight && (
              <p className="text-xs text-slate-500">Log your weight to track progress</p>
            )}
          </div>
        </div>
      </Card>

      {/* 2. Body Measurements */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Body Measurements</p>
          <div className="flex items-center gap-1">
            <button onClick={() => shiftMeasureDate(-1)} className="p-1 text-slate-400 active:text-white"><ChevronLeft size={16} /></button>
            <span className="text-xs text-slate-300 min-w-[80px] text-center">
              {measureDate === today() ? 'Today' : fmtDate(measureDate)}
            </span>
            <button onClick={() => shiftMeasureDate(1)} disabled={measureDate >= today()} className="p-1 text-slate-400 disabled:opacity-30 active:text-white"><ChevronRight size={16} /></button>
            <button onClick={() => setShowMeasureForm(v => !v)} className="p-1 text-slate-400 active:text-emerald-400 ml-1">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {showMeasureForm && (
          <div className="space-y-2 border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-400">
              {measureDate === today() ? "Today's" : fmtDate(measureDate)} measurements (cm) — all optional
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['waistCm', 'Waist'],
                ['bellyCm', 'Belly (navel)'],
                ['chestCm', 'Chest'],
                ['leftArmCm', 'Left arm'],
                ['rightArmCm', 'Right arm'],
                ['hipsAndButtocksCm', 'Hips'],
              ] as [keyof typeof measureForm, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 block mb-1">{label}</label>
                  <input
                    className="w-full bg-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none"
                    type="number" step="0.5" placeholder="—"
                    value={measureForm[key] ?? ''}
                    onChange={e => setMeasureForm(f => ({ ...f, [key]: e.target.value ? Number(e.target.value) : undefined }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowMeasureForm(false)} className="flex-1 bg-slate-700 rounded-xl py-2 text-sm">Cancel</button>
              <button onClick={saveMeasurement} className="flex-1 bg-emerald-600 rounded-xl py-2 text-sm font-medium">Save</button>
            </div>
          </div>
        )}

        {measureDateEntry ? (
          <div className="space-y-1.5">
            {firstM && lastM && firstM.id !== lastM.id ? (
              <>
                <div className="grid grid-cols-3 gap-1 text-xs text-slate-500 text-center">
                  <span></span><span>{fmtDate(firstM.date)}</span><span>{fmtDate(measureDate)} (Δ)</span>
                </div>
                {([
                  ['waistCm', 'Waist'],
                  ['bellyCm', 'Belly'],
                  ['chestCm', 'Chest'],
                  ['leftArmCm', 'L. Arm'],
                ] as [keyof BodyMeasurement, string][]).map(([key, label]) => {
                  const f = firstM[key] as number | undefined
                  const l = measureDateEntry[key] as number | undefined
                  if (!f && !l) return null
                  const delta = f && l ? Math.round((l - f) * 10) / 10 : null
                  return (
                    <div key={key} className="grid grid-cols-3 gap-1 text-xs text-center">
                      <span className="text-slate-400">{label}</span>
                      <span>{f ? `${f} cm` : '—'}</span>
                      <span className={delta !== null ? (delta < 0 ? 'text-emerald-400' : delta > 0 ? 'text-rose-400' : 'text-slate-400') : 'text-slate-400'}>
                        {l ? `${l} cm` : '—'}{delta !== null && delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}
                      </span>
                    </div>
                  )
                })}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-300">
                {measureDateEntry.waistCm && <span>Waist: {measureDateEntry.waistCm} cm</span>}
                {measureDateEntry.bellyCm && <span>Belly: {measureDateEntry.bellyCm} cm</span>}
                {measureDateEntry.chestCm && <span>Chest: {measureDateEntry.chestCm} cm</span>}
                {measureDateEntry.leftArmCm && <span>Arm: {measureDateEntry.leftArmCm} cm</span>}
                {measureDateEntry.hipsAndButtocksCm && <span>Hips: {measureDateEntry.hipsAndButtocksCm} cm</span>}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            No entry for {measureDate === today() ? 'today' : fmtDate(measureDate)} — tap + to log
          </p>
        )}

        {measurements.length >= 3 && (
          <div className="mt-2 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={measurements.slice(-10).map(m => ({
                date: m.date.slice(5),
                waist: m.waistCm,
                belly: m.bellyCm,
              }))}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#64748b' }} width={28} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', fontSize: 11 }} />
                <Line type="monotone" dataKey="waist" stroke="#60a5fa" dot={false} strokeWidth={1.5} name="Waist" />
                <Line type="monotone" dataKey="belly" stroke="#f87171" dot={false} strokeWidth={1.5} name="Belly" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 3. Sleep Tracker */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Sleep</p>
          <div className="flex items-center gap-1">
            <button onClick={() => shiftSleepDate(-1)} className="p-1 text-slate-400 active:text-white"><ChevronLeft size={16} /></button>
            <span className="text-xs text-slate-300 min-w-[80px] text-center">
              {sleepDate === today() ? 'Today' : fmtDate(sleepDate)}
            </span>
            <button onClick={() => shiftSleepDate(1)} disabled={sleepDate >= today()} className="p-1 text-slate-400 disabled:opacity-30 active:text-white"><ChevronRight size={16} /></button>
            <button onClick={() => setShowSleepForm(v => !v)} className="text-xs text-slate-400 active:text-emerald-400 ml-1">
              {dateSleep ? 'Edit' : '+ Log'}
            </button>
          </div>
        </div>

        {showSleepForm && (
          <div className="space-y-3 border-t border-slate-700 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Bedtime</label>
                <input type="time" className="w-full bg-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none"
                  value={sleepBedtime} onChange={e => setSleepBedtime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Wake up</label>
                <input type="time" className="w-full bg-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none"
                  value={sleepWake} onChange={e => setSleepWake(e.target.value)} />
              </div>
            </div>
            {(() => {
              const bedH = parseInt(sleepBedtime)
              const prevD = new Date(sleepDate + 'T12:00:00'); prevD.setDate(prevD.getDate() - 1)
              const bedD = bedH < 12 ? sleepDate : prevD.toISOString().slice(0, 10)
              const dur = (new Date(`${sleepDate}T${sleepWake}:00`).getTime() - new Date(`${bedD}T${sleepBedtime}:00`).getTime()) / 3_600_000
              return dur > 0 ? <p className="text-xs text-slate-400">Duration: {Math.floor(dur)}h {Math.round((dur % 1) * 60)}m</p> : null
            })()}
            <div>
              <label className="text-xs text-slate-400 block mb-2">Quality</label>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as const).map(n => (
                  <button key={n} onClick={() => setSleepQuality(n)}
                    className={`flex-1 py-1.5 rounded-lg text-sm flex items-center justify-center ${sleepQuality === n ? 'bg-amber-600' : 'bg-slate-700'}`}>
                    <Star size={12} className={sleepQuality >= n ? 'fill-current text-amber-300' : 'text-slate-500'} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSleepForm(false)} className="flex-1 bg-slate-700 rounded-xl py-2 text-sm">Cancel</button>
              <button onClick={saveSleep} className="flex-1 bg-emerald-600 rounded-xl py-2 text-sm font-medium">Save</button>
            </div>
          </div>
        )}

        {!showSleepForm && dateSleep && (() => {
          const dur = (new Date(dateSleep.wakeISO).getTime() - new Date(dateSleep.bedtimeISO).getTime()) / 3_600_000
          return (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold">{Math.floor(dur)}h {Math.round((dur % 1) * 60)}m</span>
              <span className="text-slate-400 text-xs">{dateSleep.bedtimeISO.slice(11, 16)} → {dateSleep.wakeISO.slice(11, 16)}</span>
              {dateSleep.qualityScore && (
                <div className="flex gap-0.5 ml-auto">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={10} className={n <= dateSleep.qualityScore! ? 'fill-amber-400 text-amber-400' : 'text-slate-600'} />
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {!showSleepForm && !dateSleep && (
          <p className="text-xs text-slate-500">
            No sleep logged for {sleepDate === today() ? 'today' : fmtDate(sleepDate)}
          </p>
        )}

        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sleepData} barSize={16}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: '#64748b' }} width={20} />
              <Tooltip contentStyle={{ background: '#1e293b', border: 'none', fontSize: 11 }} formatter={(v) => [`${v}h`, 'Sleep']} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}
                fill="#60a5fa"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 text-center">
          Avg this week: {sleepStore.avgDurationHours(week) || '—'} h · Goal: 7–8h
        </p>
      </Card>

      {/* 4. Weekly Score */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Weekly Score</p>
          {rewardState && (
            <span className="text-xs bg-emerald-800/60 text-emerald-300 px-2 py-0.5 rounded-full">
              Lv. {rewardState.level}
            </span>
          )}
        </div>

        {rewardState && (
          <div className="flex gap-4 text-center">
            <div className="flex-1">
              <p className="text-xl font-bold text-emerald-400">{rewardState.weekPoints}</p>
              <p className="text-xs text-slate-400">This week</p>
            </div>
            <div className="flex-1">
              <p className="text-xl font-bold">{rewardState.totalPoints}</p>
              <p className="text-xs text-slate-400">Total pts</p>
            </div>
            <div className="flex-1">
              <p className="text-xl font-bold text-amber-400 flex items-center justify-center gap-0.5">
                {rewardState.currentStreak}<Flame size={16} />
              </p>
              <p className="text-xs text-slate-400">Streak</p>
            </div>
          </div>
        )}

        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreData} barSize={24}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} width={24} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', fontSize: 11 }}
                formatter={(v) => [v, 'pts']}
              />
              <Bar dataKey="points" radius={[4, 4, 0, 0]} fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Score breakdown for today */}
        {weekScores.length > 0 && (() => {
          const todayScore = dayScoreStore.forDate(today())
          if (!todayScore) return null
          const { breakdown } = todayScore
          return (
            <div className="text-xs text-slate-400 space-y-0.5 border-t border-slate-700 pt-2">
              <p className="text-slate-300 font-medium mb-1">Today's breakdown ({todayScore.points} pts)</p>
              {breakdown.stepsPoints > 0 && <p>Steps: +{breakdown.stepsPoints}</p>}
              {breakdown.exercisePoints > 0 && <p>Exercise: +{breakdown.exercisePoints}</p>}
              {breakdown.caloriePoints > 0 && <p>Calories: +{breakdown.caloriePoints}</p>}
              {breakdown.prPoints > 0 && <p>PRs: +{breakdown.prPoints}</p>}
              {breakdown.planCompliancePoints > 0 && <p>Plan compliance: +{breakdown.planCompliancePoints}</p>}
              {breakdown.streakBonus > 0 && <p>Streak bonus: +{breakdown.streakBonus}</p>}
            </div>
          )
        })()}

        {/* Badges */}
        {rewardState && rewardState.badges.length > 0 && (
          <div className="border-t border-slate-700 pt-2 space-y-2">
            <button onClick={() => setExpandedBadges(v => !v)} className="flex items-center gap-1 text-xs text-slate-400">
              <Trophy size={12} className="text-amber-400" /> {rewardState.badges.length} badge{rewardState.badges.length > 1 ? 's' : ''} earned
              {expandedBadges ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {expandedBadges && (
              <div className="flex flex-wrap gap-1.5">
                {rewardState.badges.map(b => (
                  <span key={b.id} className="text-xs bg-amber-900/40 text-amber-300 border border-amber-700/40 px-2 py-0.5 rounded-full capitalize">
                    {b.id.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 5. AI Recomposition Coach */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400" />
            <p className="text-sm font-medium">Recomp Coach</p>
          </div>
          {insight && (
            <button onClick={fetchInsight} disabled={loadingInsight} className="text-slate-400 active:text-emerald-400 disabled:opacity-40">
              <RefreshCw size={14} className={loadingInsight ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {!insight && !loadingInsight && (
          <button
            onClick={fetchInsight}
            className="w-full bg-emerald-600/20 border border-emerald-600/40 rounded-xl py-3 text-sm text-emerald-300 font-medium"
          >
            <Sparkles size={14} className="inline mr-1.5" />
            Get coaching insight
          </button>
        )}

        {loadingInsight && (
          <p className="text-sm text-slate-400 text-center py-4">Analyzing your progress...</p>
        )}

        {insight && (
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{insight}</p>
        )}

        <p className="text-xs text-slate-600">
          Goal: {settings.recompNote || `Reach ${goalWeight} kg, reduce belly fat and gynecomastia`}
        </p>
      </Card>
    </div>
  )
}
