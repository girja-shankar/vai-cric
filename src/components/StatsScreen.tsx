import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Trophy,
  Target,
  Flame,
  TrendingUp,
  Award,
  Calendar,
  Zap,
  Star,
} from "lucide-react";
import {
  fetchPlayerStats,
  fetchTodayPlayerStats,
  fetchDayWiseAwards,
  fetchCaptainStats,
  supabase,
  TodayPlayerStat,
  DayAward,
  CaptainStat,
} from "../lib/supabase";

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

type Tab = "batting" | "bowling" | "awards" | "captains";

export default function StatsScreen({ onBack }: { onBack: () => void }) {
  const [stats, setStats] = useState<CareerStat[]>([]);
  const [captainStats, setCaptainStats] = useState<CaptainStat[]>([]);
  const [todayStats, setTodayStats] = useState<{
    date: string;
    players: TodayPlayerStat[];
  }>({ date: "", players: [] });
  const [dayAwards, setDayAwards] = useState<DayAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("batting");
  const [battingSubTab, setBattingSubTab] = useState<"overall" | "today">(
    "overall",
  );
  const [bowlingSubTab, setBowlingSubTab] = useState<"overall" | "today">(
    "overall",
  );

  useEffect(() => {
    (async () => {
      if (supabase) {
        const career = await fetchPlayerStats();
        setStats(career as CareerStat[]);
        fetchTodayPlayerStats().then(setTodayStats);
        fetchDayWiseAwards().then(setDayAwards);
        fetchCaptainStats().then(setCaptainStats);
      }
      setLoading(false);
    })();
  }, []);

  const battingLeaders = [...stats].sort((a, b) => b.total_runs - a.total_runs);
  const bowlingLeaders = [...stats]
    .filter((s) => s.total_wickets > 0)
    .sort((a, b) => b.total_wickets - a.total_wickets);

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0">
      <div className="bg-indigo-600 text-white p-4 shadow-md shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Analytics</h1>
            <p className="text-indigo-200 text-xs">
              {stats.length} players tracked
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-indigo-700/50 rounded-xl p-1">
          {(["batting", "bowling", "awards", "captains"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all capitalize ${
                tab === t
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-indigo-200 hover:text-white"
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
            <p className="text-slate-300 text-[10px]">
              Complete a match to see analytics
            </p>
          </div>
        ) : (
          <>
            {/* Batting Tab */}
            {tab === "batting" && (
              <div className="space-y-2">
                {/* Sub-tabs */}
                <div className="flex gap-1 bg-slate-200/60 rounded-lg p-0.5 mb-3">
                  {(["overall", "today"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setBattingSubTab(st)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${battingSubTab === st ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {st === "today" ? "Day-Wise" : "Overall"}
                    </button>
                  ))}
                </div>

                {battingSubTab === "overall" && (
                  <>
                    {battingLeaders[0] && (
                      <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-5 h-5 text-amber-600" />
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                            Top Run Scorer
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="text-lg font-black text-amber-900">
                              {battingLeaders[0].player_name}
                            </h3>
                            <p className="text-xs text-amber-700">
                              {battingLeaders[0].matches_played} matches
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-amber-800">
                              {battingLeaders[0].total_runs}
                            </div>
                            <div className="text-[10px] text-amber-600">
                              runs
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="grid grid-cols-[1fr_40px_45px_35px_35px_35px_45px] gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          Player
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          M
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          Runs
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          HS
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          4S
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          6S
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          SR
                        </span>
                      </div>
                      {battingLeaders.map((s, i) => (
                        <div
                          key={i}
                          className={`grid grid-cols-[1fr_40px_45px_35px_35px_35px_45px] gap-1 px-3 py-2.5 border-b border-slate-50 last:border-0 ${i < 3 ? "bg-amber-50/30" : ""}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {s.player_name}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 text-center">
                            {s.matches_played}
                          </span>
                          <span className="text-xs font-bold text-slate-800 text-center">
                            {s.total_runs}
                          </span>
                          <span className="text-xs text-slate-600 text-center">
                            {s.highest_score}
                          </span>
                          <span className="text-xs text-slate-600 text-center">
                            {s.total_fours}
                          </span>
                          <span className="text-xs text-indigo-600 text-center">
                            {s.total_sixes}
                          </span>
                          <span className="text-xs text-slate-500 text-center">
                            {s.strike_rate}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {battingSubTab === "today" &&
                  (todayStats.players.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No data yet</p>
                    </div>
                  ) : (
                    (() => {
                      const sorted = [...todayStats.players].sort(
                        (a, b) => b.runs_scored - a.runs_scored,
                      );
                      const [y, m, d] = todayStats.date.split("-");
                      const label = new Date(+y, +m - 1, +d).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" },
                      );
                      return (
                        <>
                          {sorted[0] && (
                            <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-2xl p-4 border border-amber-200 mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Award className="w-5 h-5 text-amber-600" />
                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                                  Tata Sierra Super Striker of the Day · {label}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h3 className="text-lg font-black text-amber-900">
                                      {sorted[0].player_name}
                                    </h3>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-2xl font-black text-amber-800">
                                        {sorted[0].runs_scored}
                                      </span>
                                      <span className="text-[10px] text-amber-600">
                                        runs
                                      </span>
                                    </div>
                                  </div>
                                  <img
                                    src="/tata-sierra.png"
                                    alt="Tata Sierra"
                                    className="h-16 w-auto object-contain"
                                  />
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-black text-amber-800">
                                    {sorted[0].balls_faced > 0
                                      ? (
                                          (sorted[0].runs_scored * 100) /
                                          sorted[0].balls_faced
                                        ).toFixed(1)
                                      : "0.0"}
                                  </div>
                                  <div className="text-[10px] text-amber-600">
                                    SR
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="bg-amber-50 px-3 py-2 border-b border-amber-100 flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-xs font-bold text-amber-700">
                                {label}
                              </span>
                            </div>
                            <div className="grid grid-cols-[1fr_40px_45px_35px_35px_35px_45px] gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">
                                Player
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                                M
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                                Runs
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                                HS
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                                4S
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                                6S
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                                SR
                              </span>
                            </div>
                            {sorted.map((p, i) => (
                              <div
                                key={i}
                                className={`grid grid-cols-[1fr_40px_45px_35px_35px_35px_45px] gap-1 px-3 py-2.5 border-b border-slate-50 last:border-0 items-center ${i < 3 ? "bg-amber-50/30" : ""}`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-800 truncate">
                                    {p.player_name}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-500 text-center">
                                  {p.matches_played}
                                </span>
                                <span className="text-xs font-bold text-slate-800 text-center">
                                  {p.runs_scored}
                                </span>
                                <span className="text-xs text-slate-600 text-center">
                                  {p.highest_score}
                                </span>
                                <span className="text-xs text-slate-600 text-center">
                                  {p.fours}
                                </span>
                                <span className="text-xs text-indigo-600 text-center">
                                  {p.sixes}
                                </span>
                                <span className="text-xs text-slate-500 text-center">
                                  {p.balls_faced > 0
                                    ? (
                                        (p.runs_scored * 100) /
                                        p.balls_faced
                                      ).toFixed(1)
                                    : "0.0"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()
                  ))}
              </div>
            )}

            {/* Bowling Tab */}
            {tab === "bowling" && (
              <div className="space-y-2">
                {/* Sub-tabs */}
                <div className="flex gap-1 bg-slate-200/60 rounded-lg p-0.5 mb-3">
                  {(["overall", "today"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setBowlingSubTab(st)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${bowlingSubTab === st ? "bg-white text-rose-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {st === "today" ? "Day-Wise" : "Overall"}
                    </button>
                  ))}
                </div>

                {bowlingSubTab === "overall" && (
                  <>
                    {bowlingLeaders[0] && (
                      <div className="bg-gradient-to-r from-rose-50 to-rose-100 rounded-2xl p-4 border border-rose-200 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Flame className="w-5 h-5 text-rose-600" />
                          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                            Top Wicket Taker
                          </span>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <h3 className="text-lg font-black text-rose-900">
                              {bowlingLeaders[0].player_name}
                            </h3>
                            <p className="text-xs text-rose-700">
                              Econ: {bowlingLeaders[0].economy_rate}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-rose-800">
                              {bowlingLeaders[0].total_wickets}
                            </div>
                            <div className="text-[10px] text-rose-600">
                              wickets
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="grid grid-cols-[1fr_50px_50px_50px_50px] gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          Player
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          M
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          Wkts
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          Runs
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                          Econ
                        </span>
                      </div>
                      {bowlingLeaders.map((s, i) => (
                        <div
                          key={i}
                          className={`grid grid-cols-[1fr_50px_50px_50px_50px] gap-1 px-3 py-2.5 border-b border-slate-50 last:border-0 ${i < 3 ? "bg-rose-50/30" : ""}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {s.player_name}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 text-center">
                            {s.matches_played}
                          </span>
                          <span className="text-xs font-bold text-rose-600 text-center">
                            {s.total_wickets}
                          </span>
                          <span className="text-xs text-slate-600 text-center">
                            {s.total_runs_conceded}
                          </span>
                          <span className="text-xs text-slate-500 text-center">
                            {s.economy_rate}
                          </span>
                        </div>
                      ))}
                    </div>
                    {bowlingLeaders.length === 0 && (
                      <div className="text-center py-8">
                        <Target className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">
                          No wickets taken yet
                        </p>
                      </div>
                    )}
                  </>
                )}

                {bowlingSubTab === "today" &&
                  (todayStats.players.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No data yet</p>
                    </div>
                  ) : (
                    (() => {
                      const sorted = [...todayStats.players]
                        .filter(
                          (p) => p.wickets_taken > 0 || p.overs_bowled > 0,
                        )
                        .sort(
                          (a, b) =>
                            b.wickets_taken - a.wickets_taken ||
                            a.runs_conceded - b.runs_conceded,
                        );
                      const [y, m, d] = todayStats.date.split("-");
                      const label = new Date(+y, +m - 1, +d).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" },
                      );
                      return (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                          <div className="bg-rose-50 px-3 py-2 border-b border-rose-100 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-xs font-bold text-rose-700">
                              {label}
                            </span>
                          </div>
                          <div className="grid grid-cols-[1fr_50px_50px_50px_50px] gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                              Player
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                              M
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                              Wkts
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                              Runs
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase text-center">
                              Econ
                            </span>
                          </div>
                          {sorted.map((p, i) => (
                            <div
                              key={i}
                              className={`grid grid-cols-[1fr_50px_50px_50px_50px] gap-1 px-3 py-2.5 border-b border-slate-50 last:border-0 items-center ${i < 3 ? "bg-rose-50/30" : ""}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">
                                  {i + 1}
                                </span>
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                  {p.player_name}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 text-center">
                                {p.matches_played}
                              </span>
                              <span className="text-xs font-bold text-rose-600 text-center">
                                {p.wickets_taken}
                              </span>
                              <span className="text-xs text-slate-600 text-center">
                                {p.runs_conceded}
                              </span>
                              <span className="text-xs text-slate-500 text-center">
                                {p.overs_bowled > 0
                                  ? (p.runs_conceded / p.overs_bowled).toFixed(
                                      1,
                                    )
                                  : "0.0"}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  ))}
              </div>
            )}

            {/* Awards Tab */}
            {tab === "awards" && (
              <div className="space-y-4">
                {dayAwards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-2">
                    <Trophy className="w-12 h-12 text-slate-200" />
                    <p className="text-slate-400 text-sm">No awards yet</p>
                  </div>
                ) : (
                  dayAwards.map((day) => {
                    const [y, m, d] = day.date.split("-");
                    const label = new Date(+y, +m - 1, +d).toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short", year: "numeric" },
                    );
                    return (
                      <div key={day.date}>
                        {/* Date header */}
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <div className="h-px flex-1 bg-slate-200" />
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-full">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-[11px] font-bold text-slate-500">
                              {label}
                            </span>
                          </div>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        {/* 2×2 award grid — last card spans full width if odd count */}
                        {(() => {
                          const cards = [
                            day.super_striker ? (
                              <div
                                key="ss"
                                className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 rounded-2xl p-3 flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-black tracking-wide text-amber-700 uppercase">
                                      Sierra Super Striker
                                    </span>
                                  </div>
                                  <p className="text-base font-black text-amber-900">
                                    {day.super_striker.player_name}
                                  </p>
                                  <p className="text-[10px] text-amber-500">
                                    {day.super_striker.runs} runs
                                  </p>
                                </div>
                                <span className="text-2xl font-black text-amber-700">
                                  {day.super_striker.sr}
                                </span>
                              </div>
                            ) : null,
                            day.comeback_player ? (
                              <div key="cb" className="bg-gradient-to-r from-cyan-50 to-cyan-100 border border-cyan-300 rounded-2xl p-3 flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-black tracking-wide text-cyan-700 uppercase">ICIC Comeback Player</span>
                                  </div>
                                  <p className="text-base font-black text-cyan-900">{day.comeback_player.player_name}</p>
                                </div>
                                <div className="text-right flex flex-col gap-0.5 items-end">
                                  {day.comeback_player.runs > day.comeback_player.prev_runs && (
                                    <p className="text-[11px] font-semibold text-cyan-600">{day.comeback_player.prev_runs}→{day.comeback_player.runs} runs</p>
                                  )}
                                  {day.comeback_player.wickets > day.comeback_player.prev_wickets && (
                                    <p className="text-[11px] font-semibold text-cyan-600">{day.comeback_player.prev_wickets}→{day.comeback_player.wickets} wkts</p>
                                  )}
                                </div>
                              </div>
                            ) : null,
                            day.most_sixes ? (
                              <div
                                key="ms"
                                className="bg-gradient-to-r from-indigo-50 to-indigo-100 border border-indigo-300 rounded-2xl p-3 flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-black tracking-wide text-indigo-700 uppercase">
                                      Angel-One Super Sixes
                                    </span>
                                  </div>
                                  <p className="text-base font-black text-indigo-900">
                                    {day.most_sixes.player_name}
                                  </p>
                                </div>
                                <span className="text-2xl font-black text-indigo-700">
                                  {day.most_sixes.sixes}
                                </span>
                              </div>
                            ) : null,
                            day.most_fours ? (
                              <div
                                key="mf"
                                className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-300 rounded-2xl p-3 flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-black tracking-wide text-emerald-700 uppercase">
                                      RuPay On-The-Go 4s
                                    </span>
                                  </div>
                                  <p className="text-base font-black text-emerald-900">
                                    {day.most_fours.player_name}
                                  </p>
                                </div>
                                <span className="text-2xl font-black text-emerald-700">
                                  {day.most_fours.fours}
                                </span>
                              </div>
                            ) : null,
                            day.most_wickets ? (
                              <div
                                key="mw"
                                className="bg-gradient-to-r from-rose-50 to-rose-100 border border-rose-300 rounded-2xl p-3 flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-black tracking-wide text-rose-700 uppercase">
                                      Curvv Most Wicket
                                    </span>
                                  </div>
                                  <p className="text-base font-black text-rose-900">
                                    {day.most_wickets.player_name}
                                  </p>
                                  <p className="text-[10px] text-rose-500">
                                    Econ{" "}
                                    {day.most_wickets.economy > 0 &&
                                    day.most_wickets.economy < 999
                                      ? day.most_wickets.economy.toFixed(1)
                                      : "—"}
                                  </p>
                                </div>
                                <span className="text-2xl font-black text-rose-700">
                                  {day.most_wickets.wickets}
                                </span>
                              </div>
                            ) : null,
                          ].filter(Boolean) as React.ReactElement[];

                          return (
                            <div className="flex flex-col gap-2">{cards}</div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Captains Tab */}
            {tab === "captains" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {captainStats.length === 0 ? (
                  <div className="text-center py-10">
                    <Trophy className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No captain data yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_1px_auto_auto_auto_1px_auto_auto_auto]">

                    {/* Header cells */}
                    <div className="bg-indigo-600 px-3 py-2.5"><span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wide">Captain</span></div>
                    <div className="bg-indigo-400/60" />
                    <div className="bg-indigo-600 py-2.5 flex items-center justify-center w-8"><span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wide">M</span></div>
                    <div className="bg-indigo-600 py-2.5 flex items-center justify-center w-8"><span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">W</span></div>
                    <div className="bg-indigo-600 py-2.5 flex items-center justify-center w-8 pr-2"><span className="text-[10px] font-bold text-rose-300 uppercase tracking-wide">L</span></div>
                    <div className="bg-indigo-400/60" />
                    <div className="bg-indigo-600 py-2.5 flex items-center justify-center w-8 pl-2"><span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wide">T</span></div>
                    <div className="bg-indigo-600 py-2.5 flex items-center justify-center w-8"><span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">TW</span></div>
                    <div className="bg-indigo-600 py-2.5 pr-3 flex items-center justify-center w-8"><span className="text-[10px] font-bold text-rose-300 uppercase tracking-wide">TL</span></div>

                    {/* Data rows */}
                    {captainStats.map((c, i) => {
                      const winRate = c.matches > 0 ? Math.round((c.wins / c.matches) * 100) : 0;
                      const bg = i % 2 === 0 ? "bg-white" : "bg-slate-50/60";
                      const dividerBg = "bg-slate-200";
                      return (
                        <React.Fragment key={i}>
                          <div className={`${bg} px-3 py-3 border-t border-slate-100`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs font-bold truncate text-slate-800">{c.captain_name}</span>
                              <span className={`text-[9px] font-bold ml-auto shrink-0 ${winRate >= 50 ? "text-emerald-600" : "text-amber-500"}`}>{winRate}%</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${i === 0 ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${winRate}%` }} />
                            </div>
                          </div>
                          <div className={`${dividerBg} border-t border-slate-100`} />
                          <div className={`${bg} border-t border-slate-100 flex items-center justify-center w-8`}><span className="text-xs text-slate-400">{c.matches}</span></div>
                          <div className={`${bg} border-t border-slate-100 flex items-center justify-center w-8`}><span className="text-xs font-bold text-emerald-600">{c.wins}</span></div>
                          <div className={`${bg} border-t border-slate-100 flex items-center justify-center w-8 pr-2`}><span className="text-xs font-bold text-rose-500">{c.losses}</span></div>
                          <div className={`${dividerBg} border-t border-slate-100`} />
                          <div className={`${bg} border-t border-slate-100 flex items-center justify-center w-8 pl-2`}><span className="text-xs text-slate-400">{c.tournaments || 0}</span></div>
                          <div className={`${bg} border-t border-slate-100 flex items-center justify-center w-8`}><span className="text-xs font-bold text-emerald-600">{c.tournament_wins || 0}</span></div>
                          <div className={`${bg} border-t border-slate-100 pr-3 flex items-center justify-center w-8`}><span className="text-xs font-bold text-rose-500">{c.tournament_losses || 0}</span></div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
