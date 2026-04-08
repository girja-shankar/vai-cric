import React, { useState, useEffect } from 'react';
import { Team, Player } from '../types';
import { Action } from '../store';
import { Users, Settings, ChevronRight, ChevronLeft, Trophy, X, UserCheck, Hash, ArrowLeft, UserPlus, Crown } from 'lucide-react';
import { fetchRegisteredPlayers, RegisteredPlayer } from '../lib/supabase';

const MIN_OVERS = 1;
const MAX_OVERS = 10;

const getDefaultOvers = (playerCount: number): number => {
  if (playerCount <= 5) return 5;
  return 10;
};

type Tab = 'settings' | 'team1' | 'team2';

export default function SetupScreen({ dispatch, onBack, defaultTeam1, defaultTeam2 }: { dispatch: React.Dispatch<Action>; onBack?: () => void; defaultTeam1?: string; defaultTeam2?: string }) {
  const [team1Name, setTeam1Name] = useState(defaultTeam1 ?? 'Team A');
  const [team2Name, setTeam2Name] = useState(defaultTeam2 ?? 'Team B');

  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);

  const [commonPlayer, setCommonPlayer] = useState<Player | null>(null);

  const [overs, setOvers] = useState(getDefaultOvers(0));
  const [oversManuallySet, setOversManuallySet] = useState(false);
  const [team1CaptainId, setTeam1CaptainId] = useState<string | null>(null);
  const [team2CaptainId, setTeam2CaptainId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([]);

  useEffect(() => {
    fetchRegisteredPlayers().then(setRegisteredPlayers);
  }, []);

  // Auto-update overs when player count changes (unless manually set)
  useEffect(() => {
    if (!oversManuallySet) {
      const maxPlayers = Math.max(team1Players.length, team2Players.length) + (commonPlayer ? 1 : 0);
      setOvers(getDefaultOvers(maxPlayers));
    }
  }, [team1Players.length, team2Players.length, commonPlayer, oversManuallySet]);

  const toggleCommonPlayer = () => {
    if (commonPlayer) {
      setCommonPlayer(null);
    } else {
      setCommonPlayer({ id: `cp-${Date.now()}`, name: '' });
    }
  };

  const handleStart = () => {
    const filled1 = team1Players;
    const filled2 = team2Players;
    const commonPlayers = commonPlayer && commonPlayer.name.trim() ? [commonPlayer] : [];
    const t1CommonPlayers = commonPlayers.map(p => ({ id: `${p.id}-t1`, name: p.name }));
    const t2CommonPlayers = commonPlayers.map(p => ({ id: `${p.id}-t2`, name: p.name }));

    const teams: Team[] = [
      { id: 't1', name: team1Name, players: [...filled1, ...t1CommonPlayers], captainId: team1CaptainId },
      { id: 't2', name: team2Name, players: [...filled2, ...t2CommonPlayers], captainId: team2CaptainId }
    ];
    dispatch({ type: 'START_MATCH', teams, overs });
  };

  const removePlayerFromTeam = (team: 1 | 2, index: number) => {
    if (team === 1) {
      const removed = team1Players[index];
      if (removed?.id === team1CaptainId) setTeam1CaptainId(null);
      setTeam1Players(team1Players.filter((_, i) => i !== index));
    } else {
      const removed = team2Players[index];
      if (removed?.id === team2CaptainId) setTeam2CaptainId(null);
      setTeam2Players(team2Players.filter((_, i) => i !== index));
    }
  };

  const filledTeam1 = team1Players.length;
  const filledTeam2 = team2Players.length;
  const isReady = filledTeam1 >= 2 && filledTeam2 >= 2;

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'settings', label: 'Match', icon: <Settings className="w-4 h-4" /> },
    { key: 'team1', label: team1Name.length > 8 ? team1Name.slice(0, 8) + '..' : team1Name, icon: <Users className="w-4 h-4" />, badge: filledTeam1 || undefined },
    { key: 'team2', label: team2Name.length > 8 ? team2Name.slice(0, 8) + '..' : team2Name, icon: <Users className="w-4 h-4" />, badge: filledTeam2 || undefined },
  ];

  const tabOrder: Tab[] = ['settings', 'team1', 'team2'];
  const currentIdx = tabOrder.indexOf(activeTab);

  const addRegisteredToTeam = (team: 1 | 2, name: string) => {
    const setPlayers = team === 1 ? setTeam1Players : setTeam2Players;
    setPlayers(prev => [...prev, { id: `t${team}-${Date.now()}`, name }]);
  };

  const renderPlayerList = (
    players: Player[],
    team: 1 | 2,
  ) => {
    const captainId = team === 1 ? team1CaptainId : team2CaptainId;
    const setCaptainId = team === 1 ? setTeam1CaptainId : setTeam2CaptainId;
    const usedNames = new Set(players.map(p => p.name.toLowerCase()));
    const otherTeamPlayers = team === 1 ? team2Players : team1Players;
    const otherUsedNames = new Set(otherTeamPlayers.map(p => p.name.toLowerCase()));
    const commonPlayerName = commonPlayer?.name?.trim().toLowerCase();
    const available = registeredPlayers.filter(rp => {
      const name = rp.name.toLowerCase();
      return !usedNames.has(name) && !otherUsedNames.has(name) && (!commonPlayerName || name !== commonPlayerName);
    });

    return (
      <div className="flex flex-col flex-grow min-h-0 overflow-hidden">
        {/* Selected players */}
        {players.length > 0 && (
          <div className="mb-2 flex flex-col min-h-0 flex-grow">
            <div className="flex items-center gap-1.5 mb-1 px-1 shrink-0">
              <Users className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected ({players.length})</span>
              <span className="text-[10px] text-slate-400 ml-auto">Tap crown to set captain</span>
            </div>
            <div className="space-y-0.5 overflow-y-auto flex-grow min-h-0">
              {players.map((p, i) => {
                const isCaptain = p.id === captainId;
                return (
                  <div key={p.id} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${isCaptain ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-100'}`}>
                    <span className="text-[10px] font-mono text-slate-400 w-4 text-right shrink-0">{i + 1}</span>
                    <span className={`flex-1 text-xs font-semibold truncate ${isCaptain ? 'text-amber-800' : 'text-slate-800'}`}>{p.name}</span>
                    {isCaptain && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1 rounded">C</span>}
                    <button
                      onClick={() => setCaptainId(isCaptain ? null : p.id)}
                      className={`p-1 rounded transition-colors active:scale-95 ${isCaptain ? 'text-amber-500 bg-amber-100 hover:bg-amber-200' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                      aria-label={isCaptain ? 'Remove captain' : `Set ${p.name} as captain`}
                    >
                      <Crown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removePlayerFromTeam(team, i)}
                      className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors active:scale-95"
                      aria-label={`Remove ${p.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available players to add */}
        <div className="shrink-0 pt-1">
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <UserPlus className="w-3 h-3 text-indigo-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tap to add</span>
          </div>
          {registeredPlayers.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-amber-700">No registered players</p>
              <p className="text-[10px] text-amber-500 mt-0.5">Go to Players from home screen to register first</p>
            </div>
          ) : available.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
              <p className="text-[10px] text-slate-400">All registered players added</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {available.map(rp => (
                <button
                  key={rp.id}
                  onClick={() => addRegisteredToTeam(team, rp.name)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95 border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                >
                  + {rp.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0 relative">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 pb-3 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 -ml-1 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Trophy className="w-6 h-6 text-indigo-200" />
          <h1 className="text-xl font-bold tracking-tight">New Match</h1>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-indigo-700/50 rounded-xl p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-600/50'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/50 text-indigo-100'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-grow p-4 flex flex-col min-h-0 overflow-hidden">
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Team 1 Name</label>
              <input
                type="text"
                value={team1Name}
                onChange={e => setTeam1Name(e.target.value)}
                placeholder="Enter team name"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Team 2 Name</label>
              <input
                type="text"
                value={team2Name}
                onChange={e => setTeam2Name(e.target.value)}
                placeholder="Enter team name"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Overs per innings</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setOvers(Math.max(MIN_OVERS, overs - 1)); setOversManuallySet(true) }}
                  className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xl flex items-center justify-center transition-colors active:scale-95"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={overs}
                  onChange={e => { setOvers(Math.min(MAX_OVERS, Math.max(MIN_OVERS, Number(e.target.value)))); setOversManuallySet(true) }}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-center text-2xl font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <button
                  onClick={() => { setOvers(Math.min(MAX_OVERS, overs + 1)); setOversManuallySet(true); }}
                  className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xl flex items-center justify-center transition-colors active:scale-95"
                >
                  +
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
                  <button
                    key={v}
                    onClick={() => { setOvers(v); setOversManuallySet(true); }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      overs === v
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {!oversManuallySet && (
                <p className="text-xs text-slate-400 mt-2">Auto-set based on player count. Change manually to override.</p>
              )}
            </div>

            {/* Common Player Toggle */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Common Player</p>
                    <p className="text-xs text-slate-400">One player who plays for both teams</p>
                  </div>
                </div>
                <button
                  onClick={toggleCommonPlayer}
                  className={`relative w-12 h-7 rounded-full transition-colors ${commonPlayer ? 'bg-amber-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${commonPlayer ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              {commonPlayer && (
                <select
                  value={commonPlayer.name}
                  onChange={e => setCommonPlayer({ ...commonPlayer, name: e.target.value })}
                  className="w-full mt-3 bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all appearance-none"
                >
                  <option value="">Select common player</option>
                  {registeredPlayers.map(rp => (
                    <option key={rp.id} value={rp.name}>{rp.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm mb-1">
                <Hash className="w-4 h-4" />
                Match Summary
              </div>
              <p className="text-indigo-600 text-xs">
                {team1Name} ({filledTeam1 + (commonPlayer ? 1 : 0)}p) vs {team2Name} ({filledTeam2 + (commonPlayer ? 1 : 0)}p) &middot; {overs} overs
                {commonPlayer && <span className="text-amber-600"> &middot; 1 common</span>}
              </p>
            </div>
          </div>
        )}

        {/* Team 1 Tab */}
        {activeTab === 'team1' && (
          <div className="flex flex-col flex-grow min-h-0 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm font-bold text-slate-800">{team1Name} Roster</h2>
              <span className="text-xs font-medium text-slate-400">{filledTeam1} players</span>
            </div>
            {renderPlayerList(team1Players, 1)}
          </div>
        )}

        {/* Team 2 Tab */}
        {activeTab === 'team2' && (
          <div className="flex flex-col flex-grow min-h-0 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm font-bold text-slate-800">{team2Name} Roster</h2>
              <span className="text-xs font-medium text-slate-400">{filledTeam2} players</span>
            </div>
            {renderPlayerList(team2Players, 2)}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0 flex gap-2">
        {currentIdx > 0 && (
          <button
            onClick={() => setActiveTab(tabOrder[currentIdx - 1])}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-sm flex items-center gap-1 transition-colors active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {currentIdx < tabOrder.length - 1 ? (
          <button
            onClick={() => setActiveTab(tabOrder[currentIdx + 1])}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={!isReady}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {isReady ? (
              <>Start Match <ChevronRight className="w-4 h-4" /></>
            ) : (
              `Need at least 2 named players per team`
            )}
          </button>
        )}
      </div>
    </div>
  );
}
