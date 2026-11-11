/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { Heart, Trophy, MapPin, Coins, Flame, ArrowUpCircle, Shield, Activity, Coffee, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store';
import { GameStatus, GEMINI_COLORS, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';

// Available Chai Tapri Shop Items
const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'DOUBLE_JUMP',
    name: 'Gully Parkour',
    description: 'Double jump in mid-air to leap right over parked auto-rickshaws.',
    cost: 1000,
    icon: ArrowUpCircle,
    oneTime: true,
  },
  {
    id: 'MAX_LIFE',
    name: 'Garam Samosa Plate',
    description: 'Permanently adds an extra stamina heart slot and restores 1 heart.',
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
    icon: Shield,
    oneTime: true,
  },
];

const UNCLE_TAUNTS = [
  '“Ruko beta! Board exam ke marks dikhao!”',
  '“Cricket ball se meri khidki kisne todi?!”',
  '“Abhi tumhare Papa ko phone lagata hoon!”',
  '“Subah 5 baje utha karo, mobile chhodo!”',
  '“Chappal khayega kya?! Ruko abhi!”',
];

const ShopScreen: React.FC = () => {
  const { score, buyItem, closeShop, hasDoubleJump, hasImmortality } = useStore();
  const [items, setItems] = useState<ShopItem[]>([]);

  useEffect(() => {
    let pool = SHOP_ITEMS.filter(item => {
      if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
      if (item.id === 'IMMORTAL' && hasImmortality) return false;
      return true;
    });

    pool = pool.sort(() => 0.5 - Math.random());
    setItems(pool.slice(0, 3));
  }, [hasDoubleJump, hasImmortality]);

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
    lives,
    maxLives,
    collectedLetters,
    status,
    level,
    restartGame,
    startGame,
    gemsCollected,
    distance,
    isImmortalityActive,
    isStumbling,
    speed,
  } = useStore();

  const target = ['B', 'H', 'A', 'A', 'G', 'O'];
  const [tauntIndex, setTauntIndex] = useState(0);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [coverError, setCoverError] = useState(false);

  // Rotate Uncle's scolding callouts during gameplay
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;
    const interval = setInterval(() => {
      setTauntIndex(prev => (prev + 1) % UNCLE_TAUNTS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [status]);

  // Trigger immediate scolding change when hit
  useEffect(() => {
    const onHit = () => {
      setTauntIndex(prev => (prev + 1) % UNCLE_TAUNTS.length);
    };
    window.addEventListener('player-hit', onHit);
    return () => window.removeEventListener('player-hit', onHit);
  }, []);

  if (status === GameStatus.SHOP) {
    return <ShopScreen />;
  }

  if (status === GameStatus.MENU) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-[100] bg-[#1a0b05]/90 p-4 pointer-events-auto">
        <div className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30 bg-[#261107]">
          <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-amber-700 via-orange-800 to-stone-950 overflow-hidden">
            {!coverError ? (
              <img
                src="/src/assets/images/indian_street_uncle_chase_1794369409878.jpg"
                alt="Young Indian boy running through a golden-hour bazaar street chased by an angry Uncle waving a chappal"
                referrerPolicy="no-referrer"
                onError={() => setCoverError(true)}
                className="w-full h-full object-cover block"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <Flame className="w-16 h-16 text-amber-400 mb-3" />
                <span className="text-2xl font-extrabold text-amber-200 font-cyber">
                  Gully Runner: Bhaago Beta!
                </span>
              </div>
            )}

            {/* Measured contrast scrim for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b05] via-[#1a0b05]/55 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end items-center p-6 pb-7 text-center z-10">
              <p className="text-xs font-semibold tracking-wider text-amber-300 uppercase mb-1">
                Indian Bazaar Street Chase
              </p>
              <h1
                className="text-3xl md:text-4xl font-extrabold text-white font-cyber mb-2 drop-shadow"
                style={{ textWrap: 'balance' }}
              >
                Bhaago Beta! Uncle Chase
              </h1>
              <p className="text-amber-100/85 text-xs md:text-sm max-w-md mb-5">
                You accidentally broke Sharma Uncle’s window with a sixer! Dodge the auto-rickshaws, grab samosas, and spell B-H-A-A-G-O before his chappal catches you.
              </p>

              <button
                onClick={() => {
                  audio.init();
                  startGame();
                }}
                className="w-full px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-lg rounded-xl transition-colors shadow-lg flex items-center justify-center whitespace-nowrap shrink-0"
              >
                Start Running <Play className="ml-2 w-5 h-5 fill-stone-950" />
              </button>

              <div className="flex items-center justify-center gap-2 text-amber-200/75 text-xs mt-3 font-mono">
                <span>Arrow Keys or A/D to Dodge</span>
                <span aria-hidden="true">·</span>
                <span>Up or W to Jump</span>
                <span aria-hidden="true">·</span>
                <span>Space for Blessing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    return (
      <div className="absolute inset-0 bg-[#1a0b05]/95 z-[100] text-white pointer-events-auto overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full py-8 px-4 max-w-lg mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-1">
            Flying Chappal Impact
          </p>
          <h1
            className="text-3xl md:text-5xl font-extrabold text-amber-300 mb-2 font-cyber text-center"
            style={{ textWrap: 'balance' }}
          >
            Caught by Sharma Uncle!
          </h1>
          <p className="text-amber-100/75 text-sm md:text-base text-center mb-6">
            “Pakad liya! Chalo abhi tumhare Papa ke paas chalte hain!”
          </p>

          <div className="grid grid-cols-1 gap-3 w-full max-w-md mb-8">
            <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center text-amber-300 text-sm font-medium">
                <Trophy className="mr-2.5 w-5 h-5" /> Mohalla Level
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">{level} / 3</div>
            </div>
            <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center text-amber-400 text-sm font-medium">
                <Coins className="mr-2.5 w-5 h-5" /> Samosas & Coins
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">{gemsCollected}</div>
            </div>
            <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center text-orange-300 text-sm font-medium">
                <MapPin className="mr-2.5 w-5 h-5" /> Gully Distance
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">{Math.floor(distance)} m</div>
            </div>
            <div className="bg-amber-500/15 p-4 rounded-xl border border-amber-400/30 flex items-center justify-between mt-1">
              <div className="text-amber-100 text-sm font-semibold">Total Bazaar Score</div>
              <div className="text-2xl md:text-3xl font-extrabold font-mono tabular-nums text-amber-400">
                ₹{score.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              audio.init();
              restartGame();
            }}
            className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-base md:text-lg rounded-xl transition-colors shadow-lg whitespace-nowrap shrink-0"
          >
            Run Again
          </button>
        </div>
      </div>
    );
  }

  if (status === GameStatus.VICTORY) {
    return (
      <div className="absolute inset-0 bg-[#1a0b05]/95 z-[100] text-white pointer-events-auto overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full py-8 px-4 max-w-lg mx-auto">
          <Trophy className="w-16 h-16 text-amber-400 mb-3" />
          <h1
            className="text-3xl md:text-5xl font-extrabold text-amber-300 mb-2 font-cyber text-center"
            style={{ textWrap: 'balance' }}
          >
            Escaped the Mohalla!
          </h1>
          <p className="text-amber-100/80 text-sm md:text-base mb-8 text-center">
            Sharma Uncle stopped at Raju’s Tapri to catch his breath and drink chai. You made a clean getaway!
          </p>

          <div className="grid grid-cols-1 gap-4 text-center mb-8 w-full max-w-md">
            <div className="bg-[#2c1509] p-6 rounded-xl border border-amber-500/30">
              <div className="text-xs text-amber-200/70 mb-1 uppercase tracking-wider">Final Score</div>
              <div className="text-3xl md:text-4xl font-extrabold font-mono tabular-nums text-amber-400">
                ₹{score.toLocaleString()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20">
                <div className="text-xs text-amber-200/70">Samosas</div>
                <div className="text-xl md:text-2xl font-bold font-mono tabular-nums text-amber-300">
                  {gemsCollected}
                </div>
              </div>
              <div className="bg-[#2c1509] p-4 rounded-xl border border-amber-500/20">
                <div className="text-xs text-amber-200/70">Distance</div>
                <div className="text-xl md:text-2xl font-bold font-mono tabular-nums text-orange-300">
                  {Math.floor(distance)} m
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              audio.init();
              restartGame();
            }}
            className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-base md:text-lg rounded-xl transition-colors shadow-lg whitespace-nowrap shrink-0"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Distance status label for Uncle
  const uncleProximityLabel = isStumbling
    ? 'Uncle: Right on Your Heels (2m)!'
    : lives >= 3
    ? 'Uncle: 15m Behind'
    : lives === 2
    ? 'Uncle: Closing In (8m)!'
    : 'Uncle: Chappal Range (3m)!';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-50">
      {/* Top HUD Bar (Solid dark translucent surface without backdrop-blur over WebGL) */}
      <div className="flex justify-between items-start w-full gap-4">
        <div className="bg-[#1c0d06]/85 border border-amber-500/30 px-4 py-2 rounded-xl">
          <div className="text-[11px] text-amber-200/75 font-medium">Bazaar Score · Level {level}/3</div>
          <div className="text-2xl md:text-3xl font-extrabold text-amber-400 font-mono tabular-nums">
            ₹{score.toLocaleString()}
          </div>
        </div>

        {/* Center B-H-A-A-G-O Word Progress */}
        <div className="flex flex-col items-center">
          <div className="flex space-x-1.5 md:space-x-2">
            {target.map((char, idx) => {
              const isCollected = collectedLetters.includes(idx);
              const color = GEMINI_COLORS[idx];

              return (
                <div
                  key={idx}
                  style={{
                    borderColor: isCollected ? color : 'rgba(120, 53, 15, 0.6)',
                    color: isCollected ? '#1c0d06' : 'rgba(254, 243, 199, 0.45)',
                    backgroundColor: isCollected ? color : 'rgba(28, 13, 6, 0.88)',
                  }}
                  className="w-7 h-9 md:w-9 md:h-11 flex items-center justify-center border-2 font-extrabold text-sm md:text-lg font-cyber rounded-lg transition-colors duration-200"
                >
                  {char}
                </div>
              );
            })}
          </div>
          {isImmortalityActive && (
            <div className="mt-2 bg-amber-500 text-stone-950 px-3 py-0.5 rounded-md font-bold text-xs flex items-center">
              <Shield className="w-3.5 h-3.5 mr-1 fill-stone-950" /> Maa Ka Aashirwad Active
            </div>
          )}
          {isStumbling && !isImmortalityActive && (
            <div className="mt-2 bg-orange-600 text-white border border-amber-300 px-3 py-0.5 rounded-md font-bold text-xs flex items-center">
              Stumbled on Bazaar Debris · Slowed Down!
            </div>
          )}
        </div>

        {/* Stamina Hearts */}
        <div className="bg-[#1c0d06]/85 border border-amber-500/30 px-3.5 py-2.5 rounded-xl flex items-center space-x-1.5">
          {[...Array(maxLives)].map((_, i) => (
            <Heart
              key={i}
              className={`w-5 h-5 md:w-6 md:h-6 ${
                i < lives ? 'text-red-500 fill-red-500' : 'text-stone-700 fill-stone-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Collapsible Bottom Dock: Uncle Scolding Callout & Speedometer */}
      <div className="w-full flex flex-col items-center pointer-events-auto">
        <button
          onClick={() => setDockCollapsed(c => !c)}
          className="mb-1 px-3 py-1 bg-[#1c0d06]/90 border border-amber-500/30 rounded-t-lg text-amber-200/80 hover:text-white text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Show Chase Info
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Hide Chase Info
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full max-w-2xl bg-[#1c0d06]/90 border border-amber-500/30 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs md:text-sm">
            <div className="flex items-center gap-2 text-amber-100">
              <span className="font-bold text-orange-400 whitespace-nowrap shrink-0">
                Sharma Uncle:
              </span>
              <span className="italic text-amber-200 truncate">{UNCLE_TAUNTS[tauntIndex]}</span>
            </div>

            <div className="flex items-center gap-3 text-amber-300/90 font-mono tabular-nums whitespace-nowrap shrink-0">
              <span className={lives === 1 ? 'text-red-400 font-bold' : 'text-amber-300'}>
                {uncleProximityLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span>Speed {Math.round((speed / RUN_SPEED_BASE) * 100)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
