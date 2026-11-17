/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { create } from 'zustand';
import * as THREE from 'three';
import {
  GameStatus,
  GameMode,
  StreetEnvironmentZone,
  PowerUpType,
  CharacterId,
  ShopItemId,
  RUN_SPEED_BASE,
} from './types';
import { audio } from './components/System/Audio';

export interface EnvironmentZoneProfile {
  id: StreetEnvironmentZone;
  title: string;
  subtitle: string;
  isCobbleRoad: boolean;
  roadBaseHex: string;
  tileHexA: string;
  tileHexB: string;
  curbStripeHexA: string;
  curbStripeHexB: string;
  sidewalkHex: string;
  outerGroundHex: string;
  wallPalette: [string, string, string];
  trimHex: string;
  horizonDomeHex: string;
  hasPalmTrees: boolean;
  hasTriangleBunting: boolean;
}

/**
 * Environment Progression matching Image 1D & Roadmap Phase 3:
 * - Level 1: Traditional Residential Gully (Purani Gully Mohalla)
 * - Level 2: Crowded Vegetable Market (Subzi Mandi Bazaar)
 * - Level 3: Festival Street (Diwali Utsav Street)
 * - Level 4+ / Endless: Cyber Metro Bazaar + dynamic rotation every 240m
 */
export const ENVIRONMENT_ZONES: EnvironmentZoneProfile[] = [
  {
    id: 'RESIDENTIAL_GULLY',
    title: 'Traditional Residential Gully',
    subtitle: 'Purani Gully Mohalla · Sandstone Havelis & Jharokhas',
    isCobbleRoad: false,
    roadBaseHex: '#111318',
    tileHexA: '#181b22',
    tileHexB: '#111318',
    curbStripeHexA: '#b45309',
    curbStripeHexB: '#fde68a',
    sidewalkHex: '#b08968',
    outerGroundHex: '#7f5539',
    wallPalette: ['#d97706', '#c27838', '#b5654d'],
    trimHex: '#e6ccb2',
    horizonDomeHex: '#b45309',
    hasPalmTrees: false,
    hasTriangleBunting: false,
  },
  {
    id: 'VEGETABLE_MARKET',
    title: 'Crowded Vegetable Market',
    subtitle: 'Subzi Mandi Bazaar · Crate Piles, Stalls & Thelas',
    isCobbleRoad: false,
    roadBaseHex: '#111318',
    tileHexA: '#181b22',
    tileHexB: '#111318',
    curbStripeHexA: '#15803d',
    curbStripeHexB: '#fde047',
    sidewalkHex: '#94a3b8',
    outerGroundHex: '#475569',
    wallPalette: ['#10b981', '#eab308', '#3b82f6'],
    trimHex: '#cbd5e1',
    horizonDomeHex: '#15803d',
    hasPalmTrees: true,
    hasTriangleBunting: false,
  },
  {
    id: 'FESTIVAL_STREET',
    title: 'Festival Street',
    subtitle: 'Diwali Utsav Avenue · Marigold Garlands & Bunting',
    isCobbleRoad: false,
    roadBaseHex: '#111318',
    tileHexA: '#181b22',
    tileHexB: '#111318',
    curbStripeHexA: '#f59e0b',
    curbStripeHexB: '#be123c',
    sidewalkHex: '#c87d65',
    outerGroundHex: '#9a523c',
    wallPalette: ['#d96b43', '#db5461', '#d97706'],
    trimHex: '#f3d5b5',
    horizonDomeHex: '#9f1239',
    hasPalmTrees: true,
    hasTriangleBunting: true,
  },
  {
    id: 'METRO_NIGHT_BAZAAR',
    title: 'Cyber Metro Bazaar',
    subtitle: 'Express Avenue · Chaat Thelas & Neon Signboards',
    isCobbleRoad: false,
    roadBaseHex: '#111318',
    tileHexA: '#181b22',
    tileHexB: '#111318',
    curbStripeHexA: '#0284c7',
    curbStripeHexB: '#0f172a',
    sidewalkHex: '#64748b',
    outerGroundHex: '#334155',
    wallPalette: ['#3b82f6', '#6366f1', '#059669'],
    trimHex: '#94a3b8',
    horizonDomeHex: '#312e81',
    hasPalmTrees: true,
    hasTriangleBunting: true,
  },
];

/**
 * Returns the active Indian street environment zone locked in sync with `level`:
 * - Level 1: Traditional Residential Gully
 * - Level 2: Crowded Vegetable Market
 * - Level 3: Festival Street
 * - Wave 4+: Cyber Metro Bazaar (and rotates zones across higher waves)
 */
export const getEnvironmentZone = (_distance: number, level = 1): EnvironmentZoneProfile => {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel === 1) return ENVIRONMENT_ZONES[0];
  if (safeLevel === 2) return ENVIRONMENT_ZONES[1];
  if (safeLevel === 3) return ENVIRONMENT_ZONES[2];
  return ENVIRONMENT_ZONES[(safeLevel - 1) % ENVIRONMENT_ZONES.length];
};

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  title: string;
  unlockRequirementText: string;
  shirtHex: string;
  vestHex: string;
  jeansHex: string;
  headbandHex: string;
  shoeAccentHex: string;
  perkLabel: string;
}

export const CHARACTER_PROFILES: CharacterProfile[] = [
  {
    id: 'RAJU_CRICKETER',
    name: 'Raju',
    title: 'Gully Striker',
    unlockRequirementText: 'Default Starter Runner',
    shirtHex: '#ff6d00',
    vestHex: '#1e293b',
    jeansHex: '#1d4ed8',
    headbandHex: '#facc15',
    shoeAccentHex: '#ef4444',
    perkLabel: 'Balanced Gully All-Rounder',
  },
  {
    id: 'ZOYA_SKATER',
    name: 'Zoya',
    title: 'Colaba Sprinter',
    unlockRequirementText: 'Unlock: Run 400m or Score ₹4,000',
    shirtHex: '#06b6d4',
    vestHex: '#0f172a',
    jeansHex: '#312e81',
    headbandHex: '#ec4899',
    shoeAccentHex: '#22d3ee',
    perkLabel: '+15% Near-Miss Bonus Points',
  },
  {
    id: 'KABIR_ROYAL',
    name: 'Kabir',
    title: 'Johari Parkour',
    unlockRequirementText: 'Unlock: Run 800m or Score ₹9,000',
    shirtHex: '#e11d48',
    vestHex: '#4c0519',
    jeansHex: '#1e1b4b',
    headbandHex: '#fde047',
    shoeAccentHex: '#f59e0b',
    perkLabel: '+20% Gem & Samosa Value',
  },
  {
    id: 'DEV_CYBER',
    name: 'Dev',
    title: 'Metro Legend',
    unlockRequirementText: 'Unlock: Run 1,200m or Score ₹15,000',
    shirtHex: '#10b981',
    vestHex: '#064e3b',
    jeansHex: '#0f172a',
    headbandHex: '#38bdf8',
    shoeAccentHex: '#a855f7',
    perkLabel: '+1.5s Longer Chai & Power-Ups',
  },
];

export interface DailyMission {
  id: string;
  title: string;
  target: number;
  progress: number;
  rewardPoints: number;
  completed: boolean;
  claimed?: boolean;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  distance: number;
  characterId: CharacterId;
  mode: GameMode;
  isPlayer?: boolean;
}

