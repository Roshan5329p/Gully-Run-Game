/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Trophy,
  Coins,
  ArrowUpCircle,
  Shield,
  Activity,
  Coffee,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Target,
  Zap,
  Magnet,
  Clock,
  Sparkles,
  Award,
  Sliders,
} from 'lucide-react';
import {
  useStore,
  calculateGullyLightingGrade,
  getEnvironmentZone,
} from '../../store';
import { GameStatus, GEMINI_COLORS, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';
import { MainMenu } from './MainMenu';
import { PauseModal } from './PauseModal';
import { ResultsModal } from './ResultsModal';
import { ProgressionModal } from './ProgressionModal';
import { SettingsModal } from './SettingsModal';
import { HowToPlayModal } from './HowToPlayModal';

// Available Chai Tapri Shop Items (with Gully 2.0 Power-Ups)
const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'DOUBLE_JUMP',
    name: 'Gully Parkour',
    description: 'Double jump in mid-air to leap right over parked auto-rickshaws and city buses.',
    cost: 1000,
    icon: ArrowUpCircle,
    oneTime: true,
  },
  {
    id: 'RICKSHAW_SHIELD',
    name: 'Auto-Rickshaw Shield',
    description: 'Equips a glowing bumper aura that absorbs 1 major vehicle or chappal collision.',
    cost: 1200,
    icon: Shield,
    oneTime: true,
  },
  {
    id: 'EMERGENCY_DODGE',
    name: 'Reflex Phase Dodge',
    description: 'One-time emergency reflex save that automatically phases through a fatal hit.',
    cost: 1400,
    icon: Zap,
    oneTime: true,
  },
  {
    id: 'COIN_MAGNET',
    name: 'Chumbak Coin Magnet',
    description: 'Pulls all nearby samosas and golden rupees across every lane toward you for 10s.',
    cost: 900,
    icon: Magnet,
  },
  {
    id: 'MAX_LIFE',
    name: 'Garam Samosa Plate',
    description: 'Adds +1 extra stamina heart slot and restores 1 heart for the remainder of this run.',
    cost: 1500,
    icon: Activity,
  },
  {
    id: 'HEAL',
    name: 'Cutting Masala Chai',
    description: 'Instantly restores 1 stamina heart to put distance between you and Uncle.',
    cost: 1000,
    icon: Coffee,
  },
  {
    id: 'IMMORTAL',
    name: 'Maa Ka Aashirwad',
    description: 'Press Space or Tap during a run for 5 seconds of unstoppable golden blessing.',
    cost: 3000,
    icon: Sparkles,
    oneTime: true,
  },
];

