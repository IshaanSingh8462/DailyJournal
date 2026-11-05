-- Run once in Supabase: SQL Editor > New query > paste > Run

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_updated on notes (user_id, updated_at desc);

alter table notes enable row level security;

grant select, insert, update, delete on notes to authenticated;

drop policy if exists "own notes" on notes;
create policy "own notes" on notes
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
