import { sb } from '../lib/supabase.js'
import { data, state, pull, ensureTemplates, flush } from '../lib/store.js'
import { pullPlan } from '../lib/plan.js'
import { render, updateBadges } from './entries.js'

export async function refresh() {
  if (!sb || !navigator.onLine) return
  pullPlan().then(ok => { if (ok) updateBadges() })
  const ok = await pull()
  if (!ok) return
  if (!state.pulled) { state.pulled = true; ensureTemplates() }
  const shown = [...document.querySelectorAll('details')].map(d => d.dataset.k).sort().join()
  if (shown !== Object.keys(data).sort().join()) {
    render(true)
  } else {
    document.querySelectorAll('details').forEach(d => {
      const ed = d.querySelector('.ed')
      if (ed !== document.activeElement && ed.innerHTML !== data[d.dataset.k]) ed.innerHTML = data[d.dataset.k]
    })
  }
  flush()
}
