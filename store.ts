/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { create } from 'zustand';
import { GameStatus, GameMode, RUN_SPEED_BASE } from './types';

export interface ObstacleDifficultyProfile {
  /** Normalized difficulty factor (0.0 at start -> 1.5 at high score & distance) */
  difficultyIndex: number;
  /** Target base running speed before temporary Cutting Chai or stumble modifiers */
  targetBaseSpeed: number;
  /** Multiplier for oncoming projectiles / moving hazards */
  obstacleSpeedMultiplier: number;
  /** Z-distance gap between consecutive obstacle waves (smaller = higher frequency) */
  spawnGap: number;
  /** Probability that a spawn slot generates an obstacle wave instead of a lone collectible */
  obstacleWaveChance: number;
  /** Probability of spawning multi-lane obstacle formations */
  multiLaneChance: number;
  /** Probability of spawning Rival Scooter Uncles firing flying chappals */
  scooterChance: number;
  /** Probability of filling open lanes alongside auto-rickshaws with secondary bazaar hazards */
  secondaryHazardChance: number;
}

/**
 * Dynamically computes obstacle speed and spawn frequency parameters
 * based on the player's current score, distance covered, and wave level.
 */
export const calculateObstacleDifficulty = (
  score: number,
  distance: number,
  level: number
): ObstacleDifficultyProfile => {
  const distanceFactor = Math.max(0, distance) / 1600;
  const scoreFactor = Math.max(0, score) / 10000;
  const levelFactor = Math.max(0, level - 1) * 0.14;

  // Combined progressive difficulty index (0.0 -> 1.5)
  const difficultyIndex = Math.min(1.5, distanceFactor * 0.55 + scoreFactor * 0.45 + levelFactor);

  // Smoothly scale base speed from RUN_SPEED_BASE (22.5) up to 2.55x (57.4)
  const maxSpeed = RUN_SPEED_BASE * 2.55;
  const targetBaseSpeed = Math.min(
    maxSpeed,
    RUN_SPEED_BASE * (1 + difficultyIndex * 0.72)
  );

  // Oncoming flying chappals & scooters move faster as score & distance climb
  const obstacleSpeedMultiplier = 1 + difficultyIndex * 0.35;

  // Obstacle frequency increases by tightening the Z-gap between waves (from 21.5m down to 12.8m)
  const spawnGap = Math.max(12.8, 21.5 - difficultyIndex * 5.8);

  // Obstacle wave probability rises from 75% to 92%
  const obstacleWaveChance = Math.min(0.92, 0.75 + difficultyIndex * 0.12);

  // Multi-lane formation density rises from 38% to 78%
  const multiLaneChance = Math.min(0.78, 0.38 + difficultyIndex * 0.28);

  // Rival scooter chance rises from 15% to 38%
  const scooterChance = Math.min(0.38, 0.15 + difficultyIndex * 0.16);

  // Secondary lane bazaar hazard chance rises from 62% to 88%
  const secondaryHazardChance = Math.min(0.88, 0.62 + difficultyIndex * 0.18);

  return {
    difficultyIndex,
    targetBaseSpeed,
    obstacleSpeedMultiplier,
    spawnGap,
    obstacleWaveChance,
    multiLaneChance,
    scooterChance,
    secondaryHazardChance,
  };
};

export type ReviewCategory =
  | 'Gameplay & Controls'
  | 'Uncle Chase & Chappals'
  | 'Bazaar Audio & Shouts'
  | 'Cutting Chai Power-Up'
  | 'Idea / Bug Report';

export interface GameReview {
  id: string;
  author: string;
  rating: number;
  category: ReviewCategory;
  comment: string;
  createdAt: string;
  gameMode?: GameMode;
  score?: number;
  distance?: number;
  level?: number;
  helpfulCount: number;
  isUserSubmitted?: boolean;
}

const DEFAULT_REVIEWS: GameReview[] = [
  {
    id: 'seed-1',
    author: 'Aarav S.',
    rating: 5,
    category: 'Uncle Chase & Chappals',
    comment:
      'That screen shake and whoosh when Sharma Uncle’s chappal flies past my ear gave me real childhood flashbacks! 10/10 gully cricket energy.',
    createdAt: '2 days ago',
    gameMode: 'ENDLESS',
    score: 14850,
    distance: 1120,
    level: 4,
    helpfulCount: 18,
  },
  {
    id: 'seed-2',
    author: 'Priya K.',
    rating: 5,
    category: 'Cutting Chai Power-Up',
    comment:
      'Grabbing a Cutting Chai and smashing straight through barricades while shopkeepers yell "Ae! Sambhal ke!" in 3D audio is pure chaos. Love Endless Mode!',
    createdAt: '1 day ago',
    gameMode: 'ENDLESS',
    score: 19200,
    distance: 1450,
    level: 5,
    helpfulCount: 14,
  },
  {
    id: 'seed-3',
    author: 'Rohan M.',
    rating: 4,
    category: 'Gameplay & Controls',
    comment:
      'Super smooth controls on mobile and the vibration feedback when picking up chai feels awesome. Wave 4+ gets intense fast!',
    createdAt: '5 hours ago',
    gameMode: 'REGULAR',
    score: 9600,
    distance: 780,
    level: 3,
    helpfulCount: 9,
  },
];

