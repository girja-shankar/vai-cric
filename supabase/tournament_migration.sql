-- Run this in your Supabase SQL editor to enable tournament features

create table if not exists tournaments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text default 'active' check (status in ('active', 'completed')),
  created_at timestamptz default now()
);

create table if not exists tournament_teams (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  team_name text not null,
  created_at timestamptz default now()
);

create table if not exists tournament_matches (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade,
  team1 text not null,
  team2 text not null,
  team1_score integer default 0,
  team1_wickets integer default 0,
  team1_overs numeric(5,1) default 0,
  team2_score integer default 0,
  team2_wickets integer default 0,
  team2_overs numeric(5,1) default 0,
  winner text,
  played_at timestamptz default now()
);

-- Enable RLS (open for authenticated + anon)
alter table tournaments enable row level security;
alter table tournament_teams enable row level security;
alter table tournament_matches enable row level security;

create policy "public_all" on tournaments for all using (true) with check (true);
create policy "public_all" on tournament_teams for all using (true) with check (true);
create policy "public_all" on tournament_matches for all using (true) with check (true);
