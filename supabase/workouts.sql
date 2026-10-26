-- Run once in Supabase: SQL Editor > New query > paste > Run

-- 1) Workout plan (day types, schedule, exercises) – one row per user
create table if not exists workout_plan (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table workout_plan enable row level security;

drop policy if exists "own workout plan" on workout_plan;
create policy "own workout plan" on workout_plan
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Private storage bucket for exercise videos (50 MB per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('exercise-videos', 'exercise-videos', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "own exercise videos" on storage.objects;
create policy "own exercise videos" on storage.objects
  for all to authenticated
  using (bucket_id = 'exercise-videos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'exercise-videos' and (storage.foldername(name))[1] = auth.uid()::text);
