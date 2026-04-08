-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Live match state (stores the full JSON state for real-time viewing)
create table if not exists live_matches (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz default now()
);

-- Completed matches (for stats)
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  played_at timestamptz default now(),
  overs int not null,
  team1_name text not null,
  team2_name text not null,
  team1_score int not null default 0,
  team1_wickets int not null default 0,
  team1_balls int not null default 0,
  team2_score int not null default 0,
  team2_wickets int not null default 0,
  team2_balls int not null default 0,
  winner text, -- team name or 'tie'
  full_state jsonb -- full match state for detailed scorecard
);

-- Player stats per match
create table if not exists match_player_stats (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  player_name text not null,
  team_name text not null,
  -- batting
  runs_scored int not null default 0,
  balls_faced int not null default 0,
  fours int not null default 0,
  sixes int not null default 0,
  -- bowling
  overs_bowled numeric(4,1) not null default 0,
  runs_conceded int not null default 0,
  wickets_taken int not null default 0,
  wides int not null default 0,
  no_balls int not null default 0
);

-- Enable realtime on live_matches
alter publication supabase_realtime add table live_matches;

-- Allow public access (no auth needed)
alter table live_matches enable row level security;
alter table matches enable row level security;
alter table match_player_stats enable row level security;

create policy "Public read/write live_matches" on live_matches for all using (true) with check (true);
create policy "Public read/write matches" on matches for all using (true) with check (true);
create policy "Public read/write match_player_stats" on match_player_stats for all using (true) with check (true);

-- Useful views for stats
create or replace view player_career_stats as
select
  player_name,
  count(distinct match_id) as matches_played,
  sum(runs_scored) as total_runs,
  sum(balls_faced) as total_balls_faced,
  sum(fours) as total_fours,
  sum(sixes) as total_sixes,
  max(runs_scored) as highest_score,
  round(case when sum(balls_faced) > 0 then sum(runs_scored)::numeric / sum(balls_faced) * 100 else 0 end, 1) as strike_rate,
  sum(wickets_taken) as total_wickets,
  sum(runs_conceded) as total_runs_conceded,
  round(case when sum(overs_bowled) > 0 then sum(runs_conceded)::numeric / sum(overs_bowled) else 0 end, 1) as economy_rate
from match_player_stats
group by player_name;

-- Monthly stats view
create or replace view monthly_player_stats as
select
  player_name,
  to_char(m.played_at, 'YYYY-MM') as month,
  count(distinct mps.match_id) as matches,
  sum(runs_scored) as runs,
  sum(wickets_taken) as wickets,
  max(runs_scored) as best_score
from match_player_stats mps
join matches m on m.id = mps.match_id
group by player_name, to_char(m.played_at, 'YYYY-MM');
