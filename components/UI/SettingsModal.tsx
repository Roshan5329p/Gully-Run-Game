/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Volume2, VolumeX, Sliders, Eye, Sparkles } from 'lucide-react';
import { useStore } from '../../store';
import { audio } from '../System/Audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    masterVolume,
    setMasterVolume,
    reducedCameraShake,
    toggleReducedCameraShake,
    skipIntro,
    setSkipIntro,
  } = useStore();

  if (!isOpen) return null;

  const isMuted = masterVolume === 0;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVolume(val);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setMasterVolume(0.75);
    } else {
      setMasterVolume(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
      <div className="relative w-full max-w-md bg-[#1c0d06] border-2 border-amber-500/40 rounded-2xl shadow-2xl p-6 text-white overflow-hidden">
        {/* Header Scrim */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400" />

        <div className="flex items-center justify-between pb-4 border-b border-amber-500/20 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-amber-200 font-cyber">Game Settings</h2>
              <p className="text-xs text-amber-100/60">Preferences saved automatically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#2c1509] border border-amber-500/30 text-amber-300 hover:text-white hover:bg-[#3d1e0d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Audio Master Volume */}
          <div className="bg-[#241007] border border-amber-500/25 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-stone-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-amber-400" />
                )}
                <span className="text-sm font-bold text-amber-100">Bazaar Master Volume</span>
              </div>
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
              >
                {isMuted ? 'UNMUTE' : `${Math.round(masterVolume * 100)}%`}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={handleVolumeChange}
              className="w-full accent-amber-500 bg-stone-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-amber-200/50 mt-1 font-mono">
              <span>0% (Mute)</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Camera Shake Accessibility */}
          <div className="bg-[#241007] border border-amber-500/25 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-start gap-2.5 max-w-[240px]">
              <Eye className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-bold text-amber-100">Reduced Camera Shake</div>
                <div className="text-xs text-amber-200/60 leading-snug">
                  Smooth camera motion on chappal impacts and near misses (Accessibility).
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleReducedCameraShake}
              className={`w-12 h-6 rounded-full transition-colors relative border ${
                reducedCameraShake
                  ? 'bg-amber-500 border-amber-400'
                  : 'bg-stone-800 border-stone-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  reducedCameraShake ? 'left-6.5 translate-x-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Skip Story Intro */}
          <div className="bg-[#241007] border border-amber-500/25 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-start gap-2.5 max-w-[240px]">
              <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-bold text-amber-100">Always Skip Intro Cutscene</div>
                <div className="text-xs text-amber-200/60 leading-snug">
                  Jump straight into the bazaar run without the window smash comic sequence.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSkipIntro(!skipIntro)}
              className={`w-12 h-6 rounded-full transition-colors relative border ${
                skipIntro
                  ? 'bg-amber-500 border-amber-400'
                  : 'bg-stone-800 border-stone-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                  skipIntro ? 'left-6.5 translate-x-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-amber-500/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm rounded-xl transition-colors shadow-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
