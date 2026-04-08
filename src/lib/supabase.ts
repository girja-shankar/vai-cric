import { createClient } from '@supabase/supabase-js';
import { AppState } from '../types';

const supabaseUrl = "https://fjlqxctzoolpmyjnwmkk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqbHF4Y3R6b29scG15am53bWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDE5NjgsImV4cCI6MjA4OTIxNzk2OH0.yIQgsJBQcuRqlTmMf73N9_c6kIFP4PMKfBKIepI_SJQ";

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


// Generate a short match ID for sharing
export const generateMatchId = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Fetch a single live match state from DB
export const fetchLiveMatch = async (matchId: string): Promise<AppState | null> => {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from('live_matches').select('state').eq('id', matchId).single();
    return data?.state as AppState | null;
  } catch {
    return null;
  }
};

// Fetch all active live matches
export const fetchAllLiveMatches = async (): Promise<Array<{ id: string; state: AppState; updated_at: string }>> => {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('live_matches').select('id, state, updated_at').order('updated_at', { ascending: false });
    return (data || []) as Array<{ id: string; state: AppState; updated_at: string }>;
  } catch {
    return [];
  }
};

// Sync live match state to Supabase
export const syncLiveMatch = async (matchId: string, state: AppState) => {
  if (!supabase) return;
  const { past, ...stateWithoutPast } = state;
  try {
    await supabase.from('live_matches').upsert({
      id: matchId,
      state: stateWithoutPast,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Failed to sync live match:', e);
  }
};

// Remove live match when done
export const removeLiveMatch = async (matchId: string) => {
  if (!supabase) return;
  try {
    await supabase.from('live_matches').delete().eq('id', matchId);
  } catch (e) {
    console.warn('Failed to remove live match:', e);
  }
};

// Save completed match for stats
export const saveCompletedMatch = async (state: AppState) => {
  if (!supabase || !state.innings1 || !state.innings2) return;

  const team1 = state.teams.find(t => t.id === state.innings1!.battingTeamId)!;
  const team2 = state.teams.find(t => t.id === state.innings2!.battingTeamId)!;
  const inn1 = state.innings1;
  const inn2 = state.innings2;

  let winner: string | null = null;
  if (inn2.runs > inn1.runs) winner = team2.name;
  else if (inn1.runs > inn2.runs) winner = team1.name;
  else winner = 'tie';

  const { past, ...stateWithoutPast } = state;

  try {
    const { data: match, error } = await supabase.from('matches').insert({
      overs: state.overs,
      team1_name: team1.name,
      team2_name: team2.name,
      team1_score: inn1.runs,
      team1_wickets: inn1.wickets,
      team1_balls: inn1.balls,
      team2_score: inn2.runs,
      team2_wickets: inn2.wickets,
      team2_balls: inn2.balls,
      winner,
      full_state: stateWithoutPast,
    }).select('id').single();

    if (error || !match) return;

    // Save player stats
    const playerStats: Array<{
      match_id: string;
      player_name: string;
      team_name: string;
      runs_scored: number;
      balls_faced: number;
      fours: number;
      sixes: number;
      overs_bowled: number;
      runs_conceded: number;
      wickets_taken: number;
      wides: number;
      no_balls: number;
    }> = [];

    // Process both innings
    const processInnings = (innings: typeof inn1, battingTeamName: string, bowlingTeamName: string) => {
      const battingTeam = state.teams.find(t => t.id === innings.battingTeamId)!;
      const bowlingTeam = state.teams.find(t => t.id === innings.bowlingTeamId)!;

      battingTeam.players.forEach(p => {
        const stats = innings.batters[p.id];
        if (!stats || stats.balls === 0) return;
        // Check if player already has entry (common player)
        const existing = playerStats.find(ps => ps.player_name === p.name && ps.match_id === match.id);
        if (existing) {
          existing.runs_scored += stats.runs;
          existing.balls_faced += stats.balls;
          existing.fours += stats.fours;
          existing.sixes += stats.sixes;
        } else {
          playerStats.push({
            match_id: match.id,
            player_name: p.name,
            team_name: battingTeamName,
            runs_scored: stats.runs,
            balls_faced: stats.balls,
            fours: stats.fours,
            sixes: stats.sixes,
            overs_bowled: 0,
            runs_conceded: 0,
            wickets_taken: 0,
            wides: 0,
            no_balls: 0,
          });
        }
      });

      bowlingTeam.players.forEach(p => {
        const stats = innings.bowlers[p.id];
        if (!stats || stats.balls === 0) return;
        const overs = Math.floor(stats.balls / 6) + (stats.balls % 6) / 10;
        const existing = playerStats.find(ps => ps.player_name === p.name && ps.match_id === match.id);
        if (existing) {
          existing.overs_bowled += overs;
          existing.runs_conceded += stats.runs;
          existing.wickets_taken += stats.wickets;
          existing.wides += stats.wides;
          existing.no_balls += stats.noBalls;
        } else {
          playerStats.push({
            match_id: match.id,
            player_name: p.name,
            team_name: bowlingTeamName,
            runs_scored: 0,
            balls_faced: 0,
            fours: 0,
            sixes: 0,
            overs_bowled: overs,
            runs_conceded: stats.runs,
            wickets_taken: stats.wickets,
            wides: stats.wides,
            no_balls: stats.noBalls,
          });
        }
      });
    };

    processInnings(inn1, team1.name, team2.name);
    processInnings(inn2, team2.name, team1.name);

    if (playerStats.length > 0) {
      await supabase.from('match_player_stats').insert(playerStats);
    }
  } catch (e) {
    console.warn('Failed to save completed match:', e);
  }
};

// Subscribe to live match updates (for viewers)
export const subscribeLiveMatch = (
  matchId: string,
  onUpdate: (state: AppState) => void
) => {
  if (!supabase) return null;

  // Initial fetch
  supabase.from('live_matches').select('state').eq('id', matchId).single()
    .then(({ data }) => {
      if (data?.state) onUpdate(data.state as AppState);
    });

  // Real-time subscription
  const channel = supabase
    .channel(`live-match-${matchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'live_matches', filter: `id=eq.${matchId}` },
      (payload) => {
        if (payload.new && 'state' in payload.new) {
          onUpdate(payload.new.state as AppState);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Fetch stats
export const fetchPlayerStats = async () => {
  if (!supabase) return [];
  const { data } = await supabase.from('player_career_stats').select('*').order('total_runs', { ascending: false });
  return data || [];
};

export const fetchRecentMatches = async (limit = 20) => {
  if (!supabase) return [];
  const { data } = await supabase.from('matches').select('*').order('played_at', { ascending: false }).limit(limit);
  return data || [];
};

export const fetchMonthlyStats = async () => {
  if (!supabase) return [];
  const { data } = await supabase.from('monthly_player_stats').select('*').order('month', { ascending: false });
  return data || [];
};

export type TodayPlayerStat = {
  player_name: string;
  matches_played: number;
  runs_scored: number;
  highest_score: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  wickets_taken: number;
  runs_conceded: number;
  overs_bowled: number;
};

// Fetch all player stats for the most recent match day
export const fetchTodayPlayerStats = async (): Promise<{ date: string; players: TodayPlayerStat[] }> => {
  if (!supabase) return { date: '', players: [] };
  try {
    // Step 1: find today's match IDs, fall back to most recent day
    const today = new Date().toISOString().split('T')[0];
    const { data: todayMatches } = await supabase
      .from('matches').select('id, played_at')
      .gte('played_at', today)
      .order('played_at', { ascending: false }).limit(20);

    let targetDate = today;
    let matchIds: string[] = (todayMatches || []).map((m: any) => m.id);

    if (matchIds.length === 0) {
      const { data: recent } = await supabase
        .from('matches').select('id, played_at')
        .order('played_at', { ascending: false }).limit(20);
      if (!recent || recent.length === 0) return { date: '', players: [] };
      targetDate = (recent[0] as any).played_at.split('T')[0];
      matchIds = (recent as any[])
        .filter(m => m.played_at.startsWith(targetDate))
        .map(m => m.id);
    }

    if (matchIds.length === 0) return { date: targetDate, players: [] };

    // Step 2: fetch player stats for those match IDs
    const { data } = await supabase
      .from('match_player_stats')
      .select('player_name, runs_scored, balls_faced, fours, sixes, wickets_taken, runs_conceded, overs_bowled')
      .in('match_id', matchIds);

    if (!data || data.length === 0) return { date: targetDate, players: [] };

    // Aggregate per player (they may have played multiple matches that day)
    const byPlayer: Record<string, TodayPlayerStat> = {};
    (data as any[]).forEach(row => {
      const name = row.player_name;
      if (!byPlayer[name]) {
        byPlayer[name] = { player_name: name, matches_played: 0, runs_scored: 0, highest_score: 0, balls_faced: 0, fours: 0, sixes: 0, wickets_taken: 0, runs_conceded: 0, overs_bowled: 0 };
      }
      const runs = row.runs_scored ?? 0;
      byPlayer[name].matches_played += 1;
      byPlayer[name].runs_scored += runs;
      byPlayer[name].highest_score = Math.max(byPlayer[name].highest_score, runs);
      byPlayer[name].balls_faced += row.balls_faced ?? 0;
      byPlayer[name].fours += row.fours ?? 0;
      byPlayer[name].sixes += row.sixes ?? 0;
      byPlayer[name].wickets_taken += row.wickets_taken ?? 0;
      byPlayer[name].runs_conceded += row.runs_conceded ?? 0;
      byPlayer[name].overs_bowled += row.overs_bowled ?? 0;
    });

    return { date: targetDate, players: Object.values(byPlayer) };
  } catch {
    return { date: '', players: [] };
  }
};

// --- Player Registry ---
export type RegisteredPlayer = {
  id: string;
  name: string;
  created_at?: string;
};

export const fetchRegisteredPlayers = async (): Promise<RegisteredPlayer[]> => {
  if (!supabase) return [];
  const { data } = await supabase.from('registered_players').select('*').order('name');
  return data || [];
};

export const addRegisteredPlayer = async (name: string): Promise<RegisteredPlayer | null> => {
  const trimmed = name.trim();
  if (!trimmed || !supabase) return null;

  const { data, error } = await supabase.from('registered_players').insert({ name: trimmed }).select().single();
  if (data) return data;
  if (error) console.warn('Failed to add player:', error);
  return null;
};

export const deleteRegisteredPlayer = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('registered_players').delete().eq('id', id);
  return !error;
};

// --- Tournaments ---
export type Tournament = {
  id: string;
  name: string;
  status: 'active' | 'completed';
  created_at: string;
};

export type TournamentTeam = {
  id: string;
  tournament_id: string;
  team_name: string;
};

export type TournamentMatch = {
  id: string;
  tournament_id: string;
  team1: string;
  team2: string;
  team1_score: number;
  team1_wickets: number;
  team1_overs: number;
  team2_score: number;
  team2_wickets: number;
  team2_overs: number;
  winner: string | null;
  played_at: string;
};

export const fetchTournaments = async (): Promise<Tournament[]> => {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
    return data || [];
  } catch { return []; }
};

export const createTournament = async (name: string, teams: string[]): Promise<Tournament | null> => {
  if (!supabase) return null;
  const { data: t } = await supabase.from('tournaments').insert({ name }).select().single();
  if (!t) return null;
  await supabase.from('tournament_teams').insert(teams.map(team_name => ({ tournament_id: t.id, team_name })));
  return t;
};

export const fetchTournamentTeams = async (id: string): Promise<TournamentTeam[]> => {
  if (!supabase) return [];
  const { data } = await supabase.from('tournament_teams').select('*').eq('tournament_id', id).order('team_name');
  return data || [];
};

export const fetchTournamentMatches = async (id: string): Promise<TournamentMatch[]> => {
  if (!supabase) return [];
  const { data } = await supabase.from('tournament_matches').select('*').eq('tournament_id', id).order('played_at', { ascending: false });
  return data || [];
};

export const addTournamentMatch = async (match: Omit<TournamentMatch, 'id' | 'played_at'>): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('tournament_matches').insert(match);
  return !error;
};

export const deleteMatch = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  await supabase.from('match_player_stats').delete().eq('match_id', id);
  const { error } = await supabase.from('matches').delete().eq('id', id);
  return !error;
};

export const deleteTournamentMatch = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('tournament_matches').delete().eq('id', id);
  return !error;
};

export const deleteTournament = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  await supabase.from('tournament_matches').delete().eq('tournament_id', id);
  await supabase.from('tournament_teams').delete().eq('tournament_id', id);
  const { error } = await supabase.from('tournaments').delete().eq('id', id);
  return !error;
};

export const updateTournamentStatus = async (id: string, status: 'active' | 'completed'): Promise<void> => {
  if (!supabase) return;
  await supabase.from('tournaments').update({ status }).eq('id', id);
};

// --- Global Teams ---
export type GlobalTeam = {
  id: string;
  name: string;
  player_names: string[];
  captain_name: string | null;
  created_at: string;
};

export const fetchGlobalTeams = async (): Promise<GlobalTeam[]> => {
  if (!supabase) return [];
  const { data } = await supabase.from('global_teams').select('*').order('name');
  return data || [];
};

export const createGlobalTeam = async (name: string, playerNames: string[], captainName: string | null): Promise<GlobalTeam | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from('global_teams').insert({ name, player_names: playerNames, captain_name: captainName }).select().single();
  if (error) console.warn('Failed to create global team:', error);
  return data || null;
};

export const updateGlobalTeam = async (id: string, playerNames: string[], captainName: string | null): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('global_teams').update({ player_names: playerNames, captain_name: captainName }).eq('id', id);
  return !error;
};

export const deleteGlobalTeam = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('global_teams').delete().eq('id', id);
  return !error;
};

// --- Admin Auth ---
export const signIn = async (email: string, password: string) => {
  if (!supabase) return { error: 'No client' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error: error?.message ?? null };
};

export const signOut = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

export const onAuthStateChange = (cb: (isLoggedIn: boolean) => void) => {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(!!session?.user);
  });
  return () => subscription.unsubscribe();
};

// Convert balls to overs in decimal form (e.g. 47 balls → 7.5)
const ballsToOvers = (balls: number, maxOvers: number): number => {
  if (!balls) return maxOvers;
  const full = Math.floor(balls / 6);
  const rem = balls % 6;
  return parseFloat(`${full}.${rem}`);
};

export const migratePastMatchesToTournament = async (tournamentName: string): Promise<Tournament | null> => {
  if (!supabase) return null;

  // Fetch all completed matches including full_state for actual overs
  const { data: matches } = await supabase
    .from('matches')
    .select('id, team1_name, team2_name, team1_score, team1_wickets, team2_score, team2_wickets, winner, overs, played_at, full_state')
    .order('played_at', { ascending: true });

  if (!matches || matches.length === 0) return null;

  // Collect unique team names
  const teamSet = new Set<string>();
  (matches as any[]).forEach(m => { teamSet.add(m.team1_name); teamSet.add(m.team2_name); });

  // Create tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .insert({ name: tournamentName })
    .select().single();
  if (!tournament) return null;

  // Add teams
  await supabase.from('tournament_teams').insert(
    Array.from(teamSet).map(team_name => ({ tournament_id: tournament.id, team_name }))
  );

  // Add matches — extract actual overs from full_state.innings1/2.balls
  const rows = (matches as any[]).map(m => {
    const s = m.full_state;
    const t1Overs = ballsToOvers(s?.innings1?.balls, m.overs);
    const t2Overs = ballsToOvers(s?.innings2?.balls, m.overs);
    return {
      tournament_id: tournament.id,
      team1: m.team1_name,
      team2: m.team2_name,
      team1_score: m.team1_score ?? 0,
      team1_wickets: m.team1_wickets ?? 0,
      team1_overs: t1Overs,
      team2_score: m.team2_score ?? 0,
      team2_wickets: m.team2_wickets ?? 0,
      team2_overs: t2Overs,
      winner: m.winner ?? null,
      played_at: m.played_at,
    };
  });

  await supabase.from('tournament_matches').insert(rows);
  return tournament;
};
