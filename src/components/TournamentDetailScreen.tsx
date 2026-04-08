import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, Plus, Trophy, Shield, X, Check, Trash2, Crown, TrendingUp, CheckCircle2
} from 'lucide-react';
import {
  Tournament, TournamentTeam, TournamentMatch,
  fetchTournamentTeams, fetchTournamentMatches,
  addTournamentMatch, deleteTournamentMatch, updateTournamentStatus,
} from '../lib/supabase';

type Props = { tournament: Tournament; onBack: () => void; onStartMatch: (team1: string, team2: string, autoTossTeam?: string) => void; isAdmin?: boolean };
type SubTab = 'points' | 'matches';

type TeamRow = {
  team: string; mp: number; w: number; l: number; t: number; pts: number; nrr: number;
  runsScored: number; oversFaced: number; runsConceded: number; oversBowled: number;
};

function calcOvers(o: number) {
  // overs stored as decimal e.g. 4.3 = 4 overs 3 balls = 4.5 effective
  const full = Math.floor(o);
  const balls = Math.round((o - full) * 10);
  return full + balls / 6;
}

function buildPointsTable(teams: TournamentTeam[], matches: TournamentMatch[]): TeamRow[] {
  const table: Record<string, TeamRow> = {};
  teams.forEach(({ team_name }) => {
    table[team_name] = { team: team_name, mp: 0, w: 0, l: 0, t: 0, pts: 0, nrr: 0, runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0 };
  });

  matches.forEach(m => {
    if (!m.winner) return;
    [m.team1, m.team2].forEach(tn => {
      if (!table[tn]) table[tn] = { team: tn, mp: 0, w: 0, l: 0, t: 0, pts: 0, nrr: 0, runsScored: 0, oversFaced: 0, runsConceded: 0, oversBowled: 0 };
    });
    const r1 = table[m.team1], r2 = table[m.team2];
    r1.mp++; r2.mp++;
    r1.runsScored += m.team1_score; r1.runsConceded += m.team2_score;
    r2.runsScored += m.team2_score; r2.runsConceded += m.team1_score;
    r1.oversFaced += calcOvers(m.team1_overs); r1.oversBowled += calcOvers(m.team2_overs);
    r2.oversFaced += calcOvers(m.team2_overs); r2.oversBowled += calcOvers(m.team1_overs);

    if (m.winner === 'tie') { r1.t++; r2.t++; r1.pts++; r2.pts++; }
    else if (m.winner === m.team1) { r1.w++; r2.l++; r1.pts += 2; }
    else { r2.w++; r1.l++; r2.pts += 2; }
  });

  return Object.values(table)
    .map(r => ({
      ...r,
      nrr: parseFloat(((r.oversFaced > 0 ? r.runsScored / r.oversFaced : 0) - (r.oversBowled > 0 ? r.runsConceded / r.oversBowled : 0)).toFixed(3)),
    }))
    .sort((a, b) => b.pts - a.pts || b.nrr - a.nrr);
}

// ── Add Match Modal ───────────────────────────────────────────────
type MatchFormProps = { teams: TournamentTeam[]; tournamentId: string; onSaved: () => void; onClose: () => void };