const ShopScreen: React.FC = () => {
  const {
    score,
    buyItem,
    closeShop,
    hasDoubleJump,
    hasImmortality,
    hasShield,
    hasEmergencyDodge,
    lives,
    maxLives,
  } = useStore();
  const [items, setItems] = useState<ShopItem[]>([]);

  useEffect(() => {
    let pool = SHOP_ITEMS.filter(item => {
      if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
      if (item.id === 'IMMORTAL' && hasImmortality) return false;
      if (item.id === 'RICKSHAW_SHIELD' && hasShield) return false;
      if (item.id === 'EMERGENCY_DODGE' && hasEmergencyDodge) return false;
      if (item.id === 'HEAL' && lives >= maxLives) return false;
      return true;
    });

    pool = pool.sort(() => 0.5 - Math.random());
    setItems(pool.slice(0, 3));
  }, [hasDoubleJump, hasImmortality, hasShield, hasEmergencyDodge, lives, maxLives]);

  return (
    <div className="absolute inset-0 bg-[#1c0d06]/95 z-[100] text-amber-50 pointer-events-auto overflow-y-auto">
      <div className="flex flex-col items-center justify-center min-h-full py-8 px-4 max-w-5xl mx-auto">
        <p className="text-xs font-semibold tracking-widest text-amber-400 uppercase mb-1">
          Roadside Refreshment Stop
        </p>
        <h2 className="text-3xl md:text-5xl font-extrabold text-amber-300 mb-3 font-cyber text-center">
          Raju Chai Tapri
        </h2>
        <div className="flex items-center gap-2 text-amber-200 mb-8 text-sm md:text-base">
          <span>Bazaar Points Available:</span>
          <span className="text-xl md:text-2xl font-bold font-mono tabular-nums text-amber-400">
            ₹{score.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-8">
          {items.map(item => {
            const Icon = item.icon;
            const canAfford = score >= item.cost;
            return (
              <div
                key={item.id}
                className="bg-[#2c1509] border border-amber-500/25 p-6 rounded-xl flex flex-col items-center text-center hover:border-amber-400 transition-colors"
              >
                <div className="bg-amber-500/15 p-3.5 rounded-lg mb-4 text-amber-400">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                <p className="text-amber-100/75 text-sm mb-6 leading-relaxed flex-1 flex items-center justify-center">
                  {item.description}
                </p>
                <button
                  onClick={() => buyItem(item.id as any, item.cost)}
                  disabled={!canAfford}
                  className={`px-5 py-2.5 rounded-lg font-bold w-full text-sm transition-colors whitespace-nowrap shrink-0 ${
                    canAfford
                      ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  Buy for ₹{item.cost}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={closeShop}
          className="flex items-center px-8 py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-base md:text-lg rounded-lg transition-colors shadow-lg whitespace-nowrap shrink-0"
        >
          Keep Running <Play className="ml-2 w-5 h-5" fill="white" />
        </button>
      </div>
    </div>
  );
};

export const HUD: React.FC = () => {
  const {
    score,
    gameMode,
    lives,
    maxLives,
    collectedLetters,
    status,
    level,
    gemsCollected,
    distance,
    isImmortalityActive,
    isStumbling,
    isChaiBoostActive,
    isMagnetActive,
    isSlowMotionActive,
    hasShield,
    isDoubleScoreActive,
    hasEmergencyDodge,
    nearMissStreak,
    lastNearMissLabel,
    lastNearMissPoints,
    nearMissBannerVisible,
    recentAchievementBanner,
    activeNotification,
    comboCount,
    comboMultiplier,
    lastComboLabel,
    speed,
    setSkipIntro,
    completeIntro,
    uncleDialogueBanner,
    togglePause,
    masterVolume,
    setMasterVolume,
  } = useStore();

  const target = ['B', 'H', 'A', 'A', 'G', 'O'];
  const [introBeat, setIntroBeat] = useState<1 | 2 | 3>(1);
  const [chaiTimeLeft, setChaiTimeLeft] = useState(0);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isProgressionOpen, setIsProgressionOpen] = useState(false);
  const [progressionTab, setProgressionTab] = useState<'missions' | 'characters' | 'leaderboard' | 'reviews'>('missions');

  const isMuted = masterVolume === 0;

  // Track 4.0s Cutting Chai invincibility & speed boost countdown
  useEffect(() => {
    if (!isChaiBoostActive) {
      setChaiTimeLeft(0);
      return;
    }
    let expiresAt = performance.now() + 4000;
    setChaiTimeLeft(4.0);

    const handleRefresh = () => {
      expiresAt = performance.now() + 4000;
      setChaiTimeLeft(4.0);
    };
    window.addEventListener('chai-boost', handleRefresh);

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, (expiresAt - performance.now()) / 1000);
      setChaiTimeLeft(remaining);
    }, 80);

    return () => {
      window.removeEventListener('chai-boost', handleRefresh);
      window.clearInterval(interval);
    };
  }, [isChaiBoostActive]);

  useEffect(() => {
    if (status !== GameStatus.INTRO) {
      setIntroBeat(1);
      return;
    }
    setIntroBeat(1);
    const onShatter = () => setIntroBeat(2);
    const onStorm = () => setIntroBeat(3);
    window.addEventListener('intro-window-shatter', onShatter);
    window.addEventListener('intro-uncle-storm', onStorm);
    return () => {
      window.removeEventListener('intro-window-shatter', onShatter);
      window.removeEventListener('intro-uncle-storm', onStorm);
    };
  }, [status]);

  // Sync dynamic Bazaar Ambient Soundscape & Upbeat Percussion with running intensity
  useEffect(() => {
    const speedRatio = speed > 0 ? speed / RUN_SPEED_BASE : 1.0;
    audio.updateBazaarIntensity?.({
      isPlaying: status === GameStatus.PLAYING,
      isShop: status === GameStatus.SHOP || status === GameStatus.INTRO,
      speedRatio,
      level,
      isChaiBoostActive,
      isStumbling,
      comboCount,
      lives,
    });
  }, [status, speed, level, isChaiBoostActive, isStumbling, comboCount, lives]);

  const handleOpenProgression = (tab?: 'missions' | 'characters' | 'leaderboard' | 'reviews') => {
    setProgressionTab(tab || 'missions');
    setIsProgressionOpen(true);
  };

  // Modals Overlay (always available)
  const renderModals = () => (
    <>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <HowToPlayModal isOpen={isHowToPlayOpen} onClose={() => setIsHowToPlayOpen(false)} />
      {isProgressionOpen && (
        <ProgressionModal
          defaultTab={progressionTab}
          onClose={() => setIsProgressionOpen(false)}
        />
      )}
    </>
  );

  if (status === GameStatus.SHOP) {
    return (
      <>
        {renderModals()}
        <ShopScreen />
      </>
    );
  }

  if (status === GameStatus.INTRO) {
    const beatContent =
      introBeat === 1
        ? {
            tag: 'Gully Cricket · Sunday 4:45 PM',
            title: 'Last Ball of the Match... Massive SIXER!',
            desc: 'You swing your Kashmir Willow bat with everything you’ve got...',
            accent: 'border-amber-400 text-amber-300',
          }
        : introBeat === 2
        ? {
            tag: 'Direct Hit · Sharma Niwas',
            title: 'CRASH!! Right Through Sharma Uncle’s Window & Chai!',
            desc: 'The leather ball shatters his living-room glass and sends his afternoon masala chai flying!',
            accent: 'border-orange-500 text-orange-300',
          }
        : {
            tag: 'Code Red · Flying Chappal Alert',
            title: '“Meri Khidki Tod Di?! RUK BETA!”',
            desc: 'Sharma Uncle storms out onto the bazaar street waving his chappal. BHAAGO!',
            accent: 'border-red-500 text-red-300',
          };

    return (
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-50">
        {renderModals()}
        {/* Top Bar during Intro: Story Header + Audio & Skip Intro Controls */}
        <div className="flex items-center justify-between w-full pointer-events-auto">
          <div className="bg-[#1c0d06]/90 border border-amber-500/35 px-3.5 py-2 rounded-xl flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-200">
              Story Intro · Step {introBeat} of 3
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isMuted) setMasterVolume(0.75);
                else setMasterVolume(0);
              }}
              title={isMuted ? 'Unmute Bazaar Audio' : 'Mute Bazaar Audio'}
              aria-label={isMuted ? 'Unmute Bazaar Audio' : 'Mute Bazaar Audio'}
              className="bg-[#1c0d06]/90 border border-amber-500/35 hover:border-amber-400 p-2.5 rounded-xl text-amber-300 hover:text-amber-200 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-stone-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-amber-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setSkipIntro(true);
                completeIntro();
              }}
              className="px-3.5 py-2.5 bg-[#1c0d06]/90 hover:bg-[#2c1509] text-amber-200 border border-amber-500/40 font-bold text-xs rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              Always Skip Intro
            </button>

            <button
              onClick={completeIntro}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs md:text-sm rounded-xl transition-colors shadow-lg flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              Skip Intro <Play className="w-4 h-4 fill-stone-950" />
            </button>
          </div>
        </div>

        {/* Bottom Comic Story Panel */}
        <div className="w-full flex justify-center pointer-events-auto">
          <div
            className={`w-full max-w-2xl bg-[#1c0d06]/92 border-2 ${beatContent.accent} rounded-2xl px-5 py-4 shadow-2xl transition-all duration-200`}
          >
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 mb-1">
              {beatContent.tag}
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white font-cyber mb-1">
              {beatContent.title}
            </h2>
            <p className="text-amber-100/85 text-xs md:text-sm leading-relaxed">
              {beatContent.desc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Full-Screen Cinematic Main Menu (Finding #1)
  if (status === GameStatus.MENU) {
    return (
      <>
        {renderModals()}
        <MainMenu
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenProgression={handleOpenProgression}
        />
      </>
    );
  }

  // Dedicated Pause Overlay (Finding #2)
  if (status === GameStatus.PAUSED) {
    return (
      <>
        {renderModals()}
        <PauseModal onOpenSettings={() => setIsSettingsOpen(true)} />
      </>
    );
  }

  // Distinct Cinematic Results Screens (Finding #4)
  if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
    return (
      <>
        {renderModals()}
        <ResultsModal
          type={status}
          onOpenProgression={() => handleOpenProgression('missions')}
        />
      </>
    );
  }

  // Compact distance status label for Uncle in Top-Right HUD
  const uncleProximityShort = isChaiBoostActive
    ? 'Uncle: 22m'
    : isStumbling
    ? 'Uncle: 2m!'
    : lives >= 3
    ? 'Uncle: 15m'
    : lives === 2
    ? 'Uncle: 8m!'
    : 'Uncle: 3m!';

  const lightingGrade = calculateGullyLightingGrade(score, distance);
  const environmentZone = getEnvironmentZone(distance, level);

  // Consolidated Temporary Notification Logic (Finding #3)
  // Strict priority: Near Miss > Achievement > Active Store Notification > Stumble
  let primaryToast: { text: string; sub?: string; points?: number; type: 'nearMiss' | 'achievement' | 'alert' | 'stumble' } | null = null;
  if (nearMissBannerVisible) {
    primaryToast = {
      text: `NEAR MISS! ${nearMissStreak > 1 ? `${nearMissStreak}x` : ''}`,
      sub: lastNearMissLabel,
      points: lastNearMissPoints,
      type: 'nearMiss',
    };
  } else if (recentAchievementBanner) {
    primaryToast = {
      text: 'ACHIEVEMENT UNLOCKED',
      sub: recentAchievementBanner,
      type: 'achievement',
    };
  } else if (activeNotification) {
    primaryToast = {
      text: activeNotification.text,
      type: 'alert',
    };
  } else if (isStumbling && !isImmortalityActive && !isChaiBoostActive) {
    primaryToast = {
      text: 'Stumbled · Speed Reduced!',
      sub: 'Recovering sprint balance...',
      type: 'stumble',
    };
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-5 z-50">
      {renderModals()}

      {/* Score-Driven Day/Night Atmospheric Colour Grade Overlay */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none transition-opacity duration-500 z-[-1]"
        style={{
          opacity: Math.min(0.28, lightingGrade.goldenHourFactor * 0.18),
          background:
            'radial-gradient(circle at 50% 38%, rgba(254, 240, 138, 0.02) 0%, rgba(249, 115, 22, 0.06) 65%, rgba(154, 52, 18, 0.14) 100%)',
        }}
      />

      {/* Golden Masala-Amber Colour Grade & Subtle Screen-Edge 'Steam' Blur Effect when Cutting Chai is Active */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 pointer-events-none transition-opacity duration-300 z-[-1] ${
          isChaiBoostActive ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(251, 191, 36, 0.04) 0%, rgba(245, 158, 11, 0.14) 64%, rgba(180, 83, 9, 0.34) 100%)',
            boxShadow: 'inset 0 0 75px rgba(245, 158, 11, 0.3)',
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            backdropFilter: isChaiBoostActive ? 'blur(3.5px)' : 'none',
            WebkitBackdropFilter: isChaiBoostActive ? 'blur(3.5px)' : 'none',
            maskImage:
              'radial-gradient(ellipse 72% 68% at 50% 50%, transparent 62%, rgba(0, 0, 0, 0.65) 82%, black 98%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 72% 68% at 50% 50%, transparent 62%, rgba(0, 0, 0, 0.65) 82%, black 98%)',
          }}
        />
      </div>

      {/* HUD Strict Hierarchy:
          - Top-Left: Permanent Score, Level/Zone, Combo + Single Row of Buff Badges + Single Consolidated Priority Toast
          - Top-Center: Permanent B-H-A-A-G-O Word Progress ONLY (center runway kept 100% clear)
          - Top-Right: Stamina Hearts, Pause Button, Proximity Pill + Temporary Uncle Dialogue Toast */}
      <div className="grid grid-cols-3 items-start w-full gap-2 md:gap-4">
        {/* TOP-LEFT: Permanent Score & Progress */}
        <div className="flex flex-col items-start gap-1.5 max-w-[270px] sm:max-w-xs">
          <div className="bg-[#1c0d06]/90 border border-amber-500/35 px-3.5 py-2 rounded-xl shadow-lg">
            <div className="text-[10px] md:text-[11px] text-amber-200/80 font-medium flex flex-wrap items-center gap-1">
              <span className="font-mono font-bold text-amber-400">
                {gameMode === 'ENDLESS' ? `Wave ${level}` : `Level ${level}/3`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-200 font-semibold truncate">{environmentZone.title}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-amber-300/80">{Math.floor(distance)}m</span>
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <div className="text-xl md:text-3xl font-extrabold text-amber-400 font-mono tabular-nums leading-none">
                ₹{score.toLocaleString()}
              </div>
              {comboCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-400/40 text-[10px] md:text-xs font-extrabold font-mono tabular-nums text-orange-300">
                  {comboMultiplier}x ({comboCount})
                </span>
              )}
            </div>
            {comboCount > 0 && lastComboLabel && (
              <div className="text-[10px] font-semibold text-amber-200/90 mt-0.5 truncate max-w-[200px]">
                {lastComboLabel}
              </div>
            )}
          </div>

          {/* Active Buff Badges in a Single Horizontal Row (Finding #3) */}
          <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
            {isChaiBoostActive && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 font-extrabold text-[10px] flex items-center gap-1 shadow animate-pulse">
                <Coffee className="w-3 h-3 stroke-[2.5]" /> Chai Rush ({chaiTimeLeft.toFixed(1)}s)
              </span>
            )}
            {isImmortalityActive && (
              <span className="px-2 py-0.5 rounded-md bg-yellow-400 text-stone-950 font-extrabold text-[10px] flex items-center gap-1 shadow">
                <Shield className="w-2.5 h-2.5 fill-stone-950" /> Blessing
              </span>
            )}
            {hasShield && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-400 text-cyan-200 font-extrabold text-[10px] flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-cyan-400" /> Shield
              </span>
            )}
            {hasEmergencyDodge && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-400 text-emerald-200 font-extrabold text-[10px] flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-emerald-400" /> Reflex
              </span>
            )}
            {isMagnetActive && (
              <span className="px-2 py-0.5 rounded-md bg-sky-950/90 border border-sky-400 text-sky-200 font-extrabold text-[10px] flex items-center gap-1">
                <Magnet className="w-2.5 h-2.5 text-sky-400" /> Magnet
              </span>
            )}
            {isSlowMotionActive && (
              <span className="px-2 py-0.5 rounded-md bg-purple-950/90 border border-purple-400 text-purple-200 font-extrabold text-[10px] flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-purple-400" /> Slow-Mo
              </span>
            )}
            {isDoubleScoreActive && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-stone-950 border border-yellow-200 font-extrabold text-[10px] flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 fill-stone-950" /> 2x Score
              </span>
            )}
          </div>

          {/* Consolidated Single Priority Toast (Never Multi-Stacked!) (Finding #3) */}
          {primaryToast && (
            <div
              role="status"
              aria-live="polite"
              className={`px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 max-w-[240px] transition-all duration-200 ${
                primaryToast.type === 'nearMiss'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-stone-950 border-2 border-yellow-200'
                  : primaryToast.type === 'achievement'
                  ? 'bg-emerald-950/95 border border-emerald-400 text-emerald-100'
                  : primaryToast.type === 'stumble'
                  ? 'bg-orange-700/95 border border-amber-300 text-white'
                  : 'bg-[#261107]/95 border border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 font-extrabold text-[10px] uppercase tracking-wider truncate">
                  {primaryToast.type === 'nearMiss' && <Zap className="w-3 h-3 fill-stone-950 shrink-0" />}
                  {primaryToast.type === 'achievement' && <Award className="w-3 h-3 text-emerald-400 shrink-0" />}
                  <span>{primaryToast.text}</span>
                </div>
                {primaryToast.sub && (
                  <div className="text-[10px] font-semibold opacity-90 truncate">
                    {primaryToast.sub}
                  </div>
                )}
              </div>
              {primaryToast.points && (
                <span className="px-1.5 py-0.5 rounded bg-stone-950 text-amber-300 font-mono font-extrabold text-[11px] tabular-nums shrink-0">
                  +₹{primaryToast.points}
                </span>
              )}
            </div>
          )}
        </div>

        {/* TOP-CENTER: Permanent B-H-A-A-G-O Progress ONLY (No stacked banners over center runway) */}
        <div className="flex flex-col items-center justify-self-center">
          <div className="flex space-x-1 md:space-x-1.5 bg-[#1c0d06]/75 px-2 py-1.5 rounded-xl border border-amber-500/25">
            {target.map((char, idx) => {
              const isCollected = collectedLetters.includes(idx);
              const color = GEMINI_COLORS[idx];

              return (
                <div
                  key={idx}
                  style={{
                    borderColor: isCollected ? color : 'rgba(120, 53, 15, 0.55)',
                    color: isCollected ? '#1c0d06' : 'rgba(254, 243, 199, 0.45)',
                    backgroundColor: isCollected ? color : 'rgba(28, 13, 6, 0.9)',
                  }}
                  className="w-6 h-8 md:w-8 md:h-10 flex items-center justify-center border-2 font-extrabold text-xs md:text-base font-cyber rounded-lg transition-colors duration-200"
                >
                  {char}
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP-RIGHT: Permanent Health, Pause Button, Compact Chase Proximity & Uncle Dialogue Toast */}
        <div className="flex flex-col items-end gap-2 justify-self-end">
          <div className="flex items-center gap-1.5 md:gap-2 pointer-events-auto">
            {/* Pause Button (Finding #2) */}
            <button
              type="button"
              onClick={togglePause}
              title="Pause Game (Esc or P)"
              aria-label="Pause Game"
              className="bg-[#1c0d06]/90 border border-amber-500/35 hover:border-amber-400 p-2 md:p-2.5 rounded-xl text-amber-300 hover:text-amber-200 transition-colors"
            >
              <Pause className="w-4 h-4 md:w-5 md:h-5 text-amber-400 fill-amber-400/20" />
            </button>

            {/* Missions / Progression Modal Button */}
            <button
              type="button"
              onClick={() => handleOpenProgression('missions')}
              title="Daily Missions, Characters & Ranks"
              aria-label="Daily Missions, Characters & Ranks"
              className="bg-[#1c0d06]/90 border border-amber-500/35 hover:border-amber-400 p-2 md:p-2.5 rounded-xl text-amber-300 hover:text-amber-200 transition-colors"
            >
              <Target className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
            </button>

            {/* Audio Mute/Unmute */}
            <button
              onClick={() => {
                if (isMuted) setMasterVolume(0.75);
                else setMasterVolume(0);
              }}
              title={isMuted ? 'Unmute Bazaar Audio' : 'Mute Bazaar Audio'}
              aria-label={isMuted ? 'Unmute Bazaar Audio' : 'Mute Bazaar Audio'}
              className="bg-[#1c0d06]/90 border border-amber-500/35 hover:border-amber-400 p-2 md:p-2.5 rounded-xl text-amber-300 hover:text-amber-200 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-stone-400" />
              ) : (
                <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
              )}
            </button>

            {/* Stamina Hearts */}
            <div className="bg-[#1c0d06]/90 border border-amber-500/35 px-2.5 md:px-3 py-2 rounded-xl flex items-center gap-2">
              <div className="flex items-center space-x-1">
                {[...Array(maxLives)].map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 md:w-5 md:h-5 ${
                      i < lives ? 'text-red-500 fill-red-500' : 'text-stone-700 fill-stone-700'
                    }`}
                  />
                ))}
              </div>
              <span
                className={`hidden sm:inline-block text-[10px] md:text-xs font-mono font-bold pl-1.5 border-l border-amber-500/25 ${
                  lives === 1 || isStumbling ? 'text-red-400' : 'text-amber-300'
                }`}
              >
                {uncleProximityShort}
              </span>
            </div>
          </div>

          {/* Temporary Sharma Uncle Dialogue Notification (Top-Right Flank, away from player action) */}
          {uncleDialogueBanner && (
            <div
              role="status"
              aria-live="polite"
              className={`max-w-[220px] md:max-w-[260px] px-3 py-1.5 rounded-xl border shadow-lg text-right transition-all duration-200 ${
                uncleDialogueBanner.urgent
                  ? 'bg-red-950/92 border-red-400 text-red-100'
                  : 'bg-[#1c0d06]/90 border-amber-500/40 text-amber-100'
              }`}
            >
              <div className="text-[9px] font-extrabold uppercase tracking-wider text-orange-400">
                Sharma Uncle
              </div>
              <div className="text-[11px] md:text-xs font-bold leading-snug">
                “{uncleDialogueBanner.text}”
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom area intentionally kept 100% clear so player and Uncle chase action never overlap with UI */}
      <div />
    </div>
  );
};
