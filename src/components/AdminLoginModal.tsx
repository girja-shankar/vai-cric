import React, { useState } from 'react';
import { X, Lock, LogOut, Eye, EyeOff } from 'lucide-react';
import { signIn, signOut } from '../lib/supabase';

type Props = {
  isAdmin: boolean;
  onClose: () => void;
  onAuthChange: (isAdmin: boolean) => void;
};

export default function AdminLoginModal({ isAdmin, onClose, onAuthChange }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError('Invalid email or password');
    } else {
      onAuthChange(true);
      onClose();
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    onAuthChange(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-3xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            <h2 className="font-black text-slate-800">Admin</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {isAdmin ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-emerald-700">Logged in as admin</p>
              <p className="text-xs text-emerald-500 mt-0.5">Delete controls are now visible</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Email</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Password</p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 pr-10"
                />
                <button
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={!email || !password || loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Lock className="w-4 h-4" />}
              Log In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
