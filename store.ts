/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { create } from 'zustand';
import { GameStatus, GameMode, RUN_SPEED_BASE } from './types';

interface GameState {
  status: GameStatus;
  gameMode: GameMode;
  score: number;
  highScore: number;
  bestDistance: number;
  lives: number;
  maxLives: number;
  speed: number;
  collectedLetters: number[]; 
  level: number;
  laneCount: number;
  gemsCollected: number;
  distance: number;
  
  // Inventory / Abilities / Hazards
  hasDoubleJump: boolean;
  hasImmortality: boolean;
  isImmortalityActive: boolean;
  isStumbling: boolean;
  isChaiBoostActive: boolean;

  // Combo System
  comboCount: number;
  comboMultiplier: number;
  lastComboLabel: string;

  // Actions
  setGameMode: (mode: GameMode) => void;
  startGame: (mode?: GameMode) => void;
  completeIntro: () => void;
  restartGame: () => void;
  continueToEndless: () => void;
  takeDamage: () => void;
  triggerStumble: () => void;
  collectChai: () => void;
  registerComboAction: (label: string, baseBonus: number) => void;
  resetCombo: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (index: number) => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  
  // Shop / Abilities
  buyItem: (type: 'DOUBLE_JUMP' | 'MAX_LIFE' | 'HEAL' | 'IMMORTAL', cost: number) => boolean;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;
}

const GEMINI_TARGET = ['B', 'H', 'A', 'A', 'G', 'O'];
const MAX_LEVEL = 3;
let stumbleTimeoutId: number | null = null;
let activeSpeedPenalty = 0;
let chaiTimeoutId: number | null = null;
let activeChaiBoost = 0;
let comboTimeoutId: number | null = null;

const getMultiplierForCombo = (count: number): number => {
  if (count <= 0) return 1;
  if (count === 1) return 1.2;
  if (count === 2) return 1.4;
  if (count === 3) return 1.6;
  if (count === 4) return 1.8;
  return 2.0;
};

const readSavedStat = (key: string): number => {
  try {
    const val = window.localStorage.getItem(key);
    return val ? Math.max(0, parseInt(val, 10) || 0) : 0;
  } catch {
    return 0;
  }
};

const saveStat = (key: string, val: number) => {
  try {
    window.localStorage.setItem(key, String(Math.floor(val)));
  } catch {
    // Ignore storage quota / privacy errors
  }
};