const REVIEWS_STORAGE_KEY = 'gully_runner_reviews_v1';
const HELPFUL_STORAGE_KEY = 'gully_runner_helpful_reviews_v1';

const loadReviews = (): GameReview[] => {
  try {
    const raw = window.localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) return DEFAULT_REVIEWS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_REVIEWS;
  } catch {
    return DEFAULT_REVIEWS;
  }
};

const saveReviews = (reviews: GameReview[]) => {
  try {
    window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // Ignore storage errors
  }
};

const loadHelpfulIds = (): string[] => {
  try {
    const raw = window.localStorage.getItem(HELPFUL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveHelpfulIds = (ids: string[]) => {
  try {
    window.localStorage.setItem(HELPFUL_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
};

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

  // Player Feedback & Reviews
  reviews: GameReview[];
  helpfulReviewIds: string[];
  addReview: (input: {
    author: string;
    rating: number;
    category: ReviewCategory;
    comment: string;
    includeStats: boolean;
  }) => void;
  toggleHelpfulReview: (id: string) => void;
  deleteReview: (id: string) => void;

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

  reviews: loadReviews(),
  helpfulReviewIds: loadHelpfulIds(),

  addReview: ({ author, rating, category, comment, includeStats }) => {
    const state = get();
    const cleanAuthor = author.trim() || 'Gully Runner';
    const cleanComment = comment.trim();
    if (!cleanComment) return;

    const reportedScore = state.score > 0 ? state.score : state.highScore;
    const reportedDist =
      Math.floor(state.distance) > 0 ? Math.floor(state.distance) : state.bestDistance;

    const newReview: GameReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: cleanAuthor,
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      category,
      comment: cleanComment,
      createdAt: 'Just now',
      ...(includeStats && reportedScore > 0
        ? {
            gameMode: state.gameMode,
            score: reportedScore,
            distance: reportedDist,
            level: state.level,
          }
        : {}),
      helpfulCount: 1,
      isUserSubmitted: true,
    };

    const nextReviews = [newReview, ...state.reviews];
    saveReviews(nextReviews);
    set({ reviews: nextReviews });
  },

  toggleHelpfulReview: (id) => {
    const { reviews, helpfulReviewIds } = get();
    const alreadyHelpful = helpfulReviewIds.includes(id);
    const nextHelpfulIds = alreadyHelpful
      ? helpfulReviewIds.filter((item) => item !== id)
      : [...helpfulReviewIds, id];

    const nextReviews = reviews.map((rev) =>
      rev.id === id
        ? {
            ...rev,
            helpfulCount: Math.max(0, rev.helpfulCount + (alreadyHelpful ? -1 : 1)),
          }
        : rev
    );

    saveHelpfulIds(nextHelpfulIds);
    saveReviews(nextReviews);
    set({ reviews: nextReviews, helpfulReviewIds: nextHelpfulIds });
  },

  deleteReview: (id) => {
    const { reviews } = get();
    const nextReviews = reviews.filter((rev) => rev.id !== id);
    saveReviews(nextReviews);
    set({ reviews: nextReviews });
  },

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
      laneCount: Math.min(laneCount + 2, 5),
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

    const profile = calculateObstacleDifficulty(nextScore, state.distance, state.level);
    const dynamicTargetSpeed = Math.max(
      8,
      profile.targetBaseSpeed + activeChaiBoost - activeSpeedPenalty
    );
    const nextSpeed =
      state.status === GameStatus.PLAYING
        ? Math.max(state.speed, dynamicTargetSpeed)
        : state.speed;

    return { 
      score: nextScore,
      highScore: nextHigh,
      gemsCollected: state.gemsCollected + 1,
      speed: nextSpeed,
    };
  }),

  setDistance: (dist) => set((state) => {
    const nextBest = Math.max(state.bestDistance, Math.floor(dist));
    if (nextBest > state.bestDistance) saveStat('gully_runner_best_distance', nextBest);

    if (state.status !== GameStatus.PLAYING) {
      return { distance: dist, bestDistance: nextBest };
    }

    const profile = calculateObstacleDifficulty(state.score, dist, state.level);
    const dynamicTargetSpeed = Math.max(
      8,
      profile.targetBaseSpeed + activeChaiBoost - activeSpeedPenalty
    );
    return {
      distance: dist,
      bestDistance: nextBest,
      speed: Math.max(state.speed, dynamicTargetSpeed),
    };
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
          laneCount: Math.min(laneCount + 2, 5), // Keep street compact (max 5 lanes) so camera stays close
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
