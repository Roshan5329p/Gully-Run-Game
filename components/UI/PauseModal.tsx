/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Home, Sliders, Trophy, MapPin, Coins } from 'lucide-react';
import { useStore, getEnvironmentZone } from '../../store';
import { GameStatus } from '../../types';

interface PauseModalProps {
  onOpenSettings: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onOpenSettings }) => {
  const {
    score,
    distance,
    level,
    gemsCollected,
    comboMultiplier,
    resumeGame,
    restartGame,
    setStatus,
  } = useStore();

  const environmentZone = getEnvironmentZone(distance, level);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto">
      <div className="relative w-full max-w-md bg-[#1c0d06] border-2 border-amber-500/50 rounded-2xl shadow-2xl p-6 text-white text-center">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 rounded-t-2xl" />

        {/* Header */}
        <div className="inline-block px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-[11px] font-extrabold uppercase tracking-widest text-amber-400 mb-2">
          Run Paused
        </div>
        <h2 className="text-3xl font-extrabold text-amber-200 font-cyber mb-1">
          Bazaar Chitra-Viram
        </h2>
        <p className="text-xs text-amber-100/60 mb-5">
          Press <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-300 font-mono">Esc</kbd> or{' '}
          <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-300 font-mono">P</kbd> to resume
        </p>

        {/* Current Run Snapshot */}
        <div className="grid grid-cols-3 gap-2.5 bg-[#251007] border border-amber-500/25 rounded-xl p-3 mb-6 text-left">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber-200/60 font-semibold flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Score
            </div>
            <div className="text-base font-extrabold font-mono text-amber-300 tabular-nums">
              ₹{score.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber-200/60 font-semibold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-orange-400" /> Distance
            </div>
            <div className="text-base font-extrabold font-mono text-orange-200 tabular-nums">
              {Math.floor(distance)}m
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber-200/60 font-semibold flex items-center gap-1">
              <Coins className="w-3 h-3 text-yellow-400" /> Samosas
            </div>
            <div className="text-base font-extrabold font-mono text-yellow-300 tabular-nums">
              {gemsCollected}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={resumeGame}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-base rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-stone-950" /> Resume Run
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-3 bg-[#2c1509] hover:bg-[#3b1d0d] text-amber-200 border border-amber-500/35 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Sliders className="w-4 h-4 text-amber-400" /> Audio & Settings
          </button>

          <div className="flex gap-2.5">
            <button
              onClick={restartGame}
              className="flex-1 py-2.5 bg-[#2c1509] hover:bg-[#3b1d0d] text-stone-300 hover:text-white border border-amber-500/20 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart Run
            </button>
            <button
              onClick={() => setStatus(GameStatus.MENU)}
              className="flex-1 py-2.5 bg-[#2c1509] hover:bg-[#3b1d0d] text-stone-300 hover:text-white border border-amber-500/20 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" /> Quit to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
