/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export type GameMode = 'REGULAR' | 'ENDLESS';

export enum GameStatus {
  MENU = 'MENU',
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum ObjectType {
  OBSTACLE = 'OBSTACLE',
  DEBRIS = 'DEBRIS',
  STRAY_COW = 'STRAY_COW',
  SLEEPING_DOG = 'SLEEPING_DOG',
  VEG_CRATE_PILE = 'VEG_CRATE_PILE',
  CHAI = 'CHAI',
  GEM = 'GEM',
  LETTER = 'LETTER',
  SHOP_PORTAL = 'SHOP_PORTAL',
  ALIEN = 'ALIEN',
  MISSILE = 'MISSILE'
}

export type ClearanceType = 'JUMP' | 'SLIDE';

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number]; // x, y, z
  active: boolean;
  value?: string; // For letters (G, E, M...)
  color?: string;
  targetIndex?: number; // Index in the GEMINI target word
  points?: number; // Score value for gems
  hasFired?: boolean; // For Aliens
  dodged?: boolean; // Tracks if player already earned a near-miss/jump/slide combo on this hazard
  clearanceType?: ClearanceType; // Whether player must JUMP over or SLIDE under this bazaar item
  spawnAge?: number; // Elapsed seconds since this temporary bazaar item appeared
  maxDuration?: number; // Temporary bazaar presence duration before clearing
}

export const LANE_WIDTH = 2.2;
export const JUMP_HEIGHT = 3.15;
export const JUMP_DURATION = 0.92; // seconds (extended hang-time window to clear obstacles)
export const SLIDE_DURATION = 0.9; // seconds
export const RUN_SPEED_BASE = 22.5;
export const SPAWN_DISTANCE = 120;
export const REMOVE_DISTANCE = 20; // Behind player

// Vibrant Indian Street Festival Colors for B-H-A-A-G-O
export const GEMINI_COLORS = [
    '#ff9900', // B - Marigold Saffron
    '#ff1744', // H - Kumkum Red
    '#ffea00', // A - Haldi Yellow
    '#00e676', // A - Mehendi Green
    '#00b0ff', // G - Peacock Blue
    '#ff4081', // O - Jaipur Pink
];

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: any; // Lucide icon component
    oneTime?: boolean; // If true, remove from pool after buying
}
