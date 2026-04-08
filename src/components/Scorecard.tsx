import React from 'react';
import { AppState, Innings } from '../types';
import { X } from 'lucide-react';

export default function Scorecard({ state, onClose }: { state: AppState; onClose: () => void }) {
  const renderInningsScorecard = (innings: Innings, title: string) => {
    const battingTeam = state.teams.find(t => t.id === innings.battingTeamId)!;
    const bowlingTeam = state.teams.find(t => t.id === innings.bowlingTeamId)!;

    const batters = Object.values(innings.batters).filter(b => b.status !== 'yetToBat');
    const bowlers = Object.values(innings.bowlers).filter(b => b.balls > 0 || b.runs > 0 || b.wickets > 0);

    return (
      <div className="mb-8">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex justify-between items-center bg-slate-100 p-3 rounded-xl">
          <span>{title} - {battingTeam.name}</span>
          <span className="text-indigo-600">{innings.runs}/{innings.wickets} <span className="text-sm text-slate-500 font-normal">({(Math.floor(innings.balls / 6) + (innings.balls % 6) / 10).toFixed(1)} ov)</span></span>
        </h3>

        {/* Batting Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Batter</th>
                <th className="px-2 py-3 text-right">R</th>
                <th className="px-2 py-3 text-right">B</th>
                <th className="px-2 py-3 text-right">4s</th>
                <th className="px-2 py-3 text-right">6s</th>
                <th className="px-2 py-3 text-right">SR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batters.map(b => {
                const player = battingTeam.players.find(p => p.id === b.id);
                const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={b.id} className={b.status === 'batting' ? 'bg-indigo-50/30' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{player?.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{b.status === 'batting' ? 'not out' : b.status.replace('Out', ' out')}</div>
                    </td>
                    <td className="px-2 py-3 text-right font-bold text-slate-700">{b.runs}</td>
                    <td className="px-2 py-3 text-right text-slate-500">{b.balls}</td>
                    <td className="px-2 py-3 text-right text-slate-500">{b.fours}</td>
                    <td className="px-2 py-3 text-right text-slate-500">{b.sixes}</td>
                    <td className="px-2 py-3 text-right text-slate-500">{sr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between text-sm">
            <span className="font-semibold text-slate-600">Extras</span>
            <span className="font-bold text-slate-800">
              {innings.extras.total} <span className="text-slate-400 font-normal">(W {innings.extras.wides}, NB {innings.extras.noBalls})</span>
            </span>
          </div>
        </div>

        {/* Bowling Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Bowler</th>
                <th className="px-2 py-3 text-right">O</th>
                <th className="px-2 py-3 text-right">R</th>
                <th className="px-2 py-3 text-right">W</th>
                <th className="px-2 py-3 text-right">Extras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bowlers.map(b => {
                const player = bowlingTeam.players.find(p => p.id === b.id);
                const overs = Math.floor(b.balls / 6) + (b.balls % 6) / 10;
                const extras = b.wides + b.noBalls;
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{player?.name}</td>
                    <td className="px-2 py-3 text-right text-slate-500">{overs.toFixed(1)}</td>
                    <td className="px-2 py-3 text-right font-bold text-slate-700">{b.runs}</td>
                    <td className="px-2 py-3 text-right font-bold text-rose-600">{b.wickets}</td>
                    <td className="px-2 py-3 text-right text-slate-500">{extras}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full animate-in slide-in-from-bottom-full duration-300">
      <div className="bg-indigo-600 text-white p-4 flex items-center justify-between shadow-md shrink-0">
        <h2 className="text-xl font-bold tracking-tight">Match Scorecard</h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto p-4 min-h-0">
        {state.innings1 && renderInningsScorecard(state.innings1, '1st Innings')}
        {state.innings2 && renderInningsScorecard(state.innings2, '2nd Innings')}
      </div>
    </div>
  );
}
