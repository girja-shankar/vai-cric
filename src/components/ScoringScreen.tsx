import React, { useState, useEffect } from 'react';
import { AppState, Innings } from '../types';
import { Action } from '../store';
import { Zap, ChevronRight, Activity, AlertCircle, Undo2, List, X, Flag, Settings, Plus, Trash2, UserCheck, ArrowLeft, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Scorecard from './Scorecard';
import { Player } from '../types';

export default function ScoringScreen({ state, dispatch, matchId }: { state: AppState; dispatch: React.Dispatch<Action>; matchId: string | null }) {
  const isFirstInnings = state.matchState === 'innings1';
  const innings = isFirstInnings ? state.innings1! : state.innings2!;
  const battingTeam = state.teams.find(t => t.id === innings.battingTeamId)!;
  const bowlingTeam = state.teams.find(t => t.id === innings.bowlingTeamId)!;

  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showEndInningsModal, setShowEndInningsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings modal state
  const [editOvers, setEditOvers] = useState(state.overs);
  const [editTeams, setEditTeams] = useState(state.teams.map(t => ({ ...t, players: [...t.players] })));
  const [settingsTab, setSettingsTab] = useState<'match' | 'team1' | 'team2'>('match');
  const [editCommonPlayer, setEditCommonPlayer] = useState<{ enabled: boolean; name: string }>({ enabled: false, name: '' });

  const openSettings = () => {
    setEditOvers(state.overs);
    // Filter out common players from team lists — they're managed via the toggle
    setEditTeams(state.teams.map(t => ({ ...t, players: t.players.filter(p => !p.id.startsWith('cp-')).map(p => ({ ...p })) })));
    // Detect existing common player (id starts with "cp-")
    const existingCP = state.teams[0]?.players.find(p => p.id.startsWith('cp-'));
    setEditCommonPlayer(existingCP ? { enabled: true, name: existingCP.name } : { enabled: false, name: '' });
    setSettingsTab('match');
    setShowSettingsModal(true);
  };

  const updateEditPlayer = (teamIdx: number, playerIdx: number, name: string) => {
    const newTeams = editTeams.map((t, ti) => ti === teamIdx ? { ...t, players: t.players.map((p, pi) => pi === playerIdx ? { ...p, name } : p) } : t);
    setEditTeams(newTeams);
  };

  const addEditPlayer = (teamIdx: number) => {
    const newTeams = editTeams.map((t, ti) => ti === teamIdx ? { ...t, players: [...t.players, { id: `new-${Date.now()}`, name: '' }] } : t);
    setEditTeams(newTeams);
  };

  const removeEditPlayer = (teamIdx: number, playerIdx: number) => {
    const player = editTeams[teamIdx].players[playerIdx];
    // Don't allow removing players who are currently batting/bowling
    const activePlayerIds = new Set([innings.strikerId, innings.nonStrikerId, innings.bowlerId]);
    if (activePlayerIds.has(player.id)) return;
    // Don't allow removing players who have stats
    if (innings.batters[player.id] && (innings.batters[player.id].balls > 0 || innings.batters[player.id].status !== 'yetToBat')) return;
    if (innings.bowlers[player.id] && innings.bowlers[player.id].balls > 0) return;

    const newTeams = editTeams.map((t, ti) => ti === teamIdx ? { ...t, players: t.players.filter((_, pi) => pi !== playerIdx) } : t);
    setEditTeams(newTeams);
  };

  const canRemovePlayer = (teamIdx: number, playerIdx: number): boolean => {
    const player = editTeams[teamIdx].players[playerIdx];
    if (editTeams[teamIdx].players.length <= 2) return false;
    const activePlayerIds = new Set([innings.strikerId, innings.nonStrikerId, innings.bowlerId]);
    if (activePlayerIds.has(player.id)) return false;
    if (innings.batters[player.id] && (innings.batters[player.id].balls > 0 || innings.batters[player.id].status !== 'yetToBat')) return false;
    if (innings.bowlers[player.id] && innings.bowlers[player.id].balls > 0) return false;
    return true;
  };

  const handleSaveSettings = () => {
    const cleanTeams = editTeams.map(t => ({ ...t, players: t.players.filter(p => p.name.trim() !== '') }));
    // Remove old common players before adding updated ones
    cleanTeams.forEach(t => { t.players = t.players.filter(p => !p.id.startsWith('cp-')); });
    // Add common player to both teams if enabled and named
    if (editCommonPlayer.enabled && editCommonPlayer.name.trim()) {
      // Reuse existing CP base ID to preserve stats
      const existingCP = state.teams[0]?.players.find(p => p.id.startsWith('cp-'));
      const cpBase = existingCP ? existingCP.id.replace(/-t[12]$/, '') : `cp-${Date.now()}`;
      cleanTeams[0].players.push({ id: `${cpBase}-t1`, name: editCommonPlayer.name.trim() });
      cleanTeams[1].players.push({ id: `${cpBase}-t2`, name: editCommonPlayer.name.trim() });
    }
    if (cleanTeams[0].players.length < 2 || cleanTeams[1].players.length < 2) return;
    dispatch({ type: 'UPDATE_MATCH_SETTINGS', teams: cleanTeams, overs: editOvers });
    setShowSettingsModal(false);
  };

  // Wicket state
  const [outBatsmanId, setOutBatsmanId] = useState<string>(innings.strikerId || '');
  const [outType, setOutType] = useState<'out' | 'retiredOut'>('out');
  const [wicketRuns, setWicketRuns] = useState<number>(0);
  const [nextBatsmanId, setNextBatsmanId] = useState<string>('');
  const [forcedNextStrikerId, setForcedNextStrikerId] = useState<string>('');

  // Next Bowler state
  const [nextBowlerId, setNextBowlerId] = useState<string>('');

  if (!innings.strikerId || !innings.bowlerId) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <p className="text-slate-500 text-sm">Invalid match state. Please go back and reselect players.</p>
        <button onClick={() => dispatch({ type: 'GO_BACK' })} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm">Go Back</button>
      </div>
    );
  }

  const striker = innings.batters[innings.strikerId];
  const nonStriker = innings.nonStrikerId ? innings.batters[innings.nonStrikerId] : null;
  const bowler = innings.bowlers[innings.bowlerId];

  const oversBowled = Math.floor(innings.balls / 6) + (innings.balls % 6) / 10;
  const currentRunRate = innings.balls > 0 ? ((innings.runs / innings.balls) * 6).toFixed(1) : '0.0';

  const [lastOverPrompted, setLastOverPrompted] = useState(-1);

  useEffect(() => {
    const currentOver = Math.floor(innings.balls / 6);
    if (innings.balls > 0 && innings.balls % 6 === 0 && !innings.isComplete && currentOver > lastOverPrompted) {
      setShowBowlerModal(true);
      setLastOverPrompted(currentOver);
    }
  }, [innings.balls, innings.isComplete, lastOverPrompted]);

  const [flashId, setFlashId] = useState<string | null>(null);

  const triggerFeedback = (id: string) => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);
    // Visual flash
    setFlashId(id);
    setTimeout(() => setFlashId(null), 300);
  };

  const handleDelivery = (runs: number, type: 'normal' | 'wide' | 'noBall' = 'normal') => {
    triggerFeedback(`${type}-${runs}`);
    dispatch({ type: 'RECORD_DELIVERY', runs, deliveryType: type });
  };

  const maxWickets = battingTeam.players.length;

  const handleWicket = () => {
    if (outBatsmanId && (nextBatsmanId || availableBatters.length === 0)) {
      dispatch({
        type: 'RECORD_DELIVERY',
        runs: wicketRuns,
        deliveryType: 'wicket',
        wicketDetails: {
          outBatsmanId,
          outType,
          nextBatsmanId: nextBatsmanId || null,
          forcedNextStrikerId: forcedNextStrikerId || undefined,
        }
      });
      setShowWicketModal(false);
      setNextBatsmanId('');
      setWicketRuns(0);
      setForcedNextStrikerId('');
    }
  };

  const handleNextBowler = () => {
    if (nextBowlerId) {
      dispatch({ type: 'CHANGE_BOWLER', bowlerId: nextBowlerId });
      setShowBowlerModal(false);
      setNextBowlerId('');
    }
  };

  const handleEndInnings = () => {
    dispatch({ type: 'END_INNINGS' });
    setShowEndInningsModal(false);
  };

  const availableBatters = battingTeam.players.filter(p => innings.batters[p.id].status === 'yetToBat' || innings.batters[p.id].status === 'retiredOut');
  const availableBowlers = bowlingTeam.players;

  if (showScorecard) {
    return <Scorecard state={state} onClose={() => setShowScorecard(false)} />;
  }

  if (showAuditLog) {
    return (
      <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col h-full animate-in slide-in-from-bottom-full duration-300">
        <div className="bg-indigo-600 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-10">
          <h2 className="text-xl font-bold tracking-tight">Audit Log</h2>
          <button onClick={() => setShowAuditLog(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-4 pb-24 space-y-2">
          {state.auditLog.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">No events recorded yet.</div>
          ) : (
            [...state.auditLog].reverse().map((log, i) => (
              <div key={i} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 text-sm text-slate-700">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-100 min-h-0 relative">
      {/* Top Bar */}
      <div className="bg-indigo-600 text-white p-3 pb-5 rounded-b-3xl shadow-lg relative z-10 shrink-0">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-start gap-1">
            <button
              onClick={() => dispatch({ type: 'GO_BACK' })}
              className="p-1.5 -ml-1 mt-0.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
            <h2 className="text-indigo-200 text-[10px] font-semibold tracking-wider uppercase mb-0.5">
              {battingTeam.name}
            </h2>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tighter">{innings.runs}</span>
              <span className="text-xl font-bold text-indigo-300">/ {innings.wickets}</span>
            </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold font-mono tracking-tight">{oversBowled.toFixed(1)}<span className="text-sm text-indigo-300">/{state.overs}</span></div>
            <div className="text-indigo-200 text-[9px] font-medium uppercase tracking-widest mt-0.5">Overs</div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] font-medium text-indigo-100 bg-indigo-700/50 rounded-lg p-2 backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" /> CRR: {currentRunRate}
          </div>
          {!isFirstInnings && state.innings1 && (
            <div className="font-bold text-white">
              Target: {state.innings1.runs + 1}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow p-2 flex flex-col justify-evenly min-h-0 overflow-hidden gap-1">
        
        {/* Batsmen */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
          <div className="grid grid-cols-1 divide-y divide-slate-100">
            <div className={`p-2 flex justify-between items-center bg-indigo-50/50`}>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="font-semibold text-xs text-indigo-900">
                  {battingTeam.players.find(p => p.id === striker.id)?.name}
                </span>
                {striker.id === battingTeam.captainId && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1 rounded">C</span>}
              </div>
              <div className="font-mono">
                <span className="font-bold text-sm">{striker.runs}</span>
                <span className="text-slate-400 text-[10px] ml-1">({striker.balls})</span>
              </div>
            </div>
            {nonStriker ? (
              <div className="p-2 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-slate-700">
                    {battingTeam.players.find(p => p.id === nonStriker.id)?.name}
                  </span>
                  {nonStriker.id === battingTeam.captainId && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1 rounded">C</span>}
                </div>
                <div className="font-mono">
                  <span className="font-bold text-sm">{nonStriker.runs}</span>
                  <span className="text-slate-400 text-[10px] ml-1">({nonStriker.balls})</span>
                </div>
              </div>
            ) : (
              <div className="p-2 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Last Man Standing</span>
              </div>
            )}
          </div>
        </div>

        {/* Bowler */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex justify-between items-center shrink-0">
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bowler</div>
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
              {bowlingTeam.players.find(p => p.id === bowler.id)?.name}
              {bowler.id === bowlingTeam.captainId && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1 rounded">C</span>}
            </div>
          </div>
          <div className="flex gap-3 font-mono text-center">
            <div>
              <div className="text-[9px] text-slate-400">O</div>
              <div className="font-bold text-xs">{(Math.floor(bowler.balls / 6) + (bowler.balls % 6) / 10).toFixed(1)}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">R</div>
              <div className="font-bold text-xs">{bowler.runs}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400">W</div>
              <div className="font-bold text-xs text-rose-600">{bowler.wickets}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-5 gap-1.5 shrink-0">
          {[0, 1, 2, 4, 6].map(runs => {
            const id = `normal-${runs}`;
            const isFlashing = flashId === id;
            return (
              <button
                key={runs}
                onClick={() => handleDelivery(runs)}
                className={`py-2 rounded-xl font-bold text-base transition-all active:scale-90 flex items-center justify-center relative overflow-hidden ${
                  runs === 4 || runs === 6
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-200'
                    : 'bg-white text-slate-700 border-2 border-slate-200 shadow-sm'
                } ${isFlashing ? 'ring-4 ring-indigo-400 scale-95' : ''}`}
              >
                {isFlashing && <span className="absolute inset-0 bg-indigo-400/20 animate-ping rounded-xl" />}
                {runs}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-1.5 shrink-0">
          <button
            onClick={() => handleDelivery(0, 'wide')}
            className={`py-2 flex items-center justify-center rounded-xl font-bold text-xs text-slate-600 bg-white border-2 border-slate-200 shadow-sm active:scale-90 relative overflow-hidden ${flashId === 'wide-0' ? 'ring-4 ring-amber-400 scale-95' : ''}`}
          >
            {flashId === 'wide-0' && <span className="absolute inset-0 bg-amber-400/20 animate-ping rounded-xl" />}
            WD
          </button>
          <button
            onClick={() => handleDelivery(0, 'noBall')}
            className={`py-2 flex items-center justify-center rounded-xl font-bold text-xs text-slate-600 bg-white border-2 border-slate-200 shadow-sm active:scale-90 relative overflow-hidden ${flashId === 'noBall-0' ? 'ring-4 ring-amber-400 scale-95' : ''}`}
          >
            {flashId === 'noBall-0' && <span className="absolute inset-0 bg-amber-400/20 animate-ping rounded-xl" />}
            NB
          </button>
          <button
            onClick={() => {
              triggerFeedback('out');
              setOutBatsmanId(innings.strikerId!);
              setOutType('out');
              setWicketRuns(0);
              setNextBatsmanId('');
              setForcedNextStrikerId('');
              setShowWicketModal(true);
            }}
            className={`py-2 flex items-center justify-center rounded-xl font-bold text-xs text-white bg-rose-500 shadow-sm shadow-rose-200 active:scale-90 relative overflow-hidden ${flashId === 'out' ? 'ring-4 ring-rose-300 scale-95' : ''}`}
          >
            {flashId === 'out' && <span className="absolute inset-0 bg-white/30 animate-ping rounded-xl" />}
            OUT
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-white border-t border-slate-200 p-2 flex gap-1.5 shrink-0">
        <button 
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={!state.past || state.past.length === 0}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
          title="Undo last action"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setShowAuditLog(true)}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center justify-center"
          title="View Audit Log"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowEndInningsModal(true)}
          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-lg transition-colors flex items-center justify-center"
          title={isFirstInnings ? "End Innings Early" : "End Match"}
        >
          <Flag className="w-4 h-4" />
        </button>
        <button
          onClick={openSettings}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center justify-center"
          title="Edit Match Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        {supabase && matchId && (
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}#/live/${matchId}`;
              if (navigator.share) {
                navigator.share({ title: 'Live Cricket Score', url });
              } else {
                navigator.clipboard.writeText(url);
                alert(`Link copied!\n${url}`);
              }
            }}
            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-semibold rounded-lg transition-colors flex items-center justify-center"
            title="Share Live Scorecard"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => setShowScorecard(true)}
          className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
        >
          Scorecard
        </button>
        {/* If over is complete but modal didn't show for some reason, manual trigger */}
        {innings.balls > 0 && innings.balls % 6 === 0 && !innings.isComplete && (
          <button 
            onClick={() => setShowBowlerModal(true)}
            className="flex-1 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold text-xs rounded-lg transition-colors"
          >
            Next Bowler
          </button>
        )}
      </div>

      {/* Wicket Modal */}
      {showWicketModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-2">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Wicket!</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Who is out?</label>
                <div className={`grid gap-1.5 ${nonStriker ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button
                    onClick={() => setOutBatsmanId(striker.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border-2 ${outBatsmanId === striker.id ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    {battingTeam.players.find(p => p.id === striker.id)?.name}
                  </button>
                  {nonStriker && (
                    <button
                      onClick={() => setOutBatsmanId(nonStriker.id)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border-2 ${outBatsmanId === nonStriker.id ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600'}`}
                    >
                      {battingTeam.players.find(p => p.id === nonStriker.id)?.name}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dismissal Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setOutType('out')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border-2 ${outType === 'out' ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600'}`}
                  >
                    Out
                  </button>
                  <button
                    onClick={() => setOutType('retiredOut')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border-2 ${outType === 'retiredOut' ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600'}`}
                  >
                    Retired Out
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Runs completed</label>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(r => (
                    <button
                      key={r}
                      onClick={() => setWicketRuns(r)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                        wicketRuns === r ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">Runs before dismissal (e.g. run out on 2nd run)</p>
              </div>

              {availableBatters.length > 0 ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Next Batsman</label>
                  <select
                    value={nextBatsmanId}
                    onChange={e => setNextBatsmanId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="" disabled>Select Next Batsman</option>
                    {availableBatters.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ) : nonStriker ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                  <p className="text-xs font-semibold text-amber-700">Last man standing</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Remaining batsman will continue alone</p>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-center">
                  <p className="text-xs font-semibold text-rose-700">All Out!</p>
                  <p className="text-[10px] text-rose-600 mt-0.5">This will end the innings</p>
                </div>
              )}
            </div>

            {/* Who faces next? — shown when two batsmen remain */}
            {outType !== 'retiredOut' && (() => {
              const remainingIds = outBatsmanId === innings.strikerId
                ? [innings.nonStrikerId, nextBatsmanId].filter((id): id is string => !!id)
                : [innings.strikerId!, nextBatsmanId].filter((id): id is string => !!id);
              if (remainingIds.length < 2) return null;
              const autoNext = (() => {
                const rotate = wicketRuns % 2 !== 0;
                if (outBatsmanId === innings.strikerId) return rotate ? (innings.nonStrikerId ?? '') : (nextBatsmanId ?? '');
                return rotate ? (nextBatsmanId ?? '') : (innings.strikerId ?? '');
              })();
              const effective = forcedNextStrikerId || autoNext;
              return (
                <div className="mt-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Who faces next?</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {remainingIds.map(id => {
                      const name = battingTeam.players.find(p => p.id === id)?.name || 'Unknown';
                      const isSelected = id === effective;
                      return (
                        <button
                          key={id}
                          onClick={() => setForcedNextStrikerId(id === autoNext ? '' : id)}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold border-2 ${isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                        >
                          {name}
                          {id === autoNext && <span className="block text-[9px] text-slate-400 font-normal">auto</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setShowWicketModal(false); setForcedNextStrikerId(''); }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleWicket}
                disabled={!outBatsmanId || (!nextBatsmanId && availableBatters.length > 0)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next Bowler Modal */}
      {showBowlerModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <h3 className="text-xl font-bold text-slate-800 mb-2">End of Over</h3>
            <p className="text-slate-500 text-sm mb-6">Select the bowler for the next over.</p>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-2">
              {availableBowlers.map(p => {
                const bStats = innings.bowlers[p.id];
                const isCurrent = p.id === innings.bowlerId;
                return (
                  <button
                    key={p.id}
                    disabled={isCurrent}
                    onClick={() => setNextBowlerId(p.id)}
                    className={`w-full flex justify-between items-center p-4 rounded-xl border-2 transition-all ${
                      nextBowlerId === p.id 
                        ? 'border-indigo-600 bg-indigo-50' 
                        : isCurrent 
                          ? 'border-slate-100 bg-slate-50 opacity-50' 
                          : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <span className="font-semibold text-slate-700">{p.name}</span>
                    <span className="text-sm font-mono text-slate-500">
                      {bStats ? `${(Math.floor(bStats.balls / 6) + (bStats.balls % 6) / 10).toFixed(1)} O` : '0.0 O'}
                    </span>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={handleNextBowler}
              disabled={!nextBowlerId}
              className="w-full py-4 rounded-xl font-semibold text-white bg-indigo-600 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              Start Next Over <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col">
          <div className="bg-white flex flex-col h-full animate-in slide-in-from-bottom-8">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold">Edit Match Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 mx-4 mt-3 rounded-xl shrink-0">
              {(['match', 'team1', 'team2'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSettingsTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    settingsTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'match' ? 'Overs' : editTeams[tab === 'team1' ? 0 : 1].name}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-4">
              {settingsTab === 'match' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Overs per innings</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditOvers(Math.max(1, editOvers - 1))}
                      className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xl flex items-center justify-center"
                    >-</button>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={editOvers}
                      onChange={e => setEditOvers(Math.min(10, Math.max(1, Number(e.target.value))))}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-center text-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      onClick={() => setEditOvers(Math.min(10, editOvers + 1))}
                      className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xl flex items-center justify-center"
                    >+</button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[4, 5, 6, 7, 8, 9, 10].map(v => (
                      <button
                        key={v}
                        onClick={() => setEditOvers(v)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-semibold ${editOvers === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >{v}</button>
                    ))}
                  </div>
                  {innings.balls > 0 && editOvers * 6 < innings.balls && (
                    <p className="text-xs text-rose-500 mt-2">Overs cannot be less than already bowled ({(innings.balls / 6).toFixed(1)} overs).</p>
                  )}

                  {/* Common Player */}
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mt-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-amber-600" />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Common Player</p>
                          <p className="text-xs text-slate-400">Plays for both teams</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditCommonPlayer(prev => prev.enabled ? { enabled: false, name: '' } : { enabled: true, name: '' })}
                        className={`relative w-12 h-7 rounded-full transition-colors ${editCommonPlayer.enabled ? 'bg-amber-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${editCommonPlayer.enabled ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                    {editCommonPlayer.enabled && (
                      <input
                        type="text"
                        value={editCommonPlayer.name}
                        onChange={e => setEditCommonPlayer(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter common player name"
                        className="w-full mt-3 bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all placeholder:text-slate-300"
                      />
                    )}
                  </div>
                </div>
              )}

              {(settingsTab === 'team1' || settingsTab === 'team2') && (() => {
                const teamIdx = settingsTab === 'team1' ? 0 : 1;
                const team = editTeams[teamIdx];
                return (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-800">{team.name}</h3>
                      <span className="text-xs text-slate-400">{team.players.filter(p => p.name.trim()).length} players</span>
                    </div>
                    <div className="space-y-2">
                      {team.players.map((p, i) => {
                        const removable = canRemovePlayer(teamIdx, i);
                        const isActive = new Set([innings.strikerId, innings.nonStrikerId, innings.bowlerId]).has(p.id);
                        const hasStats = (innings.batters[p.id] && (innings.batters[p.id].balls > 0 || innings.batters[p.id].status !== 'yetToBat')) ||
                                         (innings.bowlers[p.id] && innings.bowlers[p.id].balls > 0);
                        return (
                          <div key={p.id} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400 w-5 text-right shrink-0">{i + 1}</span>
                            <input
                              type="text"
                              value={p.name}
                              onChange={e => updateEditPlayer(teamIdx, i, e.target.value)}
                              disabled={isActive || !!hasStats}
                              className={`flex-1 bg-white border rounded-xl px-3 py-2.5 text-sm font-medium outline-none transition-all placeholder:text-slate-300 ${
                                isActive ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : hasStats ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                              }`}
                              placeholder="Enter player name"
                            />
                            {isActive && <span className="text-[10px] text-indigo-500 font-semibold shrink-0">ACTIVE</span>}
                            {!isActive && hasStats && <span className="text-[10px] text-slate-400 font-semibold shrink-0">PLAYED</span>}
                            {removable && (
                              <button
                                onClick={() => removeEditPlayer(teamIdx, i)}
                                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => addEditPlayer(teamIdx)}
                      className="w-full py-2.5 mt-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Player
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Save Button */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <button
                onClick={handleSaveSettings}
                disabled={editOvers * 6 < innings.balls || editTeams.some(t => t.players.filter(p => p.name.trim()).length < 2)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Innings Modal */}
      {showEndInningsModal && (
        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <Flag className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                {isFirstInnings ? 'End Innings?' : 'End Match?'}
              </h3>
            </div>
            
            <p className="text-slate-600 mb-5">
              {isFirstInnings
                ? 'What would you like to do?'
                : 'Are you sure you want to end the match early?'}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleEndInnings}
                className="w-full py-3 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-700"
              >
                {isFirstInnings ? 'End Innings' : 'End Match'}
              </button>
              <button
                onClick={() => { setShowEndInningsModal(false); dispatch({ type: 'RESET_MATCH' }); }}
                className="w-full py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                Quit Match
              </button>
              <button
                onClick={() => setShowEndInningsModal(false)}
                className="w-full py-2.5 rounded-xl font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

