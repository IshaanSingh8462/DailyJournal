# Daily Log

Journal + next-day todo list. Vite (vanilla JS) + Supabase, deployed on Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local   # then paste your Supabase URL + anon key
npm run dev
```

## Deploy (Vercel)

1. Push this folder to GitHub (`node_modules`, `dist` and `.env*` are git-ignored).
2. In Vercel: **Project Settings > Environment Variables**, add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Production + Preview).
3. Framework preset: **Vite** (auto-detected). Build: `npm run build`, output: `dist`.
4. Redeploy after changing env vars.

## Workouts page (one-time Supabase setup)

The Workouts page stores its data in Supabase. Open **SQL Editor** in Supabase, paste the contents of
`supabase/workouts.sql`, and run it. This creates the `workout_plan` table and a private
`exercise-videos` storage bucket (both locked to your own user). Until then the page still works
and saves on your device, it just won't sync.

## Notes page (one-time Supabase setup)

Same idea as Workouts: open the Supabase **SQL Editor**, paste `supabase/notes.sql`, and run it once.
Notes are saved on the device first, then synced.

## Structure

```
index.html            main journal page
pages/                extra pages: any .html file here is built automatically
src/main.js           journal entry point (wires everything together)
src/pages/            one script per extra page (notes.js, workouts.js, routine.js)
src/data/routine.js   the text of the Routine page – edit it to change what shows
supabase/             SQL to run in Supabase
src/journal/          journal-only code: entries, toolbar, auth, sync
src/lib/              shared code: supabase client, journal store/sync, plan.js (workouts), dates, ui helpers
src/styles/           base.css (shared) + journal.css
```

## Adding a new page

1. Create `pages/stats.html` (copy the `<head>` from `index.html`, and end with
   `<script type="module" src="/src/pages/stats.js"></script>`).
2. Create `src/pages/stats.js` and import what you need, e.g.
   `import '../styles/base.css'` and `import { data } from '../lib/store.js'`.
3. Visit `/pages/stats.html` (link to it from the journal toolbar when ready).

No config changes needed; `vite.config.js` picks up everything in `pages/`.
