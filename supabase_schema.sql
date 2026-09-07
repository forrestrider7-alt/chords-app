-- Run in Supabase SQL editor
-- Table: songs
create table if not exists songs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null default '',
  body       text not null default '',
  tone       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table songs enable row level security;

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

-- Auto-update updated_at on change
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger songs_updated_at
  before update on songs
  for each row execute procedure update_updated_at();