function AddMatchModal({ teams, tournamentId, onSaved, onClose }: MatchFormProps) {
  const names = teams.map(t => t.team_name);
  const [team1, setTeam1] = useState(names[0] ?? '');
  const [team2, setTeam2] = useState(names[1] ?? '');
  const [t1s, setT1s] = useState(''); const [t1w, setT1w] = useState(''); const [t1o, setT1o] = useState('');
  const [t2s, setT2s] = useState(''); const [t2w, setT2w] = useState(''); const [t2o, setT2o] = useState('');
  const [winner, setWinner] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const team2Options = names.filter(n => n !== team1);
  const score1 = parseInt(t1s) || 0, score2 = parseInt(t2s) || 0;
  const autoWinner = score1 > score2 ? team1 : score2 > score1 ? team2 : '';

  useEffect(() => { setWinner(autoWinner); }, [t1s, t2s, team1, team2]);
  useEffect(() => { if (team2Options.length && !team2Options.includes(team2)) setTeam2(team2Options[0]); }, [team1]);

  const canSave = team1 && team2 && team1 !== team2 && t1s && t2s && t1o && t2o && winner;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await addTournamentMatch({
      tournament_id: tournamentId, team1, team2,
      team1_score: parseInt(t1s), team1_wickets: parseInt(t1w) || 0, team1_overs: parseFloat(t1o) || 0,
      team2_score: parseInt(t2s), team2_wickets: parseInt(t2w) || 0, team2_overs: parseFloat(t2o) || 0,
      winner,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{label}</p>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? '0'}
        className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-center focus:outline-none focus:border-indigo-400" type="number" min="0" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800">Add Match Result</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'Team 1', val: team1, set: setTeam1, opts: names }, { label: 'Team 2', val: team2, set: setTeam2, opts: team2Options }].map(({ label, val, set, opts }) => (
            <div key={label}>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{label}</p>
              <select value={val} onChange={e => set(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white">
                {opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Scores */}
        {[
          { label: team1, s: t1s, setS: setT1s, w: t1w, setW: setT1w, o: t1o, setO: setT1o },
          { label: team2, s: t2s, setS: setT2s, w: t2w, setW: setT2w, o: t2o, setO: setT2o },
        ].map(({ label, s, setS, w, setW, o, setO }) => (
          <div key={label} className="bg-slate-50 rounded-2xl p-3 space-y-2">
            <p className="font-bold text-xs text-slate-700">{label}</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Runs" value={s} onChange={setS} />
              <Field label="Wkts" value={w} onChange={setW} />
              <Field label="Overs" value={o} onChange={setO} placeholder="4.3" />
            </div>
          </div>
        ))}

        {/* Winner override */}
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Winner</p>
          <div className="flex gap-2 flex-wrap">
            {[team1, team2, 'tie'].map(opt => (
              <button key={opt} onClick={() => setWinner(opt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${winner === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                {opt === 'tie' ? '🤝 Tie' : opt}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={!canSave || saving}
          className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm disabled:opacity-40 flex items-center justify-center gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
          Save Result
        </button>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function TournamentDetailScreen({ tournament, onBack, onStartMatch, isAdmin }: Props) {
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<SubTab>('points');
  const [showAdd, setShowAdd] = useState(false);
  const [showMatchPicker, setShowMatchPicker] = useState(false);
  const [pickerTeam1, setPickerTeam1] = useState('');
  const [pickerTeam2, setPickerTeam2] = useState('');
  const [status, setStatus] = useState<Tournament['status']>(tournament.status);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [winnerBatsFirst, setWinnerBatsFirst] = useState(true);

  const reload = useCallback(async () => {
    const [t, m] = await Promise.all([fetchTournamentTeams(tournament.id), fetchTournamentMatches(tournament.id)]);
    setTeams(t); setMatches(m); setLoading(false);
  }, [tournament.id]);

  useEffect(() => { reload(); }, [reload]);

  const handleDelete = async (id: string) => {
    await deleteTournamentMatch(id);
    setMatches(prev => prev.filter(m => m.id !== id));
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    const next = status === 'active' ? 'completed' : 'active';
    await updateTournamentStatus(tournament.id, next);
    setStatus(next);
    setTogglingStatus(false);
  };

  const table = buildPointsTable(teams, matches);

  // Most recent completed match winner (excluding ties)
  const lastMatchWinner = matches.length > 0
    ? [...matches].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())[0].winner
    : null;
  const lastWinnerName = lastMatchWinner && lastMatchWinner !== 'tie' ? lastMatchWinner : null;

  const nrrStr = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(3);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black truncate">{tournament.name}</h1>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status === 'active' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/20 text-white/70'}`}>
                {status === 'active' ? '● Active' : '✓ Completed'}
              </span>
              <span className="text-indigo-300 text-[10px]">{teams.length} teams · {matches.length} matches</span>
            </div>
          </div>
          <button onClick={handleToggleStatus} disabled={togglingStatus}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1 shrink-0">
            {status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
            {status === 'active' ? 'Finish' : 'Reopen'}
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 bg-indigo-700/50 rounded-xl p-1">
          {(['points', 'matches'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${subTab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-200 hover:text-white'}`}>
              {t === 'points' ? '🏆 Points Table' : '🏏 Matches'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-3 min-h-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : subTab === 'points' ? (
          /* ── Points Table ── */
          <div className="space-y-3">
            {/* Top team highlight */}
            {table.length > 0 && table[0].mp > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Current Leader</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-black text-amber-900">{table[0].team}</h3>
                    <p className="text-xs text-amber-700">{table[0].w}W · {table[0].l}L · NRR {nrrStr(table[0].nrr)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-amber-800">{table[0].pts}</div>
                    <div className="text-[10px] text-amber-600">points</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[28px_1fr_36px_32px_32px_40px_58px] gap-1 px-3 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase">#</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Team</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase text-center">MP</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase text-center">W</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase text-center">L</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Pts</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase text-center">NRR</span>
              </div>
              {table.map((row, i) => (
                <div key={row.team}
                  className={`grid grid-cols-[28px_1fr_36px_32px_32px_40px_58px] gap-1 px-3 py-3 border-b border-slate-50 last:border-0 items-center
                    ${i === 0 && row.mp > 0 ? 'bg-amber-50/40' : ''}`}>
                  <span className="text-[11px] font-black text-center"
                    style={{ color: i === 0 ? '#d97706' : i === 1 ? '#94a3b8' : i === 2 ? '#a16207' : '#94a3b8' }}>
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${i === 0 ? 'bg-amber-100' : 'bg-slate-100'}`}>
                      <Shield className={`w-3 h-3 ${i === 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">{row.team}</span>
                  </div>
                  <span className="text-xs text-slate-500 text-center">{row.mp}</span>
                  <span className="text-xs font-semibold text-emerald-600 text-center">{row.w}</span>
                  <span className="text-xs text-rose-500 text-center">{row.l}</span>
                  <span className="text-xs font-black text-indigo-700 text-center">{row.pts}</span>
                  <span className={`text-[11px] font-semibold text-center ${row.nrr >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {nrrStr(row.nrr)}
                  </span>
                </div>
              ))}
              {table.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-sm">No teams yet</div>
              )}
            </div>

            {/* Legend */}
            <p className="text-[10px] text-slate-400 text-center">Ranked by Points · Tie-broken by NRR · Win=2pts · Tie=1pt</p>
          </div>
        ) : (
          /* ── Matches Tab ── */
          <div className="space-y-2">
            {matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <TrendingUp className="w-12 h-12 text-slate-200" />
                <p className="text-slate-400 text-sm">No matches recorded yet</p>
              </div>
            ) : (
              matches.map(m => {
                const t1Won = m.winner === m.team1, t2Won = m.winner === m.team2;
                const tie = m.winner === 'tie';
                const t1o = calcOvers(m.team1_overs), t2o = calcOvers(m.team2_overs);
                const t1rr = t1o > 0 ? m.team1_score / t1o : 0;
                const t2rr = t2o > 0 ? m.team2_score / t2o : 0;
                const t1nrr = t1rr - t2rr, t2nrr = t2rr - t1rr;
                const rrStr = (r: number) => r.toFixed(2);
                const mnrrStr = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(3);
                return (
                  <div key={m.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Team 1 */}
                        <div className={`flex items-center justify-between py-1 ${t1Won ? 'font-black text-slate-900' : 'text-slate-500'}`}>
                          <div className="flex items-center gap-2">
                            {t1Won && <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">WON</span>}
                            <span className={`text-sm truncate ${t1Won ? 'font-black' : 'font-medium'}`}>{m.team1}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <span className="text-[10px] text-slate-400">RR {rrStr(t1rr)}</span>
                            <span className="text-sm font-mono">{m.team1_score}/{m.team1_wickets} <span className="text-[10px] font-normal text-slate-400">({m.team1_overs}ov)</span></span>
                          </div>
                        </div>
                        {/* Team 2 */}
                        <div className={`flex items-center justify-between py-1 ${t2Won ? 'font-black text-slate-900' : 'text-slate-500'}`}>
                          <div className="flex items-center gap-2">
                            {t2Won && <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">WON</span>}
                            <span className={`text-sm truncate ${t2Won ? 'font-black' : 'font-medium'}`}>{m.team2}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <span className="text-[10px] text-slate-400">RR {rrStr(t2rr)}</span>
                            <span className="text-sm font-mono">{m.team2_score}/{m.team2_wickets} <span className="text-[10px] font-normal text-slate-400">({m.team2_overs}ov)</span></span>
                          </div>
                        </div>
                        {tie && <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">TIE</span>}
                        {/* NRR impact row */}
                        <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-slate-50">
                          <div className="flex-1 bg-slate-50 rounded-lg px-2 py-1">
                            <p className="text-[9px] text-slate-400 uppercase font-bold">{m.team1} NRR impact</p>
                            <p className={`text-xs font-bold ${t1nrr >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{mnrrStr(t1nrr)}</p>
                          </div>
                          <div className="flex-1 bg-slate-50 rounded-lg px-2 py-1">
                            <p className="text-[9px] text-slate-400 uppercase font-bold">{m.team2} NRR impact</p>
                            <p className={`text-xs font-bold ${t2nrr >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{mnrrStr(t2nrr)}</p>
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDelete(m.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 shrink-0 transition-colors mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 border-t border-slate-50 pt-1">
                      {new Date(m.played_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* FAB – Start Match */}
      {status === 'active' && (
        <div className="shrink-0 p-3 border-t border-slate-100 bg-white space-y-2">
          {/* Winner bats first toggle — only shown when there's a known previous winner */}
          {lastWinnerName && (
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700">Winner bats first</p>
                <p className="text-[10px] text-slate-400 truncate">Last winner: <span className="font-medium text-indigo-600">{lastWinnerName}</span></p>
              </div>
              <button
                onClick={() => setWinnerBatsFirst(v => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${winnerBatsFirst ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${winnerBatsFirst ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          )}
          <button
            onClick={() => {
              const autoToss = winnerBatsFirst && lastWinnerName ? lastWinnerName : undefined;
              if (teams.length === 2) {
                onStartMatch(teams[0].team_name, teams[1].team_name, autoToss);
              } else {
                setPickerTeam1(teams[0]?.team_name ?? '');
                setPickerTeam2(teams[1]?.team_name ?? '');
                setShowMatchPicker(true);
              }
            }}
            className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all">
            <Trophy className="w-5 h-5" /> Start Live Match
          </button>
          <button onClick={() => setShowAdd(true)}
            className="w-full py-2 text-slate-400 text-xs font-medium flex items-center justify-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add result manually
          </button>
        </div>
      )}

      {/* Team picker for > 2 teams */}
      {showMatchPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowMatchPicker(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-800">Select Teams</h2>
              <button onClick={() => setShowMatchPicker(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            {(['Team 1', 'Team 2'] as const).map((label, idx) => {
              const val = idx === 0 ? pickerTeam1 : pickerTeam2;
              const setVal = idx === 0 ? setPickerTeam1 : setPickerTeam2;
              const other = idx === 0 ? pickerTeam2 : pickerTeam1;
              return (
                <div key={label}>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{label}</p>
                  <select value={val} onChange={e => setVal(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-400">
                    {teams.map(t => (
                      <option key={t.team_name} value={t.team_name} disabled={t.team_name === other}>
                        {t.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            <button
              disabled={!pickerTeam1 || !pickerTeam2 || pickerTeam1 === pickerTeam2}
              onClick={() => { setShowMatchPicker(false); onStartMatch(pickerTeam1, pickerTeam2, winnerBatsFirst && lastWinnerName ? lastWinnerName : undefined); }}
              className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" /> Start Match
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <AddMatchModal
          teams={teams}
          tournamentId={tournament.id}
          onSaved={reload}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
