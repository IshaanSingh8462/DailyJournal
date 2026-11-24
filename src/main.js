import './styles/base.css'
import './styles/journal.css'

import { sb, configured } from './lib/supabase.js'
import { state, flush, cancelPendingFlush } from './lib/store.js'
import { yestK } from './lib/dates.js'
import { $, setStatus } from './lib/ui.js'
import { render, jump } from './journal/entries.js'
import { refresh } from './journal/sync.js'
import { setupToolbar } from './journal/toolbar.js'
import { setupGoals } from './journal/goals.js'
import { setupTopbar } from './journal/topbar.js'
import { showLogin, setupLogin } from './journal/auth.js'
import { mountNav } from './lib/nav.js'

async function start() {
  $('login').hidden = true
  $('app').hidden = false
  render(false)
  setStatus('Syncing…')
  await refresh()
  jump(yestK, 'auto')
  if (!state.pulled) setStatus('Offline – showing this device’s copy')
}

async function init() {
  mountNav('journal')
  setupToolbar()
  setupTopbar()
  setupGoals()
  if (!configured) {
    return showLogin('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README).')
  }
  setupLogin(start)
  const { data: { session } } = await sb.auth.getSession()
  session ? start() : showLogin()
}

window.addEventListener('online', refresh)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh() })
window.addEventListener('beforeunload', () => { cancelPendingFlush(); flush() })
init()
