import React, { useEffect, useState } from 'react';
import { AppState } from '../types';
import { subscribeLiveMatch } from '../lib/supabase';
import { Wifi, WifiOff, Activity, List } from 'lucide-react';
import Scorecard from './Scorecard';

export default function LiveView({ matchId }: { matchId: string }) {
  const [state, setState] = useState<AppState | null>(null);
  const [connected, setConnected] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);

  useEffect(() => {
    const unsub = subscribeLiveMatch(matchId, (newState) => {
      setState(newState);
      setConnected(true);
    });
    return () => { if (unsub) unsub(); };
  }, [matchId]);

  if (!state) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        <p className="text-slate-500 text-sm">Connecting to match <span className="font-mono font-bold">{matchId}</span>...</p>
      </div>
    );
  }

  if (showScorecard) {
    return <Scorecard state={state} onClose={() => setShowScorecard(false)} />;
  }

  const isActive = state.matchState === 'innings1' || state.matchState === 'innings2';
  const isResult = state.matchState === 'result';
  const innings = state.matchState === 'innings1' || state.matchState === 'innings1_setup'
    ? state.innings1
    : state.innings2;

  const battingTeam = innings ? state.teams.find(t => t.id === innings.battingTeamId) : null;
  const bowlingTeam = innings ? state.teams.find(t => t.id === innings.bowlingTeamId) : null;

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0 relative">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-3 pb-5 rounded-b-3xl shadow-lg relative z-10 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-400" />
            )}
            <span className="text-[10px] font-semibold text-indigo-200 uppercase tracking-wider">Live</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <span className="text-[10px] font-mono text-indigo-300">#{matchId}</span>
        </div>

        {innings && battingTeam ? (
          <>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-indigo-200 text-[10px] font-semibold tracking-wider uppercase mb-0.5">
                  {battingTeam.name}
                </h2>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black tracking-tighter">{innings.runs}</span>
                  <span className="text-xl font-bold text-indigo-300">/ {innings.wickets}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold font-mono tracking-tight">
                  {(Math.floor(innings.balls / 6) + (innings.balls % 6) / 10).toFixed(1)}
                </div>
                <div className="text-indigo-200 text-[9px] font-medium uppercase tracking-widest mt-0.5">Overs</div>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-medium text-indigo-100 bg-indigo-700/50 rounded-lg p-2 mt-2">
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                CRR: {innings.balls > 0 ? ((innings.runs / innings.balls) * 6).toFixed(1) : '0.0'}
              </div>
              {state.matchState === 'innings2' && state.innings1 && (
                <div className="font-bold text-white">Target: {state.innings1.runs + 1}</div>
              )}
              {state.matchState === 'innings1' && (
                <div className="text-indigo-200">1st Innings</div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-lg font-bold">
              {state.matchState === 'setup' && 'Setting up match...'}
              {state.matchState === 'toss' && 'Toss in progress...'}
              {(state.matchState === 'innings1_setup' || state.matchState === 'innings2_setup') && 'Selecting players...'}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow p-3 flex flex-col gap-3 overflow-y-auto">
        {isActive && innings && battingTeam && bowlingTeam && (
          <>
            {/* Batters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Batting</div>
                {!innings.nonStrikerId && innings.strikerId && (
                  <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Last Man Standing</span>
                )}
              </div>
              {[innings.strikerId, innings.nonStrikerId].filter(Boolean).map(id => {
                const batter = innings.batters[id!];
                const player = battingTeam.players.find(p => p.id === id);
                const isStriker = id === innings.strikerId;
                return (
                  <div key={id} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-1.5">
                      {isStriker && <span className="text-amber-500 text-xs">*</span>}
                      <span className="font-semibold text-sm text-slate-800">{player?.name}</span>
                    </div>
                    <div className="text-sm font-mono">
                      <span className="font-bold">{batter.runs}</span>
                      <span className="text-slate-400"> ({batter.balls})</span>
                      {batter.fours > 0 && <span className="text-emerald-600 text-xs ml-1">{batter.fours}x4</span>}
                      {batter.sixes > 0 && <span className="text-indigo-600 text-xs ml-1">{batter.sixes}x6</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bowler */}
            {innings.bowlerId && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bowling</div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-slate-800">
                    {bowlingTeam.players.find(p => p.id === innings.bowlerId)?.name}
                  </span>
                  <div className="flex gap-4 text-xs font-mono">
                    <span>{(Math.floor(innings.bowlers[innings.bowlerId].balls / 6) + (innings.bowlers[innings.bowlerId].balls % 6) / 10).toFixed(1)}ov</span>
                    <span>{innings.bowlers[innings.bowlerId].runs}r</span>
                    <span className="text-rose-600 font-bold">{innings.bowlers[innings.bowlerId].wickets}w</span>
                  </div>
                </div>
              </div>
            )}

            {/* 1st Innings Summary (if 2nd innings) */}
            {state.matchState === 'innings2' && state.innings1 && (
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-700 font-semibold">
                    {state.teams.find(t => t.id === state.innings1!.battingTeamId)?.name}
                  </span>
                  <span className="font-bold text-indigo-800">
                    {state.innings1.runs}/{state.innings1.wickets}
                    <span className="text-indigo-400 text-xs ml-1">
                      ({(Math.floor(state.innings1.balls / 6) + (state.innings1.balls % 6) / 10).toFixed(1)} ov)
                    </span>
                  </span>
                </div>
                <div className="text-xs text-indigo-600 mt-1">
                  Need {state.innings1.runs + 1 - innings.runs} more from {state.overs * 6 - innings.balls} balls
                </div>
              </div>
            )}
          </>
        )}

        {/* Result */}
        {isResult && state.innings1 && state.innings2 && (() => {
          const team1 = state.teams.find(t => t.id === state.innings1!.battingTeamId)!;
          const team2 = state.teams.find(t => t.id === state.innings2!.battingTeamId)!;
          let result = '';
          if (state.innings2.runs > state.innings1.runs) {
            const wicketsRemaining = team2.players.length - state.innings2.wickets;
            result = `${team2.name} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
          } else if (state.innings1.runs > state.innings2.runs) {
            result = `${team1.name} won by ${state.innings1.runs - state.innings2.runs} runs`;
          } else {
            result = 'Match Tied!';
          }
          return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-center">
              <p className="text-lg font-black text-slate-800 mb-3">{result}</p>
              <div className="flex justify-between">
                <div className="text-center flex-1">
                  <div className="text-xs font-bold text-slate-400 uppercase">{team1.name}</div>
                  <div className="text-xl font-black">{state.innings1.runs}/{state.innings1.wickets}</div>
                </div>
                <div className="text-slate-300 font-bold self-center">vs</div>
                <div className="text-center flex-1">
                  <div className="text-xs font-bold text-slate-400 uppercase">{team2.name}</div>
                  <div className="text-xl font-black">{state.innings2.runs}/{state.innings2.wickets}</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Audit Log */}
        {state.auditLog && state.auditLog.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <List className="w-3 h-3 text-slate-400" />
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ball by Ball</div>
            </div>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {[...state.auditLog].reverse().map((log, i) => (
                <div key={i} className="text-[11px] text-slate-600 py-1 border-b border-slate-50 last:border-0 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scorecard button */}
        {(isActive || isResult) && (
          <button
            onClick={() => setShowScorecard(true)}
            className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm"
          >
            View Full Scorecard
          </button>
        )}
      </div>
    </div>
  );
}
