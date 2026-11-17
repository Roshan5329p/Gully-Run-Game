/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ArrowLeftRight, ArrowUp, ArrowDown, Shield, Coffee, Zap, Trophy, Heart } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#1c0d06] border-2 border-amber-500/40 rounded-2xl shadow-2xl p-6 text-white my-auto max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400" />

        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-amber-200 font-cyber">How to Play: Gully Run</h2>
              <p className="text-xs text-amber-100/60">Bazaar Survival Rulebook</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#2c1509] border border-amber-500/30 text-amber-300 hover:text-white hover:bg-[#3d1e0d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Grid */}
        <div className="space-y-4">
          <div className="bg-[#241007] border border-amber-500/25 rounded-xl p-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
              <ArrowLeftRight className="w-4 h-4" /> Movement & Keyboard Controls
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-[#170a04] border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-1 font-bold text-amber-300 mb-1">
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-200 border border-stone-600">A</kbd> /{' '}
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-200 border border-stone-600">D</kbd> or{' '}
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-200 border border-stone-600">←</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-200 border border-stone-600">→</kbd>
                </div>
                <div className="text-amber-100/70 text-[11px]">Switch lanes left or right (or swipe on touch)</div>
              </div>
              <div className="p-2.5 bg-[#170a04] border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-1 font-bold text-amber-300 mb-1">
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-200 border border-stone-600">W</kbd> or{' '}
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-200 border border-stone-600">Space</kbd> or{' '}
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-200 border border-stone-600">↑</kbd>
                </div>
                <div className="text-amber-100/70 text-[11px]">Jump over vegetable crates & small barriers</div>
              </div>
              <div className="p-2.5 bg-[#170a04] border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-1 font-bold text-amber-300 mb-1">
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-200 border border-stone-600">S</kbd> or{' '}
                  <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-200 border border-stone-600">↓</kbd>
                </div>
                <div className="text-amber-100/70 text-[11px]">Slide under fruit shop awnings & market signboards</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-amber-200/60 flex items-center gap-2">
              <span>Pause / Resume:</span>
              <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-300 border border-stone-600">Esc</kbd> or{' '}
              <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-amber-300 border border-stone-600">P</kbd>
            </div>
          </div>

          {/* Gameplay Mechanics */}
          <div className="bg-[#241007] border border-amber-500/25 rounded-xl p-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Mechanics & Surviving Sharma Uncle
            </h3>
            <div className="space-y-2 text-xs text-amber-100/80">
              <div className="flex items-start gap-2">
                <Heart className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Stamina Hearts & Chappals:</strong> You start with 3 stamina hearts. Crashing into vegetable stalls or taking flying chappals deducts 1 heart and brings Uncle dangerously close.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Coffee className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Cutting Chai Rush:</strong> Drinking cutting chai restores 1 heart, activates 4 seconds of turbocharged sprinting, and puts huge distance between you and Uncle!
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Spell B-H-A-A-G-O:</strong> Collect glowing letters across the street to unlock massive point bonuses and Chai Tapri refreshment stops!
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-amber-500/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm rounded-xl transition-colors shadow-lg"
          >
            Got It, Let's Run!
          </button>
        </div>
      </div>
    </div>
  );
};
