-- Run once in Supabase: SQL Editor > New query > paste > Run

-- Monthly + yearly goals: one row per user per period.
-- period is 'YYYY' for a year or 'YYYY-MM' for a month.
create table if not exists goals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table goals enable row level security;

grant select, insert, update, delete on goals to authenticated;

drop policy if exists "own goals" on goals;
create policy "own goals" on goals
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