export const useStore = create<GameState>((set, get) => ({
  status: GameStatus.MENU,
  gameMode: 'REGULAR',
  score: 0,
  highScore: readSavedStat('gully_runner_high_score'),
  bestDistance: readSavedStat('gully_runner_best_distance'),
  lives: 3,
  maxLives: 3,
  speed: 0,
  collectedLetters: [],
  level: 1,
  laneCount: 3,
  gemsCollected: 0,
  distance: 0,
  
  hasDoubleJump: false,
  hasImmortality: false,
  isImmortalityActive: false,
  isStumbling: false,
  isChaiBoostActive: false,

  comboCount: 0,
  comboMultiplier: 1,
  lastComboLabel: '',

  setGameMode: (mode) => set({ gameMode: mode }),

  startGame: (mode) => {
    if (stumbleTimeoutId) clearTimeout(stumbleTimeoutId);
    if (chaiTimeoutId) clearTimeout(chaiTimeoutId);
    if (comboTimeoutId) clearTimeout(comboTimeoutId);
    activeSpeedPenalty = 0;
    activeChaiBoost = 0;
    const chosenMode = mode || get().gameMode;
    set({ 
      status: GameStatus.INTRO,
      gameMode: chosenMode,
      score: 0, 
      lives: 3, 
      maxLives: 3,
      speed: 0,
      collectedLetters: [],
      level: 1,
      laneCount: 3,
      gemsCollected: 0,
      distance: 0,
      hasDoubleJump: false,
      hasImmortality: false,
      isImmortalityActive: false,
      isStumbling: false,
      isChaiBoostActive: false,
      comboCount: 0,
      comboMultiplier: 1,
      lastComboLabel: ''
    });
  },

  completeIntro: () => {
    const { status } = get();
    if (status === GameStatus.INTRO) {
      set({
        status: GameStatus.PLAYING,
        speed: RUN_SPEED_BASE,
      });
    }
  },

  restartGame: () => {
    if (stumbleTimeoutId) clearTimeout(stumbleTimeoutId);
    if (chaiTimeoutId) clearTimeout(chaiTimeoutId);
    if (comboTimeoutId) clearTimeout(comboTimeoutId);
    activeSpeedPenalty = 0;
    activeChaiBoost = 0;
    set({ 
      status: GameStatus.PLAYING, 
      score: 0, 
      lives: 3, 
      maxLives: 3,
      speed: RUN_SPEED_BASE,
      collectedLetters: [],
      level: 1,
      laneCount: 3,
      gemsCollected: 0,
      distance: 0,
      hasDoubleJump: false,
      hasImmortality: false,
      isImmortalityActive: false,
      isStumbling: false,
      isChaiBoostActive: false,
      comboCount: 0,
      comboMultiplier: 1,
      lastComboLabel: ''
    });
  },

  continueToEndless: () => {
    // Let players who beat Regular Mode Level 3 seamlessly continue their run in Endless Mode (Wave 4+)!
    const { level, laneCount, speed } = get();
    const nextLevel = level + 1;
    const maxEndlessSpeed = RUN_SPEED_BASE * 3.15;
    const nextSpeed = Math.min(maxEndlessSpeed, Math.max(RUN_SPEED_BASE * 1.8, speed) + RUN_SPEED_BASE * 0.2);

    set({
      gameMode: 'ENDLESS',
      level: nextLevel,
      laneCount: Math.min(laneCount + 2, 9),
      status: GameStatus.PLAYING,
      speed: nextSpeed,
      collectedLetters: [],
    });
  },

  resetCombo: () => {
    if (comboTimeoutId) {
      clearTimeout(comboTimeoutId);
      comboTimeoutId = null;
    }
    set({ comboCount: 0, comboMultiplier: 1, lastComboLabel: '' });
  },

  registerComboAction: (label, baseBonus) => {
    const { status, comboCount, score } = get();
    if (status !== GameStatus.PLAYING) return;

    const nextCount = comboCount + 1;
    const nextMult = getMultiplierForCombo(nextCount);
    const bonusPoints = Math.round(baseBonus * nextMult);

    set({
      comboCount: nextCount,
      comboMultiplier: nextMult,
      lastComboLabel: label,
      score: score + bonusPoints,
    });

    if (comboTimeoutId) clearTimeout(comboTimeoutId);
    comboTimeoutId = window.setTimeout(() => {
      set({ comboCount: 0, comboMultiplier: 1, lastComboLabel: '' });
      comboTimeoutId = null;
    }, 3000);
  },

  takeDamage: () => {
    const { lives, isImmortalityActive, isChaiBoostActive } = get();
    if (isImmortalityActive || isChaiBoostActive) return; // No damage if Maa Ka Aashirwad or Cutting Chai Invincibility is active

    get().resetCombo();

    if (lives > 1) {
      set({ lives: lives - 1 });
    } else {
      if (stumbleTimeoutId) clearTimeout(stumbleTimeoutId);
      if (chaiTimeoutId) clearTimeout(chaiTimeoutId);
      activeSpeedPenalty = 0;
      activeChaiBoost = 0;
      set({ lives: 0, status: GameStatus.GAME_OVER, speed: 0, isStumbling: false, isChaiBoostActive: false });
    }
  },

  triggerStumble: () => {
    const { status, isImmortalityActive, isChaiBoostActive, isStumbling, speed } = get();
    // Cutting Chai boost powers right through stumble slowdown!
    if (status !== GameStatus.PLAYING || isImmortalityActive || isChaiBoostActive) return;

    get().resetCombo();

    // If the player stumbles AGAIN while already slowed down and Uncle is right on their heels,
    // Uncle catches up enough to land a chappal swat!
    if (isStumbling) {
      window.dispatchEvent(new Event('player-hit'));
      return;
    }

    const penalty = Math.max(4, speed * 0.35);
    activeSpeedPenalty = penalty;
    set({
      isStumbling: true,
      speed: Math.max(8, speed - penalty),
    });

    if (stumbleTimeoutId) clearTimeout(stumbleTimeoutId);
    stumbleTimeoutId = window.setTimeout(() => {
      const current = get();
      if (current.status === GameStatus.PLAYING && current.isStumbling) {
        set({
          isStumbling: false,
          speed: current.speed + activeSpeedPenalty,
        });
      } else {
        set({ isStumbling: false });
      }
      activeSpeedPenalty = 0;
      stumbleTimeoutId = null;
    }, 2200);
  },

  collectChai: () => {
    const { status, speed, isStumbling, isChaiBoostActive } = get();
    if (status !== GameStatus.PLAYING) return;

    let baseSpeed = speed;

    // 1. Immediately recover from any active stumble slowdown!
    if (isStumbling) {
      if (stumbleTimeoutId) {
        clearTimeout(stumbleTimeoutId);
        stumbleTimeoutId = null;
      }
      baseSpeed += activeSpeedPenalty;
      activeSpeedPenalty = 0;
    }

    // 2. Apply or refresh the +20% Cutting Chai Speed Boost + Temporary Invincibility for 4.0 seconds
    const boostAmount = isChaiBoostActive ? 0 : RUN_SPEED_BASE * 0.20;
    if (!isChaiBoostActive) {
      activeChaiBoost = boostAmount;
    }

    set({
      isStumbling: false,
      isChaiBoostActive: true,
      speed: baseSpeed + boostAmount,
    });

    // 3. Register Cutting Chai pickup in the Combo Multiplier chain!
    get().registerComboAction('Cutting Chai Rush!', 150);

    window.dispatchEvent(new Event('chai-boost'));

    if (chaiTimeoutId) clearTimeout(chaiTimeoutId);
    chaiTimeoutId = window.setTimeout(() => {
      const current = get();
      if (current.status === GameStatus.PLAYING && current.isChaiBoostActive) {
        set({
          isChaiBoostActive: false,
          speed: Math.max(RUN_SPEED_BASE, current.speed - activeChaiBoost),
        });
      } else {
        set({ isChaiBoostActive: false });
      }
      activeChaiBoost = 0;
      chaiTimeoutId = null;
    }, 4000);
  },

  addScore: (amount) => set((state) => {
    const nextScore = state.score + Math.round(amount * state.comboMultiplier);
    const nextHigh = Math.max(state.highScore, nextScore);
    if (nextHigh > state.highScore) saveStat('gully_runner_high_score', nextHigh);
    return { score: nextScore, highScore: nextHigh };
  }),
  
  collectGem: (value) => set((state) => {
    const nextScore = state.score + Math.round(value * state.comboMultiplier);
    const nextHigh = Math.max(state.highScore, nextScore);
    if (nextHigh > state.highScore) saveStat('gully_runner_high_score', nextHigh);
    return { 
      score: nextScore,
      highScore: nextHigh,
      gemsCollected: state.gemsCollected + 1 
    };
  }),

  setDistance: (dist) => set((state) => {
    const nextBest = Math.max(state.bestDistance, Math.floor(dist));
    if (nextBest > state.bestDistance) saveStat('gully_runner_best_distance', nextBest);
    return { distance: dist, bestDistance: nextBest };
  }),

  collectLetter: (index) => {
    const { collectedLetters, level, speed, gameMode, score, highScore } = get();
    
    if (!collectedLetters.includes(index)) {
      const newLetters = [...collectedLetters, index];
      
      // Speed step per letter (capped smoothly in Endless Mode so high waves remain playable)
      const maxSpeedCap = RUN_SPEED_BASE * 3.15;
      const speedIncrease = RUN_SPEED_BASE * (level >= 4 ? 0.05 : 0.10);
      const nextSpeed = Math.min(maxSpeedCap, speed + speedIncrease);

      set({ 
        collectedLetters: newLetters,
        speed: nextSpeed
      });

      // Check if full word B-H-A-A-G-O collected
      if (newLetters.length === GEMINI_TARGET.length) {
        if (gameMode === 'ENDLESS' || level < MAX_LEVEL) {
            // In Endless Mode, award a +1,500 Wave Clear bonus and advance to the next infinite wave + Shop Portal!
            if (gameMode === 'ENDLESS') {
              const waveBonusScore = score + 1500;
              const nextHigh = Math.max(highScore, waveBonusScore);
              if (nextHigh > highScore) saveStat('gully_runner_high_score', nextHigh);
              set({ score: waveBonusScore, highScore: nextHigh });
            }
            get().advanceLevel();
        } else {
            // Regular Mode Victory Condition after completing Level 3
            const victoryScore = get().score + 5000;
            const nextHigh = Math.max(get().highScore, victoryScore);
            if (nextHigh > get().highScore) saveStat('gully_runner_high_score', nextHigh);
            set({
                status: GameStatus.VICTORY,
                score: victoryScore,
                highScore: nextHigh
            });
        }
      }
    }
  },

  advanceLevel: () => {
      const { level, laneCount, speed } = get();
      const nextLevel = level + 1;
      
      const maxSpeedCap = RUN_SPEED_BASE * 3.15;
      const speedIncrease = RUN_SPEED_BASE * (nextLevel > 3 ? 0.18 : 0.40);
      const newSpeed = Math.min(maxSpeedCap, speed + speedIncrease);

      set({
          level: nextLevel,
          laneCount: Math.min(laneCount + 2, 9), // Expand lanes up to 9
          status: GameStatus.PLAYING, // Keep playing, user runs into shop portal
          speed: newSpeed,
          collectedLetters: [] // Reset letters for the next wave
      });
  },

  openShop: () => set({ status: GameStatus.SHOP }),
  
  closeShop: () => set({ status: GameStatus.PLAYING }),

  buyItem: (type, cost) => {
      const { score, maxLives, lives } = get();
      
      if (score >= cost) {
          set({ score: score - cost });
          
          switch (type) {
              case 'DOUBLE_JUMP':
                  set({ hasDoubleJump: true });
                  break;
              case 'MAX_LIFE':
                  set({ maxLives: maxLives + 1, lives: lives + 1 });
                  break;
              case 'HEAL':
                  set({ lives: Math.min(lives + 1, maxLives) });
                  break;
              case 'IMMORTAL':
                  set({ hasImmortality: true });
                  break;
          }
          return true;
      }
      return false;
  },

  activateImmortality: () => {
      const { hasImmortality, isImmortalityActive } = get();
      if (hasImmortality && !isImmortalityActive) {
          set({ isImmortalityActive: true });
          
          // Lasts 5 seconds
          setTimeout(() => {
              set({ isImmortalityActive: false });
          }, 5000);
      }
  },

  setStatus: (status) => set({ status }),
  increaseLevel: () => set((state) => ({ level: state.level + 1 })),
}));
