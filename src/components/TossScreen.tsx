import React, { useState } from 'react';
import { AppState } from '../types';
import { Action } from '../store';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function TossScreen({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const [wonBy, setWonBy] = useState<string | null>(null);
  const [electedTo, setElectedTo] = useState<'bat' | 'bowl' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const [tossResult, setTossResult] = useState<'Heads' | 'Tails' | null>(null);

  const flipCoin = () => {
    setIsFlipping(true);
    setWonBy(null);
    setElectedTo(null);
    setTossResult(null);
    setFlipCount(c => c + 1);
    
    setTimeout(() => {
      const isHeads = Math.random() > 0.5;
      const winner = Math.random() > 0.5 ? state.teams[0].id : state.teams[1].id;
      setTossResult(isHeads ? 'Heads' : 'Tails');
      setWonBy(winner);
      setIsFlipping(false);
    }, 1500);
  };

  const handleContinue = () => {
    if (wonBy && electedTo) {
      dispatch({ type: 'RECORD_TOSS', wonBy, electedTo });
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 min-h-0 relative">
      <div className="bg-indigo-600 text-white p-4 pb-8 rounded-b-[40px] shadow-md text-center relative overflow-hidden shrink-0">
        <button
          onClick={() => dispatch({ type: 'GO_BACK' })}
          className="absolute top-4 left-4 z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
        
        <div className="h-24 flex flex-col items-center justify-center">
          <motion.div
            animate={{ 
              rotateY: isFlipping ? flipCount * 1800 + 1800 : flipCount * 1800, 
              scale: isFlipping ? 1.5 : 1 
            }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="inline-block"
          >
            <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center border-4 border-amber-500 shadow-lg mx-auto">
              <span className="font-bold text-amber-900 text-2xl">
                {tossResult ? tossResult[0] : '?'}
              </span>
            </div>
          </motion.div>
          
          <div className="h-6 mt-2">
            {tossResult && !isFlipping && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-amber-300 font-bold text-lg"
              >
                It's {tossResult}!
              </motion.div>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-1">The Toss</h1>
        <p className="text-indigo-200 text-xs">Who won the toss and what did they choose?</p>
      </div>

      <div className="flex-grow p-4 -mt-6 flex flex-col justify-evenly min-h-0 overflow-hidden gap-2">
        {/* Flip Coin Button */}
        <button
          onClick={flipCoin}
          disabled={isFlipping}
          className="w-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-base py-3 rounded-2xl shadow-lg shadow-amber-200 transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          {isFlipping ? 'Flipping...' : 'Flip Coin'}
        </button>

        {/* Who won */}
        <div className={`bg-white rounded-3xl p-4 shadow-sm border border-slate-100 transition-opacity duration-300 shrink-0 ${isFlipping ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Toss Won By</h2>
          <div className="grid grid-cols-2 gap-2">
            {state.teams.map(team => (
              <button
                key={team.id}
                onClick={() => setWonBy(team.id)}
                className={`py-2 px-2 rounded-xl text-sm font-semibold text-center transition-all border-2 ${
                  wonBy === team.id 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>

        {/* Decision */}
        <div className={`bg-white rounded-3xl p-4 shadow-sm border border-slate-100 transition-opacity duration-300 shrink-0 ${wonBy ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Elected To</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setElectedTo('bat')}
              className={`py-2 px-2 rounded-xl text-sm font-semibold text-center transition-all border-2 ${
                electedTo === 'bat' 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' 
                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
              }`}
            >
              Bat First
            </button>
            <button
              onClick={() => setElectedTo('bowl')}
              className={`py-2 px-2 rounded-xl text-sm font-semibold text-center transition-all border-2 ${
                electedTo === 'bowl' 
                  ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' 
                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
              }`}
            >
              Bowl First
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0 shrink-0">
        <button 
          onClick={handleContinue}
          disabled={!wonBy || !electedTo}
          className="w-full bg-indigo-600 disabled:bg-slate-300 disabled:text-slate-500 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold text-base flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
        >
          Start Match <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
