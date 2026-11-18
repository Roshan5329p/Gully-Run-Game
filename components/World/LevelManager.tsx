/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore, calculateObstacleDifficulty } from '../../store';
import { GameObject, ObjectType, PowerUpType, ClearanceType, RickshawVariant, BusVariant, VendorVariant, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus, GEMINI_COLORS } from '../../types';
import { audio } from '../System/Audio';

// Obstacle Height (Auto-Rickshaw height for jump clearance)
const OBSTACLE_HEIGHT = 1.65;
const BUS_HEIGHT = 2.85;

// Auto-Rickshaw (Tuk-Tuk) Multi-Part Geometries for 3 Distinct Models
const AUTO_LOWER_BODY_GEO = new THREE.BoxGeometry(1.35, 0.72, 1.9);
const AUTO_NOSE_GEO = new THREE.CylinderGeometry(0.25, 0.55, 0.7, 6);
const AUTO_CANOPY_GEO = new THREE.BoxGeometry(1.38, 0.65, 1.75);
const AUTO_ROOF_TOP_GEO = new THREE.CylinderGeometry(0.68, 0.68, 1.75, 8, 1, false, 0, Math.PI);
const AUTO_WINDSHIELD_GEO = new THREE.PlaneGeometry(1.15, 0.55);
const AUTO_WHEEL_GEO = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 12);
const AUTO_HEADLIGHT_GEO = new THREE.SphereGeometry(0.14, 10, 10);
const AUTO_BUMPER_GEO = new THREE.CylinderGeometry(0.04, 0.04, 1.36, 8);
const AUTO_STRIPE_GEO = new THREE.BoxGeometry(1.39, 0.1, 1.92);
const AUTO_ROOF_RACK_GEO = new THREE.BoxGeometry(1.08, 0.08, 1.15);
const AUTO_LUGGAGE_GEO = new THREE.BoxGeometry(0.68, 0.22, 0.54);
const AUTO_MIRROR_ARM_GEO = new THREE.CylinderGeometry(0.018, 0.018, 0.26, 6);
const AUTO_MIRROR_HEAD_GEO = new THREE.BoxGeometry(0.12, 0.16, 0.04);
const AUTO_GARLAND_GEO = new THREE.TorusGeometry(0.32, 0.045, 8, 14, Math.PI);
const AUTO_HARD_ROOF_GEO = new THREE.BoxGeometry(1.44, 0.14, 1.92);
const AUTO_SOLAR_PANEL_GEO = new THREE.BoxGeometry(1.12, 0.04, 1.35);
const AUTO_SIDE_RAIL_GEO = new THREE.CylinderGeometry(0.025, 0.025, 1.65, 6);
const AUTO_LED_BROW_GEO = new THREE.BoxGeometry(0.92, 0.07, 0.06);
const AUTO_INDICATOR_GEO = new THREE.SphereGeometry(0.065, 8, 8);

// Indian City Bus (BEST Red / DTC Green / Utsav Express Yellow) Scaled Up Proportions
const BUS_BODY_GEO = new THREE.BoxGeometry(2.35, 2.45, 5.6);
const BUS_ROOF_GEO = new THREE.BoxGeometry(2.28, 0.28, 5.5);
const BUS_STRIPE_GEO = new THREE.BoxGeometry(2.38, 0.22, 5.64);
const BUS_WINDSHIELD_GEO = new THREE.PlaneGeometry(2.05, 1.05);
const BUS_SIDE_WINDOW_GEO = new THREE.BoxGeometry(2.4, 0.72, 4.4);
const BUS_DEST_BOARD_GEO = new THREE.BoxGeometry(1.55, 0.32, 0.1);
const BUS_BUMPER_GEO = new THREE.BoxGeometry(2.42, 0.28, 0.25);
const BUS_WHEEL_GEO = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 14);

// Indian Street Vendor Pushcart (Thela) & Vendor Geometries
const VENDOR_CART_DECK_GEO = new THREE.BoxGeometry(1.38, 0.16, 1.55);
const VENDOR_CART_FRAME_GEO = new THREE.BoxGeometry(1.26, 0.58, 1.38);
const VENDOR_WHEEL_GEO = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12);
const VENDOR_UMBRELLA_POLE_GEO = new THREE.CylinderGeometry(0.035, 0.035, 1.65, 8);
const VENDOR_UMBRELLA_TOP_GEO = new THREE.ConeGeometry(0.98, 0.48, 8);
const VENDOR_MATKA_GEO = new THREE.SphereGeometry(0.28, 12, 10);
const VENDOR_PERSON_TORSO_GEO = new THREE.CylinderGeometry(0.2, 0.22, 0.65, 8);
const VENDOR_PERSON_HEAD_GEO = new THREE.SphereGeometry(0.17, 10, 10);
const VENDOR_TURBAN_GEO = new THREE.TorusGeometry(0.14, 0.065, 8, 14);

const RICKSHAW_VARIANTS: { variant: RickshawVariant; color: string }[] = [
  { variant: 'YELLOW_BLACK', color: '#facc15' },
  { variant: 'GREEN_YELLOW', color: '#15803d' },
  { variant: 'PLAIN_BLUE', color: '#0284c7' },
];

const BUS_VARIANTS: { variant: BusVariant; color: string }[] = [
  { variant: 'MUMBAI_RED', color: '#dc2626' },
  { variant: 'DELHI_GREEN', color: '#16a34a' },
  { variant: 'UTSAV_YELLOW', color: '#eab308' },
];

const VENDOR_VARIANTS: { variant: VendorVariant; color: string }[] = [
  { variant: 'CHAAT_THELA', color: '#f97316' },
  { variant: 'KULFI_CART', color: '#ef4444' },
  { variant: 'FRUIT_CART', color: '#22c55e' },
];

const pickRandomRickshaw = (): { variant: RickshawVariant; color: string } => {
  return RICKSHAW_VARIANTS[Math.floor(Math.random() * RICKSHAW_VARIANTS.length)];
};

const pickRandomBus = (): { variant: BusVariant; color: string } => {
  return BUS_VARIANTS[Math.floor(Math.random() * BUS_VARIANTS.length)];
};

const pickRandomVendor = (): { variant: VendorVariant; color: string } => {
  return VENDOR_VARIANTS[Math.floor(Math.random() * VENDOR_VARIANTS.length)];
};

// Garam Samosa / Golden Rupee Gem Geometries
const SAMOSA_GEO = new THREE.TetrahedronGeometry(0.42, 0);
const RUPEE_RING_GEO = new THREE.TorusGeometry(0.32, 0.06, 8, 20);

// Level 2+ Rival Uncle on Scooter Geometries
const SCOOTER_BODY_GEO = new THREE.BoxGeometry(0.65, 0.5, 1.4);
const SCOOTER_SHIELD_GEO = new THREE.BoxGeometry(0.7, 0.85, 0.15);
const RIVAL_TORSO_GEO = new THREE.CylinderGeometry(0.25, 0.28, 0.6, 8);
const RIVAL_HEAD_GEO = new THREE.SphereGeometry(0.2, 12, 12);

// Flying Chappal (Projectile) Geometries
const FLYING_CHAPPAL_SOLE_GEO = new THREE.BoxGeometry(0.45, 0.08, 0.95);
const FLYING_CHAPPAL_STRAP_GEO = new THREE.TorusGeometry(0.2, 0.04, 8, 16, Math.PI);
const CHAPPAL_AURA_RING_GEO = new THREE.TorusGeometry(0.42, 0.03, 12, 24);

// Bazaar Debris (Spilled Vegetable Crate, Terracotta Kulhads & Chai Spill) Geometries
const DEBRIS_CRATE_GEO = new THREE.BoxGeometry(0.85, 0.34, 0.65);
const DEBRIS_KULHAD_GEO = new THREE.CylinderGeometry(0.11, 0.08, 0.22, 8);
const DEBRIS_SPILL_GEO = new THREE.CircleGeometry(0.75, 16);
const DEBRIS_PEEL_GEO = new THREE.ConeGeometry(0.16, 0.28, 5);

// Temporary Bazaar Item 1: Stray Cow (Gaay) Geometries (High Belly Clearance -> Slide Under!)
const COW_BODY_GEO = new THREE.BoxGeometry(1.45, 0.68, 0.78);
const COW_HUMP_GEO = new THREE.SphereGeometry(0.24, 10, 10);
const COW_LEG_GEO = new THREE.CylinderGeometry(0.085, 0.065, 0.96, 8);
const COW_HEAD_GEO = new THREE.BoxGeometry(0.42, 0.38, 0.36);
const COW_SNOUT_GEO = new THREE.BoxGeometry(0.24, 0.22, 0.28);
const COW_HORN_GEO = new THREE.ConeGeometry(0.045, 0.26, 6);
const COW_EAR_GEO = new THREE.BoxGeometry(0.06, 0.18, 0.1);
const COW_GARLAND_GEO = new THREE.TorusGeometry(0.26, 0.045, 8, 16);
const COW_BELL_GEO = new THREE.ConeGeometry(0.075, 0.14, 8);
const SLIDE_BAR_GEO = new THREE.BoxGeometry(1.5, 0.07, 0.07);

// Temporary Bazaar Item 2: Sleeping Street Dog (Desi Dog) Geometries (Low Curled -> Jump Over!)
const DOG_RUG_GEO = new THREE.CylinderGeometry(0.78, 0.82, 0.05, 16);
const DOG_BODY_GEO = new THREE.TorusGeometry(0.32, 0.17, 10, 18, Math.PI * 1.45);
const DOG_HEAD_GEO = new THREE.SphereGeometry(0.17, 12, 12);
const DOG_SNOUT_GEO = new THREE.ConeGeometry(0.085, 0.2, 8);
const DOG_EAR_GEO = new THREE.BoxGeometry(0.08, 0.14, 0.05);
const DOG_SLEEP_RING_GEO = new THREE.TorusGeometry(0.12, 0.02, 6, 16);

// Temporary Bazaar Item 3: Pile of Vegetable Crates Geometries (Jump-Over Stack OR Slide-Under Overhead Rack)
const VEG_CRATE_BOX_GEO = new THREE.BoxGeometry(0.88, 0.42, 0.68);
const VEG_PRODUCE_MOUND_GEO = new THREE.DodecahedronGeometry(0.24, 1);
const VEG_RACK_POST_GEO = new THREE.CylinderGeometry(0.07, 0.08, 1.95, 8);
const VEG_RACK_BEAM_GEO = new THREE.BoxGeometry(1.75, 0.14, 0.82);

// Temporary Bazaar Item 4: Clothesline & Bamboo Scaffolding Geometries (Slide Under!)
const SCAFFOLD_POLE_GEO = new THREE.CylinderGeometry(0.045, 0.05, 2.3, 8);
const SCAFFOLD_BEAM_GEO = new THREE.CylinderGeometry(0.035, 0.035, 2.3, 8);
const CLOTHESLINE_ROPE_GEO = new THREE.CylinderGeometry(0.015, 0.015, 2.2, 6);
const CLOTHESLINE_FABRIC_GEO = new THREE.BoxGeometry(0.52, 0.58, 0.03);

// Cutting Chai Power-Up (Fluted Indian Glass Tumbler, Masala Tea, Foam & Steam) Geometries
const CHAI_GLASS_GEO = new THREE.CylinderGeometry(0.24, 0.17, 0.56, 10);
const CHAI_LIQUID_GEO = new THREE.CylinderGeometry(0.21, 0.15, 0.44, 10);
const CHAI_FOAM_GEO = new THREE.CylinderGeometry(0.215, 0.21, 0.06, 10);
const CHAI_STEAM_RING_GEO = new THREE.TorusGeometry(0.14, 0.02, 8, 16);
const CHAI_SAUCER_AURA_GEO = new THREE.TorusGeometry(0.36, 0.035, 8, 24);

// New Gully 2.0 Power-Up Geometries (Magnet, Slow-Mo, Rickshaw Shield, 2x Multiplier, Emergency Dodge)
const POWERUP_RING_GEO = new THREE.TorusGeometry(0.42, 0.055, 10, 24);
const POWERUP_CORE_OCTA_GEO = new THREE.OctahedronGeometry(0.32, 0);
const POWERUP_MAGNET_ARC_GEO = new THREE.TorusGeometry(0.24, 0.075, 8, 16, Math.PI);
const POWERUP_MAGNET_TIP_GEO = new THREE.BoxGeometry(0.15, 0.18, 0.15);
const POWERUP_SHIELD_HEX_GEO = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 6);

