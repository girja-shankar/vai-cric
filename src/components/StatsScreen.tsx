import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trophy, Target, Flame, TrendingUp, Award, Calendar } from 'lucide-react';
import { fetchPlayerStats, fetchMonthlyStats, fetchTodayPlayerStats, supabase, TodayPlayerStat } from '../lib/supabase';

type CareerStat = {
  player_name: string;
  matches_played: number;
  total_runs: number;
  total_balls_faced: number;
  total_fours: number;
  total_sixes: number;
  highest_score: number;
  strike_rate: number;
  total_wickets: number;
  total_runs_conceded: number;
  economy_rate: number;
};

type MonthlyStat = {
  player_name: string;
  month: string;
  matches: number;
  runs: number;
  wickets: number;
  best_score: number;
};

type Tab = 'batting' | 'bowling' | 'monthly';

export default function StatsScreen({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<CareerStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [todayStats, setTodayStats] = useState<{ date: string; players: TodayPlayerStat[] }>({ date: '', players: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('batting');
  const [battingSubTab, setBattingSubTab] = useState<'overall' | 'today'>('overall');
  const [bowlingSubTab, setBowlingSubTab] = useState<'overall' | 'today'>('overall');

  useEffect(() => {
    (async () => {
      if (supabase) {
        const [career, monthly] = await Promise.all([
          fetchPlayerStats(),
          fetchMonthlyStats(),
        ]);
        setStats(career as CareerStat[]);
        setMonthlyStats(monthly as MonthlyStat[]);
        // Load today stats independently so it doesn't block main loading
        fetchTodayPlayerStats().then(setTodayStats);
      }
      setLoading(false);
    })();
  }, []);

  const battingLeaders = [...stats].sort((a, b) => b.total_runs - a.total_runs);
  const bowlingLeaders = [...stats].filter(s => s.total_wickets > 0).sort((a, b) => b.total_wickets - a.total_wickets);

  // Group monthly stats by month
  const monthlyGrouped: Record<string, MonthlyStat[]> = {};
  monthlyStats.forEach(s => {
    if (!monthlyGrouped[s.month]) monthlyGrouped[s.month] = [];
    monthlyGrouped[s.month].push(s);
  });
  const sortedMonths = Object.keys(monthlyGrouped).sort().reverse();

  const formatMonth = (m: string) => {
    const [year, month] = m.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0">
      <div className="bg-indigo-600 text-white p-4 shadow-md shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
            <p className="text-indigo-200 text-xs">{stats.length} players tracked</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-indigo-700/50 rounded-xl p-1">
          {(['batting', 'bowling', 'monthly'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-200 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <TrendingUp className="w-12 h-12 text-slate-200" />
            <p className="text-slate-400 text-sm">No stats yet</p>
            <p className="text-slate-300 text-[10px]">Complete a match to see analytics</p>
          </div>
        ) : (
          <>
            {/* Batting Tab */}
            {tab === 'batting' && (
              <div className="space-y-2">
                {/* Sub-tabs */}
                <div className="flex gap-1 bg-slate-200/60 rounded-lg p-0.5 mb-3">
                  {(['overall', 'today'] as const).map(st => (
                    <button key={st} onClick={() => setBattingSubTab(st)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${battingSubTab === st ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {st === 'today' ? 'Day-Wise' : 'Overall'}
                    </button>
                  ))}
                </div>

                {battingSubTab === 'overall' && (
                  <>
                    {battingLeaders[0] && (
                      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-5 h-5 text-amber-600" />
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Top Run Scorer</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="text-lg font-black text-amber-900">{battingLeaders[0].player_name}</h3>
                            <p className="text-xs text-amber-700">{battingLeaders[0].matches_played} matches</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-amber-800">{battingLeaders[0].total_runs}</div>
                            <div className="text-[10px] text-amber-600">runs</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="grid grid-cols-[1fr_40px_45px_35px_35px_35px_45px] gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Player</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">M</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Runs</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">HS</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">4S</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">6S</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">SR</span>
                      </div>
                      {battingLeaders.map((s, i) => (
                        <div key={i} className={`grid grid-cols-[1fr_40px_45px_35px_35px_35px_45px] gap-1 px-3 py-2.5 border-b border-slate-50 last:border-0 ${i < 3 ? 'bg-amber-50/30' : ''}`}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">{i + 1}</span>
                            <span className="text-xs font-semibold text-slate-800 truncate">{s.player_name}</span>
                          </div>
                          <span className="text-xs text-slate-500 text-center">{s.matches_played}</span>
                          <span className="text-xs font-bold text-slate-800 text-center">{s.total_runs}</span>
                          <span className="text-xs text-slate-600 text-center">{s.highest_score}</span>
                          <span className="text-xs text-slate-600 text-center">{s.total_fours}</span>
                          <span className="text-xs text-indigo-600 text-center">{s.total_sixes}</span>
                          <span className="text-xs text-slate-500 text-center">{s.strike_rate}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {battingSubTab === 'today' && (
                  todayStats.players.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No data yet</p>
                    </div>
                  ) : (() => {
                    const sorted = [...todayStats.players].sort((a, b) => b.runs_scored - a.runs_scored);
                    const [y, m, d] = todayStats.date.split('-');
                    const label = new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    return (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="bg-amber-50 px-3 py-2 border-b border-amber-100 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs font-bold text-amber-700">{label}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_40px_45px_35px_35px_35px_45px] gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Player</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">M</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Runs</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">HS</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">4S</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">6S</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">SR</span>
                        </div>
                        {sorted.map((p, i) => (
                          <div key={i} className={`grid grid-cols-[1fr_40px_45px_35px_35px_35px_45px] gap-1 px-3 py-2.5 border-b border-slate-50 last:border-0 items-center ${i < 3 ? 'bg-amber-50/30' : ''}`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">{i + 1}</span>
                              <span className="text-xs font-semibold text-slate-800 truncate">{p.player_name}</span>
                            </div>
                            <span className="text-xs text-slate-500 text-center">{p.matches_played}</span>
                            <span className="text-xs font-bold text-slate-800 text-center">{p.runs_scored}</span>
                            <span className="text-xs text-slate-600 text-center">{p.highest_score}</span>
                            <span className="text-xs text-slate-600 text-center">{p.fours}</span>
                            <span className="text-xs text-indigo-600 text-center">{p.sixes}</span>
                            <span className="text-xs text-slate-500 text-center">{p.balls_faced > 0 ? (p.runs_scored * 100 / p.balls_faced).toFixed(1) : '0.0'}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* Bowling Tab */}
            {tab === 'bowling' && (
              <div className="space-y-2">
                {/* Sub-tabs */}
                <div className="flex gap-1 bg-slate-200/60 rounded-lg p-0.5 mb-3">
                  {(['overall', 'today'] as const).map(st => (
                    <button key={st} onClick={() => setBowlingSubTab(st)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${bowlingSubTab === st ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {st === 'today' ? 'Day-Wise' : 'Overall'}
                    </button>
                  ))}
                </div>

                {bowlingSubTab === 'overall' && (
                  <>
                    {bowlingLeaders[0] && (
                      <div className="bg-gradient-to-r from-rose-50 to-rose-100 rounded-2xl p-4 border border-rose-200 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Flame className="w-5 h-5 text-rose-600" />
                          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Top Wicket Taker</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="text-lg font-black text-rose-900">{bowlingLeaders[0].player_name}</h3>
                            <p className="text-xs text-rose-700">Econ: {bowlingLeaders[0].economy_rate}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-rose-800">{bowlingLeaders[0].total_wickets}</div>
                            <div className="text-[10px] text-rose-600">wickets</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="grid grid-cols-[1fr_50px_50px_50px_50px] gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Player</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">M</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Wkts</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Runs</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Econ</span>
                      </div>
                      {bowlingLeaders.map((s, i) => (
                        <div key={i} className={`grid grid-cols-[1fr_50px_50px_50px_50px] gap-1 px-3 py-2.5 border-b border-slate-50 last:border-0 ${i < 3 ? 'bg-rose-50/30' : ''}`}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">{i + 1}</span>
                            <span className="text-xs font-semibold text-slate-800 truncate">{s.player_name}</span>
                          </div>
                          <span className="text-xs text-slate-500 text-center">{s.matches_played}</span>
                          <span className="text-xs font-bold text-rose-600 text-center">{s.total_wickets}</span>
                          <span className="text-xs text-slate-600 text-center">{s.total_runs_conceded}</span>
                          <span className="text-xs text-slate-500 text-center">{s.economy_rate}</span>
                        </div>
                      ))}
                    </div>
                    {bowlingLeaders.length === 0 && (
                      <div className="text-center py-8">
                        <Target className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No wickets taken yet</p>
                      </div>
                    )}
                  </>
                )}

                {bowlingSubTab === 'today' && (
                  todayStats.players.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No data yet</p>
                    </div>
                  ) : (() => {
                    const sorted = [...todayStats.players]
                      .filter(p => p.wickets_taken > 0 || p.overs_bowled > 0)
                      .sort((a, b) => b.wickets_taken - a.wickets_taken || a.runs_conceded - b.runs_conceded);
                    const [y, m, d] = todayStats.date.split('-');
                    const label = new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    return (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="bg-rose-50 px-3 py-2 border-b border-rose-100 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-xs font-bold text-rose-700">{label}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_50px_50px_50px_50px] gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Player</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">M</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Wkts</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Runs</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Econ</span>
                        </div>
                        {sorted.map((p, i) => (
                          <div key={i} className={`grid grid-cols-[1fr_50px_50px_50px_50px] gap-1 px-3 py-2.5 border-b border-slate-50 last:border-0 items-center ${i < 3 ? 'bg-rose-50/30' : ''}`}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">{i + 1}</span>
                              <span className="text-xs font-semibold text-slate-800 truncate">{p.player_name}</span>
                            </div>
                            <span className="text-xs text-slate-500 text-center">{p.matches_played}</span>
                            <span className="text-xs font-bold text-rose-600 text-center">{p.wickets_taken}</span>
                            <span className="text-xs text-slate-600 text-center">{p.runs_conceded}</span>
                            <span className="text-xs text-slate-500 text-center">{p.overs_bowled > 0 ? (p.runs_conceded / p.overs_bowled).toFixed(1) : '0.0'}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* Monthly Tab */}
            {tab === 'monthly' && (
              <div className="space-y-3">
                {sortedMonths.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No monthly data yet</p>
                  </div>
                ) : (
                  sortedMonths.map(month => {
                    const players = monthlyGrouped[month].sort((a, b) => b.runs - a.runs);
                    return (
                      <div key={month} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="bg-indigo-50 px-3 py-2 border-b border-indigo-100">
                          <h3 className="text-xs font-bold text-indigo-700">{formatMonth(month)}</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {players.map((s, i) => (
                            <div key={i} className="px-3 py-2 flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-800">{s.player_name}</span>
                              <div className="flex gap-4 text-xs font-mono">
                                <span className="text-slate-500">{s.matches}m</span>
                                <span className="font-bold text-slate-800">{s.runs}r</span>
                                <span className="text-rose-600">{s.wickets}w</span>
                                <span className="text-amber-600">HS:{s.best_score}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
