export function formatCardDate(iso: string): { month: string; day: string; weekday: string } {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...o }).format(dt)
  return { month: fmt({ month: 'long' }), day: String(d), weekday: fmt({ weekday: 'long' }) }
}
