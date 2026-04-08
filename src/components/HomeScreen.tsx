import React, { useEffect, useState } from 'react';
import { Plus, History, BarChart3, Trophy, ChevronRight, Wifi, Users, Eye, Radio } from 'lucide-react';
import { supabase, fetchRecentMatches, fetchAllLiveMatches } from '../lib/supabase';
import { AppState } from '../types';

type Props = {
  onNewMatch: () => void;
  onHistory: () => void;
  onStats: () => void;
  onPlayers: () => void;
  onTournaments: () => void;
  hasActiveMatch: boolean;
  onResumeMatch: () => void;
  onResumeMatchById: (id: string) => void;
  currentMatchId: string | null;
};

type MatchRow = {
  id: string;
  played_at: string;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team1_wickets: number;
  team2_score: number;
  team2_wickets: number;
  winner: string | null;
  overs: number;
};

type LiveMatchRow = {
  id: string;
  state: AppState;
  updated_at: string;
};

export default function HomeScreen({ onNewMatch, onHistory, onStats, onPlayers, onTournaments, hasActiveMatch, onResumeMatch, onResumeMatchById, currentMatchId }: Props) {
  const [recentMatches, setRecentMatches] = useState<MatchRow[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (supabase) {
        const [matches, live] = await Promise.all([
          fetchRecentMatches(5),
          fetchAllLiveMatches(),
        ]);
        setRecentMatches(matches as MatchRow[]);
        setLiveMatches(live);
      }
      setLoading(false);
    })();
  }, []);

  const getLiveMatchSummary = (state: AppState) => {
    if (!state.teams || state.teams.length < 2) return null;
    const team1 = state.teams[0];
    const team2 = state.teams[1];
    const innings = state.matchState === 'innings2' || state.matchState === 'innings2_setup'
      ? state.innings2 : state.innings1;
    return {
      team1Name: team1.name,
      team2Name: team2.name,
      score: innings ? `${innings.runs}/${innings.wickets}` : '-',
      overs: innings ? (Math.floor(innings.balls / 6) + (innings.balls % 6) / 10).toFixed(1) : '0.0',
      battingTeam: innings ? state.teams.find(t => t.id === innings.battingTeamId)?.name : null,
      matchState: state.matchState,
    };
  };

  const getMatchStateLabel = (matchState: string) => {
    switch (matchState) {
      case 'toss': return 'Toss';
      case 'innings1_setup': return 'Setting up';
      case 'innings1': return '1st Innings';
      case 'innings2_setup': return 'Innings Break';
      case 'innings2': return '2nd Innings';
      case 'result': return 'Completed';
      default: return 'Setup';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0">
      {/* Hero Header */}
      <div className="bg-indigo-600 text-white p-5 pb-10 rounded-b-[40px] shadow-lg relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-white to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Trophy className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">VAI Cricket</h1>
              <p className="text-indigo-200 text-xs font-medium">Score Calculator & Stats</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={onNewMatch}
              className="flex-1 bg-white text-indigo-700 rounded-2xl py-3.5 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 active:scale-[0.97] transition-all"
            >
              <Plus className="w-5 h-5" /> New Match
            </button>
            {hasActiveMatch && (
              <button
                onClick={onResumeMatch}
                className="flex-1 bg-emerald-500 text-white rounded-2xl py-3.5 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-[0.97] transition-all"
              >
                <Wifi className="w-5 h-5" /> Resume
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow p-4 -mt-5 flex flex-col gap-3 overflow-y-auto min-h-0">
        {/* Navigation Cards */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onPlayers}
            className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-left active:scale-[0.97] transition-all hover:shadow-md"
          >
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center mb-2">
              <Users className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-xs text-slate-800">Players</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Manage roster</p>
          </button>

          <button
            onClick={onHistory}
            className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-left active:scale-[0.97] transition-all hover:shadow-md"
          >
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-2">
              <History className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <h3 className="font-bold text-xs text-slate-800">History</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Past matches</p>
          </button>

          <button
            onClick={onStats}
            className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-left active:scale-[0.97] transition-all hover:shadow-md"
          >
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center mb-2">
              <BarChart3 className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <h3 className="font-bold text-xs text-slate-800">Analytics</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Stats & records</p>
          </button>

          <button
            onClick={onTournaments}
            className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-left active:scale-[0.97] transition-all hover:shadow-md"
          >
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center mb-2">
              <Trophy className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-xs text-slate-800">Tournaments</h3>
            <p className="text-[9px] text-slate-400 mt-0.5">Points & NRR</p>
          </button>
        </div>

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 p-3 pb-2">
              <Radio className="w-3.5 h-3.5 text-rose-500" />
              <h3 className="font-bold text-sm text-slate-800">Live Matches</h3>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </div>

            <div className="divide-y divide-slate-50">
              {liveMatches.map(m => {
                const summary = getLiveMatchSummary(m.state);
                if (!summary) return null;
                const isCurrentMatch = m.id === currentMatchId;
                return (
                  <div key={m.id} className="px-3 py-2.5">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-slate-700">{summary.team1Name}</span>
                          <span className="text-slate-400">vs</span>
                          <span className="font-bold text-slate-700">{summary.team2Name}</span>
                        </div>
                        {summary.battingTeam && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono font-bold text-indigo-600">{summary.score}</span>
                            <span className="text-[10px] text-slate-400">({summary.overs} ov)</span>
                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">
                              {getMatchStateLabel(summary.matchState)}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-300 shrink-0">#{m.id}</span>
                    </div>
                    <div className="flex gap-2">
                      {isCurrentMatch ? (
                        <button
                          onClick={onResumeMatch}
                          className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                          <Wifi className="w-3 h-3" /> Resume Scoring
                        </button>
                      ) : (
                        <button
                          onClick={() => onResumeMatchById(m.id)}
                          className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-colors"
                        >
                          <Wifi className="w-3 h-3" /> Resume as Umpire
                        </button>
                      )}
                      <button
                        onClick={() => { window.location.hash = `#/live/${m.id}`; }}
                        className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View Live
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Matches */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-3 pb-2">
            <h3 className="font-bold text-sm text-slate-800">Recent Matches</h3>
            {recentMatches.length > 0 && (
              <button onClick={onHistory} className="text-xs text-indigo-600 font-semibold flex items-center gap-0.5">
                View All <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="p-6 text-center">
              <Trophy className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-xs">No matches played yet</p>
              <p className="text-slate-300 text-[10px] mt-0.5">Start a new match to see results here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentMatches.map(m => (
                <div key={m.id} className="px-3 py-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-bold ${m.winner === m.team1_name ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {m.team1_name}
                        </span>
                        <span className="font-mono text-slate-500">{m.team1_score}/{m.team1_wickets}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className={`font-bold ${m.winner === m.team2_name ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {m.team2_name}
                        </span>
                        <span className="font-mono text-slate-500">{m.team2_score}/{m.team2_wickets}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-[9px] text-slate-400">
                        {new Date(m.played_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-[9px] text-slate-300">{m.overs} ov</div>
                    </div>
                  </div>
                  {m.winner && m.winner !== 'tie' && (
                    <p className="text-[9px] text-emerald-600 font-medium mt-0.5">{m.winner} won</p>
                  )}
                  {m.winner === 'tie' && (
                    <p className="text-[9px] text-amber-600 font-medium mt-0.5">Match Tied</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
