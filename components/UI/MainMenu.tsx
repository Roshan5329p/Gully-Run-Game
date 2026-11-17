/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Flame,
  Infinity,
  HelpCircle,
  Sliders,
  Award,
  Volume2,
  VolumeX,
  Target,
  Users,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { useStore, CHARACTER_PROFILES } from '../../store';
import { GameMode } from '../../types';
import { audio } from '../System/Audio';

interface MainMenuProps {
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onOpenProgression: (tab?: 'missions' | 'characters' | 'leaderboard' | 'reviews') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onOpenHowToPlay,
  onOpenSettings,
  onOpenProgression,
}) => {
  const {
    gameMode,
    setGameMode,
    startGame,
    replayIntro,
    highScore,
    bestDistance,
    selectedCharacter,
    masterVolume,
    setMasterVolume,
    persistentWallet,
  } = useStore();

  const [selectedMode, setSelectedMode] = useState<GameMode>(gameMode || 'REGULAR');
  const activeChar = CHARACTER_PROFILES[selectedCharacter] || CHARACTER_PROFILES['RAJU_CRICKETER'];

  const isMuted = masterVolume === 0;

  const handleStartGame = () => {
    audio.init();
    startGame(selectedMode);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-between p-4 md:p-8 bg-gradient-to-b from-[#140602]/95 via-[#1a0b05]/90 to-[#0e0401]/98 text-white pointer-events-auto overflow-y-auto">
      {/* Ambient glowing bazaar lights in the background */}
      <div className="fixed inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_50%_25%,_rgba(245,158,11,0.25)_0%,_rgba(180,83,9,0.12)_45%,_transparent_75%)]" />

      {/* Top Bar: High Scores & Quick Settings */}
      <header className="relative z-10 flex items-center justify-between w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-2 md:gap-3 bg-[#241007]/80 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl backdrop-blur-md">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-xs">
            <span className="text-amber-200/70 uppercase text-[10px] tracking-wider block font-medium">Personal Best</span>
            <span className="font-mono font-extrabold text-amber-300">
              ₹{highScore.toLocaleString()} · {Math.floor(bestDistance)}m
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Persistent Wallet Pill */}
          <button
            type="button"
            onClick={() => onOpenProgression('characters')}
            className="flex items-center gap-1.5 bg-[#241007]/80 hover:bg-[#34170b] border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs text-amber-300 font-mono transition-colors"
          >
            <span className="text-yellow-400 font-bold">₹</span>
            <span>{persistentWallet.toLocaleString()}</span>
            <span className="text-[10px] text-amber-200/60 uppercase">Wallet</span>
          </button>

          {/* Mute/Unmute */}
          <button
            type="button"
            onClick={() => {
              if (isMuted) setMasterVolume(0.75);
              else setMasterVolume(0);
            }}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2.5 bg-[#241007]/80 hover:bg-[#34170b] border border-amber-500/30 rounded-xl text-amber-300 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings"
            className="p-2.5 bg-[#241007]/80 hover:bg-[#34170b] border border-amber-500/30 rounded-xl text-amber-300 transition-colors"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </header>

      {/* Center Cinematic Hero Area */}
      <main className="relative z-10 w-full max-w-4xl mx-auto my-auto text-center py-6">
        {/* Subtitle Lore Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Sharma Niwas Gully Cricket Special</span>
        </div>

        {/* Layered Cinematic Title Typography */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black font-cyber tracking-tight leading-none mb-1 bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(245,158,11,0.4)]">
          GULLY RUNNER
        </h1>
        <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-amber-200/90 font-cyber tracking-wider mb-4">
          भागो बेटा! BHAAGO BETA!
        </div>

        <p className="max-w-xl mx-auto text-amber-100/75 text-xs sm:text-sm md:text-base leading-relaxed mb-8">
          Your sixer shattered Sharma Uncle’s living room glass. Now dodge auto-rickshaws, leap vegetable crates, and sprint for your life through the vibrant Indian bazaar streets!
        </p>

        {/* Clear Mode Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6 text-left">
          {/* Mode 1: Regular Campaign */}
          <div
            onClick={() => setSelectedMode('REGULAR')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 ${
              selectedMode === 'REGULAR'
                ? 'bg-[#2a1308] border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.25)] scale-[1.02]'
                : 'bg-[#1e0d05]/80 border-amber-500/25 hover:border-amber-500/40 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Story Campaign
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                3 Levels
              </span>
            </div>
            <div className="text-lg font-extrabold text-white font-cyber mb-1">
              Regular Mohalla Run
            </div>
            <p className="text-xs text-amber-100/70 leading-relaxed">
              Sprint through Subzi Mandi, Street Bazaar, and Temple Ghats to shake off Sharma Uncle and win!
            </p>
          </div>

          {/* Mode 2: Endless Wave Run */}
          <div
            onClick={() => setSelectedMode('ENDLESS')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 ${
              selectedMode === 'ENDLESS'
                ? 'bg-[#2a1308] border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.25)] scale-[1.02]'
                : 'bg-[#1e0d05]/80 border-amber-500/25 hover:border-amber-500/40 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                <Infinity className="w-3.5 h-3.5" /> Endless Mode
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Wave 1+
              </span>
            </div>
            <div className="text-lg font-extrabold text-white font-cyber mb-1">
              Endless Bazaar Wave
            </div>
            <p className="text-xs text-amber-100/70 leading-relaxed">
              Non-stop endless high-score chase. Infinite flying chappals, increasing speeds, and top leaderboard points!
            </p>
          </div>
        </div>

        {/* Selected Runner Preview Pill */}
        <div className="inline-flex items-center gap-3 bg-[#241007]/90 border border-amber-500/30 px-4 py-2.5 rounded-2xl mb-8 max-w-md w-full justify-between">
          <div className="flex items-center gap-2.5 text-left">
            <span className="text-2xl">{activeChar.icon}</span>
            <div>
              <div className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <span>{activeChar.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">
                  {activeChar.role}
                </span>
              </div>
              <div className="text-[11px] text-amber-200/70 truncate max-w-[210px]">
                {activeChar.perk}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenProgression('characters')}
            className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors shrink-0"
          >
            Change
          </button>
        </div>

        {/* Primary Call-to-Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <button
            type="button"
            onClick={handleStartGame}
            className="w-full sm:flex-1 py-4 px-8 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-lg md:text-xl rounded-2xl transition-all shadow-[0_6px_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2.5 active:scale-98"
          >
            <Play className="w-6 h-6 fill-stone-950" />
            <span>START SPRINT</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenProgression('missions')}
            className="w-full sm:w-auto px-5 py-4 bg-[#2c1509] hover:bg-[#3d1e0d] text-amber-200 border border-amber-500/40 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Target className="w-4 h-4 text-amber-400" />
            <span>Missions & Ranks</span>
          </button>
        </div>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between w-full max-w-6xl mx-auto pt-4 border-t border-amber-500/20 text-xs text-amber-200/60">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="hover:text-amber-300 transition-colors flex items-center gap-1.5 font-semibold"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>How to Play & Controls</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenProgression('reviews')}
            className="hover:text-amber-300 transition-colors flex items-center gap-1.5 font-semibold"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Mohalla Reviews</span>
          </button>

          <button
            type="button"
            onClick={replayIntro}
            className="hover:text-amber-300 transition-colors flex items-center gap-1.5 font-semibold"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Replay Story Intro</span>
          </button>
        </div>

        <div className="mt-2 sm:mt-0 text-[11px] font-mono text-amber-200/50">
          Controls: <kbd className="px-1 bg-stone-800 rounded text-amber-300">A/D</kbd> Lanes ·{' '}
          <kbd className="px-1 bg-stone-800 rounded text-amber-300">W</kbd> Jump ·{' '}
          <kbd className="px-1 bg-stone-800 rounded text-amber-300">S</kbd> Slide ·{' '}
          <kbd className="px-1 bg-stone-800 rounded text-amber-300">Esc/P</kbd> Pause
        </div>
      </footer>
    </div>
  );
};
