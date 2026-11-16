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
  CITY_BUS = 'CITY_BUS',
  STREET_VENDOR = 'STREET_VENDOR',
  DEBRIS = 'DEBRIS',
  STRAY_COW = 'STRAY_COW',
  SLEEPING_DOG = 'SLEEPING_DOG',
  VEG_CRATE_PILE = 'VEG_CRATE_PILE',
  CHAI = 'CHAI',
  POWERUP = 'POWERUP',
  GEM = 'GEM',
  LETTER = 'LETTER',
  SHOP_PORTAL = 'SHOP_PORTAL',
  ALIEN = 'ALIEN',
  MISSILE = 'MISSILE'
}

export type PowerUpType =
  | 'COIN_MAGNET'
  | 'SLOW_MOTION'
  | 'RICKSHAW_SHIELD'
  | 'SCORE_MULTIPLIER'
  | 'EMERGENCY_DODGE';

export type UncleAttackPattern =
  | 'SINGLE_LOCK'
  | 'DOUBLE_FAN'
  | 'CURVE_SPIN'
  | 'FAKE_FEINT';

export type CharacterId =
  | 'RAJU_CRICKETER'
  | 'ZOYA_SKATER'
  | 'KABIR_ROYAL'
  | 'DEV_CYBER';

export type ClearanceType = 'JUMP' | 'SLIDE';

export type RickshawVariant = 'YELLOW_BLACK' | 'GREEN_YELLOW' | 'PLAIN_BLUE';
export type BusVariant = 'MUMBAI_RED' | 'DELHI_GREEN' | 'UTSAV_YELLOW';
export type VendorVariant = 'CHAAT_THELA' | 'KULFI_CART' | 'FRUIT_CART';

export type StreetEnvironmentZone =
  | 'RESIDENTIAL_GULLY'
  | 'VEGETABLE_MARKET'
  | 'FESTIVAL_STREET'
  | 'METRO_NIGHT_BAZAAR';

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number]; // x, y, z
  active: boolean;
  value?: string; // For letters (B, H, A, A, G, O)
  color?: string;
  targetIndex?: number; // Index in the target word
  points?: number; // Score value for gems
  hasFired?: boolean; // For Aliens
  dodged?: boolean; // Tracks if player already earned a near-miss/jump/slide combo on this hazard
  clearanceType?: ClearanceType; // Whether player must JUMP over or SLIDE under this bazaar item
  spawnAge?: number; // Elapsed seconds since this temporary bazaar item appeared
  maxDuration?: number; // Temporary bazaar presence duration before clearing
  rickshawVariant?: RickshawVariant; // 1 of 3 distinct Auto-Rickshaw models & color skins
  busVariant?: BusVariant; // 1 of 3 distinct Indian City Bus models
  vendorVariant?: VendorVariant; // 1 of 3 distinct Street Vendor pushcart models
  powerUpType?: PowerUpType; // Specific Gully Run 2.0 power-up variant
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

export type ShopItemId =
  | 'DOUBLE_JUMP'
  | 'MAX_LIFE'
  | 'HEAL'
  | 'IMMORTAL'
  | 'RICKSHAW_SHIELD'
  | 'EMERGENCY_DODGE'
  | 'COIN_MAGNET';

export interface ShopItem {
  id: ShopItemId;
  name: string;
  description: string;
  cost: number;
  icon: any; // Lucide icon component
  oneTime?: boolean; // Enforced both in store logic and UI
}
