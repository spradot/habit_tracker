export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function nowTime(): string {
  return new Date().toTimeString().slice(0, 5)
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function fmtDate(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

export function kgToLbs(kg: number) {
  return Math.round(kg * 2.20462 * 10) / 10
}