export interface ObstacleDifficultyProfile {
  difficultyIndex: number;
  targetBaseSpeed: number;
  obstacleSpeedMultiplier: number;
  spawnGap: number;
  obstacleWaveChance: number;
  multiLaneChance: number;
  scooterChance: number;
  secondaryHazardChance: number;
}

export const calculateObstacleDifficulty = (
  score: number,
  distance: number,
  level: number
): ObstacleDifficultyProfile => {
  const distanceFactor = Math.max(0, distance) / 1600;
  const scoreFactor = Math.max(0, score) / 10000;
  const levelFactor = Math.max(0, level - 1) * 0.14;

  const difficultyIndex = Math.min(1.5, distanceFactor * 0.55 + scoreFactor * 0.45 + levelFactor);

  const maxSpeed = RUN_SPEED_BASE * 2.55;
  const targetBaseSpeed = Math.min(
    maxSpeed,
    RUN_SPEED_BASE * (1 + difficultyIndex * 0.72)
  );

  const obstacleSpeedMultiplier = 1 + difficultyIndex * 0.35;
  const spawnGap = Math.max(12.8, 21.5 - difficultyIndex * 5.8);
  const obstacleWaveChance = Math.min(0.92, 0.75 + difficultyIndex * 0.12);
  const multiLaneChance = Math.min(0.78, 0.38 + difficultyIndex * 0.28);
  const scooterChance = Math.min(0.38, 0.15 + difficultyIndex * 0.16);
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

export interface GullyLightingGrade {
  sunsetProgress: number;
  goldenHourFactor: number;
  nightFactor: number;
  phaseLabel:
    | 'Sunny Afternoon'
    | 'Late Afternoon'
    | 'Golden Hour'
    | 'Twilight Dusk'
    | 'Starlit Night'
    | 'Saffron Dawn';
  lampIntensity: number;
  toneMappingExposure: number;
  bloomIntensity: number;
  bloomThreshold: number;
  vignetteDarkness: number;
  zenithHex: string;
  midSkyHex: string;
  horizonHex: string;
  sunDiscHex: string;
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  dirSunHex: string;
  dirSunIntensity: number;
  dirSunPosition: [number, number, number];
  rimLightHex: string;
  rimLightIntensity: number;
  fogNear: number;
  fogFar: number;
}

const GRADE_STOPS = {
  afternoon: {
    zenith: new THREE.Color('#0284c7'),
    midSky: new THREE.Color('#38bdf8'),
    horizon: new THREE.Color('#f5deb3'),
    sunDisc: new THREE.Color('#fde68a'),
    hemiSky: new THREE.Color('#bae6fd'),
    hemiGround: new THREE.Color('#8c5230'),
    dirSun: new THREE.Color('#fffaeb'),
    rimLight: new THREE.Color('#fde047'),
  },
  lateAfternoon: {
    zenith: new THREE.Color('#1d4ed8'),
    midSky: new THREE.Color('#f59e0b'),
    horizon: new THREE.Color('#fdba74'),
    sunDisc: new THREE.Color('#facc15'),
    hemiSky: new THREE.Color('#fcd34d'),
    hemiGround: new THREE.Color('#7c3a19'),
    dirSun: new THREE.Color('#fde68a'),
    rimLight: new THREE.Color('#fb923c'),
  },
  goldenHour: {
    zenith: new THREE.Color('#7c2d12'),
    midSky: new THREE.Color('#ea580c'),
    horizon: new THREE.Color('#f97316'),
    sunDisc: new THREE.Color('#fed7aa'),
    hemiSky: new THREE.Color('#fdba74'),
    hemiGround: new THREE.Color('#4a1d0b'),
    dirSun: new THREE.Color('#ffb703'),
    rimLight: new THREE.Color('#ff5400'),
  },
  twilightDusk: {
    zenith: new THREE.Color('#1e1b4b'),
    midSky: new THREE.Color('#701a75'),
    horizon: new THREE.Color('#c2410c'),
    sunDisc: new THREE.Color('#fb7185'),
    hemiSky: new THREE.Color('#c084fc'),
    hemiGround: new THREE.Color('#271124'),
    dirSun: new THREE.Color('#f472b6'),
    rimLight: new THREE.Color('#e11d48'),
  },
  starlitNight: {
    zenith: new THREE.Color('#090d16'),
    midSky: new THREE.Color('#172554'),
    horizon: new THREE.Color('#312e81'),
    sunDisc: new THREE.Color('#e2e8f0'),
    hemiSky: new THREE.Color('#60a5fa'),
    hemiGround: new THREE.Color('#1e1b4b'),
    dirSun: new THREE.Color('#93c5fd'),
    rimLight: new THREE.Color('#f59e0b'),
  },
};

const _scratchC1 = new THREE.Color();

function sampleFiveStopHex(
  t: number,
  c0: THREE.Color,
  c1: THREE.Color,
  c2: THREE.Color,
  c3: THREE.Color,
  c4: THREE.Color
): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.25) {
    _scratchC1.lerpColors(c0, c1, clamped / 0.25);
  } else if (clamped < 0.52) {
    _scratchC1.lerpColors(c1, c2, (clamped - 0.25) / 0.27);
  } else if (clamped < 0.76) {
    _scratchC1.lerpColors(c2, c3, (clamped - 0.52) / 0.24);
  } else {
    _scratchC1.lerpColors(c3, c4, (clamped - 0.76) / 0.24);
  }
  return `#${_scratchC1.getHexString()}`;
}

