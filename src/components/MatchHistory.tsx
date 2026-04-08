import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trophy, Calendar, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { fetchRecentMatches, deleteMatch, supabase } from '../lib/supabase';

type MatchRow = {
  id: string;
  played_at: string;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team1_wickets: number;
  team1_balls: number;
  team2_score: number;
  team2_wickets: number;
  team2_balls: number;
  winner: string | null;
  overs: number;
  full_state: any;
};

type PlayerStatRow = {
  player_name: string;
  team_name: string;
  runs_scored: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  wickets_taken: number;
  runs_conceded: number;
  overs_bowled: number;
};

export default function MatchHistory({ onBack, isAdmin }: { onBack: () => void; isAdmin?: boolean }) {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [matchStats, setMatchStats] = useState<Record<string, PlayerStatRow[]>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchRecentMatches(50);
      setMatches(data as MatchRow[]);
      setLoading(false);
    })();
  }, []);

  const toggleExpand = async (matchId: string) => {
    if (expandedId === matchId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(matchId);
    if (!matchStats[matchId] && supabase) {
      const { data } = await supabase.from('match_player_stats').select('*').eq('match_id', matchId);
      if (data) {
        setMatchStats(prev => ({ ...prev, [matchId]: data as PlayerStatRow[] }));
      }
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteMatch(id);
    setMatches(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);
  };

  const formatOvers = (balls: number) => (Math.floor(balls / 6) + (balls % 6) / 10).toFixed(1);

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0">
      <div className="bg-indigo-600 text-white p-4 shadow-md shrink-0 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Match History</h1>
          <p className="text-indigo-200 text-xs">{matches.length} matches played</p>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Trophy className="w-12 h-12 text-slate-200" />
            <p className="text-slate-400 text-sm">No matches yet</p>
          </div>
        ) : (
          matches.map(m => {
            const isExpanded = expandedId === m.id;
            const stats = matchStats[m.id];
            const date = new Date(m.played_at);

            return (
              <div key={m.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <button
                  onClick={() => toggleExpand(m.id)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="text-slate-300">•</span>
                      <span>{m.overs} overs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(m.id); }}
                          disabled={deletingId === m.id}
                          className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          {deletingId === m.id
                            ? <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${m.winner === m.team1_name ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {m.team1_name}
                        </span>
                        {m.winner === m.team1_name && <Trophy className="w-3 h-3 text-amber-500" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${m.winner === m.team2_name ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {m.team2_name}
                        </span>
                        {m.winner === m.team2_name && <Trophy className="w-3 h-3 text-amber-500" />}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-slate-800">
                        {m.team1_score}/{m.team1_wickets}
                        <span className="text-[10px] text-slate-400 ml-1">({formatOvers(m.team1_balls)})</span>
                      </div>
                      <div className="text-sm font-mono font-bold text-slate-800">
                        {m.team2_score}/{m.team2_wickets}
                        <span className="text-[10px] text-slate-400 ml-1">({formatOvers(m.team2_balls)})</span>
                      </div>
                    </div>
                  </div>

                  {m.winner && (
                    <p className={`text-[10px] font-semibold mt-1.5 ${m.winner === 'tie' ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {m.winner === 'tie' ? 'Match Tied' : `${m.winner} won`}
                    </p>
                  )}
                </button>

                {/* Expanded Stats */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-3 bg-slate-50">
                    {!stats ? (
                      <div className="flex justify-center py-3">
                        <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Batting */}
                        <div>
                          <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Batting</h4>
                          <div className="space-y-1">
                            {stats.filter(s => s.balls_faced > 0).sort((a, b) => b.runs_scored - a.runs_scored).map((s, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-semibold text-slate-700">{s.player_name}</span>
                                  <span className="text-slate-400 ml-1">({s.team_name})</span>
                                </div>
                                <div className="font-mono">
                                  <span className="font-bold">{s.runs_scored}</span>
                                  <span className="text-slate-400">({s.balls_faced})</span>
                                  {s.fours > 0 && <span className="text-emerald-600 ml-1">{s.fours}x4</span>}
                                  {s.sixes > 0 && <span className="text-indigo-600 ml-1">{s.sixes}x6</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bowling */}
                        <div>
                          <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bowling</h4>
                          <div className="space-y-1">
                            {stats.filter(s => s.overs_bowled > 0).sort((a, b) => b.wickets_taken - a.wickets_taken).map((s, i) => (
                              <div key={i} className="flex justify-between items-center text-xs">
                                <div>
                                  <span className="font-semibold text-slate-700">{s.player_name}</span>
                                  <span className="text-slate-400 ml-1">({s.team_name})</span>
                                </div>
                                <div className="font-mono">
                                  <span className="font-bold text-rose-600">{s.wickets_taken}/{s.runs_conceded}</span>
                                  <span className="text-slate-400 ml-1">({s.overs_bowled}ov)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
