export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function notify(title: string, body: string) {
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/favicon.svg' })
}

export function checkCalorieAlert(current: number, goal: number, alertPercent: number) {
  const pct = (current / goal) * 100
  if (pct >= 100) {
    notify('🚨 Calorie limit reached!', `You've hit ${current} kcal — your ${goal} kcal goal for today.`)
  } else if (pct >= alertPercent) {
    notify('⚠️ Approaching calorie limit', `${current} / ${goal} kcal (${Math.round(pct)}%)`)
  }
}
