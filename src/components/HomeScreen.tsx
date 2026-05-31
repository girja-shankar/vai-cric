import React, { useEffect, useState } from 'react';
import { Plus, History, BarChart3, Trophy, ChevronRight, Wifi, Users, Eye, Radio, Lock, Shield, Play } from 'lucide-react';
import { supabase, fetchRecentMatches, fetchAllLiveMatches } from '../lib/supabase';
import { AppState } from '../types';
import AdminLoginModal from './AdminLoginModal';

type Props = {
  onNewMatch: () => void;
  onHistory: () => void;
  onStats: () => void;
  onPlayers: () => void;
  onTournaments: () => void;
  onNewTournament: () => void;
  onTeams: () => void;
  hasActiveMatch: boolean;
  onResumeMatch: () => void;
  onResumeMatchById: (id: string) => void;
  currentMatchId: string | null;
  isAdmin: boolean;
  onAdminChange: (v: boolean) => void;
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

export default function HomeScreen({ onNewMatch, onHistory, onStats, onPlayers, onTournaments, onNewTournament, onTeams, hasActiveMatch, onResumeMatch, onResumeMatchById, currentMatchId, isAdmin, onAdminChange }: Props) {
  const [recentMatches, setRecentMatches] = useState<MatchRow[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdminModal, setShowAdminModal] = useState(false);

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
      case 'innings1': return '1st Inn';
      case 'innings2_setup': return 'Break';
      case 'innings2': return '2nd Inn';
      case 'result': return 'Completed';
      default: return 'Setup';
    }
  };

  const getMatchStateDot = (matchState: string) => {
    if (matchState === 'result') return 'bg-slate-400';
    return 'bg-emerald-500 animate-pulse';
  };

  const navItems = [
    { label: 'Players', sub: 'Roster', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', action: onPlayers },
    { label: 'History', sub: 'Past matches', icon: History, color: 'text-blue-600', bg: 'bg-blue-50', action: onHistory },
    { label: 'Analytics', sub: 'Stats', icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50', action: onStats },
    { label: 'Tournaments', sub: 'Points', icon: Trophy, color: 'text-indigo-600', bg: 'bg-indigo-50', action: onTournaments },
    { label: 'Teams', sub: 'Squads', icon: Shield, color: 'text-rose-600', bg: 'bg-rose-50', action: onTeams },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-100 min-h-0">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-5 pt-5 pb-8 shrink-0 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">VAI Cricket</h1>
              <p className="text-indigo-300 text-[10px] font-medium mt-0.5">Score Calculator & Stats</p>
            </div>
          </div>
          <button onClick={() => setShowAdminModal(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Lock className={`w-4 h-4 ${isAdmin ? 'text-amber-300' : 'text-indigo-300'}`} />
          </button>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onNewTournament}
            className="flex-1 bg-white text-indigo-700 rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-[0.97] transition-all"
          >
            <Trophy className="w-4 h-4" /> New Tournament
          </button>
          {hasActiveMatch && (
            <button
              onClick={onResumeMatch}
              className="flex-1 bg-emerald-500 text-white rounded-2xl py-3 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-[0.97] transition-all"
            >
              <Play className="w-4 h-4 fill-white" /> Resume
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto min-h-0 px-4 pt-4 pb-6 flex flex-col gap-3">

        {/* Live Matches */}
        {liveMatches.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <Radio className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-bold text-sm text-slate-800">Live Matches</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </div>
            <div className="divide-y divide-slate-50">
              {liveMatches.map(m => {
                const summary = getLiveMatchSummary(m.state);
                if (!summary) return null;
                const isCurrentMatch = m.id === currentMatchId;
                return (
                  <div key={m.id} onClick={() => { window.location.hash = `#/live/${m.id}`; }} className="px-4 py-3 cursor-pointer active:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                          {summary.team1Name}
                          <span className="text-slate-300 font-normal text-xs">vs</span>
                          {summary.team2Name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm font-black font-mono text-indigo-600">{summary.score}</span>
                          <span className="text-xs text-slate-400">({summary.overs} ov)</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${getMatchStateDot(summary.matchState)}`} />
                          <span className="text-[10px] text-slate-500 font-medium">{getMatchStateLabel(summary.matchState)}</span>
                        </div>
                      </div>
                      <Eye className="w-4 h-4 text-indigo-300 shrink-0" />
                    </div>
                    {isAdmin && (
                      <div className="mt-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={isCurrentMatch ? onResumeMatch : () => onResumeMatchById(m.id)}
                          className="w-full py-1.5 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1"
                        >
                          <Wifi className="w-3 h-3" /> {isCurrentMatch ? 'Resume Scoring' : 'Resume as Umpire'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Nav Grid */}
        <div className="grid grid-cols-3 gap-2">
          {navItems.slice(0, 3).map(({ label, sub, icon: Icon, color, bg, action }) => (
            <button key={label} onClick={action} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-left active:scale-[0.97] transition-all flex flex-col gap-2">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 leading-none">{label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {navItems.slice(3).map(({ label, sub, icon: Icon, color, bg, action }) => (
            <button key={label} onClick={action} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 text-left active:scale-[0.97] transition-all flex items-center gap-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 leading-none">{label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>

      {showAdminModal && (
        <AdminLoginModal isAdmin={isAdmin} onClose={() => setShowAdminModal(false)} onAuthChange={onAdminChange} />
      )}
    </div>
  );
}
