export const pad = n => String(n).padStart(2, '0')
export const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())

const now = new Date()
export const todayK = iso(now)
export const yestK = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))

export const label = k => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .replace(',', '')
}

// the day after a 'YYYY-MM-DD' key
export const nextKey = k => {
  const [y, m, d] = k.split('-').map(Number)
  return iso(new Date(y, m - 1, d + 1))
}

const parse = k => { const [y, m, d] = k.split('-').map(Number); return [y, m, d] }
export const addDays = (k, n) => { const [y, m, d] = parse(k); return iso(new Date(y, m - 1, d + n)) }
// whole days from a to b (DST-safe)
export const daysBetween = (a, b) => {
  const u = k => { const [y, m, d] = parse(k); return Date.UTC(y, m - 1, d) }
  return Math.round((u(b) - u(a)) / 86400000)
}
export const mondayOf = k => { const [y, m, d] = parse(k); return addDays(k, -((new Date(y, m - 1, d).getDay() + 6) % 7)) }
export const shortLabel = k => { const [y, m, d] = parse(k); return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) }
export const shortDate = k => { const [y, m, d] = parse(k); return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
