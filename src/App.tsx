/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import { initialState, reducer } from './store';
import { Player } from './types';
import HomeScreen from './components/HomeScreen';
import SetupScreen from './components/SetupScreen';
import TossScreen from './components/TossScreen';
import InningsSetup from './components/InningsSetup';
import ScoringScreen from './components/ScoringScreen';
import ResultScreen from './components/ResultScreen';
import MatchHistory from './components/MatchHistory';
import StatsScreen from './components/StatsScreen';
import PlayerRegistry from './components/PlayerRegistry';
import LiveView from './components/LiveView';
import TournamentListScreen from './components/TournamentListScreen';
import TournamentDetailScreen from './components/TournamentDetailScreen';
import { Tournament } from './lib/supabase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase, generateMatchId, syncLiveMatch, removeLiveMatch, saveCompletedMatch, fetchLiveMatch, addTournamentMatch, onAuthStateChange } from './lib/supabase';

type Page = 'home' | 'match' | 'history' | 'stats' | 'players' | 'tournaments' | 'tournament-detail';

type Squad = { players: Player[]; captainId: string | null };

// Parse hash route
function parseHash(hash: string): { mode: 'live' | 'match' | null; matchId: string | null } {
  const liveMatch = hash.match(/#\/live\/([A-Z0-9]+)/i);
  if (liveMatch) return { mode: 'live', matchId: liveMatch[1].toUpperCase() };
  const umpireMatch = hash.match(/#\/match\/([A-Z0-9]+)/i);
  if (umpireMatch) return { mode: 'match', matchId: umpireMatch[1].toUpperCase() };
  return { mode: null, matchId: null };
}

function MainApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [page, setPage] = useState<Page>('home');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [tournamentMatchContext, setTournamentMatchContext] = useState<{ tournamentId: string; team1: string; team2: string; prevSquad1?: Squad | null; prevSquad2?: Squad | null; autoTossTeam?: string | null } | null>(null);

  useEffect(() => {
    return onAuthStateChange(setIsAdmin);
  }, []);

  const prevMatchState = useRef(state.matchState);

  // On mount, check if URL has #/match/ID and restore from DB
  useEffect(() => {
    const { mode, matchId: urlMatchId } = parseHash(window.location.hash);
    if (mode === 'match' && urlMatchId) {
      fetchLiveMatch(urlMatchId).then(restoredState => {
        if (restoredState && restoredState.matchState !== 'setup') {
          dispatch({ type: 'RESTORE_STATE', state: { ...restoredState, past: [] } });
          setMatchId(urlMatchId);
          setPage('match');
        } else {
          // Match not found or already in setup, clear hash
          window.location.hash = '';
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Sync to Supabase on every state change
  useEffect(() => {
    if (!supabase || loading) return;

    if (state.matchState !== 'setup') {
      // Ensure we have a match ID
      let currentMatchId = matchId;
      if (!currentMatchId) {
        currentMatchId = generateMatchId();
        setMatchId(currentMatchId);
        window.location.hash = `#/match/${currentMatchId}`;
      }
      syncLiveMatch(currentMatchId, state);
    }

    // Save completed match when reaching result
    if (state.matchState === 'result' && prevMatchState.current !== 'result') {
      saveCompletedMatch(state);
      if (tournamentMatchContext && state.innings1 && state.innings2) {
        const inn1 = state.innings1, inn2 = state.innings2;
        const t1Team = state.teams.find(t => t.id === inn1.battingTeamId)!;
        const t2Team = state.teams.find(t => t.id === inn2.battingTeamId)!;
        const toOvers = (balls: number) => Math.floor(balls / 6) + (balls % 6) / 10;
        const t1First = t1Team.name === tournamentMatchContext.team1;
        const winner = inn2.runs > inn1.runs ? t2Team.name : inn1.runs > inn2.runs ? t1Team.name : 'tie';
        addTournamentMatch({
          tournament_id: tournamentMatchContext.tournamentId,
          team1: tournamentMatchContext.team1,
          team2: tournamentMatchContext.team2,
          team1_score: t1First ? inn1.runs : inn2.runs,
          team1_wickets: t1First ? inn1.wickets : inn2.wickets,
          team1_overs: t1First ? toOvers(inn1.balls) : toOvers(inn2.balls),
          team2_score: t1First ? inn2.runs : inn1.runs,
          team2_wickets: t1First ? inn2.wickets : inn1.wickets,
          team2_overs: t1First ? toOvers(inn2.balls) : toOvers(inn1.balls),
          winner,
        });

        // Save squads for carry-forward in next tournament match
        const { tournamentId, team1: t1Name, team2: t2Name } = tournamentMatchContext;
        const teamA = state.teams.find(t => t.name === t1Name);
        const teamB = state.teams.find(t => t.name === t2Name);
        if (teamA) localStorage.setItem(`squad_${tournamentId}_${t1Name}`, JSON.stringify({ players: teamA.players, captainId: teamA.captainId ?? null }));
        if (teamB) localStorage.setItem(`squad_${tournamentId}_${t2Name}`, JSON.stringify({ players: teamB.players, captainId: teamB.captainId ?? null }));
      }
    }

    // Clean up live match on reset
    if (state.matchState === 'setup' && prevMatchState.current !== 'setup') {
      if (matchId) {
        removeLiveMatch(matchId);
        setMatchId(null);
        window.location.hash = '';
      }
    }

    prevMatchState.current = state.matchState;
  }, [state, loading, matchId]);

  // Auto-toss: when tournament context has a winner-bats-first team, skip the toss screen.
  // Clear autoTossTeam after firing so pressing back shows the normal toss screen.
  useEffect(() => {
    if (state.matchState !== 'toss' || !tournamentMatchContext?.autoTossTeam) return;
    const autoTeam = state.teams.find(t => t.name === tournamentMatchContext.autoTossTeam);
    if (autoTeam) {
      dispatch({ type: 'RECORD_TOSS', wonBy: autoTeam.id, electedTo: 'bat' });
      setTournamentMatchContext(prev => prev ? { ...prev, autoTossTeam: null } : null);
    }
  }, [state.matchState]);

  // Push a dummy history entry whenever we navigate away from home,
  // so the mobile back button is interceptable instead of closing the app.
  useEffect(() => {
    if (page !== 'home' || state.matchState !== 'setup') {
      history.pushState({ appNav: true }, '');
    }
  }, [page, state.matchState]);

  // Handle mobile back button — map to the correct in-app back action.
  useEffect(() => {
    const onPopState = () => {
      // Immediately push another entry so back is always interceptable.
      history.pushState({ appNav: true }, '');

      if (page === 'match') {
        if (['innings1', 'innings2'].includes(state.matchState)) return; // ignore during active play
        dispatch({ type: 'GO_BACK' });
      } else if (page === 'tournament-detail') {
        setPage('tournaments');
      } else if (page !== 'home') {
        setPage('home');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [page, state.matchState]);

  // When match resets (from result/scoring via quit), go back to home or tournament
  const intentionalSetup = useRef(false);
  useEffect(() => {
    if (state.matchState === 'setup' && page === 'match' && !intentionalSetup.current) {
      if (tournamentMatchContext) {
        setPage('tournament-detail');
        setTournamentMatchContext(null);
      } else {
        setPage('home');
      }
    }
    intentionalSetup.current = false;
  }, [state.matchState, page, tournamentMatchContext]);

  const handleNewMatch = useCallback(() => {
    intentionalSetup.current = true;
    if (matchId) {
      removeLiveMatch(matchId);
    }
    setMatchId(null);
    window.location.hash = '';
    dispatch({ type: 'RESET_MATCH' });
    setPage('match');
  }, [matchId]);

  const handleStartTournamentMatch = useCallback((tournament: Tournament, team1: string, team2: string, autoTossTeam?: string) => {
    const loadSquad = (teamName: string): Squad | null => {
      const raw = localStorage.getItem(`squad_${tournament.id}_${teamName}`);
      if (!raw) return null;
      try { return JSON.parse(raw) as Squad; } catch { return null; }
    };
    setTournamentMatchContext({ tournamentId: tournament.id, team1, team2, prevSquad1: loadSquad(team1), prevSquad2: loadSquad(team2), autoTossTeam: autoTossTeam ?? null });
    intentionalSetup.current = true;
    if (matchId) removeLiveMatch(matchId);
    setMatchId(null);
    window.location.hash = '';
    dispatch({ type: 'RESET_MATCH' });
    setPage('match');
  }, [matchId]);

  const handleResumeMatch = useCallback((id: string) => {
    fetchLiveMatch(id).then(restoredState => {
      if (restoredState && restoredState.matchState !== 'setup') {
        dispatch({ type: 'RESTORE_STATE', state: { ...restoredState, past: [] } });
        setMatchId(id);
        window.location.hash = `#/match/${id}`;
        setPage('match');
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-slate-500 text-sm">Loading match...</p>
      </div>
    );
  }

  if (page === 'home') {
    return (
      <HomeScreen
        onNewMatch={handleNewMatch}
        onHistory={() => setPage('history')}
        onStats={() => setPage('stats')}
        onPlayers={() => setPage('players')}
        onTournaments={() => setPage('tournaments')}
        hasActiveMatch={state.matchState !== 'setup'}
        onResumeMatch={() => setPage('match')}
        onResumeMatchById={handleResumeMatch}
        currentMatchId={matchId}
        isAdmin={isAdmin}
        onAdminChange={setIsAdmin}
      />
    );
  }

  if (page === 'history') {
    return <MatchHistory onBack={() => setPage('home')} isAdmin={isAdmin} />;
  }

  if (page === 'stats') {
    return <StatsScreen onBack={() => setPage('home')} />;
  }

  if (page === 'players') {
    return <PlayerRegistry onBack={() => setPage('home')} />;
  }

  if (page === 'tournaments') {
    return (
      <TournamentListScreen
        onBack={() => setPage('home')}
        onOpen={t => { setActiveTournament(t); setPage('tournament-detail'); }}
        isAdmin={isAdmin}
      />
    );
  }

  if (page === 'tournament-detail' && activeTournament) {
    return (
      <TournamentDetailScreen
        tournament={activeTournament}
        onBack={() => setPage('tournaments')}
        onStartMatch={(team1, team2, autoTossTeam) => handleStartTournamentMatch(activeTournament, team1, team2, autoTossTeam)}
        isAdmin={isAdmin}
      />
    );
  }

  // Match flow
  const renderScreen = () => {
    switch (state.matchState) {
      case 'setup': {
        // If we came back from toss (teams already set), restore them; otherwise use tournament prev squad
        const backSquad1 = state.teams[0] ? { players: state.teams[0].players, captainId: state.teams[0].captainId ?? null } : null;
        const backSquad2 = state.teams[1] ? { players: state.teams[1].players, captainId: state.teams[1].captainId ?? null } : null;
        return <SetupScreen dispatch={dispatch} onBack={() => {
          if (tournamentMatchContext) { setPage('tournament-detail'); setTournamentMatchContext(null); }
          else setPage('home');
        }}
          defaultTeam1={state.teams[0]?.name ?? tournamentMatchContext?.team1}
          defaultTeam2={state.teams[1]?.name ?? tournamentMatchContext?.team2}
          defaultTeam1Squad={backSquad1 ?? tournamentMatchContext?.prevSquad1}
          defaultTeam2Squad={backSquad2 ?? tournamentMatchContext?.prevSquad2}
        />;
      }
      case 'toss':
        return <TossScreen state={state} dispatch={dispatch} />;
      case 'innings1_setup':
      case 'innings2_setup':
        return <InningsSetup state={state} dispatch={dispatch} />;
      case 'innings1':
      case 'innings2':
        return <ScoringScreen state={state} dispatch={dispatch} matchId={matchId} />;
      case 'result':
        return <ResultScreen state={state} dispatch={dispatch} />;
      default:
        return <div>Unknown State</div>;
    }
  };

  return <>{renderScreen()}</>;
}

export default function App() {
  // Simple hash-based routing for live view
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const { mode, matchId } = parseHash(hash);

  if (mode === 'live' && matchId) {
    return (
      <ErrorBoundary>
        <div className="fixed inset-0 bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 overflow-hidden flex justify-center items-center">
          <div className="w-full max-w-md bg-white h-full max-h-[100dvh] shadow-xl overflow-hidden flex flex-col relative">
            <LiveView matchId={matchId} />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 overflow-hidden flex justify-center items-center">
        <div className="w-full max-w-md bg-white h-full max-h-[100dvh] shadow-xl overflow-hidden flex flex-col relative">
          <MainApp />
        </div>
      </div>
    </ErrorBoundary>
  );
}
