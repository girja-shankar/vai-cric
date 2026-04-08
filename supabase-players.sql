-- Run this in Supabase SQL Editor to add the player registry table

create table if not exists registered_players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

alter table registered_players enable row level security;
create policy "Public read/write registered_players" on registered_players for all using (true) with check (true);