export const calculateGullyLightingGrade = (
  score: number,
  distance = 0
): GullyLightingGrade => {
  const rawUnits = (Math.max(0, score) / 11500) * 0.65 + (Math.max(0, distance) / 1100) * 0.35;
  const cyclePhase = rawUnits % 2.0;
  const isDawnReturn = cyclePhase > 1.0;
  const linearT = isDawnReturn ? 2.0 - cyclePhase : cyclePhase;
  const t = linearT * linearT * (3 - 2 * linearT);

  const phaseLabel: GullyLightingGrade['phaseLabel'] =
    t < 0.2
      ? 'Sunny Afternoon'
      : t < 0.44
      ? isDawnReturn
        ? 'Saffron Dawn'
        : 'Late Afternoon'
      : t < 0.68
      ? isDawnReturn
        ? 'Saffron Dawn'
        : 'Golden Hour'
      : t < 0.86
      ? 'Twilight Dusk'
      : 'Starlit Night';

  const goldenHourFactor = Math.max(0, 1 - Math.abs(t - 0.52) / 0.35);
  const nightFactor = Math.max(0, Math.min(1, (t - 0.65) / 0.35));
  const lampIntensity = Math.max(0, Math.min(1, (t - 0.32) / 0.42));

  const sunX = 28 - t * 22;
  const sunY = nightFactor > 0.3 ? 16 + nightFactor * 20 : 48 - t * 38;
  const sunZ = 24 - t * 62;

  return {
    sunsetProgress: t,
    goldenHourFactor,
    nightFactor,
    phaseLabel,
    lampIntensity,
    toneMappingExposure: 0.92 - t * 0.03 + goldenHourFactor * 0.02 + nightFactor * 0.06,
    bloomIntensity: 0.15 + goldenHourFactor * 0.07 + nightFactor * 0.12,
    bloomThreshold: 0.94 - goldenHourFactor * 0.04 - nightFactor * 0.06,
    vignetteDarkness: 0.22 + t * 0.08,
    zenithHex: sampleFiveStopHex(
      t,
      GRADE_STOPS.afternoon.zenith,
      GRADE_STOPS.lateAfternoon.zenith,
      GRADE_STOPS.goldenHour.zenith,
      GRADE_STOPS.twilightDusk.zenith,
      GRADE_STOPS.starlitNight.zenith
    ),
    midSkyHex: sampleFiveStopHex(
      t,
      GRADE_STOPS.afternoon.midSky,
      GRADE_STOPS.lateAfternoon.midSky,
      GRADE_STOPS.goldenHour.midSky,
      GRADE_STOPS.twilightDusk.midSky,
      GRADE_STOPS.starlitNight.midSky
    ),
    horizonHex: sampleFiveStopHex(
      t,
      GRADE_STOPS.afternoon.horizon,
      GRADE_STOPS.lateAfternoon.horizon,
      GRADE_STOPS.goldenHour.horizon,
      GRADE_STOPS.twilightDusk.horizon,
      GRADE_STOPS.starlitNight.horizon
    ),
    sunDiscHex: sampleFiveStopHex(
      t,
      GRADE_STOPS.afternoon.sunDisc,
      GRADE_STOPS.lateAfternoon.sunDisc,
      GRADE_STOPS.goldenHour.sunDisc,
      GRADE_STOPS.twilightDusk.sunDisc,
      GRADE_STOPS.starlitNight.sunDisc
    ),
    hemiSkyHex: sampleFiveStopHex(
      t,
      GRADE_STOPS.afternoon.hemiSky,
      GRADE_STOPS.lateAfternoon.hemiSky,
      GRADE_STOPS.goldenHour.hemiSky,
      GRADE_STOPS.twilightDusk.hemiSky,
      GRADE_STOPS.starlitNight.hemiSky
    ),
    hemiGroundHex: sampleFiveStopHex(
      t,
      GRADE_STOPS.afternoon.hemiGround,
      GRADE_STOPS.lateAfternoon.hemiGround,
      GRADE_STOPS.goldenHour.hemiGround,
      GRADE_STOPS.twilightDusk.hemiGround,
      GRADE_STOPS.starlitNight.hemiGround
    ),
    hemiIntensity: 0.92 - t * 0.14 + nightFactor * 0.12,
    dirSunHex: sampleFiveStopHex(
      t,
      GRADE_STOPS.afternoon.dirSun,
      GRADE_STOPS.lateAfternoon.dirSun,
      GRADE_STOPS.goldenHour.dirSun,
      GRADE_STOPS.twilightDusk.dirSun,
      GRADE_STOPS.starlitNight.dirSun
    ),
    dirSunIntensity: 1.48 - t * 0.25 + goldenHourFactor * 0.14 + nightFactor * 0.18,
    dirSunPosition: [sunX, sunY, sunZ],
    rimLightHex: sampleFiveStopHex(
      t,
      GRADE_STOPS.afternoon.rimLight,
      GRADE_STOPS.lateAfternoon.rimLight,
      GRADE_STOPS.goldenHour.rimLight,
      GRADE_STOPS.twilightDusk.rimLight,
      GRADE_STOPS.starlitNight.rimLight
    ),
    rimLightIntensity: 0.75 + goldenHourFactor * 1.4 + nightFactor * 1.1,
    fogNear: 76 - t * 8,
    fogFar: 235 - t * 15,
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
      'That screen shake and whoosh when Sharma Uncle’s chappal flies past my ear gave me real childhood flashbacks! The new fake-out chappal feints and near-miss streaks are awesome.',
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
      'Grabbing a Cutting Chai and Chumbak Magnet while shopkeepers yell "Ae! Sambhal ke!" in 3D audio is pure chaos. Love the 3-level progression!',
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
      'Super smooth controls on mobile and the Auto-Rickshaw Shield saved my run on Wave 4! Highly addictive.',
    createdAt: '5 hours ago',
    gameMode: 'REGULAR',
    score: 9600,
    distance: 780,
    level: 3,
    helpfulCount: 9,
  },
];

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'lb-1', name: 'Priya K. (Mumbai)', score: 19200, distance: 1450, characterId: 'DEV_CYBER', mode: 'ENDLESS' },
  { id: 'lb-2', name: 'Aarav S. (Delhi)', score: 14850, distance: 1120, characterId: 'KABIR_ROYAL', mode: 'ENDLESS' },
  { id: 'lb-3', name: 'Rohan M. (Jaipur)', score: 9600, distance: 780, characterId: 'ZOYA_SKATER', mode: 'REGULAR' },
  { id: 'lb-4', name: 'Neha T. (Pune)', score: 6400, distance: 540, characterId: 'RAJU_CRICKETER', mode: 'REGULAR' },
];

const DEFAULT_MISSIONS: DailyMission[] = [
  { id: 'm_nearmiss', title: 'Pull Off 5 Near-Miss Dodges', target: 5, progress: 0, rewardPoints: 150, completed: false },
  { id: 'm_gems', title: 'Collect 25 Bazaar Coins & Samosas', target: 25, progress: 0, rewardPoints: 200, completed: false },
  { id: 'm_dist', title: 'Sprint 500m Across the Bazaar', target: 500, progress: 0, rewardPoints: 250, completed: false },
];

const DEFAULT_ACHIEVEMENTS: AchievementItem[] = [
  { id: 'ach_first_near_miss', title: 'Bazaar Daredevil', description: 'Trigger your first Near-Miss obstacle brush.', unlocked: false },
  { id: 'ach_streak_5', title: 'Untouchable Gully King', description: 'Reach a 5x Near-Miss or Dodge Combo streak.', unlocked: false },
  { id: 'ach_shield_save', title: 'Bumper Bachao!', description: 'Block a major collision using an Auto-Rickshaw Shield.', unlocked: false },
  { id: 'ach_uncle_escape', title: 'Chappal Dodger', description: 'Evade Sharma Uncle’s multi-pattern chappal attack.', unlocked: false },
  { id: 'ach_festival_street', title: 'Utsav Champion', description: 'Reach Level 3 Festival Street or 600m distance.', unlocked: false },
];

export interface ActiveNotification {
  id: string;
  text: string;
  type: 'immortal' | 'chai' | 'stumble' | 'combo' | 'mission' | 'info';
  priority: number;
}

const REVIEWS_STORAGE_KEY = 'gully_runner_reviews_v1';
const HELPFUL_STORAGE_KEY = 'gully_runner_helpful_reviews_v1';
const LEADERBOARD_STORAGE_KEY = 'gully_runner_leaderboard_v2';
const MISSIONS_STORAGE_KEY = 'gully_runner_missions_v2';
const MISSIONS_DATE_KEY = 'gully_runner_missions_date_v2';
const ACHIEVEMENTS_STORAGE_KEY = 'gully_runner_achievements_v2';
const VOLUME_STORAGE_KEY = 'gully_runner_volume_v2';
const SHAKE_STORAGE_KEY = 'gully_runner_shake_v2';
const PERMA_HEARTS_STORAGE_KEY = 'gully_runner_perma_hearts_v2';
const WALLET_STORAGE_KEY = 'gully_runner_wallet_v2';

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const saveJson = (key: string, val: unknown) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore storage errors
  }
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