const POWERUP_SPAWN_POOL: { powerUpType: PowerUpType; color: string }[] = [
  { powerUpType: 'COIN_MAGNET', color: '#38bdf8' },
  { powerUpType: 'SLOW_MOTION', color: '#a855f7' },
  { powerUpType: 'RICKSHAW_SHIELD', color: '#06b6d4' },
  { powerUpType: 'SCORE_MULTIPLIER', color: '#facc15' },
  { powerUpType: 'EMERGENCY_DODGE', color: '#10b981' },
];

const pickRandomPowerUp = (): { powerUpType: PowerUpType; color: string } => {
  return POWERUP_SPAWN_POOL[Math.floor(Math.random() * POWERUP_SPAWN_POOL.length)];
};

// Dark Blob Drop-Shadow Geometries (Soft rounded circular & oval silhouettes)
const SHADOW_LETTER_GEO = new THREE.CircleGeometry(0.85, 24);
const SHADOW_GEM_GEO = new THREE.CircleGeometry(0.55, 20);
const SHADOW_ALIEN_GEO = new THREE.CircleGeometry(0.95, 24);
const SHADOW_MISSILE_GEO = new THREE.CircleGeometry(0.75, 20);
const SHADOW_DEBRIS_GEO = new THREE.CircleGeometry(0.85, 20);
const SHADOW_BUS_GEO = new THREE.CircleGeometry(2.1, 32);
const SHADOW_DEFAULT_GEO = new THREE.CircleGeometry(1.35, 24);

// Chai Tapri Shop Portal Geometries
const SHOP_FRAME_GEO = new THREE.BoxGeometry(1, 7, 1);
const SHOP_BACK_GEO = new THREE.BoxGeometry(1, 5, 1.2);
const SHOP_OUTLINE_GEO = new THREE.BoxGeometry(1, 7.2, 0.8);
const SHOP_FLOOR_GEO = new THREE.PlaneGeometry(1, 4);

// Cut particle count by 50% (750 -> 375) for optimal performance & visual clarity
const PARTICLE_COUNT = 375;
const BASE_LETTER_INTERVAL = 150;

const getLetterInterval = (level: number) => {
  return BASE_LETTER_INTERVAL * Math.pow(1.4, Math.min(3, Math.max(0, level - 1)));
};

const MISSILE_SPEED = 30;
const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

// Reusable vector for player world position (zero GC in loop)
const _playerPos = new THREE.Vector3();

// Helper to check if an object type is one of the procedural temporary bazaar obstacles
const isTemporaryBazaarObstacle = (type: ObjectType) =>
  type === ObjectType.STRAY_COW ||
  type === ObjectType.SLEEPING_DOG ||
  type === ObjectType.VEG_CRATE_PILE ||
  type === ObjectType.STREET_VENDOR ||
  type === ObjectType.CLOTHESLINE_SCAFFOLD;

// Procedural factory for a temporary bazaar obstacle (Stray Cow, Sleeping Street Dog, Street Vendor Pushcart, Vegetable Crate Pile, or Clothesline Scaffolding)
const createTemporaryBazaarObstacle = (lane: number, spawnZ: number): { obstacle: GameObject; guideGem?: GameObject } => {
  const laneX = lane * LANE_WIDTH;
  const roll = Math.random();

  // 1. Stray Bazaar Cow (22% chance) -> Requires SLIDING under its high belly (or double-jumping over)
  if (roll < 0.22) {
    const obstacle: GameObject = {
      id: uuidv4(),
      type: ObjectType.STRAY_COW,
      position: [laneX, 0, spawnZ],
      active: true,
      color: '#fef3c7',
      clearanceType: 'SLIDE',
      spawnAge: 0,
      maxDuration: 8.5 + Math.random() * 3.0,
    };
    const guideGem: GameObject = {
      id: uuidv4(),
      type: ObjectType.GEM,
      position: [laneX, 0.42, spawnZ],
      active: true,
      color: '#38bdf8',
      points: 25,
    };
    return { obstacle, guideGem };
  }

  // 2. Indian Street Vendor Pushcart / Thela (24% chance) -> Golgappa Chaat Thela, Matka Kulfi Cart, or Mango Cart (Jump Over!)
  if (roll < 0.46) {
    const pickedVendor = pickRandomVendor();
    const obstacle: GameObject = {
      id: uuidv4(),
      type: ObjectType.STREET_VENDOR,
      position: [laneX, 0, spawnZ],
      active: true,
      color: pickedVendor.color,
      vendorVariant: pickedVendor.variant,
      clearanceType: 'JUMP',
      spawnAge: 0,
      maxDuration: 9.5 + Math.random() * 3.0,
    };
    const guideGem: GameObject = {
      id: uuidv4(),
      type: ObjectType.GEM,
      position: [laneX, 2.25, spawnZ],
      active: true,
      color: '#ffd700',
      points: 25,
    };
    return { obstacle, guideGem };
  }

  // 3. Sleeping Street Dog (18% chance) -> Curled low on a burlap sack, requires JUMPING over
  if (roll < 0.64) {
    const obstacle: GameObject = {
      id: uuidv4(),
      type: ObjectType.SLEEPING_DOG,
      position: [laneX, 0, spawnZ],
      active: true,
      color: '#d97706',
      clearanceType: 'JUMP',
      spawnAge: 0,
      maxDuration: 9.0 + Math.random() * 3.0,
    };
    const guideGem: GameObject = {
      id: uuidv4(),
      type: ObjectType.GEM,
      position: [laneX, 1.95, spawnZ],
      active: true,
      color: '#ffd700',
      points: 20,
    };
    return { obstacle, guideGem };
  }

  // 4. Overhead Dhobi Clothesline / Bamboo Scaffolding (18% chance) -> Requires SLIDING under fluttering sarees!
  if (roll < 0.82) {
    const obstacle: GameObject = {
      id: uuidv4(),
      type: ObjectType.CLOTHESLINE_SCAFFOLD,
      position: [laneX, 0, spawnZ],
      active: true,
      color: '#ec4899',
      clearanceType: 'SLIDE',
      spawnAge: 0,
      maxDuration: 8.5 + Math.random() * 3.0,
    };
    const guideGem: GameObject = {
      id: uuidv4(),
      type: ObjectType.GEM,
      position: [laneX, 0.42, spawnZ],
      active: true,
      color: '#06b6d4',
      points: 25,
    };
    return { obstacle, guideGem };
  }

  // 5. Pile of Vegetable Crates (18% chance) -> Either a Stacked Pyramid (JUMP) or an Overhead Crate Rack (SLIDE)
  const clearance: ClearanceType = Math.random() < 0.52 ? 'JUMP' : 'SLIDE';
  const obstacle: GameObject = {
    id: uuidv4(),
    type: ObjectType.VEG_CRATE_PILE,
    position: [laneX, 0, spawnZ],
    active: true,
    color: clearance === 'JUMP' ? '#22c55e' : '#f97316',
    clearanceType: clearance,
    spawnAge: 0,
    maxDuration: 8.5 + Math.random() * 3.0,
  };
  const guideGem: GameObject = {
    id: uuidv4(),
    type: ObjectType.GEM,
    position: [laneX, clearance === 'JUMP' ? 2.15 : 0.42, spawnZ],
    active: true,
    color: clearance === 'JUMP' ? '#ffd700' : '#38bdf8',
    points: 20,
  };
  return { obstacle, guideGem };
};

// --- Particle System (Supports Glittering Coin Fountains & High-Energy Collision Spark Bursts) ---
const ParticleSystem: React.FC = () => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      new Array(PARTICLE_COUNT).fill(0).map(() => ({
        life: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        color: new THREE.Color(),
        baseScale: 0.25,
      })),
    []
  );

  useEffect(() => {
    const coinPalette = ['#ffd700', '#fef08a', '#f59e0b', '#ffffff', '#fb923c'];
    const collisionPalette = ['#ff3d00', '#facc15', '#fb923c', '#ffffff', '#ef4444'];

    const handleExplosion = (e: CustomEvent) => {
      const { position, color, burstType } = e.detail;
      let spawned = 0;
      const isCoin = burstType === 'coin';
      const isCollision = burstType === 'collision';
      const burstAmount = isCollision ? 68 : isCoin ? 48 : 38;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        if (p.life <= 0) {
          p.life = isCoin ? 0.85 + Math.random() * 0.45 : 1.0 + Math.random() * 0.55;
          p.pos.set(
            position[0] + (Math.random() - 0.5) * 0.25,
            position[1] + (Math.random() - 0.5) * 0.25,
            position[2] + (Math.random() - 0.5) * 0.25
          );

          if (isCoin) {
            // Upward glittering coin fountain + radial ring burst
            const angle = Math.random() * Math.PI * 2;
            const radialSpeed = 1.8 + Math.random() * 5.2;
            const upSpeed = 3.5 + Math.random() * 6.5;
            p.vel.set(
              Math.cos(angle) * radialSpeed,
              upSpeed,
              Math.sin(angle) * radialSpeed + 2.5
            );
            p.color.set(coinPalette[spawned % coinPalette.length]);
            p.baseScale = 0.22 + Math.random() * 0.14;
          } else if (isCollision) {
            // Explosive 3D collision shockwave & flying sparks
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = 4 + Math.random() * 13;
            p.vel
              .set(
                Math.sin(phi) * Math.cos(theta),
                Math.abs(Math.sin(phi) * Math.sin(theta)) * 1.2 + 1.5,
                Math.cos(phi)
              )
              .multiplyScalar(speed);
            p.color.set(collisionPalette[spawned % collisionPalette.length]);
            p.baseScale = 0.28 + Math.random() * 0.16;
          } else {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = 2 + Math.random() * 9;
            p.vel
              .set(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
              )
              .multiplyScalar(speed);
            p.color.set(color || '#ffb703');
            p.baseScale = 0.24;
          }

          p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          p.rotVel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(8);

          spawned++;
          if (spawned >= burstAmount) break;
        }
      }
    };

    window.addEventListener('particle-burst', handleExplosion as any);
    return () => window.removeEventListener('particle-burst', handleExplosion as any);
  }, [particles]);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    const safeDelta = Math.min(delta, 0.1);

    particles.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= safeDelta * 1.55;
        p.pos.addScaledVector(p.vel, safeDelta);
        p.vel.y -= safeDelta * 7.5;
        p.vel.multiplyScalar(0.97);

        p.rot.x += p.rotVel.x * safeDelta;
        p.rot.y += p.rotVel.y * safeDelta;

        dummy.position.copy(p.pos);
        const scale = Math.max(0, p.life * p.baseScale);
        dummy.scale.set(scale, scale, scale);

        dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
        dummy.updateMatrix();

        mesh.current!.setMatrixAt(i, dummy.matrix);
        mesh.current!.setColorAt(i, p.color);
      } else {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <octahedronGeometry args={[0.5, 0]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.48} />
    </instancedMesh>
  );
};

const getRandomLane = (laneCount: number) => {
  const max = Math.floor(laneCount / 2);
  return Math.floor(Math.random() * (max * 2 + 1)) - max;
};

