import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trophy, ChevronRight, X, Check, Trash2 } from 'lucide-react';
import { fetchTournaments, createTournament, deleteTournament, Tournament } from '../lib/supabase';

type Props = {
  onBack: () => void;
  onOpen: (t: Tournament) => void;
};

export default function TournamentListScreen({ onBack, onOpen }: Props) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [teams, setTeams] = useState<string[]>(['', '']);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchTournaments().then(data => { setTournaments(data); setLoading(false); });
  }, []);

  const addTeamField = () => setTeams(t => [...t, '']);
  const removeTeamField = (i: number) => setTeams(t => t.filter((_, idx) => idx !== i));
  const updateTeam = (i: number, val: string) => setTeams(t => t.map((v, idx) => idx === i ? val : v));

  const handleCreate = async () => {
    const validTeams = teams.map(t => t.trim()).filter(Boolean);
    if (!name.trim() || validTeams.length < 2) return;
    setSaving(true);
    const t = await createTournament(name.trim(), validTeams);
    if (t) {
      setTournaments(prev => [t, ...prev]);
      setCreating(false);
      setName('');
      setTeams(['', '']);
    }
    setSaving(false);
  };

  const canCreate = name.trim().length > 0 && teams.filter(t => t.trim()).length >= 2;

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteTournament(id);
    setTournaments(prev => prev.filter(t => t.id !== id));
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Tournaments</h1>
            <p className="text-indigo-200 text-xs">{tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-3 space-y-3">
        {/* Create form */}
        {creating && (
          <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-sm text-slate-800">New Tournament</h2>
              <button onClick={() => { setCreating(false); setName(''); setTeams(['', '']); }}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tournament name"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
            />

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teams</p>
              {teams.map((t, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={t}
                    onChange={e => updateTeam(i, e.target.value)}
                    placeholder={`Team ${i + 1}`}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  {teams.length > 2 && (
                    <button onClick={() => removeTeamField(i)} className="p-1.5 text-slate-400 hover:text-rose-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addTeamField}
                className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" /> Add team
              </button>
            </div>

            <button
              onClick={handleCreate}
              disabled={!canCreate || saving}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
              Create Tournament
            </button>
          </div>
        )}

        {/* Tournament list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : tournaments.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Trophy className="w-8 h-8 text-indigo-300" />
            </div>
            <p className="text-slate-400 text-sm">No tournaments yet</p>
            <button
              onClick={() => setCreating(true)}
              className="bg-indigo-600 text-white rounded-xl px-5 py-2.5 font-bold text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create First Tournament
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {tournaments.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => onOpen(t)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.status === 'active' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                      <Trophy className={`w-5 h-5 ${t.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 truncate">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.status === 'active' ? 'Active' : 'Completed'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(confirmDeleteId === t.id ? null : t.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {confirmDeleteId === t.id && (
                  <div className="px-4 pb-3 flex items-center gap-2 border-t border-rose-50 bg-rose-50/50">
                    <p className="text-xs text-rose-600 flex-1">Delete this tournament and all its matches?</p>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-1.5 text-xs text-slate-500 font-medium rounded-lg hover:bg-slate-100"
                    >Cancel</button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deletingId === t.id}
                      className="px-3 py-1.5 text-xs text-white font-bold bg-rose-500 rounded-lg disabled:opacity-50 flex items-center gap-1"
                    >
                      {deletingId === t.id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
