/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Trophy, MapPin, Coins, RotateCcw, Home, Sparkles, Award, ArrowRight, Zap, Target } from 'lucide-react';
import { useStore, getEnvironmentZone } from '../../store';
import { GameStatus } from '../../types';
import { audio } from '../System/Audio';

interface ResultsModalProps {
  type: GameStatus.GAME_OVER | GameStatus.VICTORY;
  onOpenProgression: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({ type, onOpenProgression }) => {
  const {
    score,
    highScore,
    distance,
    bestDistance,
    level,
    gemsCollected,
    gameMode,
    restartGame,
    continueToEndless,
    setStatus,
  } = useStore();

  const isVictory = type === GameStatus.VICTORY;
  const isEndless = gameMode === 'ENDLESS';
  const isNewHighScore = score > 0 && score >= highScore;
  const isNewBestDist = distance > 0 && distance >= bestDistance;
  const earnedWalletBonus = Math.max(10, Math.floor(score * 0.1));

  // Score counter animation
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = score / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setDisplayedScore(score);
        clearInterval(timer);
      } else {
        setDisplayedScore(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  const zone = getEnvironmentZone(distance, level);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 pointer-events-auto overflow-y-auto">
      {/* Background radial atmosphere */}
      <div
        className={`fixed inset-0 pointer-events-none opacity-40 ${
          isVictory
            ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/30 via-orange-950/20 to-transparent'
            : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-800/25 via-stone-950/40 to-transparent'
        }`}
      />

      <div className="relative w-full max-w-lg bg-[#180a04] border-2 border-amber-500/40 rounded-3xl shadow-2xl p-6 md:p-8 text-white my-auto overflow-hidden">
        {/* Animated Top Flare */}
        <div
          className={`absolute top-0 left-0 right-0 h-2 ${
            isVictory
              ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500'
              : 'bg-gradient-to-r from-orange-600 via-red-500 to-amber-600'
          }`}
        />

        {/* Header Badge */}
        <div className="flex justify-center mb-2">
          <div
            className={`px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest flex items-center gap-1.5 shadow-md ${
              isVictory
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                : 'bg-red-500/20 text-red-300 border border-red-500/40'
            }`}
          >
            {isVictory ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Mohalla Escape Achieved!</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-red-400" />
                <span>{isEndless ? 'Endless Sprint Concluded' : 'Caught by Sharma Uncle!'}</span>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-amber-200 font-cyber text-center mb-1">
          {isVictory ? 'Bhaag Gaye Beta!' : 'Pakde Gaye Beta!'}
        </h1>
        <p className="text-xs md:text-sm text-amber-100/70 text-center mb-6">
          {isVictory
            ? 'Sharma Uncle stopped at Raju’s Chai Stall to catch his breath. You cleared all 3 mohalla levels!'
            : '“Arey ruk beta! Meri khidki ka kaanch todke kahan bhaag raha tha?!”'}
        </p>

        {/* New Record Banner if applicable */}
        {isNewHighScore && (
          <div className="mb-5 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-stone-950 font-extrabold px-4 py-2 rounded-xl text-center shadow-lg flex items-center justify-center gap-2 animate-pulse">
            <Trophy className="w-5 h-5 fill-stone-950" />
            <span className="text-xs md:text-sm font-cyber uppercase tracking-wider">
              New Personal High Score!
            </span>
          </div>
        )}

        {/* Main Score Reveal Card */}
        <div className="bg-[#241007] border border-amber-500/30 rounded-2xl p-5 mb-5 text-center relative overflow-hidden">
          <div className="text-xs font-bold uppercase tracking-widest text-amber-300/80 mb-1">
            Total Gully Score
          </div>
          <div className="text-4xl md:text-5xl font-extrabold font-mono text-amber-400 tabular-nums mb-2">
            ₹{displayedScore.toLocaleString()}
          </div>

          {/* Comparison to High Score */}
          {!isNewHighScore && highScore > 0 && (
            <div className="text-xs text-amber-200/60 font-mono">
              All-Time Best: ₹{highScore.toLocaleString()} ({Math.round((score / highScore) * 100)}%)
            </div>
          )}

          {/* Gully Wallet Reward Earned */}
          <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between text-xs px-2">
            <span className="text-amber-200/80 font-medium">10% Bazaar Run Bonus:</span>
            <span className="font-mono font-extrabold text-yellow-300 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" /> +₹{earnedWalletBonus} to Gully Wallet
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#241007] border border-amber-500/20 p-3 rounded-xl text-center">
            <div className="text-[10px] uppercase text-amber-200/60 font-bold mb-1 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3 text-orange-400" /> Distance
            </div>
            <div className="text-lg md:text-xl font-extrabold font-mono text-orange-300 tabular-nums">
              {Math.floor(distance)}m
            </div>
            {isNewBestDist && (
              <span className="text-[9px] text-amber-400 font-extrabold block">Best Run!</span>
            )}
          </div>

          <div className="bg-[#241007] border border-amber-500/20 p-3 rounded-xl text-center">
            <div className="text-[10px] uppercase text-amber-200/60 font-bold mb-1 flex items-center justify-center gap-1">
              <Coins className="w-3 h-3 text-yellow-400" /> Samosas
            </div>
            <div className="text-lg md:text-xl font-extrabold font-mono text-yellow-300 tabular-nums">
              {gemsCollected}
            </div>
          </div>

          <div className="bg-[#241007] border border-amber-500/20 p-3 rounded-xl text-center">
            <div className="text-[10px] uppercase text-amber-200/60 font-bold mb-1 flex items-center justify-center gap-1">
              <Award className="w-3 h-3 text-amber-400" /> Zone
            </div>
            <div className="text-xs font-bold text-amber-100 truncate mt-1">
              {isEndless ? `Wave ${level}` : `Level ${level}`}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isVictory && (
            <button
              onClick={() => {
                audio.init();
                continueToEndless();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-stone-950 font-extrabold text-sm md:text-base rounded-xl transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5 fill-stone-950" />
              <span>Continue into Endless Mode (Wave 4+) ∞</span>
            </button>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                audio.init();
                restartGame();
              }}
              className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm md:text-base rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Run Again</span>
            </button>

            <button
              onClick={onOpenProgression}
              className="px-5 py-3.5 bg-[#2c1509] hover:bg-[#3d1e0d] text-amber-200 border border-amber-500/35 font-bold text-xs md:text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Target className="w-4 h-4 text-amber-400" />
              <span>Missions & Upgrades</span>
            </button>
          </div>

          <button
            onClick={() => setStatus(GameStatus.MENU)}
            className="w-full py-2.5 bg-[#1d0b04] hover:bg-[#2c1509] text-stone-400 hover:text-white border border-amber-500/15 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" /> Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
