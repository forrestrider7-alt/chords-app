-- Migration: switch from per-user isolation to shared library
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Drop the old per-user RLS policies
drop policy if exists "Users can read own songs"   on songs;
drop policy if exists "Users can insert own songs" on songs;
drop policy if exists "Users can update own songs" on songs;
drop policy if exists "Users can delete own songs" on songs;

-- Shared library: any authenticated user can read/write/delete any song
create policy "Authenticated can select"
  on songs for select
  using (auth.role() = 'authenticated');

create policy "Authenticated can insert"
  on songs for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated can update"
  on songs for update
  using (auth.role() = 'authenticated');

create policy "Authenticated can delete"
  on songs for delete
  using (auth.role() = 'authenticated');
