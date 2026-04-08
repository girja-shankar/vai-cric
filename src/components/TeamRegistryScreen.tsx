import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Users, Crown, X, ChevronRight, Check } from 'lucide-react';
import { fetchGlobalTeams, createGlobalTeam, updateGlobalTeam, deleteGlobalTeam, fetchRegisteredPlayers, GlobalTeam, RegisteredPlayer } from '../lib/supabase';

type View = 'list' | 'edit';

export default function TeamRegistryScreen({ onBack, isAdmin }: { onBack: () => void; isAdmin: boolean }) {
  const [teams, setTeams] = useState<GlobalTeam[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<RegisteredPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [editingTeam, setEditingTeam] = useState<GlobalTeam | null>(null);

  // New team form
  const [newTeamName, setNewTeamName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editPlayerNames, setEditPlayerNames] = useState<string[]>([]);
  const [editCaptainName, setEditCaptainName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchGlobalTeams(), fetchRegisteredPlayers()]).then(([t, p]) => {
      setTeams(t);
      setRegisteredPlayers(p);
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    if (!newTeamName.trim() || creating) return;
    if (teams.some(t => t.name.toLowerCase() === newTeamName.trim().toLowerCase())) {
      alert('Team name already exists');
      return;
    }
    setCreating(true);
    const team = await createGlobalTeam(newTeamName.trim(), [], null);
    if (team) {
      setTeams(prev => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTeamName('');
      setShowCreateForm(false);
      // Open to edit players
      openEdit(team);
    }
    setCreating(false);
  };

  const openEdit = (team: GlobalTeam) => {
    setEditingTeam(team);
    setEditPlayerNames([...team.player_names]);
    setEditCaptainName(team.captain_name);
    setView('edit');
  };

  const handleSave = async () => {
    if (!editingTeam || saving) return;
    setSaving(true);
    const ok = await updateGlobalTeam(editingTeam.id, editPlayerNames, editCaptainName);
    if (ok) {
      setTeams(prev => prev.map(t => t.id === editingTeam.id ? { ...t, player_names: editPlayerNames, captain_name: editCaptainName } : t));
    }
    setSaving(false);
    setView('list');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete team "${name}"?`)) return;
    const ok = await deleteGlobalTeam(id);
    if (ok) setTeams(prev => prev.filter(t => t.id !== id));
  };

  const togglePlayer = (name: string) => {
    setEditPlayerNames(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
    // If removing captain, clear captain
    if (editCaptainName === name) setEditCaptainName(null);
  };

  // Edit view
  if (view === 'edit' && editingTeam) {
    const available = registeredPlayers.filter(rp => !editPlayerNames.includes(rp.name));
    const selected = editPlayerNames;

    return (
      <div className="h-full flex flex-col bg-slate-50 min-h-0">
        <div className="bg-indigo-600 text-white p-4 shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">{editingTeam.name}</h1>
              <p className="text-indigo-200 text-xs">{selected.length} players in squad</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-white text-indigo-700 rounded-xl font-bold text-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="flex-grow p-4 flex flex-col gap-4 overflow-y-auto min-h-0">
          {/* Selected players */}
          {selected.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Squad ({selected.length}) · Tap crown to set captain</p>
              <div className="space-y-1">
                {selected.map((name, i) => {
                  const isCaptain = editCaptainName === name;
                  return (
                    <div key={name} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${isCaptain ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-100'}`}>
                      <span className="text-xs font-mono text-slate-400 w-5 text-right shrink-0">{i + 1}</span>
                      <span className={`flex-1 text-base font-semibold ${isCaptain ? 'text-amber-800' : 'text-slate-800'}`}>{name}</span>
                      {isCaptain && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 rounded">C</span>}
                      <button
                        onClick={() => setEditCaptainName(isCaptain ? null : name)}
                        className={`p-1.5 rounded-lg transition-colors ${isCaptain ? 'text-amber-500 bg-amber-100' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                      >
                        <Crown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => togglePlayer(name)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available to add */}
          {available.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Tap to add</p>
              <div className="flex flex-wrap gap-2">
                {available.map(rp => (
                  <button
                    key={rp.id}
                    onClick={() => togglePlayer(rp.name)}
                    className="px-3 py-2 rounded-xl text-base font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all"
                  >
                    + {rp.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {registeredPlayers.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm font-semibold text-amber-700">No registered players</p>
              <p className="text-xs text-amber-500 mt-0.5">Go to Players from home screen to register players first</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0">
      <div className="bg-indigo-600 text-white p-4 shadow-md shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Teams</h1>
            <p className="text-indigo-200 text-xs">{teams.length} teams registered</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateForm(v => !v)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreateForm && isAdmin && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Team name (e.g. RCB, MI...)"
              className="flex-1 bg-white/20 text-white placeholder:text-indigo-300 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:bg-white/30"
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newTeamName.trim()}
              className="px-4 py-2 bg-white text-indigo-700 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95"
            >
              {creating ? '...' : 'Add'}
            </button>
          </div>
        )}
      </div>

      <div className="flex-grow overflow-y-auto min-h-0 p-4">
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center pt-10">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm font-medium">No teams yet</p>
            {isAdmin && <p className="text-slate-300 text-xs mt-1">Tap + to create your first team</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {teams.map(team => (
              <div
                key={team.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => openEdit(team)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors active:scale-[0.99]"
                >
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-base">{team.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {team.player_names.length} players
                      {team.captain_name && <span className="text-amber-500"> · {team.captain_name} (C)</span>}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
                {isAdmin && (
                  <div className="border-t border-slate-50 px-4 py-2 flex justify-end">
                    <button
                      onClick={() => handleDelete(team.id, team.name)}
                      className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-600 font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
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
