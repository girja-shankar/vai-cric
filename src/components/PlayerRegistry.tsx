import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Users, Search } from 'lucide-react';
import { fetchRegisteredPlayers, addRegisteredPlayer, deleteRegisteredPlayer, RegisteredPlayer } from '../lib/supabase';

export default function PlayerRegistry({ onBack }: { onBack: () => void }) {
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const data = await fetchRegisteredPlayers();
      setPlayers(data);
      setLoading(false);
    })();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim() || adding) return;
    // Check duplicate
    if (players.some(p => p.name.toLowerCase() === newName.trim().toLowerCase())) {
      alert('Player already exists');
      return;
    }
    setAdding(true);
    const player = await addRegisteredPlayer(newName.trim());
    if (player) {
      setPlayers(prev => [...prev, player].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
    }
    setAdding(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from registry?`)) return;
    const ok = await deleteRegisteredPlayer(id);
    if (ok) setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const filtered = search
    ? players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : players;

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0">
      <div className="bg-indigo-600 text-white p-4 shadow-md shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Player Registry</h1>
            <p className="text-indigo-200 text-xs">{players.length} players registered</p>
          </div>
        </div>

        {/* Add Player */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add new player..."
            className="flex-1 bg-indigo-700/50 border border-indigo-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-indigo-300 focus:ring-2 focus:ring-white/30 outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || adding}
            className="px-4 py-2.5 bg-white text-indigo-700 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Search */}
      {players.length > 5 && (
        <div className="px-3 pt-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Player List */}
      <div className="flex-grow overflow-y-auto p-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Users className="w-12 h-12 text-slate-200" />
            <p className="text-slate-400 text-sm">{search ? 'No matches found' : 'No players yet'}</p>
            <p className="text-slate-300 text-[10px]">Add players above to build your roster</p>
          </div>
        ) : (
          filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center justify-between group">
              <span className="font-semibold text-sm text-slate-800">{p.name}</span>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 active:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