export const LevelManager: React.FC = () => {
  const {
    status,
    speed,
    collectGem,
    collectLetter,
    laneCount,
    setDistance,
    openShop,
    level,
    triggerStumble,
    collectChai,
    collectPowerUp,
    consumeShield,
    triggerEmergencyDodge,
    registerComboAction,
    registerNearMiss,
  } = useStore();

  const objectsRef = useRef<GameObject[]>([]);
  const [, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  const lastSyncedDistance = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);
  const lastRickshawHonkRef = useRef(0);
  const lastNearMissTimeRef = useRef(0);

  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp =
      level !== prevLevel.current &&
      status === GameStatus.PLAYING &&
      prevStatus.current === GameStatus.PLAYING;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || (isVictoryReset && level === 1)) {
      objectsRef.current = [];
      setRenderTrigger(t => t + 1);
      distanceTraveled.current = 0;
      lastSyncedDistance.current = 0;
      nextLetterDistance.current = getLetterInterval(1);
    } else if (isVictoryReset && level > 1) {
      // Continuing from Victory into Endless Mode Wave 4+
      objectsRef.current = [];
      nextLetterDistance.current = distanceTraveled.current + getLetterInterval(level);
      setRenderTrigger(t => t + 1);
    } else if (isLevelUp && level > 1) {
      // Triggered ONLY when all 6 letters of B-H-A-A-G-O are collected to complete the wave
      objectsRef.current = objectsRef.current.filter(obj => obj.position[2] > -25);

      objectsRef.current.push({
        id: uuidv4(),
        type: ObjectType.SHOP_PORTAL,
        position: [0, 0, -60],
        active: true,
      });

      nextLetterDistance.current =
        distanceTraveled.current - SPAWN_DISTANCE + getLetterInterval(level);
      setRenderTrigger(t => t + 1);
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
      setDistance(Math.floor(distanceTraveled.current));
    }

    prevStatus.current = status;
    prevLevel.current = level;
  }, [status, level, setDistance]);

  useFrame(state => {
    if (!playerObjRef.current) {
      const group = state.scene.getObjectByName('PlayerGroup');
      if (group && group.children.length > 0) {
        playerObjRef.current = group.children[0];
      }
    }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05);
    const dist = speed * safeDelta;
    const now = state.clock.elapsedTime;

    distanceTraveled.current += dist;

    // Continuously sync distance covered (every 15m) so day/night lighting, street zones & dynamic difficulty scale in real time
    if (distanceTraveled.current - lastSyncedDistance.current >= 15) {
      lastSyncedDistance.current = distanceTraveled.current;
      setDistance(Math.floor(distanceTraveled.current));
    }

    // Compute dynamic difficulty profile from current score, distance covered, and wave level
    const currentScore = useStore.getState().score;
    const difficulty = calculateObstacleDifficulty(currentScore, distanceTraveled.current, level);

    let hasChanges = false;
    _playerPos.set(0, 0, 0);
    let isPlayerSliding = false;

    if (playerObjRef.current) {
      playerObjRef.current.getWorldPosition(_playerPos);
      isPlayerSliding = Boolean(playerObjRef.current.userData?.isSliding);
    }

    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];
    const newSpawns: GameObject[] = [];

    const currentState = useStore.getState();
    const magnetActive = currentState.isMagnetActive;
    const slowMoScale = currentState.isSlowMotionActive ? 0.55 : 1.0;

    for (const obj of currentObjects) {
      let moveAmount = dist;

      if (obj.type === ObjectType.MISSILE) {
        moveAmount += MISSILE_SPEED * difficulty.obstacleSpeedMultiplier * slowMoScale * safeDelta;
      } else if (obj.type === ObjectType.ALIEN) {
        moveAmount += (3.0 + difficulty.difficultyIndex * 4.5) * slowMoScale * safeDelta;
      } else if (obj.type === ObjectType.CITY_BUS) {
        // City buses rumble forward through traffic toward the runner
        moveAmount += (1.8 + difficulty.difficultyIndex * 2.5) * slowMoScale * safeDelta;
      }

      const prevZ = obj.position[2];
      obj.position[2] += moveAmount;

      // Coin Magnet Power-Up: smoothly pulls nearby coins/samosas from all lanes toward the runner!
      if (
        magnetActive &&
        obj.active &&
        obj.type === ObjectType.GEM &&
        obj.position[2] > -26 &&
        obj.position[2] < _playerPos.z + 2.5
      ) {
        const pullStrength = Math.min(1, safeDelta * 14);
        obj.position[0] = THREE.MathUtils.lerp(obj.position[0], _playerPos.x, pullStrength);
        obj.position[1] = THREE.MathUtils.lerp(obj.position[1], _playerPos.y + 0.95, pullStrength);
      }

      // Update temporary bazaar item age & temporary lifetime expiration
      if (isTemporaryBazaarObstacle(obj.type) && obj.active) {
        obj.spawnAge = (obj.spawnAge || 0) + safeDelta;
        if (obj.maxDuration && obj.spawnAge >= obj.maxDuration && obj.position[2] < _playerPos.z - 6) {
          obj.active = false;
          hasChanges = true;
          window.dispatchEvent(
            new CustomEvent('particle-burst', {
              detail: { position: [obj.position[0], 0.8, obj.position[2]], color: obj.color || '#f59e0b' },
            })
          );
        }
      }

      // Spatialized Auto-Rickshaw / City Bus Horn as vehicles approach the player
      if (
        (obj.type === ObjectType.OBSTACLE || obj.type === ObjectType.CITY_BUS) &&
        obj.active &&
        prevZ <= -38 &&
        obj.position[2] > -38 &&
        now - lastRickshawHonkRef.current > 1.35 &&
        Math.random() < 0.45
      ) {
        lastRickshawHonkRef.current = now;
        const pan = THREE.MathUtils.clamp((obj.position[0] - _playerPos.x) / 4.5, -1, 1);
        audio.playAutoRickshawHonk(pan, obj.type === ObjectType.CITY_BUS ? 1.0 : 0.85);
      }

      // Spatialized Spinning 'Chappal' Whoosh as a flying slipper enters close range (~9m) of the player!
      if (obj.type === ObjectType.MISSILE && obj.active && prevZ <= -9.0 && obj.position[2] > -9.0) {
        const dxChappal = Math.abs(obj.position[0] - _playerPos.x);
        const pan = THREE.MathUtils.clamp((obj.position[0] - _playerPos.x) / 4.0, -1, 1);
        const proximity = THREE.MathUtils.clamp(1.35 - dxChappal / (LANE_WIDTH * 2.2), 0.65, 1.35);
        audio.playChappalWhoosh(pan, proximity);
      }

      // Rival Scooter Uncle launches Flying Chappal!
      if (obj.type === ObjectType.ALIEN && obj.active && !obj.hasFired) {
        if (obj.position[2] > -90) {
          obj.hasFired = true;

          const launchPan = THREE.MathUtils.clamp((obj.position[0] - _playerPos.x) / 4.5, -1, 1);
          audio.playChappalThrow(launchPan);

          newSpawns.push({
            id: uuidv4(),
            type: ObjectType.MISSILE,
            position: [obj.position[0], 1.0, obj.position[2] + 2],
            active: true,
            color: '#ff3d00',
          });
          hasChanges = true;

          window.dispatchEvent(
            new CustomEvent('particle-burst', {
              detail: { position: obj.position, color: '#ff9100' },
            })
          );
        }
      }

      let keep = true;
      if (obj.active) {
        const isHazard =
          obj.type === ObjectType.OBSTACLE ||
          obj.type === ObjectType.CITY_BUS ||
          obj.type === ObjectType.ALIEN ||
          obj.type === ObjectType.MISSILE ||
          obj.type === ObjectType.DEBRIS ||
          isTemporaryBazaarObstacle(obj.type);
        const zThreshold = obj.type === ObjectType.CITY_BUS ? 1.75 : isHazard ? 1.1 : 2.2;
        const inZZone = prevZ < _playerPos.z + zThreshold && obj.position[2] > _playerPos.z - zThreshold;

        if (obj.type === ObjectType.SHOP_PORTAL) {
          const dz = Math.abs(obj.position[2] - _playerPos.z);
          if (dz < 2) {
            openShop();
            obj.active = false;
            hasChanges = true;
            keep = false;
          }
        } else if (inZZone) {
          const dx = Math.abs(obj.position[0] - _playerPos.x);
          if (dx < 0.9) {
            const isDamageSource =
              obj.type === ObjectType.OBSTACLE ||
              obj.type === ObjectType.CITY_BUS ||
              obj.type === ObjectType.ALIEN ||
              obj.type === ObjectType.MISSILE ||
              isTemporaryBazaarObstacle(obj.type);

            const { isChaiBoostActive: chaiInvincible, isImmortalityActive: immortalActive } =
              useStore.getState();

            if (obj.type === ObjectType.DEBRIS) {
              // Low-lying Bazaar Debris: trips the player if they don't jump over it (no camera shake on minor stumbles)
              if (chaiInvincible || immortalActive) {
                window.dispatchEvent(
                  new CustomEvent('particle-burst', {
                    detail: { position: obj.position, color: '#fbbf24' },
                  })
                );
                obj.active = false;
                hasChanges = true;
              } else if (_playerPos.y < 0.4) {
                audio.playStumble();
                triggerStumble();
                window.dispatchEvent(new Event('player-stumble'));
                window.dispatchEvent(
                  new CustomEvent('particle-burst', {
                    detail: { position: obj.position, color: '#d97706' },
                  })
                );
                obj.active = false;
                hasChanges = true;
              }
            } else if (isDamageSource) {
              const playerBottom = _playerPos.y;
              const playerTop = _playerPos.y + (isPlayerSliding ? 0.7 : 1.8);

              let objBottom = obj.position[1] - 0.45;
              let objTop = obj.position[1] + 0.45;

              if (obj.type === ObjectType.OBSTACLE) {
                objBottom = 0;
                objTop = 1.32;
              } else if (obj.type === ObjectType.CITY_BUS) {
                // Tall City Bus: requires lane dodge or high double-jump to vault over (or Cutting Chai smash!)
                objBottom = 0;
                objTop = 2.05;
              } else if (obj.type === ObjectType.STREET_VENDOR) {
                // Street Vendor Pushcart (Thela): jump over
                objBottom = 0;
                objTop = 1.25;
              } else if (obj.type === ObjectType.MISSILE) {
                objBottom = 0.45;
                objTop = 1.22;
              } else if (obj.type === ObjectType.STRAY_COW) {
                objBottom = 1.02;
                objTop = 1.68;
              } else if (obj.type === ObjectType.SLEEPING_DOG) {
                objBottom = 0;
                objTop = 0.65;
              } else if (obj.type === ObjectType.VEG_CRATE_PILE) {
                if (obj.clearanceType === 'SLIDE') {
                  objBottom = 1.02;
                  objTop = 1.75;
                } else {
                  objBottom = 0;
                  objTop = 0.98;
                }
              } else if (obj.type === ObjectType.CLOTHESLINE_SCAFFOLD) {
                objBottom = 0.95;
                objTop = 1.75;
              }

              const isHit = playerBottom < objTop && playerTop > objBottom;

              if (isHit) {
                if (chaiInvincible || immortalActive) {
                  registerComboAction('Chai Rush Smash!', 15);
                  audio.playComboTick(useStore.getState().comboCount);
                  audio.vibrateChaiSmash();
                  obj.active = false;
                  hasChanges = true;

                  window.dispatchEvent(
                    new CustomEvent('particle-burst', {
                      detail: {
                        position: [obj.position[0], 0.9, obj.position[2]],
                        color: '#fbbf24',
                        burstType: 'collision',
                      },
                    })
                  );
                } else if (consumeShield()) {
                  // Auto-Rickshaw Bumper Shield absorbs the collision (points awarded inside consumeShield)
                  audio.playShieldBlock();
                  obj.active = false;
                  hasChanges = true;

                  window.dispatchEvent(
                    new CustomEvent('particle-burst', {
                      detail: {
                        position: [obj.position[0], 0.9, obj.position[2]],
                        color: '#06b6d4',
                        burstType: 'collision',
                      },
                    })
                  );
                } else if (triggerEmergencyDodge()) {
                  // One-Time Emergency Reflex Dodge saves the runner (points awarded inside triggerEmergencyDodge)
                  audio.playEmergencyDodge();
                  obj.active = false;
                  hasChanges = true;

                  window.dispatchEvent(
                    new CustomEvent('particle-burst', {
                      detail: {
                        position: [obj.position[0], 0.9, obj.position[2]],
                        color: '#10b981',
                        burstType: 'default',
                      },
                    })
                  );
                } else {
                  window.dispatchEvent(new Event('player-hit'));
                  window.dispatchEvent(
                    new CustomEvent('major-collision', {
                      detail: {
                        obstacleType: obj.type,
                        position: [obj.position[0], 0.9, obj.position[2]],
                      },
                    })
                  );
                  obj.active = false;
                  hasChanges = true;

                  window.dispatchEvent(
                    new CustomEvent('particle-burst', {
                      detail: {
                        position: [obj.position[0], 0.9, obj.position[2]],
                        color: obj.color || '#ff4400',
                        burstType: 'collision',
                      },
                    })
                  );
                }
              }
            } else {
              const dy = Math.abs(obj.position[1] - _playerPos.y);
              if (dy < 2.5) {
                if (obj.type === ObjectType.GEM) {
                  collectGem(obj.points || 15);
                  audio.playGemCollect();
                  window.dispatchEvent(
                    new CustomEvent('coin-collected', {
                      detail: { position: obj.position, points: obj.points || 15 },
                    })
                  );
                }
                if (obj.type === ObjectType.CHAI) {
                  collectChai();
                  audio.playChaiBoost();
                }
                if (obj.type === ObjectType.POWERUP && obj.powerUpType) {
                  collectPowerUp(obj.powerUpType);
                  audio.playPowerUpCollect();
                }
                if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) {
                  collectLetter(obj.targetIndex);
                  audio.playLetterCollect();
                }

                window.dispatchEvent(
                  new CustomEvent('particle-burst', {
                    detail: {
                      position: obj.position,
                      color: obj.color || '#ffb703',
                      burstType: obj.type === ObjectType.GEM ? 'coin' : 'default',
                    },
                  })
                );

                obj.active = false;
                hasChanges = true;
              }
            }
          }
        }

        // Near-Miss / Narrow Dodge / Jump-Over / Slide-Under Reward System (with 0.95s cooldown)
        const isDodgeableThreat =
          obj.type === ObjectType.OBSTACLE ||
          obj.type === ObjectType.CITY_BUS ||
          obj.type === ObjectType.ALIEN ||
          obj.type === ObjectType.MISSILE ||
          isTemporaryBazaarObstacle(obj.type);

        if (
          obj.active &&
          isDodgeableThreat &&
          !obj.dodged &&
          now - lastNearMissTimeRef.current >= 0.95 &&
          prevZ <= _playerPos.z + 1.2 &&
          obj.position[2] > _playerPos.z + 1.2
        ) {
          const dxDodge = Math.abs(obj.position[0] - _playerPos.x);
          const sameLane = dxDodge < 0.95;

          const jumpedOverSameLane = sameLane && _playerPos.y > 0.75;
          const slidUnderSameLane =
            sameLane &&
            isPlayerSliding &&
            (obj.type === ObjectType.STRAY_COW ||
              (obj.type === ObjectType.VEG_CRATE_PILE && obj.clearanceType === 'SLIDE') ||
              obj.type === ObjectType.CLOTHESLINE_SCAFFOLD);

          // Adjacent-lane brush only counts for oncoming moving vehicles/projectiles OR active lane-switching dodge
          const isMovingThreat =
            obj.type === ObjectType.CITY_BUS ||
            obj.type === ObjectType.MISSILE ||
            obj.type === ObjectType.ALIEN;
          const isActivelySwitchingLanes =
            Math.abs(_playerPos.x - Math.round(_playerPos.x / LANE_WIDTH) * LANE_WIDTH) > 0.16;
          const closeAdjacentBrush =
            !sameLane &&
            dxDodge <= LANE_WIDTH * 1.05 &&
            (isMovingThreat || isActivelySwitchingLanes);

          if (jumpedOverSameLane || slidUnderSameLane || closeAdjacentBrush) {
            obj.dodged = true;
            lastNearMissTimeRef.current = now;
            let nearMissLabel = jumpedOverSameLane
              ? 'Vaulted Auto-Rickshaw!'
              : 'Near-Miss Auto-Rickshaw!';
            let baseBonus = jumpedOverSameLane ? 18 : 14;

            if (obj.type === ObjectType.CITY_BUS) {
              nearMissLabel = jumpedOverSameLane
                ? 'Double-Jumped City Bus!'
                : 'Razor-Close Bus Brush!';
              baseBonus = 24;
            } else if (obj.type === ObjectType.STREET_VENDOR) {
              nearMissLabel = jumpedOverSameLane
                ? 'Vaulted Chaat Thela!'
                : 'Skirted Vendor Cart!';
              baseBonus = 18;
            } else if (obj.type === ObjectType.MISSILE) {
              nearMissLabel = 'Dodged Flying Chappal!';
              baseBonus = 25;
            } else if (obj.type === ObjectType.ALIEN) {
              nearMissLabel = 'Brushed Past Scooter Uncle!';
              baseBonus = 20;
            } else if (obj.type === ObjectType.STRAY_COW) {
              nearMissLabel = slidUnderSameLane
                ? 'Slid Under Stray Cow!'
                : jumpedOverSameLane
                ? 'Vaulted Stray Cow!'
                : 'Narrowly Passed Gaay!';
              baseBonus = 20;
              audio.playCowBell();
            } else if (obj.type === ObjectType.SLEEPING_DOG) {
              nearMissLabel = jumpedOverSameLane
                ? 'Leapt Over Sleeping Dog!'
                : 'Tip-Toed Past Desi Dog!';
              baseBonus = 15;
            } else if (obj.type === ObjectType.VEG_CRATE_PILE) {
              nearMissLabel = slidUnderSameLane
                ? 'Slid Under Veg Crate Rack!'
                : jumpedOverSameLane
                ? 'Vaulted Veg Crate Pile!'
                : 'Dodged Sabzi Crates!';
              baseBonus = 15;
            } else if (obj.type === ObjectType.CLOTHESLINE_SCAFFOLD) {
              nearMissLabel = slidUnderSameLane
                ? 'Slid Under Dhobi Clothesline!'
                : 'Skirted Bamboo Scaffolding!';
              baseBonus = 25;
            }

            registerNearMiss(nearMissLabel, baseBonus);
            audio.playNearMiss(useStore.getState().nearMissStreak);
          }
        }
      }

      if (obj.position[2] > REMOVE_DISTANCE) {
        keep = false;
        hasChanges = true;
      }

      if (keep) {
        keptObjects.push(obj);
      }
    }

    if (newSpawns.length > 0) {
      keptObjects.push(...newSpawns);
    }

    // Spawning Logic
    let furthestZ = 0;
    const staticObjects = keptObjects.filter(o => o.type !== ObjectType.MISSILE);

    if (staticObjects.length > 0) {
      furthestZ = Math.min(...staticObjects.map(o => o.position[2]));
    } else {
      furthestZ = -20;
    }

    if (furthestZ > -SPAWN_DISTANCE) {
      const minGap = difficulty.spawnGap;
      const spawnZ = Math.min(furthestZ - minGap, -SPAWN_DISTANCE);

      const isLetterDue = distanceTraveled.current >= nextLetterDistance.current;

      if (isLetterDue) {
        const lane = getRandomLane(laneCount);
        const target = ['B', 'H', 'A', 'A', 'G', 'O'];
        const latestCollected = useStore.getState().collectedLetters;
        const activeRoadLetterIndices = keptObjects
          .filter(o => o.active && o.type === ObjectType.LETTER && o.targetIndex !== undefined)
          .map(o => o.targetIndex as number);

        const availableIndices = target
          .map((_, i) => i)
          .filter(i => !latestCollected.includes(i) && !activeRoadLetterIndices.includes(i));

        if (availableIndices.length > 0) {
          const chosenIndex = availableIndices[0];
          const val = target[chosenIndex];
          const color = GEMINI_COLORS[chosenIndex];

          keptObjects.push({
            id: uuidv4(),
            type: ObjectType.LETTER,
            position: [lane * LANE_WIDTH, 1.0, spawnZ],
            active: true,
            color: color,
            value: val,
            targetIndex: chosenIndex,
          });

          nextLetterDistance.current += getLetterInterval(level);
          hasChanges = true;
        } else {
          keptObjects.push({
            id: uuidv4(),
            type: ObjectType.GEM,
            position: [lane * LANE_WIDTH, 1.2, spawnZ],
            active: true,
            color: '#ffb703',
            points: 15,
          });
          hasChanges = true;
        }
      } else if (Math.random() > 0.08) {
        const isObstacle = Math.random() < difficulty.obstacleWaveChance;

        if (isObstacle) {
          const spawnAlien =
            (level >= 2 || difficulty.difficultyIndex >= 0.35) &&
            Math.random() < difficulty.scooterChance;
          // 45% of non-scooter obstacle waves are dedicated Bazaar Formations (Street Vendors, Stray Cows, Sleeping Dogs, Veg Crates)
          const spawnBazaarFormation = !spawnAlien && Math.random() < 0.45;

          if (spawnAlien) {
            const availableLanes = [];
            const maxLane = Math.floor(laneCount / 2);
            for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
            availableLanes.sort(() => Math.random() - 0.5);

            let alienCount = 1;
            const pAlien = Math.random();

            if (pAlien < difficulty.multiLaneChance * 0.65) {
              alienCount = Math.min(2, availableLanes.length);
            }
            if (pAlien < difficulty.multiLaneChance * 0.28 && availableLanes.length >= 3) {
              alienCount = Math.min(3, availableLanes.length - 1);
            }

            for (let k = 0; k < alienCount; k++) {
              const lane = availableLanes[k];
              keptObjects.push({
                id: uuidv4(),
                type: ObjectType.ALIEN,
                position: [lane * LANE_WIDTH, 0.7, spawnZ],
                active: true,
                color: '#ff6d00',
                hasFired: false,
              });
            }
          } else if (spawnBazaarFormation) {
            const availableLanes = [];
            const maxLane = Math.floor(laneCount / 2);
            for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
            availableLanes.sort(() => Math.random() - 0.5);

            const hazardCount =
              Math.random() < difficulty.multiLaneChance * 0.5
                ? Math.min(3, availableLanes.length)
                : Math.random() < difficulty.multiLaneChance
                ? Math.min(2, availableLanes.length)
                : 1;

            for (let i = 0; i < hazardCount; i++) {
              const lane = availableLanes[i];
              const { obstacle, guideGem } = createTemporaryBazaarObstacle(lane, spawnZ);
              keptObjects.push(obstacle);
              if (guideGem && Math.random() < 0.65) {
                keptObjects.push(guideGem);
              }
            }
          } else {
            const availableLanes = [];
            const maxLane = Math.floor(laneCount / 2);
            for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
            availableLanes.sort(() => Math.random() - 0.5);

            let countToSpawn = 1;
            const p = Math.random();

            if (p < difficulty.multiLaneChance * 0.42 && availableLanes.length > 3) {
              countToSpawn = Math.min(3, availableLanes.length - 1);
            } else if (p < difficulty.multiLaneChance) {
              countToSpawn = Math.min(2, availableLanes.length - 1);
            } else {
              countToSpawn = 1;
            }

            for (let i = 0; i < countToSpawn; i++) {
              const lane = availableLanes[i];
              const laneX = lane * LANE_WIDTH;
              // 30% of vehicle obstacles (max 1 per wave) are an Indian City Bus (BEST Red / DTC Green / State Express Yellow)!
              const spawnCityBus = i === 0 && Math.random() < 0.32;

              if (spawnCityBus) {
                const pickedBus = pickRandomBus();
                keptObjects.push({
                  id: uuidv4(),
                  type: ObjectType.CITY_BUS,
                  position: [laneX, BUS_HEIGHT / 2, spawnZ],
                  active: true,
                  color: pickedBus.color,
                  busVariant: pickedBus.variant,
                });
              } else {
                const picked = pickRandomRickshaw();
                keptObjects.push({
                  id: uuidv4(),
                  type: ObjectType.OBSTACLE,
                  position: [laneX, OBSTACLE_HEIGHT / 2, spawnZ],
                  active: true,
                  color: picked.color,
                  rickshawVariant: picked.variant,
                });

                if (Math.random() < 0.35) {
                  keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.GEM,
                    position: [laneX, OBSTACLE_HEIGHT + 1.0, spawnZ],
                    active: true,
                    color: '#ffd700',
                    points: 25,
                  });
                }
              }
            }

            if (
              availableLanes.length > countToSpawn &&
              Math.random() < difficulty.secondaryHazardChance
            ) {
              const extraLane = availableLanes[countToSpawn];
              if (Math.random() < 0.65) {
                const { obstacle, guideGem } = createTemporaryBazaarObstacle(extraLane, spawnZ);
                keptObjects.push(obstacle);
                if (guideGem && Math.random() < 0.5) {
                  keptObjects.push(guideGem);
                }
              } else {
                keptObjects.push({
                  id: uuidv4(),
                  type: ObjectType.DEBRIS,
                  position: [extraLane * LANE_WIDTH, 0.18, spawnZ + (Math.random() - 0.5) * 3],
                  active: true,
                  color: '#d97706',
                });
              }

              if (Math.random() < 0.44) {
                const chaiLane = getRandomLane(laneCount);
                if (Math.random() < 0.52) {
                  const pickedPowerUp = pickRandomPowerUp();
                  keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.POWERUP,
                    powerUpType: pickedPowerUp.powerUpType,
                    position: [chaiLane * LANE_WIDTH, 1.15, spawnZ - 7],
                    active: true,
                    color: pickedPowerUp.color,
                  });
                } else {
                  keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.CHAI,
                    position: [chaiLane * LANE_WIDTH, 1.05, spawnZ - 7],
                    active: true,
                    color: '#fb923c',
                  });
                }
              }
            }
          }
        } else {
          const lane = getRandomLane(laneCount);
          const rollCollectible = Math.random();
          if (rollCollectible < 0.22) {
            keptObjects.push({
              id: uuidv4(),
              type: ObjectType.CHAI,
              position: [lane * LANE_WIDTH, 1.05, spawnZ],
              active: true,
              color: '#fb923c',
            });
          } else if (rollCollectible < 0.44) {
            const pickedPowerUp = pickRandomPowerUp();
            keptObjects.push({
              id: uuidv4(),
              type: ObjectType.POWERUP,
              powerUpType: pickedPowerUp.powerUpType,
              position: [lane * LANE_WIDTH, 1.15, spawnZ],
              active: true,
              color: pickedPowerUp.color,
            });
          } else {
            // Spawn a trail of 3 glittering bazaar coins!
            for (let c = 0; c < 3; c++) {
              keptObjects.push({
                id: uuidv4(),
                type: ObjectType.GEM,
                position: [lane * LANE_WIDTH, 1.2, spawnZ - c * 2.8],
                active: true,
                color: '#ffb703',
                points: 15,
              });
            }
          }
        }
        hasChanges = true;
      }
    }

    if (hasChanges) {
      objectsRef.current = keptObjects;
      setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map(obj => {
        if (!obj.active) return null;
        return <GameEntity key={obj.id} data={obj} />;
      })}
    </group>
  );
};

