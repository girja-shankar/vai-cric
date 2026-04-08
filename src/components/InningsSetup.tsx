import React, { useState } from 'react';
import { AppState } from '../types';
import { Action } from '../store';
import { Users, Play, Zap, Shield, CircleDot, ArrowLeft } from 'lucide-react';

export default function InningsSetup({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const isFirstInnings = state.matchState === 'innings1_setup';
  const innings = isFirstInnings ? state.innings1! : state.innings2!;

  const battingTeam = state.teams.find(t => t.id === innings.battingTeamId)!;
  const bowlingTeam = state.teams.find(t => t.id === innings.bowlingTeamId)!;

  const [strikerId, setStrikerId] = useState<string>('');
  const [nonStrikerId, setNonStrikerId] = useState<string>('');
  const [bowlerId, setBowlerId] = useState<string>('');

  const handleStart = () => {
    if (strikerId && nonStrikerId && bowlerId && strikerId !== nonStrikerId) {
      dispatch({ type: 'START_INNINGS', strikerId, nonStrikerId, bowlerId });
    }
  };

  const availableBatters = battingTeam.players.filter(p => innings.batters[p.id].status === 'yetToBat' || innings.batters[p.id].status === 'retiredOut');

  const isReady = strikerId && nonStrikerId && bowlerId && strikerId !== nonStrikerId;

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0 relative">
      <div className="bg-indigo-600 text-white p-4 pb-6 shadow-md text-center shrink-0 relative">
        <button
          onClick={() => dispatch({ type: 'GO_BACK' })}
          className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight mb-0.5">
          {isFirstInnings ? '1st Innings' : '2nd Innings'}
        </h1>
        <p className="text-indigo-200 text-xs">Tap to select opening players</p>
      </div>

      <div className="flex-grow p-3 flex flex-col min-h-0 overflow-y-auto gap-3">
        {/* Striker */}
        <div className="shrink-0">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Striker</span>
            <span className="text-xs text-slate-400 ml-auto">{battingTeam.name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableBatters.map(p => {
              const isSelected = strikerId === p.id;
              const isOther = nonStrikerId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (isOther) {
                      setNonStrikerId(strikerId);
                      setStrikerId(p.id);
                    } else {
                      setStrikerId(isSelected ? '' : p.id);
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 border-2 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm shadow-amber-100'
                      : isOther
                        ? 'border-indigo-200 bg-indigo-50/50 text-indigo-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                  }`}
                >
                  {p.name}
                  {isOther && <span className="text-[9px] ml-1 opacity-60">NS</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Non-Striker */}
        <div className="shrink-0">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <CircleDot className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Non-Striker</span>
            <span className="text-xs text-slate-400 ml-auto">{battingTeam.name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableBatters.map(p => {
              const isSelected = nonStrikerId === p.id;
              const isOther = strikerId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (isOther) {
                      setStrikerId(nonStrikerId);
                      setNonStrikerId(p.id);
                    } else {
                      setNonStrikerId(isSelected ? '' : p.id);
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 border-2 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                      : isOther
                        ? 'border-amber-200 bg-amber-50/50 text-amber-400'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                  }`}
                >
                  {p.name}
                  {isOther && <span className="text-[9px] ml-1 opacity-60">ST</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 shrink-0 px-1">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">vs</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Bowler */}
        <div className="shrink-0">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Shield className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opening Bowler</span>
            <span className="text-xs text-slate-400 ml-auto">{bowlingTeam.name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bowlingTeam.players.map(p => {
              const isSelected = bowlerId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setBowlerId(isSelected ? '' : p.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 border-2 ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm shadow-rose-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/50'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selection Summary */}
        {(strikerId || nonStrikerId || bowlerId) && (
          <div className="bg-slate-100 rounded-xl p-3 shrink-0 mt-auto">
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-3">
                <span className={strikerId ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                  ST: {strikerId ? battingTeam.players.find(p => p.id === strikerId)?.name : '—'}
                </span>
                <span className={nonStrikerId ? 'text-indigo-600 font-semibold' : 'text-slate-400'}>
                  NS: {nonStrikerId ? battingTeam.players.find(p => p.id === nonStrikerId)?.name : '—'}
                </span>
              </div>
              <span className={bowlerId ? 'text-rose-600 font-semibold' : 'text-slate-400'}>
                BW: {bowlerId ? bowlingTeam.players.find(p => p.id === bowlerId)?.name : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <button
          onClick={handleStart}
          disabled={!isReady}
          className="w-full bg-indigo-600 disabled:bg-slate-300 disabled:text-slate-500 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold text-base flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
        >
          Play Ball <Play className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
}
