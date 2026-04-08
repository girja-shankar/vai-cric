import React, { useState } from 'react';
import { AppState } from '../types';
import { Action } from '../store';
import { Trophy, RotateCcw, FileText, Home } from 'lucide-react';
import Scorecard from './Scorecard';

export default function ResultScreen({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const [showScorecard, setShowScorecard] = useState(false);

  const innings1 = state.innings1!;
  const innings2 = state.innings2!;

  const team1 = state.teams.find(t => t.id === innings1.battingTeamId)!;
  const team2 = state.teams.find(t => t.id === innings2.battingTeamId)!;

  let resultMessage = '';
  let winningTeam = null;

  if (innings2.runs > innings1.runs) {
    winningTeam = team2;
    const wicketsRemaining = team2.players.length - innings2.wickets;
    resultMessage = `${team2.name} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
  } else if (innings1.runs > innings2.runs) {
    winningTeam = team1;
    const runsDifference = innings1.runs - innings2.runs;
    resultMessage = `${team1.name} won by ${runsDifference} run${runsDifference !== 1 ? 's' : ''}`;
  } else {
    resultMessage = 'Match Tied!';
  }

  if (showScorecard) {
    return <Scorecard state={state} onClose={() => setShowScorecard(false)} />;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0 relative">
      <div className="bg-indigo-600 text-white p-4 pb-10 rounded-b-[40px] shadow-md text-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-400 drop-shadow-lg" />
        <h1 className="text-3xl font-black tracking-tight mb-1 drop-shadow-md">
          {winningTeam ? 'Victory!' : 'It\'s a Tie!'}
        </h1>
        <p className="text-indigo-100 text-base font-medium">{resultMessage}</p>
      </div>

      <div className="flex-grow p-4 -mt-6 flex flex-col justify-evenly min-h-0 overflow-hidden gap-2">
        <div className="bg-white rounded-3xl p-4 shadow-lg border border-slate-100 flex flex-col gap-4 shrink-0">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div className="text-center flex-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{team1.name}</div>
              <div className="text-2xl font-black text-slate-800">{innings1.runs}/{innings1.wickets}</div>
              <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                {(Math.floor(innings1.balls / 6) + (innings1.balls % 6) / 10).toFixed(1)} ov
              </div>
            </div>
            <div className="px-2 text-slate-300 font-bold text-lg">vs</div>
            <div className="text-center flex-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{team2.name}</div>
              <div className="text-2xl font-black text-slate-800">{innings2.runs}/{innings2.wickets}</div>
              <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                {(Math.floor(innings2.balls / 6) + (innings2.balls % 6) / 10).toFixed(1)} ov
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowScorecard(true)}
            className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" /> View Full Scorecard
          </button>
        </div>
      </div>

      <div className="p-4 pt-0 shrink-0 flex gap-2">
        <button
          onClick={() => dispatch({ type: 'RESET_MATCH' })}
          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-slate-300 transition-all active:scale-[0.98]"
        >
          <Home className="w-4 h-4" /> Home
        </button>
      </div>
    </div>
  );
}