const getUnlockedCharactersFromStats = (highScore: number, bestDistance: number): CharacterId[] => {
  const unlocked: CharacterId[] = ['RAJU_CRICKETER'];
  if (bestDistance >= 400 || highScore >= 4000) unlocked.push('ZOYA_SKATER');
  if (bestDistance >= 800 || highScore >= 9000) unlocked.push('KABIR_ROYAL');
  if (bestDistance >= 1200 || highScore >= 15000) unlocked.push('DEV_CYBER');
  return unlocked;
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

  // Inventory / Abilities / Active Gully Run 2.0 Power-Ups
  hasDoubleJump: boolean;
  hasImmortality: boolean;
  isImmortalityActive: boolean;
  isStumbling: boolean;
  isChaiBoostActive: boolean;
  isMagnetActive: boolean;
  isSlowMotionActive: boolean;
  hasShield: boolean;
  isDoubleScoreActive: boolean;
  hasEmergencyDodge: boolean;

  // Near-Miss & Combo System
  comboCount: number;
  comboMultiplier: number;
  lastComboLabel: string;
  nearMissCount: number;
  nearMissStreak: number;
  lastNearMissLabel: string;
  lastNearMissPoints: number;
  nearMissBannerVisible: boolean;

  // Character Unlocks & Progression
  selectedCharacter: CharacterId;
  unlockedCharacters: CharacterId[];
  dailyMissions: DailyMission[];
  achievements: AchievementItem[];
  recentAchievementBanner: string;
  leaderboard: LeaderboardEntry[];

  // Meta Progression & Persistent Upgrades
  persistentExtraHearts: number;
  persistentWallet: number;
  buyPermanentHeartUpgrade: () => boolean;

  // Daily Missions with Date Reset
  lastMissionDate: string;
  checkAndResetDailyMissions: () => void;
  claimDailyMissionReward: (missionId: string) => boolean;

  // Single Consolidated HUD Notification System
  activeNotification: ActiveNotification | null;
  setNotification: (
    text: string,
    type: ActiveNotification['type'],
    priority?: number,
    durationMs?: number
  ) => void;
  clearNotification: () => void;

  // Sound, Accessibility & Intro Preferences
  masterVolume: number;
  reducedCameraShake: boolean;
  skipIntro: boolean;

  // Temporary Sharma Uncle HUD Callout (auto-hides after 2.2s to prevent HUD clutter)
  uncleDialogueBanner: { text: string; urgent: boolean } | null;

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
  selectCharacter: (id: CharacterId) => void;
  setMasterVolume: (vol: number) => void;
  toggleReducedCameraShake: () => void;
  setSkipIntro: (skip: boolean) => void;
  replayIntro: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  togglePause: () => void;
  showUncleDialogue: (text: string, urgent?: boolean) => void;
  startGame: (mode?: GameMode) => void;
  completeIntro: () => void;
  restartGame: () => void;
  continueToEndless: () => void;
  takeDamage: () => void;
  triggerStumble: () => void;
  collectChai: () => void;
  collectPowerUp: (type: PowerUpType) => void;
  consumeShield: () => boolean;
  triggerEmergencyDodge: () => boolean;
  registerNearMiss: (obstacleLabel: string, baseBonus?: number) => void;
  registerComboAction: (label: string, baseBonus: number) => void;
  resetCombo: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (index: number) => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  unlockAchievement: (id: string) => void;

  // Shop / Abilities
  buyItem: (type: ShopItemId, cost: number) => boolean;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;
}

const GEMINI_TARGET = ['B', 'H', 'A', 'A', 'G', 'O'];
const MAX_LEVEL = 3;
const SKIP_INTRO_STORAGE_KEY = 'gully_runner_skip_intro_v1';

// Centralized Timer Registry so restarting or changing state never leaves stale timers running
let stumbleTimeoutId: number | null = null;
let chaiTimeoutId: number | null = null;
let comboTimeoutId: number | null = null;
let immortalityTimeoutId: number | null = null;
let magnetTimeoutId: number | null = null;
let slowMoTimeoutId: number | null = null;
let doubleScoreTimeoutId: number | null = null;
let nearMissBannerTimeoutId: number | null = null;
let achievementBannerTimeoutId: number | null = null;
let uncleDialogueTimeoutId: number | null = null;
let notificationTimeoutId: number | null = null;

let activeSpeedPenalty = 0;
let activeChaiBoost = 0;
let activeSlowMoFactor = 1.0;

const clearAllGameplayTimers = () => {
  if (stumbleTimeoutId) { clearTimeout(stumbleTimeoutId); stumbleTimeoutId = null; }
  if (chaiTimeoutId) { clearTimeout(chaiTimeoutId); chaiTimeoutId = null; }
  if (comboTimeoutId) { clearTimeout(comboTimeoutId); comboTimeoutId = null; }
  if (immortalityTimeoutId) { clearTimeout(immortalityTimeoutId); immortalityTimeoutId = null; }
  if (magnetTimeoutId) { clearTimeout(magnetTimeoutId); magnetTimeoutId = null; }
  if (slowMoTimeoutId) { clearTimeout(slowMoTimeoutId); slowMoTimeoutId = null; }
  if (doubleScoreTimeoutId) { clearTimeout(doubleScoreTimeoutId); doubleScoreTimeoutId = null; }
  if (nearMissBannerTimeoutId) { clearTimeout(nearMissBannerTimeoutId); nearMissBannerTimeoutId = null; }
  if (achievementBannerTimeoutId) { clearTimeout(achievementBannerTimeoutId); achievementBannerTimeoutId = null; }
  if (uncleDialogueTimeoutId) { clearTimeout(uncleDialogueTimeoutId); uncleDialogueTimeoutId = null; }
  if (notificationTimeoutId) { clearTimeout(notificationTimeoutId); notificationTimeoutId = null; }
  activeSpeedPenalty = 0;
  activeChaiBoost = 0;
  activeSlowMoFactor = 1.0;
};

const getMultiplierForCombo = (count: number): number => {
  if (count <= 0) return 1;
  if (count === 1) return 1.1;
  if (count === 2) return 1.2;
  if (count === 3) return 1.3;
  if (count === 4) return 1.4;
  return 1.5;
};

const initialHighScore = readSavedStat('gully_runner_high_score');
const initialBestDist = readSavedStat('gully_runner_best_distance');