// Shared Materials for Indian Street Entities
const ENTITY_MATS = {
  // Skin 1: Green-Yellow (Delhi CNG Auto)
  autoGreen: new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.34, metalness: 0.42 }),
  autoYellow: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.62, metalness: 0.14 }),
  // Skin 2: Yellow-Black (Mumbai Kaali-Peeli Meter Auto)
  autoBlackChassis: new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.28, metalness: 0.52 }),
  autoLuggageBag: new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.72, metalness: 0.1 }),
  // Skin 3: Plain Blue (City Electric / Jodhpur Blue Auto)
  autoBlueBody: new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.3, metalness: 0.48 }),
  autoBlueRoof: new THREE.MeshStandardMaterial({ color: '#0369a1', roughness: 0.58, metalness: 0.2 }),
  autoWhiteTrim: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35, metalness: 0.3 }),
  autoSolarPanel: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.18, metalness: 0.82 }),
  // Indian City Bus Materials (BEST Mumbai Red, DTC Delhi Green, Utsav Express Yellow)
  busMumbaiRed: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.32, metalness: 0.38 }),
  busDelhiGreen: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.32, metalness: 0.38 }),
  busUtsavYellow: new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.35, metalness: 0.35 }),
  busCreamStripe: new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.4, metalness: 0.2 }),
  busDestBoard: new THREE.MeshBasicMaterial({ color: '#fde047' }),
  // Street Vendor Pushcart (Thela) Materials
  vendorWood: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 }),
  vendorRedCloth: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.75 }),
  vendorUmbrellaOrange: new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.55 }),
  vendorUmbrellaBlue: new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.55 }),
  vendorKurtaWhite: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.75 }),
  vendorKurtaSaffron: new THREE.MeshStandardMaterial({ color: '#fb923c', roughness: 0.7 }),
  vendorTurbanPink: new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.65 }),
  // Shared Auto & Vehicle Details
  autoChrome: new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.18, metalness: 0.88 }),
  autoGlass: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.1, metalness: 0.9 }),
  tireBlack: new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.85, metalness: 0.1 }),
  headlight: new THREE.MeshBasicMaterial({ color: '#fef08a' }),
  ledHeadlight: new THREE.MeshBasicMaterial({ color: '#e0f2fe' }),
  indicatorAmber: new THREE.MeshBasicMaterial({ color: '#fb923c' }),
  samosaGold: new THREE.MeshStandardMaterial({
    color: '#f59e0b',
    roughness: 0.25,
    metalness: 0.8,
    emissive: '#d97706',
    emissiveIntensity: 0.6,
  }),
  chappalLeather: new THREE.MeshStandardMaterial({
    color: '#7c2d12',
    roughness: 0.45,
    metalness: 0.2,
    emissive: '#9a3412',
    emissiveIntensity: 0.4,
  }),
  chappalStrap: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.3, metalness: 0.5 }),
  scooterCream: new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.3, metalness: 0.6 }),
  rivalKurta: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.7, metalness: 0.1 }),
  rivalSkin: new THREE.MeshStandardMaterial({ color: '#c68652', roughness: 0.6, metalness: 0.05 }),
  debrisCrate: new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85, metalness: 0.05 }),
  debrisKulhad: new THREE.MeshStandardMaterial({ color: '#c2410c', roughness: 0.75, metalness: 0.05 }),
  debrisChaiSpill: new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.25, metalness: 0.15 }),
  debrisPeel: new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.5, metalness: 0.1 }),
  chaiGlass: new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.55 }),
  chaiLiquid: new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.35, metalness: 0.1, emissive: '#9a3412', emissiveIntensity: 0.45 }),
  chaiFoam: new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.6, metalness: 0.05 }),
  chaiSteam: new THREE.MeshBasicMaterial({ color: '#fffbeb', transparent: true, opacity: 0.72 }),
  chaiAura: new THREE.MeshBasicMaterial({ color: '#fbbf24' }),
  // Stray Cow Materials
  cowCoat: new THREE.MeshStandardMaterial({ color: '#fafaf9', roughness: 0.75, metalness: 0.05 }),
  cowPatch: new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.8, metalness: 0.05 }),
  cowSnout: new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.6, metalness: 0.05 }),
  cowHorn: new THREE.MeshStandardMaterial({ color: '#44403c', roughness: 0.5, metalness: 0.2 }),
  cowGarland: new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.5, emissive: '#ea580c', emissiveIntensity: 0.35 }),
  cowBell: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.25, metalness: 0.85, emissive: '#eab308', emissiveIntensity: 0.3 }),
  // Sleeping Street Dog Materials
  dogRug: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.95, metalness: 0.0 }),
  dogCoat: new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.75, metalness: 0.05 }),
  dogEars: new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.8, metalness: 0.05 }),
  dogSleepZzz: new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.7 }),
  // Vegetable Crate Pile Materials
  crateGreen: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.6, metalness: 0.1 }),
  crateRed: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.6, metalness: 0.1 }),
  crateBlue: new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.6, metalness: 0.1 }),
  crateWood: new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85, metalness: 0.05 }),
  vegTomato: new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.35, metalness: 0.1 }),
  vegBrinjal: new THREE.MeshStandardMaterial({ color: '#6b21a8', roughness: 0.3, metalness: 0.15 }),
  vegChili: new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.4, metalness: 0.1 }),
  // Clearance Indicator Bars
  slideCueCyan: new THREE.MeshBasicMaterial({ color: '#38bdf8' }),
  jumpCueAmber: new THREE.MeshBasicMaterial({ color: '#facc15' }),
  // Clothesline & Bamboo Scaffolding Materials
  scaffoldWood: new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.85, metalness: 0.05 }),
  clotheslineRope: new THREE.MeshBasicMaterial({ color: '#fef08a' }),
  fabricRed: new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.65 }),
  fabricYellow: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.65 }),
  fabricCyan: new THREE.MeshStandardMaterial({ color: '#06b6d4', roughness: 0.65 }),
};