export const useStore = create<GameState>((set, get) => {
  /**
   * Centralized Scoring Function (Technical Improvement #1 from Image 2):
   * Ensures every single point source (gems, near-misses, combos, letters, wave clears, mission rewards)
   * consistently applies active multipliers, updates `highScore`, persists to `localStorage`,
   * and checks character unlock milestones!
   */
  const awardScoreCentralized = (
    basePoints: number,
    options?: { applyCombo?: boolean; applyDoublePowerUp?: boolean }
  ): number => {
    const state = get();
    const useCombo = options?.applyCombo ?? true;
    const useDouble = options?.applyDoublePowerUp ?? true;

    const comboMult = useCombo ? state.comboMultiplier : 1;
    const powerUpMult = useDouble && state.isDoubleScoreActive ? 2 : 1;
    const earned = Math.max(0, Math.round(basePoints * comboMult * powerUpMult));

    const nextScore = state.score + earned;
    const nextHigh = Math.max(state.highScore, nextScore);
    if (nextHigh > state.highScore) {
      saveStat('gully_runner_high_score', nextHigh);
    }

    const nextUnlocked = getUnlockedCharactersFromStats(nextHigh, state.bestDistance);
    set({
      score: nextScore,
      highScore: nextHigh,
      unlockedCharacters: nextUnlocked,
    });

    return earned;
  };

  const updateMissionProgress = (missionId: string, deltaOrAbsolute: number, isAbsolute = false) => {
    const state = get();
    let newlyCompletedReward = 0;
    const updated = state.dailyMissions.map(m => {
      if (m.id !== missionId || m.completed) return m;
      const nextProg = Math.min(m.target, isAbsolute ? Math.max(m.progress, deltaOrAbsolute) : m.progress + deltaOrAbsolute);
      const nowDone = nextProg >= m.target;
      if (nowDone && !m.completed) {
        newlyCompletedReward += m.rewardPoints;
      }
      return { ...m, progress: nextProg, completed: nowDone };
    });
    saveJson(MISSIONS_STORAGE_KEY, updated);
    set({ dailyMissions: updated });
    if (newlyCompletedReward > 0) {
      awardScoreCentralized(newlyCompletedReward, { applyCombo: false, applyDoublePowerUp: false });
    }
  };

  const syncLeaderboardWithRun = () => {
    const state = get();
    if (state.score <= 0) return;
    const entry: LeaderboardEntry = {
      id: `player-best`,
      name: 'You (Gully Runner)',
      score: Math.max(state.score, state.highScore),
      distance: Math.max(Math.floor(state.distance), state.bestDistance),
      characterId: state.selectedCharacter,
      mode: state.gameMode,
      isPlayer: true,
    };
    const filtered = state.leaderboard.filter(e => e.id !== 'player-best');
    const merged = [...filtered, entry].sort((a, b) => b.score - a.score).slice(0, 8);
    saveJson(LEADERBOARD_STORAGE_KEY, merged);
    set({ leaderboard: merged });
  };

  const initialPermaHearts = Math.min(2, readSavedStat(PERMA_HEARTS_STORAGE_KEY));
  const initialWallet = readSavedStat(WALLET_STORAGE_KEY);
  const startingLives = Math.min(5, 3 + initialPermaHearts);
  const initialMasterVolume = loadJson<number>(VOLUME_STORAGE_KEY, 0.75);
  const initialShake = loadJson<boolean>(SHAKE_STORAGE_KEY, false);

  // Apply persisted master volume on boot
  audio.setMasterVolume?.(initialMasterVolume);

  // Check date-based daily mission reset on boot
  const todayDateStr = new Date().toISOString().split('T')[0];
  const storedMissionsDate = loadJson<string>(MISSIONS_DATE_KEY, '');
  let initialDailyMissions = loadJson<DailyMission[]>(MISSIONS_STORAGE_KEY, DEFAULT_MISSIONS);
  if (storedMissionsDate !== todayDateStr) {
    initialDailyMissions = DEFAULT_MISSIONS.map(m => ({ ...m, progress: 0, completed: false, claimed: false }));
    saveJson(MISSIONS_STORAGE_KEY, initialDailyMissions);
    saveJson(MISSIONS_DATE_KEY, todayDateStr);
  }

  return {
    status: GameStatus.MENU,
    gameMode: 'REGULAR',
    score: 0,
    highScore: initialHighScore,
    bestDistance: initialBestDist,
    lives: startingLives,
    maxLives: startingLives,
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
    isMagnetActive: false,
    isSlowMotionActive: false,
    hasShield: false,
    isDoubleScoreActive: false,
    hasEmergencyDodge: false,

    comboCount: 0,
    comboMultiplier: 1,
    lastComboLabel: '',
    nearMissCount: 0,
    nearMissStreak: 0,
    lastNearMissLabel: '',
    lastNearMissPoints: 0,
    nearMissBannerVisible: false,

    selectedCharacter: (loadJson<CharacterId>('gully_runner_char_v2', 'RAJU_CRICKETER')),
    unlockedCharacters: getUnlockedCharactersFromStats(initialHighScore, initialBestDist),
    dailyMissions: initialDailyMissions,
    lastMissionDate: todayDateStr,
    achievements: loadJson<AchievementItem[]>(ACHIEVEMENTS_STORAGE_KEY, DEFAULT_ACHIEVEMENTS),
    recentAchievementBanner: '',
    leaderboard: loadJson<LeaderboardEntry[]>(LEADERBOARD_STORAGE_KEY, DEFAULT_LEADERBOARD),

    persistentExtraHearts: initialPermaHearts,
    persistentWallet: initialWallet,
    activeNotification: null,

    masterVolume: initialMasterVolume,
    reducedCameraShake: initialShake,
    skipIntro: loadJson<boolean>(SKIP_INTRO_STORAGE_KEY, false),
    uncleDialogueBanner: null,

    reviews: loadJson<GameReview[]>(REVIEWS_STORAGE_KEY, DEFAULT_REVIEWS),
    helpfulReviewIds: loadJson<string[]>(HELPFUL_STORAGE_KEY, []),

    unlockAchievement: (id: string) => {
      const state = get();
      const target = state.achievements.find(a => a.id === id);
      if (!target || target.unlocked) return;

      const nextList = state.achievements.map(a => (a.id === id ? { ...a, unlocked: true } : a));
      saveJson(ACHIEVEMENTS_STORAGE_KEY, nextList);
      set({
        achievements: nextList,
        recentAchievementBanner: `Achievement Unlocked: ${target.title}!`,
      });
      if (achievementBannerTimeoutId) clearTimeout(achievementBannerTimeoutId);
      achievementBannerTimeoutId = window.setTimeout(() => {
        set({ recentAchievementBanner: '' });
        achievementBannerTimeoutId = null;
      }, 3200);
    },

    selectCharacter: (id: CharacterId) => {
      const { unlockedCharacters } = get();
      if (!unlockedCharacters.includes(id)) return;
      saveJson('gully_runner_char_v2', id);
      set({ selectedCharacter: id });
    },

    setMasterVolume: (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      saveJson(VOLUME_STORAGE_KEY, clamped);
      audio.setMasterVolume?.(clamped);
      set({ masterVolume: clamped });
    },

    toggleReducedCameraShake: () => {
      const nextVal = !get().reducedCameraShake;
      saveJson(SHAKE_STORAGE_KEY, nextVal);
      set({ reducedCameraShake: nextVal });
    },

    setSkipIntro: (skip: boolean) => {
      saveJson(SKIP_INTRO_STORAGE_KEY, skip);
      set({ skipIntro: skip });
    },

    pauseGame: () => {
      if (get().status === GameStatus.PLAYING) {
        set({ status: GameStatus.PAUSED });
      }
    },

    resumeGame: () => {
      if (get().status === GameStatus.PAUSED) {
        set({ status: GameStatus.PLAYING });
      }
    },

    togglePause: () => {
      const { status } = get();
      if (status === GameStatus.PLAYING) {
        set({ status: GameStatus.PAUSED });
      } else if (status === GameStatus.PAUSED) {
        set({ status: GameStatus.PLAYING });
      }
    },

    setNotification: (text, type, priority = 1, durationMs = 2800) => {
      const current = get().activeNotification;
      if (!current || priority >= current.priority) {
        if (notificationTimeoutId) clearTimeout(notificationTimeoutId);
        set({
          activeNotification: {
            id: Math.random().toString(),
            text,
            type,
            priority,
          },
        });
        notificationTimeoutId = window.setTimeout(() => {
          set({ activeNotification: null });
          notificationTimeoutId = null;
        }, durationMs);
      }
    },

    clearNotification: () => {
      if (notificationTimeoutId) {
        clearTimeout(notificationTimeoutId);
        notificationTimeoutId = null;
      }
      set({ activeNotification: null });
    },

    checkAndResetDailyMissions: () => {
      const currentToday = new Date().toISOString().split('T')[0];
      const stored = loadJson<string>(MISSIONS_DATE_KEY, '');
      if (stored !== currentToday) {
        const fresh = DEFAULT_MISSIONS.map(m => ({ ...m, progress: 0, completed: false, claimed: false }));
        saveJson(MISSIONS_STORAGE_KEY, fresh);
        saveJson(MISSIONS_DATE_KEY, currentToday);
        set({ dailyMissions: fresh, lastMissionDate: currentToday });
      }
    },

    claimDailyMissionReward: (missionId: string) => {
      const state = get();
      const mission = state.dailyMissions.find(m => m.id === missionId);
      if (!mission || !mission.completed || mission.claimed) return false;

      const updated = state.dailyMissions.map(m => m.id === missionId ? { ...m, claimed: true } : m);
      saveJson(MISSIONS_STORAGE_KEY, updated);

      const nextWallet = (readSavedStat(WALLET_STORAGE_KEY) || 0) + mission.rewardPoints;
      saveStat(WALLET_STORAGE_KEY, nextWallet);

      set({
        dailyMissions: updated,
        persistentWallet: nextWallet,
        score: state.score + mission.rewardPoints,
      });

      get().setNotification(`Claimed ₹${mission.rewardPoints} Mission Reward!`, 'mission', 3, 3000);
      return true;
    },

    buyPermanentHeartUpgrade: () => {
      const state = get();
      const current = readSavedStat(PERMA_HEARTS_STORAGE_KEY) || 0;
      const wallet = readSavedStat(WALLET_STORAGE_KEY) || 0;
      const cost = 2500;
      if (wallet >= cost && current < 2) {
        const next = current + 1;
        saveStat(PERMA_HEARTS_STORAGE_KEY, next);
        saveStat(WALLET_STORAGE_KEY, wallet - cost);
        set({
          persistentExtraHearts: next,
          persistentWallet: wallet - cost,
          maxLives: Math.min(5, state.maxLives + 1),
          lives: Math.min(5, state.lives + 1),
        });
        get().setNotification('Unlocked +1 Permanent Stamina Heart!', 'info', 3, 3500);
        return true;
      }
      return false;
    },

    showUncleDialogue: (text: string, urgent = false) => {
      set({ uncleDialogueBanner: { text, urgent } });
      if (uncleDialogueTimeoutId) clearTimeout(uncleDialogueTimeoutId);
      uncleDialogueTimeoutId = window.setTimeout(() => {
        set({ uncleDialogueBanner: null });
        uncleDialogueTimeoutId = null;
      }, 2200);
    },

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
      saveJson(REVIEWS_STORAGE_KEY, nextReviews);
      set({ reviews: nextReviews });
    },

    toggleHelpfulReview: id => {
      const { reviews, helpfulReviewIds } = get();
      const alreadyHelpful = helpfulReviewIds.includes(id);
      const nextHelpfulIds = alreadyHelpful
        ? helpfulReviewIds.filter(item => item !== id)
        : [...helpfulReviewIds, id];

      const nextReviews = reviews.map(rev =>
        rev.id === id
          ? {
              ...rev,
              helpfulCount: Math.max(0, rev.helpfulCount + (alreadyHelpful ? -1 : 1)),
            }
          : rev
      );

      saveJson(HELPFUL_STORAGE_KEY, nextHelpfulIds);
      saveJson(REVIEWS_STORAGE_KEY, nextReviews);
      set({ reviews: nextReviews, helpfulReviewIds: nextHelpfulIds });
    },

    deleteReview: id => {
      const { reviews } = get();
      const nextReviews = reviews.filter(rev => rev.id !== id);
      saveJson(REVIEWS_STORAGE_KEY, nextReviews);
      set({ reviews: nextReviews });
    },

    setGameMode: mode => set({ gameMode: mode }),

    startGame: mode => {
      clearAllGameplayTimers();
      const chosenMode = mode || get().gameMode;
      const shouldSkipIntro = get().skipIntro;
      const startingLives = Math.min(5, 3 + (readSavedStat(PERMA_HEARTS_STORAGE_KEY) || 0));
      set({
        status: shouldSkipIntro ? GameStatus.PLAYING : GameStatus.INTRO,
        gameMode: chosenMode,
        score: 0,
        lives: startingLives,
        maxLives: startingLives,
        speed: shouldSkipIntro ? RUN_SPEED_BASE : 0,
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
        isMagnetActive: false,
        isSlowMotionActive: false,
        hasShield: false,
        isDoubleScoreActive: false,
        hasEmergencyDodge: false,
        comboCount: 0,
        comboMultiplier: 1,
        lastComboLabel: '',
        nearMissCount: 0,
        nearMissStreak: 0,
        lastNearMissLabel: '',
        lastNearMissPoints: 0,
        nearMissBannerVisible: false,
        uncleDialogueBanner: null,
      });
    },

    replayIntro: () => {
      clearAllGameplayTimers();
      const startingLives = Math.min(5, 3 + (readSavedStat(PERMA_HEARTS_STORAGE_KEY) || 0));
      set({
        status: GameStatus.INTRO,
        score: 0,
        lives: startingLives,
        maxLives: startingLives,
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
        isMagnetActive: false,
        isSlowMotionActive: false,
        hasShield: false,
        isDoubleScoreActive: false,
        hasEmergencyDodge: false,
        comboCount: 0,
        comboMultiplier: 1,
        lastComboLabel: '',
        nearMissCount: 0,
        nearMissStreak: 0,
        lastNearMissLabel: '',
        lastNearMissPoints: 0,
        nearMissBannerVisible: false,
        uncleDialogueBanner: null,
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
      clearAllGameplayTimers();
      const startingLives = Math.min(5, 3 + (readSavedStat(PERMA_HEARTS_STORAGE_KEY) || 0));
      set({
        status: GameStatus.PLAYING,
        score: 0,
        lives: startingLives,
        maxLives: startingLives,
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
        isMagnetActive: false,
        isSlowMotionActive: false,
        hasShield: false,
        isDoubleScoreActive: false,
        hasEmergencyDodge: false,
        comboCount: 0,
        comboMultiplier: 1,
        lastComboLabel: '',
        nearMissCount: 0,
        nearMissStreak: 0,
        lastNearMissLabel: '',
        lastNearMissPoints: 0,
        nearMissBannerVisible: false,
        uncleDialogueBanner: null,
      });
    },

    continueToEndless: () => {
      const { level, laneCount, speed } = get();
      const nextLevel = level + 1;
      const maxEndlessSpeed = RUN_SPEED_BASE * 3.15;
      const nextSpeed = Math.min(
        maxEndlessSpeed,
        Math.max(RUN_SPEED_BASE * 1.8, speed) + RUN_SPEED_BASE * 0.2
      );

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
      set({ comboCount: 0, comboMultiplier: 1, lastComboLabel: '', nearMissStreak: 0 });
    },

    /**
     * Centralized Combo Action Registration (Fixed per Image 2 so it updates & saves highScore!)
     */
    registerComboAction: (label, baseBonus) => {
      const { status, comboCount } = get();
      if (status !== GameStatus.PLAYING) return;

      const nextCount = comboCount + 1;
      const nextMult = getMultiplierForCombo(nextCount);

      set({
        comboCount: nextCount,
        comboMultiplier: nextMult,
        lastComboLabel: label,
      });

      awardScoreCentralized(baseBonus, { applyCombo: true, applyDoublePowerUp: true });

      if (nextCount >= 5) {
        get().unlockAchievement('ach_streak_5');
      }
      if (label.includes('Chappal')) {
        get().unlockAchievement('ach_uncle_escape');
      }

      if (comboTimeoutId) clearTimeout(comboTimeoutId);
      comboTimeoutId = window.setTimeout(() => {
        set({ comboCount: 0, comboMultiplier: 1, lastComboLabel: '', nearMissStreak: 0 });
        comboTimeoutId = null;
      }, 3200);
    },

    /**
     * Top Recommendation (Image 1A): Near-Miss Reward System
     * Awards bonus score + combo multiplier, increments streak, triggers HUD NEAR MISS notification,
     * and updates Daily Missions & Achievements.
     */
    registerNearMiss: (obstacleLabel, baseBonus = 20) => {
      const state = get();
      if (state.status !== GameStatus.PLAYING) return;

      const nextStreak = state.nearMissStreak + 1;
      const nextTotal = state.nearMissCount + 1;
      const nextCombo = state.comboCount + 1;
      const nextMult = getMultiplierForCombo(nextCombo);

      // Zoya character perk: +15% Near-Miss Bonus Points
      const charBonus = state.selectedCharacter === 'ZOYA_SKATER' ? 1.15 : 1.0;
      const streakFactor = 1 + Math.min(0.4, (nextStreak - 1) * 0.1);
      const rawBonus = Math.round(baseBonus * streakFactor * charBonus);

      set({
        comboCount: nextCombo,
        comboMultiplier: nextMult,
        lastComboLabel: `NEAR MISS · ${obstacleLabel}`,
        nearMissCount: nextTotal,
        nearMissStreak: nextStreak,
      });

      const earnedPoints = awardScoreCentralized(rawBonus, {
        applyCombo: true,
        applyDoublePowerUp: true,
      });

      set({
        lastNearMissLabel: obstacleLabel,
        lastNearMissPoints: earnedPoints,
        nearMissBannerVisible: true,
      });

      updateMissionProgress('m_nearmiss', 1, false);
      get().unlockAchievement('ach_first_near_miss');
      if (nextStreak >= 5 || nextCombo >= 5) {
        get().unlockAchievement('ach_streak_5');
      }

      if (nearMissBannerTimeoutId) clearTimeout(nearMissBannerTimeoutId);
      nearMissBannerTimeoutId = window.setTimeout(() => {
        set({ nearMissBannerVisible: false });
        nearMissBannerTimeoutId = null;
      }, 1650);

      if (comboTimeoutId) clearTimeout(comboTimeoutId);
      comboTimeoutId = window.setTimeout(() => {
        set({ comboCount: 0, comboMultiplier: 1, lastComboLabel: '', nearMissStreak: 0 });
        comboTimeoutId = null;
      }, 3200);
    },

    consumeShield: () => {
      const { hasShield } = get();
      if (!hasShield) return false;
      set({ hasShield: false });
      get().unlockAchievement('ach_shield_save');
      get().registerComboAction('Rickshaw Shield Deflect!', 30);
      return true;
    },

    triggerEmergencyDodge: () => {
      const { hasEmergencyDodge } = get();
      if (!hasEmergencyDodge) return false;
      set({ hasEmergencyDodge: false });
      get().registerComboAction('Emergency Galli Phase-Dodge!', 35);
      window.dispatchEvent(new Event('emergency-dodge'));
      return true;
    },

    collectPowerUp: (type: PowerUpType) => {
      const state = get();
      if (state.status !== GameStatus.PLAYING) return;

      // Dev character perk: +1.5s longer duration on timed power-ups
      const extraDurationMs = state.selectedCharacter === 'DEV_CYBER' ? 1500 : 0;

      if (type === 'COIN_MAGNET') {
        set({ isMagnetActive: true });
        get().registerComboAction('Chumbak Coin Magnet!', 25);
        if (magnetTimeoutId) clearTimeout(magnetTimeoutId);
        magnetTimeoutId = window.setTimeout(() => {
          set({ isMagnetActive: false });
          magnetTimeoutId = null;
        }, 8000 + extraDurationMs);
      } else if (type === 'SLOW_MOTION') {
        activeSlowMoFactor = 0.58;
        set({
          isSlowMotionActive: true,
          speed: Math.max(11, state.speed * activeSlowMoFactor),
        });
        get().registerComboAction('Thandai Slow-Mo Focus!', 25);
        if (slowMoTimeoutId) clearTimeout(slowMoTimeoutId);
        slowMoTimeoutId = window.setTimeout(() => {
          activeSlowMoFactor = 1.0;
          const curr = get();
          if (curr.status === GameStatus.PLAYING) {
            const prof = calculateObstacleDifficulty(curr.score, curr.distance, curr.level);
            set({
              isSlowMotionActive: false,
              speed: Math.max(RUN_SPEED_BASE, prof.targetBaseSpeed + activeChaiBoost - activeSpeedPenalty),
            });
          } else {
            set({ isSlowMotionActive: false });
          }
          slowMoTimeoutId = null;
        }, 5000 + extraDurationMs);
      } else if (type === 'RICKSHAW_SHIELD') {
        set({ hasShield: true });
        get().registerComboAction('Auto-Rickshaw Bumper Shield!', 25);
      } else if (type === 'SCORE_MULTIPLIER') {
        set({ isDoubleScoreActive: true });
        get().registerComboAction('2x Utsav Score Multiplier!', 30);
        if (doubleScoreTimeoutId) clearTimeout(doubleScoreTimeoutId);
        doubleScoreTimeoutId = window.setTimeout(() => {
          set({ isDoubleScoreActive: false });
          doubleScoreTimeoutId = null;
        }, 8000 + extraDurationMs);
      } else if (type === 'EMERGENCY_DODGE') {
        set({ hasEmergencyDodge: true });
        get().registerComboAction('Emergency Galli Dodge Ready!', 25);
      }
    },

    takeDamage: () => {
      const { lives, isImmortalityActive, isChaiBoostActive } = get();
      if (isImmortalityActive || isChaiBoostActive) return;

      get().resetCombo();

      if (lives > 1) {
        set({ lives: lives - 1 });
      } else {
        clearAllGameplayTimers();
        syncLeaderboardWithRun();
        const earnedWallet = Math.max(0, Math.floor(get().score * 0.1));
        const newWallet = (readSavedStat(WALLET_STORAGE_KEY) || 0) + earnedWallet;
        saveStat(WALLET_STORAGE_KEY, newWallet);
        set({
          persistentWallet: newWallet,
          lives: 0,
          status: GameStatus.GAME_OVER,
          speed: 0,
          isStumbling: false,
          isChaiBoostActive: false,
          isMagnetActive: false,
          isSlowMotionActive: false,
          isDoubleScoreActive: false,
        });
      }
    },

    triggerStumble: () => {
      const { status, isImmortalityActive, isChaiBoostActive, isStumbling, speed } = get();
      if (status !== GameStatus.PLAYING || isImmortalityActive || isChaiBoostActive) return;

      get().resetCombo();

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
      const { status, speed, isStumbling, isChaiBoostActive, selectedCharacter } = get();
      if (status !== GameStatus.PLAYING) return;

      let baseSpeed = speed;

      if (isStumbling) {
        if (stumbleTimeoutId) {
          clearTimeout(stumbleTimeoutId);
          stumbleTimeoutId = null;
        }
        baseSpeed += activeSpeedPenalty;
        activeSpeedPenalty = 0;
      }

      const boostAmount = isChaiBoostActive ? 0 : RUN_SPEED_BASE * 0.2;
      if (!isChaiBoostActive) {
        activeChaiBoost = boostAmount;
      }

      set({
        isStumbling: false,
        isChaiBoostActive: true,
        speed: baseSpeed + boostAmount,
      });

      get().registerComboAction('Cutting Chai Rush!', 35);
      window.dispatchEvent(new Event('chai-boost'));

      const extraDurationMs = selectedCharacter === 'DEV_CYBER' ? 1500 : 0;
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
      }, 4000 + extraDurationMs);
    },

    addScore: amount => {
      awardScoreCentralized(amount, { applyCombo: true, applyDoublePowerUp: true });
    },

    collectGem: value => {
      const state = get();
      // Kabir character perk: +20% Gem & Samosa Value
      const charMult = state.selectedCharacter === 'KABIR_ROYAL' ? 1.2 : 1.0;
      awardScoreCentralized(Math.round(value * charMult), {
        applyCombo: false,
        applyDoublePowerUp: true,
      });

      const updatedState = get();
      const profile = calculateObstacleDifficulty(
        updatedState.score,
        updatedState.distance,
        updatedState.level
      );
      const dynamicTargetSpeed =
        Math.max(8, profile.targetBaseSpeed + activeChaiBoost - activeSpeedPenalty) *
        activeSlowMoFactor;
      const nextSpeed =
        updatedState.status === GameStatus.PLAYING
          ? Math.max(updatedState.speed * activeSlowMoFactor, dynamicTargetSpeed)
          : updatedState.speed;

      set({
        gemsCollected: updatedState.gemsCollected + 1,
        speed: nextSpeed,
      });

      updateMissionProgress('m_gems', 1, false);
    },

    setDistance: dist => {
      const state = get();
      const nextBest = Math.max(state.bestDistance, Math.floor(dist));
      if (nextBest > state.bestDistance) {
        saveStat('gully_runner_best_distance', nextBest);
      }
      const nextUnlocked = getUnlockedCharactersFromStats(state.highScore, nextBest);

      if (dist >= 600 || state.level >= 3) {
        get().unlockAchievement('ach_festival_street');
      }
      updateMissionProgress('m_dist', Math.floor(dist), true);

      if (state.status !== GameStatus.PLAYING) {
        set({
          distance: dist,
          bestDistance: nextBest,
          unlockedCharacters: nextUnlocked,
        });
        return;
      }

      const profile = calculateObstacleDifficulty(state.score, dist, state.level);
      const dynamicTargetSpeed =
        Math.max(8, profile.targetBaseSpeed + activeChaiBoost - activeSpeedPenalty) *
        activeSlowMoFactor;

      set({
        distance: dist,
        bestDistance: nextBest,
        unlockedCharacters: nextUnlocked,
        speed: Math.max(state.speed * activeSlowMoFactor, dynamicTargetSpeed),
      });
    },

    collectLetter: index => {
      const { collectedLetters, level, speed, gameMode } = get();

      if (!collectedLetters.includes(index)) {
        const newLetters = [...collectedLetters, index];

        const maxSpeedCap = RUN_SPEED_BASE * 3.15;
        const speedIncrease = RUN_SPEED_BASE * (level >= 4 ? 0.05 : 0.1);
        const nextSpeed = Math.min(maxSpeedCap, speed + speedIncrease);

        set({
          collectedLetters: newLetters,
          speed: nextSpeed,
        });

        awardScoreCentralized(40, { applyCombo: false, applyDoublePowerUp: true });

        if (newLetters.length === GEMINI_TARGET.length) {
          if (gameMode === 'ENDLESS' || level < MAX_LEVEL) {
            awardScoreCentralized(gameMode === 'ENDLESS' ? 500 : 350, {
              applyCombo: false,
              applyDoublePowerUp: true,
            });
            get().advanceLevel();
          } else {
            awardScoreCentralized(1200, { applyCombo: false, applyDoublePowerUp: true });
            clearAllGameplayTimers();
            syncLeaderboardWithRun();
            const earnedWallet = Math.max(0, Math.floor(get().score * 0.1));
            const newWallet = (readSavedStat(WALLET_STORAGE_KEY) || 0) + earnedWallet;
            saveStat(WALLET_STORAGE_KEY, newWallet);
            set({
              persistentWallet: newWallet,
              status: GameStatus.VICTORY,
              speed: 0,
            });
          }
        }
      }
    },

    advanceLevel: () => {
      const { level, laneCount, speed } = get();
      const nextLevel = level + 1;

      if (nextLevel >= 3) {
        get().unlockAchievement('ach_festival_street');
      }

      const maxSpeedCap = RUN_SPEED_BASE * 3.15;
      const speedIncrease = RUN_SPEED_BASE * (nextLevel > 3 ? 0.18 : 0.4);
      const newSpeed = Math.min(maxSpeedCap, speed + speedIncrease);

      set({
        level: nextLevel,
        laneCount: Math.min(laneCount + 2, 5),
        status: GameStatus.PLAYING,
        speed: newSpeed,
        collectedLetters: [],
      });
    },

    openShop: () => set({ status: GameStatus.SHOP }),

    closeShop: () => set({ status: GameStatus.PLAYING }),

    /**
     * Explicit Store-Level One-Time Purchase Validation (Technical Improvement #2 from Image 2):
     * Prevents purchasing already-owned one-time abilities or over-healing even if called directly.
     */
    buyItem: (type, cost) => {
      const state = get();
      if (state.score < cost) return false;

      // Enforce one-time purchase and capacity constraints directly in store logic
      if (type === 'DOUBLE_JUMP' && state.hasDoubleJump) return false;
      if (type === 'IMMORTAL' && state.hasImmortality) return false;
      if (type === 'RICKSHAW_SHIELD' && state.hasShield) return false;
      if (type === 'EMERGENCY_DODGE' && state.hasEmergencyDodge) return false;
      if (type === 'HEAL' && state.lives >= state.maxLives) return false;

      set({ score: state.score - cost });

      switch (type) {
        case 'DOUBLE_JUMP':
          set({ hasDoubleJump: true });
          break;
        case 'MAX_LIFE':
          set({ maxLives: state.maxLives + 1, lives: state.lives + 1 });
          break;
        case 'HEAL':
          set({ lives: Math.min(state.lives + 1, state.maxLives) });
          break;
        case 'IMMORTAL':
          set({ hasImmortality: true });
          break;
        case 'RICKSHAW_SHIELD':
          set({ hasShield: true });
          break;
        case 'EMERGENCY_DODGE':
          set({ hasEmergencyDodge: true });
          break;
        case 'COIN_MAGNET':
          get().collectPowerUp('COIN_MAGNET');
          break;
      }
      return true;
    },

    activateImmortality: () => {
      const { hasImmortality, isImmortalityActive, selectedCharacter } = get();
      if (hasImmortality && !isImmortalityActive) {
        set({ isImmortalityActive: true });

        const extraMs = selectedCharacter === 'DEV_CYBER' ? 1500 : 0;
        if (immortalityTimeoutId) clearTimeout(immortalityTimeoutId);
        immortalityTimeoutId = window.setTimeout(() => {
          set({ isImmortalityActive: false });
          immortalityTimeoutId = null;
        }, 5000 + extraMs);
      }
    },

    setStatus: status => {
      if (status === GameStatus.MENU) {
        clearAllGameplayTimers();
      }
      set({ status });
    },
  };
});