const GameEntity: React.FC<{ data: GameObject }> = React.memo(({ data }) => {
  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const cowHeadRef = useRef<THREE.Group>(null);
  const dogSleepRef = useRef<THREE.Group>(null);
  const chaiSteamGroupRef = useRef<THREE.Group>(null);
  const { laneCount } = useStore();

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(data.position[0], 0, data.position[2]);
    }

    if (visualRef.current) {
      const baseHeight = data.position[1];
      const t = state.clock.elapsedTime;

      // Smooth pop-in & temporary departure scale for temporary bazaar items
      if (isTemporaryBazaarObstacle(data.type)) {
        const age = data.spawnAge || 0;
        const maxDur = data.maxDuration || 9.0;
        const popIn = age < 0.35 ? THREE.MathUtils.smoothstep(age, 0, 0.35) : 1.0;
        const popOut =
          maxDur - age < 0.55 ? THREE.MathUtils.smoothstep(maxDur - age, 0, 0.55) : 1.0;
        const tempScale = Math.max(0.01, popIn * popOut);
        visualRef.current.scale.setScalar(tempScale);
      }

      if (data.type === ObjectType.SHOP_PORTAL) {
        visualRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
      } else if (data.type === ObjectType.MISSILE) {
        visualRef.current.rotation.x += delta * 18;
        visualRef.current.rotation.y += delta * 10;
        visualRef.current.position.y = baseHeight;
      } else if (data.type === ObjectType.ALIEN) {
        visualRef.current.position.y = baseHeight + Math.sin(t * 25) * 0.04;
      } else if (data.type === ObjectType.STRAY_COW) {
        visualRef.current.position.y = baseHeight;
        if (cowHeadRef.current) {
          cowHeadRef.current.rotation.z = Math.sin(t * 2.4 + data.position[0]) * 0.08;
          cowHeadRef.current.rotation.x = Math.sin(t * 5.0) * 0.05;
        }
      } else if (data.type === ObjectType.SLEEPING_DOG) {
        visualRef.current.position.y = baseHeight;
        if (dogSleepRef.current) {
          dogSleepRef.current.position.y = 0.42 + ((t * 0.35) % 0.45);
          dogSleepRef.current.rotation.y = t * 1.5;
        }
      } else if (data.type === ObjectType.VEG_CRATE_PILE || data.type === ObjectType.STREET_VENDOR || data.type === ObjectType.CLOTHESLINE_SCAFFOLD) {
        visualRef.current.position.y = baseHeight;
      } else if (
        data.type !== ObjectType.OBSTACLE &&
        data.type !== ObjectType.CITY_BUS &&
        data.type !== ObjectType.DEBRIS
      ) {
        visualRef.current.rotation.y += delta * 3;
        const bobOffset = Math.sin(t * 4 + data.position[0]) * 0.1;
        visualRef.current.position.y = baseHeight + bobOffset;

        if (data.type === ObjectType.CHAI && chaiSteamGroupRef.current) {
          chaiSteamGroupRef.current.position.y = ((t * 0.42) % 0.35);
          chaiSteamGroupRef.current.rotation.y = -t * 2.2;
        }

        if (shadowRef.current) {
          const shadowScale = 1 - bobOffset;
          shadowRef.current.scale.setScalar(shadowScale);
        }
      } else if (data.type === ObjectType.DEBRIS) {
        visualRef.current.position.y = baseHeight;
      } else {
        // Slight engine idle rumble for Auto-Rickshaw & City Bus
        visualRef.current.position.y = baseHeight + Math.sin(t * 28 + data.position[0]) * 0.02;
      }
    }
  });

  const shadowGeo = useMemo(() => {
    if (data.type === ObjectType.LETTER) return SHADOW_LETTER_GEO;
    if (data.type === ObjectType.GEM || data.type === ObjectType.CHAI || data.type === ObjectType.POWERUP) return SHADOW_GEM_GEO;
    if (data.type === ObjectType.SHOP_PORTAL) return null;
    if (data.type === ObjectType.ALIEN) return SHADOW_ALIEN_GEO;
    if (data.type === ObjectType.MISSILE) return SHADOW_MISSILE_GEO;
    if (data.type === ObjectType.CITY_BUS || data.type === ObjectType.CLOTHESLINE_SCAFFOLD) return SHADOW_BUS_GEO;
    if (data.type === ObjectType.DEBRIS || data.type === ObjectType.SLEEPING_DOG) return SHADOW_DEBRIS_GEO;
    return SHADOW_DEFAULT_GEO;
  }, [data.type]);

  const shadowScale = useMemo<[number, number, number]>(() => {
    if (data.type === ObjectType.CITY_BUS) return [1.18, 2.35, 1];
    if (data.type === ObjectType.CLOTHESLINE_SCAFFOLD) return [1.15, 0.55, 1];
    if (data.type === ObjectType.OBSTACLE) return [1.08, 1.45, 1];
    if (data.type === ObjectType.STRAY_COW) return [1.05, 1.5, 1];
    if (data.type === ObjectType.LETTER) return [1.5, 0.72, 1];
    if (data.type === ObjectType.GEM || data.type === ObjectType.CHAI || data.type === ObjectType.POWERUP) return [0.85, 0.85, 1];
    return [1.0, 1.25, 1];
  }, [data.type]);

  return (
    <group ref={groupRef} position={[data.position[0], 0, data.position[2]]}>
      {data.type !== ObjectType.SHOP_PORTAL && shadowGeo && (
        <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={shadowScale} geometry={shadowGeo}>
          <meshBasicMaterial color="#000000" opacity={0.52} transparent depthWrite={false} />
        </mesh>
      )}

      <group ref={visualRef} position={[0, data.position[1], 0]}>
        {/* --- RAJU CHAI TAPRI SHOP PORTAL --- */}
        {data.type === ObjectType.SHOP_PORTAL && (
          <group>
            <mesh position={[0, 3, 0]} geometry={SHOP_FRAME_GEO} scale={[laneCount * LANE_WIDTH + 2, 1, 1]}>
              <meshStandardMaterial color="#9a3412" metalness={0.3} roughness={0.6} />
            </mesh>
            <mesh position={[0, 2, 0]} geometry={SHOP_BACK_GEO} scale={[laneCount * LANE_WIDTH, 1, 1]}>
              <meshBasicMaterial color="#1c1917" />
            </mesh>
            <mesh position={[0, 3, 0]} geometry={SHOP_OUTLINE_GEO} scale={[laneCount * LANE_WIDTH + 2.2, 1, 1]}>
              <meshBasicMaterial color="#facc15" wireframe transparent opacity={0.45} />
            </mesh>
            <Center position={[0, 5, 0.6]}>
              <Text3D font={FONT_URL} size={1.1} height={0.2}>
                CHAI TAPRI
                <meshBasicMaterial color="#fde047" />
              </Text3D>
            </Center>
            <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={SHOP_FLOOR_GEO} scale={[laneCount * LANE_WIDTH, 1, 1]}>
              <meshBasicMaterial color="#f97316" transparent opacity={0.35} />
            </mesh>
          </group>
        )}

        {/* --- OBSTACLE: 3 DISTINCT AUTO-RICKSHAW (TUK-TUK) MODELS WITH RANDOMIZED COLOR SKINS --- */}
        {data.type === ObjectType.OBSTACLE && (
          <group position={[0, -OBSTACLE_HEIGHT / 2, 0]}>
            {data.rickshawVariant === 'YELLOW_BLACK' ? (
              /* MODEL 1: YELLOW-BLACK ("KAALI-PEELI" METER AUTO WITH ROOF CARRIER & LUGGAGE) */
              <group>
                <mesh castShadow receiveShadow position={[0, 0.56, 0]} geometry={AUTO_LOWER_BODY_GEO} material={ENTITY_MATS.autoBlackChassis} />
                <mesh castShadow position={[0, 0.52, 1.05]} rotation={[Math.PI / 2, 0, 0]} geometry={AUTO_NOSE_GEO} material={ENTITY_MATS.autoBlackChassis} />
                <mesh position={[0, 0.78, 0]} geometry={AUTO_STRIPE_GEO} material={ENTITY_MATS.autoYellow} />
                <mesh castShadow position={[0, 1.22, -0.05]} geometry={AUTO_CANOPY_GEO} material={ENTITY_MATS.autoYellow} />
                <mesh castShadow position={[0, 1.54, -0.05]} rotation={[0, Math.PI / 2, 0]} geometry={AUTO_ROOF_TOP_GEO} material={ENTITY_MATS.autoYellow} />
                <mesh castShadow position={[0, 1.9, -0.1]} geometry={AUTO_ROOF_RACK_GEO} material={ENTITY_MATS.autoChrome} />
                <mesh castShadow position={[0, 2.04, -0.1]} rotation={[0, 0.12, 0]} geometry={AUTO_LUGGAGE_GEO} material={ENTITY_MATS.autoLuggageBag} />
                <mesh position={[0, 0.34, 1.36]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_BUMPER_GEO} material={ENTITY_MATS.autoChrome} />
                <mesh position={[-0.76, 1.05, 0.78]} rotation={[0, 0, 0.5]} geometry={AUTO_MIRROR_ARM_GEO} material={ENTITY_MATS.autoChrome} />
                <mesh position={[0.76, 1.05, 0.78]} rotation={[0, 0, -0.5]} geometry={AUTO_MIRROR_ARM_GEO} material={ENTITY_MATS.autoChrome} />
                <mesh position={[-0.86, 1.12, 0.78]} geometry={AUTO_MIRROR_HEAD_GEO} material={ENTITY_MATS.autoChrome} />
                <mesh position={[0.86, 1.12, 0.78]} geometry={AUTO_MIRROR_HEAD_GEO} material={ENTITY_MATS.autoChrome} />
                <mesh position={[0, 1.18, 0.84]} geometry={AUTO_WINDSHIELD_GEO} material={ENTITY_MATS.autoGlass} />
                <mesh position={[0, 0.65, 1.38]} geometry={AUTO_HEADLIGHT_GEO} material={ENTITY_MATS.headlight} />
                <mesh position={[-0.56, 0.68, 0.96]} geometry={AUTO_INDICATOR_GEO} material={ENTITY_MATS.indicatorAmber} />
                <mesh position={[0.56, 0.68, 0.96]} geometry={AUTO_INDICATOR_GEO} material={ENTITY_MATS.indicatorAmber} />
              </group>
            ) : data.rickshawVariant === 'PLAIN_BLUE' ? (
              /* MODEL 3: PLAIN BLUE (MODERN CITY ELECTRIC AUTO WITH HARD-TOP SOLAR ROOF & TWIN HEADLIGHTS) */
              <group>
                <mesh castShadow receiveShadow position={[0, 0.56, 0]} geometry={AUTO_LOWER_BODY_GEO} material={ENTITY_MATS.autoBlueBody} />
                <mesh castShadow position={[0, 0.52, 1.05]} rotation={[Math.PI / 2, 0, 0]} geometry={AUTO_NOSE_GEO} material={ENTITY_MATS.autoBlueBody} />
                <mesh castShadow position={[0, 1.22, -0.05]} geometry={AUTO_CANOPY_GEO} material={ENTITY_MATS.autoBlueBody} />
                <mesh castShadow position={[0, 1.62, -0.02]} geometry={AUTO_HARD_ROOF_GEO} material={ENTITY_MATS.autoBlueRoof} />
                <mesh position={[0, 1.71, -0.05]} geometry={AUTO_SOLAR_PANEL_GEO} material={ENTITY_MATS.autoSolarPanel} />
                <mesh position={[-0.71, 0.92, -0.05]} rotation={[Math.PI / 2, 0, 0]} geometry={AUTO_SIDE_RAIL_GEO} material={ENTITY_MATS.autoWhiteTrim} />
                <mesh position={[0.71, 0.92, -0.05]} rotation={[Math.PI / 2, 0, 0]} geometry={AUTO_SIDE_RAIL_GEO} material={ENTITY_MATS.autoWhiteTrim} />
                <mesh position={[0, 0.34, 1.36]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_BUMPER_GEO} material={ENTITY_MATS.autoWhiteTrim} />
                <mesh position={[0, 1.18, 0.84]} geometry={AUTO_WINDSHIELD_GEO} material={ENTITY_MATS.autoGlass} />
                <mesh position={[0, 1.52, 0.88]} geometry={AUTO_LED_BROW_GEO} material={ENTITY_MATS.ledHeadlight} />
                <mesh position={[-0.38, 0.64, 0.98]} geometry={AUTO_HEADLIGHT_GEO} material={ENTITY_MATS.ledHeadlight} />
                <mesh position={[0.38, 0.64, 0.98]} geometry={AUTO_HEADLIGHT_GEO} material={ENTITY_MATS.ledHeadlight} />
              </group>
            ) : (
              /* MODEL 2: GREEN-YELLOW (CLASSIC DELHI CNG AUTO WITH MARIGOLD GARLAND & REAR SPARE TIRE) */
              <group>
                <mesh castShadow receiveShadow position={[0, 0.56, 0]} geometry={AUTO_LOWER_BODY_GEO} material={ENTITY_MATS.autoGreen} />
                <mesh castShadow position={[0, 0.52, 1.05]} rotation={[Math.PI / 2, 0, 0]} geometry={AUTO_NOSE_GEO} material={ENTITY_MATS.autoGreen} />
                <mesh position={[0, 0.82, 0]} geometry={AUTO_STRIPE_GEO} material={ENTITY_MATS.autoYellow} />
                <mesh castShadow position={[0, 1.22, -0.05]} geometry={AUTO_CANOPY_GEO} material={ENTITY_MATS.autoYellow} />
                <mesh castShadow position={[0, 1.54, -0.05]} rotation={[0, Math.PI / 2, 0]} geometry={AUTO_ROOF_TOP_GEO} material={ENTITY_MATS.autoYellow} />
                <mesh position={[0, 1.36, 0.86]} rotation={[Math.PI, 0, 0]} geometry={AUTO_GARLAND_GEO} material={ENTITY_MATS.cowGarland} />
                <mesh position={[0, 0.68, -0.98]} rotation={[Math.PI / 2, 0, 0]} geometry={AUTO_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
                <mesh position={[0, 1.18, 0.84]} geometry={AUTO_WINDSHIELD_GEO} material={ENTITY_MATS.autoGlass} />
                <mesh position={[0, 0.65, 1.38]} geometry={AUTO_HEADLIGHT_GEO} material={ENTITY_MATS.headlight} />
                <mesh position={[-0.56, 0.68, 0.96]} geometry={AUTO_INDICATOR_GEO} material={ENTITY_MATS.indicatorAmber} />
                <mesh position={[0.56, 0.68, 0.96]} geometry={AUTO_INDICATOR_GEO} material={ENTITY_MATS.indicatorAmber} />
              </group>
            )}

            <mesh position={[0, 0.26, 1.15]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[-0.68, 0.26, -0.65]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[0.68, 0.26, -0.65]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
          </group>
        )}

        {/* --- INDIAN CITY BUS (MUMBAI BEST RED, DELHI DTC GREEN, OR UTSAV EXPRESS YELLOW) --- */}
        {data.type === ObjectType.CITY_BUS && (
          <group position={[0, -BUS_HEIGHT / 2, 0]}>
            <mesh
              castShadow
              receiveShadow
              position={[0, 1.45, 0]}
              geometry={BUS_BODY_GEO}
              material={
                data.busVariant === 'DELHI_GREEN'
                  ? ENTITY_MATS.busDelhiGreen
                  : data.busVariant === 'UTSAV_YELLOW'
                  ? ENTITY_MATS.busUtsavYellow
                  : ENTITY_MATS.busMumbaiRed
              }
            />
            <mesh castShadow position={[0, 2.74, 0]} geometry={BUS_ROOF_GEO} material={ENTITY_MATS.autoWhiteTrim} />
            <mesh position={[0, 1.25, 0]} geometry={BUS_STRIPE_GEO} material={ENTITY_MATS.busCreamStripe} />
            <mesh position={[0, 1.95, 0]} geometry={BUS_SIDE_WINDOW_GEO} material={ENTITY_MATS.autoGlass} />
            <mesh position={[0, 1.85, 2.81]} geometry={BUS_WINDSHIELD_GEO} material={ENTITY_MATS.autoGlass} />
            <mesh position={[0, 2.45, 2.81]} geometry={BUS_DEST_BOARD_GEO} material={ENTITY_MATS.busDestBoard} />
            <mesh position={[0, 0.45, 2.82]} geometry={BUS_BUMPER_GEO} material={ENTITY_MATS.autoChrome} />
            <mesh position={[-0.85, 0.75, 2.81]} geometry={AUTO_HEADLIGHT_GEO} material={ENTITY_MATS.headlight} />
            <mesh position={[0.85, 0.75, 2.81]} geometry={AUTO_HEADLIGHT_GEO} material={ENTITY_MATS.headlight} />
            {/* 4 Heavy Bus Wheels */}
            <mesh position={[-1.18, 0.48, 1.85]} rotation={[0, 0, Math.PI / 2]} geometry={BUS_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[1.18, 0.48, 1.85]} rotation={[0, 0, Math.PI / 2]} geometry={BUS_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[-1.18, 0.48, -1.85]} rotation={[0, 0, Math.PI / 2]} geometry={BUS_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[1.18, 0.48, -1.85]} rotation={[0, 0, Math.PI / 2]} geometry={BUS_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
          </group>
        )}

        {/* --- INDIAN STREET VENDOR PUSHCART (THELA) & VENDOR --- */}
        {data.type === ObjectType.STREET_VENDOR && (
          <group>
            {/* Wooden 4-Wheeled Thela Cart Base & Frame */}
            <mesh castShadow receiveShadow position={[0, 0.68, 0]} geometry={VENDOR_CART_DECK_GEO} material={ENTITY_MATS.vendorWood} />
            <mesh position={[0, 0.36, 0]} geometry={VENDOR_CART_FRAME_GEO} material={ENTITY_MATS.crateWood} />
            {/* 4 Spoked Pushcart Wheels */}
            <mesh position={[-0.68, 0.32, 0.55]} rotation={[0, 0, Math.PI / 2]} geometry={VENDOR_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[0.68, 0.32, 0.55]} rotation={[0, 0, Math.PI / 2]} geometry={VENDOR_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[-0.68, 0.32, -0.55]} rotation={[0, 0, Math.PI / 2]} geometry={VENDOR_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[0.68, 0.32, -0.55]} rotation={[0, 0, Math.PI / 2]} geometry={VENDOR_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            {/* Vendor Umbrella Pole & Colorful Shade Umbrella */}
            <mesh position={[0, 1.5, -0.15]} geometry={VENDOR_UMBRELLA_POLE_GEO} material={ENTITY_MATS.autoChrome} />
            <mesh
              castShadow
              position={[0, 2.35, -0.15]}
              geometry={VENDOR_UMBRELLA_TOP_GEO}
              material={data.vendorVariant === 'CHAAT_THELA' ? ENTITY_MATS.vendorUmbrellaOrange : ENTITY_MATS.vendorUmbrellaBlue}
            />
            {/* Vendor Wares: Matka Kulfi Pot / Golgappa Glass Jar / Fresh Fruit Mound */}
            <mesh
              castShadow
              position={[-0.25, 0.98, 0.15]}
              geometry={VENDOR_MATKA_GEO}
              material={data.vendorVariant === 'KULFI_CART' ? ENTITY_MATS.vendorRedCloth : ENTITY_MATS.cowBell}
            />
            <mesh
              castShadow
              position={[0.28, 0.92, 0.15]}
              geometry={VEG_PRODUCE_MOUND_GEO}
              material={data.vendorVariant === 'FRUIT_CART' ? ENTITY_MATS.vegChili : ENTITY_MATS.vegTomato}
            />
            {/* Street Vendor Figure Standing Beside Cart */}
            <group position={[0.58, 0, -0.62]}>
              <mesh castShadow position={[0, 0.65, 0]} geometry={VENDOR_PERSON_TORSO_GEO} material={data.vendorVariant === 'CHAAT_THELA' ? ENTITY_MATS.vendorKurtaSaffron : ENTITY_MATS.vendorKurtaWhite} />
              <mesh castShadow position={[0, 1.12, 0]} geometry={VENDOR_PERSON_HEAD_GEO} material={ENTITY_MATS.rivalSkin} />
              <mesh position={[0, 1.24, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={VENDOR_TURBAN_GEO} material={ENTITY_MATS.vendorTurbanPink} />
            </group>
            {/* Amber Jump-Over Indicator Bar */}
            <mesh position={[0, 1.22, 0.78]} geometry={SLIDE_BAR_GEO} material={ENTITY_MATS.jumpCueAmber} />
          </group>
        )}

        {/* --- TEMPORARY BAZAAR ITEM 1: STRAY COW (SLIDE UNDER BELLY OR DOUBLE-JUMP) --- */}
        {data.type === ObjectType.STRAY_COW && (
          <group>
            {/* 4 Tall Outer Legs framing the slide-under gap */}
            <mesh castShadow position={[-0.58, 0.48, 0.26]} geometry={COW_LEG_GEO} material={ENTITY_MATS.cowCoat} />
            <mesh castShadow position={[0.58, 0.48, 0.26]} geometry={COW_LEG_GEO} material={ENTITY_MATS.cowCoat} />
            <mesh castShadow position={[-0.58, 0.48, -0.26]} geometry={COW_LEG_GEO} material={ENTITY_MATS.cowCoat} />
            <mesh castShadow position={[0.58, 0.48, -0.26]} geometry={COW_LEG_GEO} material={ENTITY_MATS.cowCoat} />

            {/* High Elevated Cow Body & Zebu Hump (Bottom at y = 0.96m for Slide Clearance!) */}
            <mesh castShadow receiveShadow position={[0, 1.3, 0]} geometry={COW_BODY_GEO} material={ENTITY_MATS.cowCoat} />
            <mesh castShadow position={[0.15, 1.48, 0.02]} scale={[0.55, 0.45, 1.05]} geometry={COW_BODY_GEO} material={ENTITY_MATS.cowPatch} />
            <mesh castShadow position={[-0.38, 1.72, 0]} geometry={COW_HUMP_GEO} material={ENTITY_MATS.cowCoat} />

            {/* Cow Head, Horns, Floppy Ears, Marigold Garland & Brass Bell */}
            <group ref={cowHeadRef} position={[-0.82, 1.54, 0]}>
              <mesh castShadow geometry={COW_HEAD_GEO} material={ENTITY_MATS.cowCoat} />
              <mesh position={[-0.25, -0.06, 0]} geometry={COW_SNOUT_GEO} material={ENTITY_MATS.cowSnout} />
              {/* Curved Horns */}
              <mesh position={[0.04, 0.28, 0.14]} rotation={[0.3, 0, 0.25]} geometry={COW_HORN_GEO} material={ENTITY_MATS.cowHorn} />
              <mesh position={[0.04, 0.28, -0.14]} rotation={[-0.3, 0, 0.25]} geometry={COW_HORN_GEO} material={ENTITY_MATS.cowHorn} />
              {/* Floppy Gir Cow Ears */}
              <mesh position={[0.05, 0.04, 0.22]} rotation={[0.4, 0, 0]} geometry={COW_EAR_GEO} material={ENTITY_MATS.cowPatch} />
              <mesh position={[0.05, 0.04, -0.22]} rotation={[-0.4, 0, 0]} geometry={COW_EAR_GEO} material={ENTITY_MATS.cowPatch} />
              {/* Festive Marigold Neck Garland & Brass Bell */}
              <mesh position={[0.22, -0.12, 0]} rotation={[0, Math.PI / 2, 0.35]} geometry={COW_GARLAND_GEO} material={ENTITY_MATS.cowGarland} />
              <mesh position={[0.16, -0.36, 0]} geometry={COW_BELL_GEO} material={ENTITY_MATS.cowBell} />
            </group>

            {/* Cyan Slide-Under Clearance Indicator Bar beneath the belly */}
            <mesh position={[0, 0.92, 0.42]} geometry={SLIDE_BAR_GEO} material={ENTITY_MATS.slideCueCyan} />
          </group>
        )}

        {/* --- TEMPORARY BAZAAR ITEM 2: SLEEPING STREET DOG (JUMP OVER) --- */}
        {data.type === ObjectType.SLEEPING_DOG && (
          <group>
            {/* Woven Jute Burlap Sleeping Mat */}
            <mesh receiveShadow position={[0, 0.03, 0]} geometry={DOG_RUG_GEO} material={ENTITY_MATS.dogRug} />
            {/* Curled Caramel Desi Street Dog Body */}
            <mesh
              castShadow
              position={[0, 0.2, 0]}
              rotation={[Math.PI / 2, 0, 0.4]}
              geometry={DOG_BODY_GEO}
              material={ENTITY_MATS.dogCoat}
            />
            {/* Resting Head, Snout & Ears */}
            <group position={[0.22, 0.28, 0.18]} rotation={[0, 0.5, 0]}>
              <mesh castShadow geometry={DOG_HEAD_GEO} material={ENTITY_MATS.dogCoat} />
              <mesh position={[0, -0.04, 0.18]} rotation={[Math.PI / 2, 0, 0]} geometry={DOG_SNOUT_GEO} material={ENTITY_MATS.dogEars} />
              <mesh position={[-0.12, 0.08, 0]} rotation={[0, 0, 0.4]} geometry={DOG_EAR_GEO} material={ENTITY_MATS.dogEars} />
              <mesh position={[0.12, 0.08, 0]} rotation={[0, 0, -0.4]} geometry={DOG_EAR_GEO} material={ENTITY_MATS.dogEars} />
            </group>
            {/* Floating Sleep 'Zzz' Rings */}
            <group ref={dogSleepRef} position={[0.2, 0.55, 0.15]}>
              <mesh rotation={[Math.PI / 3, 0.2, 0]} geometry={DOG_SLEEP_RING_GEO} material={ENTITY_MATS.dogSleepZzz} />
              <mesh position={[0.12, 0.22, 0]} scale={[1.35, 1.35, 1.35]} rotation={[Math.PI / 3, -0.2, 0]} geometry={DOG_SLEEP_RING_GEO} material={ENTITY_MATS.dogSleepZzz} />
            </group>
          </group>
        )}

        {/* --- TEMPORARY BAZAAR ITEM 3: PILE OF VEGETABLE CRATES (STACKED JUMP PILE OR OVERHEAD SLIDE RACK) --- */}
        {data.type === ObjectType.VEG_CRATE_PILE && (
          <group>
            {data.clearanceType === 'SLIDE' ? (
              /* OVERHEAD VEGETABLE CRATE RACK (Requires SLIDING under!) */
              <group>
                {/* Left & Right Bamboo/Steel Support Posts */}
                <mesh castShadow position={[-0.78, 0.98, 0]} geometry={VEG_RACK_POST_GEO} material={ENTITY_MATS.crateWood} />
                <mesh castShadow position={[0.78, 0.98, 0]} geometry={VEG_RACK_POST_GEO} material={ENTITY_MATS.crateWood} />
                {/* Overhead Wooden Crossbeam at y = 1.02m */}
                <mesh castShadow position={[0, 1.02, 0]} geometry={VEG_RACK_BEAM_GEO} material={ENTITY_MATS.crateWood} />
                {/* Overhead Stacked Vegetable Crates (Tomatoes, Brinjals & Chilies) */}
                <mesh castShadow position={[-0.38, 1.3, 0]} rotation={[0, 0.12, 0]} geometry={VEG_CRATE_BOX_GEO} material={ENTITY_MATS.crateGreen} />
                <mesh castShadow position={[0.38, 1.3, 0]} rotation={[0, -0.1, 0]} geometry={VEG_CRATE_BOX_GEO} material={ENTITY_MATS.crateRed} />
                <mesh castShadow position={[0, 1.72, 0]} rotation={[0, 0.05, 0]} geometry={VEG_CRATE_BOX_GEO} material={ENTITY_MATS.crateBlue} />
                <mesh position={[-0.38, 1.56, 0]} geometry={VEG_PRODUCE_MOUND_GEO} material={ENTITY_MATS.vegTomato} />
                <mesh position={[0.38, 1.56, 0]} geometry={VEG_PRODUCE_MOUND_GEO} material={ENTITY_MATS.vegBrinjal} />
                <mesh position={[0, 1.98, 0]} geometry={VEG_PRODUCE_MOUND_GEO} material={ENTITY_MATS.vegChili} />
                {/* Cyan Slide-Under Clearance Indicator Bar */}
                <mesh position={[0, 0.92, 0.44]} geometry={SLIDE_BAR_GEO} material={ENTITY_MATS.slideCueCyan} />
              </group>
            ) : (
              /* STACKED PYRAMID OF VEGETABLE CRATES ON THE ROAD (Requires JUMPING over!) */
              <group>
                {/* Bottom Row Crates */}
                <mesh castShadow receiveShadow position={[-0.42, 0.21, 0.05]} rotation={[0, 0.18, 0]} geometry={VEG_CRATE_BOX_GEO} material={ENTITY_MATS.crateGreen} />
                <mesh castShadow receiveShadow position={[0.42, 0.21, -0.05]} rotation={[0, -0.15, 0]} geometry={VEG_CRATE_BOX_GEO} material={ENTITY_MATS.crateRed} />
                {/* Overflowing Tomatoes & Brinjals in Bottom Crates */}
                <mesh position={[-0.42, 0.45, 0.05]} geometry={VEG_PRODUCE_MOUND_GEO} material={ENTITY_MATS.vegTomato} />
                <mesh position={[0.42, 0.45, -0.05]} geometry={VEG_PRODUCE_MOUND_GEO} material={ENTITY_MATS.vegBrinjal} />
                {/* Top Stacked Crate */}
                <mesh castShadow position={[0, 0.65, 0]} rotation={[0, 0.08, 0]} geometry={VEG_CRATE_BOX_GEO} material={ENTITY_MATS.crateBlue} />
                <mesh position={[0, 0.92, 0]} geometry={VEG_PRODUCE_MOUND_GEO} material={ENTITY_MATS.vegChili} />
                {/* Amber Jump-Over Indicator Bar */}
                <mesh position={[0, 1.12, 0.38]} geometry={SLIDE_BAR_GEO} material={ENTITY_MATS.jumpCueAmber} />
              </group>
            )}
          </group>
        )}

        {/* --- TEMPORARY BAZAAR ITEM 4: OVERHEAD DHOBI CLOTHESLINE / BAMBOO SCAFFOLDING (SLIDE UNDER) --- */}
        {data.type === ObjectType.CLOTHESLINE_SCAFFOLD && (
          <group>
            {/* Left & Right Bamboo Support Poles */}
            <mesh castShadow position={[-0.95, 1.15, 0]} geometry={SCAFFOLD_POLE_GEO} material={ENTITY_MATS.scaffoldWood} />
            <mesh castShadow position={[0.95, 1.15, 0]} geometry={SCAFFOLD_POLE_GEO} material={ENTITY_MATS.scaffoldWood} />
            {/* Top Bamboo Crossbeam at y = 1.62m */}
            <mesh castShadow position={[0, 1.62, 0]} rotation={[0, 0, Math.PI / 2]} geometry={SCAFFOLD_BEAM_GEO} material={ENTITY_MATS.scaffoldWood} />
            {/* Clothesline Rope at y = 1.48m */}
            <mesh position={[0, 1.48, 0]} rotation={[0, 0, Math.PI / 2]} geometry={CLOTHESLINE_ROPE_GEO} material={ENTITY_MATS.clotheslineRope} />
            {/* Hanging Fluttering Sarees & Kurtas (Bottom at y = 0.95m for Slide Clearance!) */}
            <group position={[-0.55, 1.22, 0]} rotation={[0.08, 0, 0]}>
              <mesh castShadow geometry={CLOTHESLINE_FABRIC_GEO} material={ENTITY_MATS.fabricRed} />
            </group>
            <group position={[0, 1.20, 0]} rotation={[-0.06, 0, 0]}>
              <mesh castShadow geometry={CLOTHESLINE_FABRIC_GEO} material={ENTITY_MATS.fabricYellow} />
            </group>
            <group position={[0.55, 1.22, 0]} rotation={[0.08, 0, 0]}>
              <mesh castShadow geometry={CLOTHESLINE_FABRIC_GEO} material={ENTITY_MATS.fabricCyan} />
            </group>
            {/* Cyan Slide-Under Clearance Indicator Bar */}
            <mesh position={[0, 0.92, 0.35]} geometry={SLIDE_BAR_GEO} material={ENTITY_MATS.slideCueCyan} />
          </group>
        )}

        {/* --- DEBRIS: SPILLED BAZAAR CRATE, CHAI PUDDLE & TERRACOTTA KULHADS --- */}
        {data.type === ObjectType.DEBRIS && (
          <group position={[0, -0.15, 0]}>
            {/* Spilled Masala Chai Puddle on the Road */}
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={DEBRIS_SPILL_GEO} material={ENTITY_MATS.debrisChaiSpill} />
            {/* Overturned Wooden Bazaar Crate */}
            <mesh castShadow position={[-0.12, 0.2, 0.05]} rotation={[0.25, 0.4, 0.18]} geometry={DEBRIS_CRATE_GEO} material={ENTITY_MATS.debrisCrate} />
            {/* Scattered Terracotta Clay Kulhad Cups */}
            <mesh castShadow position={[0.35, 0.12, 0.25]} rotation={[Math.PI / 2.2, 0.3, 0.5]} geometry={DEBRIS_KULHAD_GEO} material={ENTITY_MATS.debrisKulhad} />
            <mesh castShadow position={[0.22, 0.12, -0.28]} rotation={[-Math.PI / 2.3, -0.4, 0.2]} geometry={DEBRIS_KULHAD_GEO} material={ENTITY_MATS.debrisKulhad} />
            {/* Slippery Banana Peel / Marigold Heap */}
            <mesh castShadow position={[-0.38, 0.14, -0.22]} rotation={[0.4, 0.2, -0.5]} geometry={DEBRIS_PEEL_GEO} material={ENTITY_MATS.debrisPeel} />
          </group>
        )}

        {/* --- LEVEL 2+ RIVAL UNCLE ON SCOOTER (THROWS FLYING CHAPPALS) --- */}
        {data.type === ObjectType.ALIEN && (
          <group position={[0, -0.35, 0]}>
            {/* Classic Cream Scooter Body & Front Apron Shield */}
            <mesh castShadow position={[0, 0.4, 0]} geometry={SCOOTER_BODY_GEO} material={ENTITY_MATS.scooterCream} />
            <mesh castShadow position={[0, 0.65, 0.55]} rotation={[-0.2, 0, 0]} geometry={SCOOTER_SHIELD_GEO} material={ENTITY_MATS.scooterCream} />
            <mesh position={[0, 0.95, 0.64]} geometry={AUTO_HEADLIGHT_GEO} material={ENTITY_MATS.headlight} />
            {/* Scooter Rider (Angry Padosi Uncle in Red Kurta) */}
            <mesh castShadow position={[0, 0.95, -0.1]} geometry={RIVAL_TORSO_GEO} material={ENTITY_MATS.rivalKurta} />
            <mesh castShadow position={[0, 1.4, -0.1]} geometry={RIVAL_HEAD_GEO} material={ENTITY_MATS.rivalSkin} />
            {/* Wheels */}
            <mesh position={[0, 0.24, 0.55]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[0, 0.24, -0.55]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
          </group>
        )}

        {/* --- MISSILE: SPINNING FLYING CHAPPAL (SLIPPER) --- */}
        {data.type === ObjectType.MISSILE && (
          <group>
            <mesh castShadow geometry={FLYING_CHAPPAL_SOLE_GEO} material={ENTITY_MATS.chappalLeather} />
            <mesh position={[0, 0.06, 0.1]} rotation={[Math.PI / 3, 0, 0]} geometry={FLYING_CHAPPAL_STRAP_GEO} material={ENTITY_MATS.chappalStrap} />
            <mesh geometry={CHAPPAL_AURA_RING_GEO}>
              <meshBasicMaterial color="#ff3d00" />
            </mesh>
          </group>
        )}

        {/* --- GEM: GOLDEN GARAM SAMOSA / RUPEE COIN --- */}
        {data.type === ObjectType.GEM && (
          <group>
            <mesh castShadow geometry={SAMOSA_GEO} material={ENTITY_MATS.samosaGold} />
            <mesh geometry={RUPEE_RING_GEO} material={ENTITY_MATS.autoYellow} />
          </group>
        )}

        {/* --- CUTTING CHAI POWER-UP: STEAMING MASALA CHAI GLASS --- */}
        {data.type === ObjectType.CHAI && (
          <group>
            {/* Warm Masala Chai Liquid Core */}
            <mesh position={[0, -0.03, 0]} geometry={CHAI_LIQUID_GEO} material={ENTITY_MATS.chaiLiquid} />
            {/* Creamy Froth Layer */}
            <mesh position={[0, 0.21, 0]} geometry={CHAI_FOAM_GEO} material={ENTITY_MATS.chaiFoam} />
            {/* Fluted Glass Tumbler Outer Shell */}
            <mesh castShadow geometry={CHAI_GLASS_GEO} material={ENTITY_MATS.chaiGlass} />
            {/* Animated Rising Hot Steam Rings */}
            <group ref={chaiSteamGroupRef}>
              <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0.2, 0]} geometry={CHAI_STEAM_RING_GEO} material={ENTITY_MATS.chaiSteam} />
              <mesh position={[0.04, 0.5, 0]} scale={[1.25, 1.25, 1.25]} rotation={[Math.PI / 2, -0.25, 0]} geometry={CHAI_STEAM_RING_GEO} material={ENTITY_MATS.chaiSteam} />
              <mesh position={[-0.04, 0.64, 0]} scale={[1.5, 1.5, 1.5]} rotation={[Math.PI / 2, 0.15, 0]} geometry={CHAI_STEAM_RING_GEO} material={ENTITY_MATS.chaiSteam} />
            </group>
            {/* Golden Masala Invincibility + Speed Boost Aura Ring */}
            <mesh position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={CHAI_SAUCER_AURA_GEO} material={ENTITY_MATS.chaiAura} />
          </group>
        )}

        {/* --- GULLY 2.0 STREET POWER-UP PICKUPS (MAGNET, SLOW-MO, SHIELD, 2X MULTIPLIER, EMERGENCY DODGE) --- */}
        {data.type === ObjectType.POWERUP && (
          <group>
            {/* Outer Glowing Halo Ring */}
            <mesh geometry={POWERUP_RING_GEO}>
              <meshBasicMaterial color={data.color || '#38bdf8'} />
            </mesh>
            {data.powerUpType === 'COIN_MAGNET' ? (
              <group>
                <mesh position={[0, 0.04, 0]} geometry={POWERUP_MAGNET_ARC_GEO}>
                  <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={0.6} roughness={0.25} metalness={0.7} />
                </mesh>
                <mesh position={[-0.24, -0.06, 0]} geometry={POWERUP_MAGNET_TIP_GEO} material={ENTITY_MATS.autoChrome} />
                <mesh position={[0.24, -0.06, 0]} geometry={POWERUP_MAGNET_TIP_GEO} material={ENTITY_MATS.autoChrome} />
              </group>
            ) : data.powerUpType === 'RICKSHAW_SHIELD' ? (
              <mesh rotation={[Math.PI / 2, 0, 0]} geometry={POWERUP_SHIELD_HEX_GEO}>
                <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.75} roughness={0.2} metalness={0.85} />
              </mesh>
            ) : (
              <mesh geometry={POWERUP_CORE_OCTA_GEO}>
                <meshStandardMaterial
                  color={data.color || '#facc15'}
                  emissive={data.color || '#facc15'}
                  emissiveIntensity={0.8}
                  roughness={0.2}
                  metalness={0.75}
                />
              </mesh>
            )}
            <mesh position={[0, -0.26, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={CHAI_SAUCER_AURA_GEO}>
              <meshBasicMaterial color={data.color || '#38bdf8'} />
            </mesh>
          </group>
        )}

        {/* --- LETTER (B-H-A-A-G-O) --- */}
        {data.type === ObjectType.LETTER && (
          <group scale={[1.5, 1.5, 1.5]}>
            <Center>
              <Text3D
                font={FONT_URL}
                size={0.8}
                height={0.5}
                bevelEnabled
                bevelThickness={0.02}
                bevelSize={0.02}
                bevelSegments={5}
              >
                {data.value}
                <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={1.2} />
              </Text3D>
            </Center>
          </group>
        )}
      </group>
    </group>
  );
});

