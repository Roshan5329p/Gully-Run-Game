/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store';
import { GameObject, ObjectType, ClearanceType, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus, GEMINI_COLORS } from '../../types';
import { audio } from '../System/Audio';

// Obstacle Height (Auto-Rickshaw height for jump clearance)
const OBSTACLE_HEIGHT = 1.65;

// Auto-Rickshaw (Tuk-Tuk) Multi-Part Geometries
const AUTO_LOWER_BODY_GEO = new THREE.BoxGeometry(1.35, 0.72, 1.9);
const AUTO_NOSE_GEO = new THREE.CylinderGeometry(0.25, 0.55, 0.7, 6);
const AUTO_CANOPY_GEO = new THREE.BoxGeometry(1.38, 0.65, 1.75);
const AUTO_ROOF_TOP_GEO = new THREE.CylinderGeometry(0.68, 0.68, 1.75, 8, 1, false, 0, Math.PI);
const AUTO_WINDSHIELD_GEO = new THREE.PlaneGeometry(1.15, 0.55);
const AUTO_WHEEL_GEO = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 12);
const AUTO_HEADLIGHT_GEO = new THREE.SphereGeometry(0.14, 10, 10);

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

// Cutting Chai Power-Up (Fluted Indian Glass Tumbler, Masala Tea, Foam & Steam) Geometries
const CHAI_GLASS_GEO = new THREE.CylinderGeometry(0.24, 0.17, 0.56, 10);
const CHAI_LIQUID_GEO = new THREE.CylinderGeometry(0.21, 0.15, 0.44, 10);
const CHAI_FOAM_GEO = new THREE.CylinderGeometry(0.215, 0.21, 0.06, 10);
const CHAI_STEAM_RING_GEO = new THREE.TorusGeometry(0.14, 0.02, 8, 16);
const CHAI_SAUCER_AURA_GEO = new THREE.TorusGeometry(0.36, 0.035, 8, 24);

// Shadow Geometries
const SHADOW_LETTER_GEO = new THREE.PlaneGeometry(2, 0.6);
const SHADOW_GEM_GEO = new THREE.CircleGeometry(0.55, 24);
const SHADOW_ALIEN_GEO = new THREE.CircleGeometry(0.85, 24);
const SHADOW_MISSILE_GEO = new THREE.PlaneGeometry(0.5, 1.2);
const SHADOW_DEBRIS_GEO = new THREE.CircleGeometry(0.8, 16);
const SHADOW_DEFAULT_GEO = new THREE.PlaneGeometry(1.4, 2.0);

// Chai Tapri Shop Portal Geometries
const SHOP_FRAME_GEO = new THREE.BoxGeometry(1, 7, 1);
const SHOP_BACK_GEO = new THREE.BoxGeometry(1, 5, 1.2);
const SHOP_OUTLINE_GEO = new THREE.BoxGeometry(1, 7.2, 0.8);
const SHOP_FLOOR_GEO = new THREE.PlaneGeometry(1, 4);

const PARTICLE_COUNT = 600;
const BASE_LETTER_INTERVAL = 150;

const getLetterInterval = (level: number) => {
  // Cap the interval growth at level 4 so Endless Mode waves continue spawning Shop Portals at a steady rhythm
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
  type === ObjectType.VEG_CRATE_PILE;

// Procedural factory for a temporary bazaar obstacle (Stray Cow, Sleeping Street Dog, or Vegetable Crate Pile)
const createTemporaryBazaarObstacle = (lane: number, spawnZ: number): { obstacle: GameObject; guideGem?: GameObject } => {
  const laneX = lane * LANE_WIDTH;
  const roll = Math.random();

  // 1. Stray Bazaar Cow (36% chance) -> Requires SLIDING under its high belly (or double-jumping over)
  if (roll < 0.36) {
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
      points: 75,
    };
    return { obstacle, guideGem };
  }

  // 2. Sleeping Street Dog (32% chance) -> Curled low on a burlap sack, requires JUMPING over
  if (roll < 0.68) {
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
      points: 75,
    };
    return { obstacle, guideGem };
  }

  // 3. Pile of Vegetable Crates (32% chance) -> Either a Stacked Pyramid (JUMP) or an Overhead Crate Rack (SLIDE)
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
    points: 75,
  };
  return { obstacle, guideGem };
};

// --- Particle System ---
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
      })),
    []
  );

  useEffect(() => {
    const handleExplosion = (e: CustomEvent) => {
      const { position, color } = e.detail;
      let spawned = 0;
      const burstAmount = 40;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        if (p.life <= 0) {
          p.life = 1.0 + Math.random() * 0.5;
          p.pos.set(position[0], position[1], position[2]);

          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const speed = 2 + Math.random() * 10;

          p.vel
            .set(
              Math.sin(phi) * Math.cos(theta),
              Math.sin(phi) * Math.sin(theta),
              Math.cos(phi)
            )
            .multiplyScalar(speed);

          p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          p.rotVel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(5);

          p.color.set(color);

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
        p.life -= safeDelta * 1.5;
        p.pos.addScaledVector(p.vel, safeDelta);
        p.vel.y -= safeDelta * 5;
        p.vel.multiplyScalar(0.98);

        p.rot.x += p.rotVel.x * safeDelta;
        p.rot.y += p.rotVel.y * safeDelta;

        dummy.position.copy(p.pos);
        const scale = Math.max(0, p.life * 0.25);
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
      <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
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
    collectedLetters,
    laneCount,
    setDistance,
    openShop,
    level,
    triggerStumble,
    collectChai,
    registerComboAction,
  } = useStore();

  const objectsRef = useRef<GameObject[]>([]);
  const [, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);
  const lastRickshawHonkRef = useRef(0);

  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp = level !== prevLevel.current && status === GameStatus.PLAYING;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || isVictoryReset) {
      objectsRef.current = [];
      setRenderTrigger(t => t + 1);
      distanceTraveled.current = 0;
      nextLetterDistance.current = getLetterInterval(1);
    } else if (isLevelUp && level > 1) {
      objectsRef.current = objectsRef.current.filter(obj => obj.position[2] > -80);

      objectsRef.current.push({
        id: uuidv4(),
        type: ObjectType.SHOP_PORTAL,
        position: [0, 0, -100],
        active: true,
      });

      nextLetterDistance.current = distanceTraveled.current - SPAWN_DISTANCE + getLetterInterval(level);
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

    for (const obj of currentObjects) {
      let moveAmount = dist;

      if (obj.type === ObjectType.MISSILE) {
        moveAmount += MISSILE_SPEED * safeDelta;
      }

      const prevZ = obj.position[2];
      obj.position[2] += moveAmount;

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

      // Spatialized Auto-Rickshaw Bulb-Horn Honk as 3D Tuk-Tuks approach the player
      if (
        obj.type === ObjectType.OBSTACLE &&
        obj.active &&
        prevZ <= -38 &&
        obj.position[2] > -38 &&
        now - lastRickshawHonkRef.current > 1.35 &&
        Math.random() < 0.45
      ) {
        lastRickshawHonkRef.current = now;
        const pan = THREE.MathUtils.clamp((obj.position[0] - _playerPos.x) / 4.5, -1, 1);
        audio.playAutoRickshawHonk(pan, 0.85);
      }

      // Spatialized Spinning Chappal Whoosh as a flying slipper hurtles through the air toward the player
      if (obj.type === ObjectType.MISSILE && obj.active && prevZ <= -15 && obj.position[2] > -15) {
        const pan = THREE.MathUtils.clamp((obj.position[0] - _playerPos.x) / 4.0, -1, 1);
        audio.playChappalWhoosh(pan, 1.15);
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
        const zThreshold = 2.0;
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
              obj.type === ObjectType.ALIEN ||
              obj.type === ObjectType.MISSILE ||
              isTemporaryBazaarObstacle(obj.type);

            const { isChaiBoostActive: chaiInvincible, isImmortalityActive: immortalActive } =
              useStore.getState();

            if (obj.type === ObjectType.DEBRIS) {
              // Low-lying Bazaar Debris: trips the player if they don't jump over it (unless protected by Cutting Chai / Immortality!)
              if (chaiInvincible || immortalActive) {
                window.dispatchEvent(
                  new CustomEvent('particle-burst', {
                    detail: { position: obj.position, color: '#fbbf24' },
                  })
                );
                obj.active = false;
                hasChanges = true;
              } else if (_playerPos.y < 0.45) {
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
              // Sliding ducks the player's top hitbox down to 0.72m so they can slide cleanly under Stray Cows & Overhead Crate Racks!
              const playerTop = _playerPos.y + (isPlayerSliding ? 0.72 : 1.8);

              let objBottom = obj.position[1] - 0.5;
              let objTop = obj.position[1] + 0.5;

              if (obj.type === ObjectType.OBSTACLE) {
                objBottom = 0;
                objTop = OBSTACLE_HEIGHT;
              } else if (obj.type === ObjectType.MISSILE) {
                objBottom = 0.5;
                objTop = 1.5;
              } else if (obj.type === ObjectType.STRAY_COW) {
                // High belly clearance: slide under (playerTop < 0.92) or double-jump over (playerBottom > 2.0)
                objBottom = 0.92;
                objTop = 2.0;
              } else if (obj.type === ObjectType.SLEEPING_DOG) {
                // Curled sleeping street dog: jump over (playerBottom >= 0.8)
                objBottom = 0;
                objTop = 0.8;
              } else if (obj.type === ObjectType.VEG_CRATE_PILE) {
                if (obj.clearanceType === 'SLIDE') {
                  // Overhead Bazaar Vegetable Crate Rack: slide under (playerTop < 0.92)
                  objBottom = 0.92;
                  objTop = 2.1;
                } else {
                  // Stacked Bazaar Vegetable Crate Pile: jump over (playerBottom >= 1.2)
                  objBottom = 0;
                  objTop = 1.2;
                }
              }

              const isHit = playerBottom < objTop && playerTop > objBottom;

              if (isHit) {
                if (chaiInvincible || immortalActive) {
                  // Cutting Chai Invincibility / Maa Ka Aashirwad smashes right through the obstacle!
                  registerComboAction('Chai Rush Smash!', 35);
                  audio.playComboTick(useStore.getState().comboCount);
                  obj.active = false;
                  hasChanges = true;

                  window.dispatchEvent(
                    new CustomEvent('particle-burst', {
                      detail: {
                        position: [obj.position[0], 0.9, obj.position[2]],
                        color: '#fbbf24',
                      },
                    })
                  );
                } else {
                  window.dispatchEvent(new Event('player-hit'));
                  obj.active = false;
                  hasChanges = true;

                  window.dispatchEvent(
                    new CustomEvent('particle-burst', {
                      detail: {
                        position: [obj.position[0], 0.9, obj.position[2]],
                        color: obj.color || '#ff4400',
                      },
                    })
                  );
                }
              }
            } else {
              const dy = Math.abs(obj.position[1] - _playerPos.y);
              if (dy < 2.5) {
                if (obj.type === ObjectType.GEM) {
                  collectGem(obj.points || 50);
                  audio.playGemCollect();
                }
                if (obj.type === ObjectType.CHAI) {
                  collectChai();
                  audio.playChaiBoost();
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
                    },
                  })
                );

                obj.active = false;
                hasChanges = true;
              }
            }
          }
        }

        // Near-Miss / Jump-Over / Slide-Under Dodge Combo Detection
        const isDodgeableThreat =
          obj.type === ObjectType.OBSTACLE ||
          obj.type === ObjectType.ALIEN ||
          obj.type === ObjectType.MISSILE ||
          isTemporaryBazaarObstacle(obj.type);

        if (
          obj.active &&
          isDodgeableThreat &&
          !obj.dodged &&
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
              (obj.type === ObjectType.VEG_CRATE_PILE && obj.clearanceType === 'SLIDE'));
          const dodgedMissileClose = obj.type === ObjectType.MISSILE && dxDodge <= LANE_WIDTH * 1.05;

          if (jumpedOverSameLane || slidUnderSameLane || dodgedMissileClose) {
            obj.dodged = true;
            let comboLabel = 'Vaulted Auto-Rickshaw!';
            let baseBonus = 15;

            if (obj.type === ObjectType.MISSILE) {
              comboLabel = 'Escaped Flying Chappal!';
              baseBonus = 30;
            } else if (obj.type === ObjectType.STRAY_COW) {
              comboLabel = slidUnderSameLane ? 'Slid Under Stray Cow!' : 'Vaulted Stray Cow!';
              baseBonus = 25;
              audio.playCowBell();
            } else if (obj.type === ObjectType.SLEEPING_DOG) {
              comboLabel = 'Leapt Over Sleeping Dog!';
              baseBonus = 20;
            } else if (obj.type === ObjectType.VEG_CRATE_PILE) {
              comboLabel =
                obj.clearanceType === 'SLIDE'
                  ? 'Slid Under Veg Crate Rack!'
                  : 'Vaulted Veg Crate Pile!';
              baseBonus = 20;
            }

            registerComboAction(comboLabel, baseBonus);
            audio.playComboTick(useStore.getState().comboCount);
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
      const minGap = 12 + speed * 0.4;
      const spawnZ = Math.min(furthestZ - minGap, -SPAWN_DISTANCE);

      const isLetterDue = distanceTraveled.current >= nextLetterDistance.current;

      if (isLetterDue) {
        const lane = getRandomLane(laneCount);
        const target = ['B', 'H', 'A', 'A', 'G', 'O'];

        const availableIndices = target.map((_, i) => i).filter(i => !collectedLetters.includes(i));

        if (availableIndices.length > 0) {
          const chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
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
            points: 50,
          });
          hasChanges = true;
        }
      } else if (Math.random() > 0.1) {
        const isObstacle = Math.random() > 0.2;

        if (isObstacle) {
          const alienChance = Math.min(0.32, 0.16 + Math.max(0, level - 2) * 0.04);
          const spawnAlien = level >= 2 && Math.random() < alienChance;
          // 45% of non-scooter obstacle waves are dedicated Temporary Bazaar Hazard Formations (Stray Cows, Sleeping Dogs, Veg Crates)!
          const spawnBazaarFormation = !spawnAlien && Math.random() < 0.45;

          if (spawnAlien) {
            const availableLanes = [];
            const maxLane = Math.floor(laneCount / 2);
            for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
            availableLanes.sort(() => Math.random() - 0.5);

            let alienCount = 1;
            const pAlien = Math.random();

            if (pAlien > 0.7) {
              alienCount = Math.min(2, availableLanes.length);
            }
            if (pAlien > 0.9 && availableLanes.length >= 3) {
              alienCount = 3;
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
            // Procedural Temporary Bazaar Obstacle Spawner:
            // Introduces Stray Cows (Slide Under), Sleeping Street Dogs (Jump Over), and Vegetable Crate Piles (Jump/Slide)
            const availableLanes = [];
            const maxLane = Math.floor(laneCount / 2);
            for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
            availableLanes.sort(() => Math.random() - 0.5);

            const hazardCount =
              Math.random() > 0.65
                ? Math.min(3, availableLanes.length)
                : Math.random() > 0.3
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

            if (p > 0.8) {
              countToSpawn = Math.min(3, availableLanes.length);
            } else if (p > 0.5) {
              countToSpawn = Math.min(2, availableLanes.length);
            } else {
              countToSpawn = 1;
            }

            for (let i = 0; i < countToSpawn; i++) {
              const lane = availableLanes[i];
              const laneX = lane * LANE_WIDTH;

              keptObjects.push({
                id: uuidv4(),
                type: ObjectType.OBSTACLE,
                position: [laneX, OBSTACLE_HEIGHT / 2, spawnZ],
                active: true,
                color: '#facc15',
              });

              if (Math.random() < 0.3) {
                keptObjects.push({
                  id: uuidv4(),
                  type: ObjectType.GEM,
                  position: [laneX, OBSTACLE_HEIGHT + 1.0, spawnZ],
                  active: true,
                  color: '#ffd700',
                  points: 100,
                });
              }
            }

            // In remaining open lanes alongside Auto-Rickshaws, spawn either a Temporary Bazaar Item (Stray Cow, Sleeping Dog, Veg Crates) or Bazaar Debris!
            if (availableLanes.length > countToSpawn && Math.random() < 0.72) {
              const extraLane = availableLanes[countToSpawn];
              if (Math.random() < 0.58) {
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

              // Often place a steaming Cutting Chai slightly ahead so players can grab a boost!
              if (Math.random() < 0.42) {
                const chaiLane = getRandomLane(laneCount);
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
        } else {
          const lane = getRandomLane(laneCount);
          // 35% of non-obstacle spawns are a steaming Cutting Chai power-up!
          if (Math.random() < 0.35) {
            keptObjects.push({
              id: uuidv4(),
              type: ObjectType.CHAI,
              position: [lane * LANE_WIDTH, 1.05, spawnZ],
              active: true,
              color: '#fb923c',
            });
          } else {
            keptObjects.push({
              id: uuidv4(),
              type: ObjectType.GEM,
              position: [lane * LANE_WIDTH, 1.2, spawnZ],
              active: true,
              color: '#ffb703',
              points: 50,
            });
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
  autoGreen: new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.35, metalness: 0.4 }),
  autoYellow: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.3, metalness: 0.3 }),
  autoGlass: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.1, metalness: 0.9 }),
  tireBlack: new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.85, metalness: 0.1 }),
  headlight: new THREE.MeshBasicMaterial({ color: '#fef08a' }),
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
        // Spinning Flying Chappal!
        visualRef.current.rotation.x += delta * 18;
        visualRef.current.rotation.y += delta * 10;
        visualRef.current.position.y = baseHeight;
      } else if (data.type === ObjectType.ALIEN) {
        // Scooter engine vibration
        visualRef.current.position.y = baseHeight + Math.sin(t * 25) * 0.04;
      } else if (data.type === ObjectType.STRAY_COW) {
        // Stray Cow gently chewing cud and swaying head/bell
        visualRef.current.position.y = baseHeight;
        if (cowHeadRef.current) {
          cowHeadRef.current.rotation.z = Math.sin(t * 2.4 + data.position[0]) * 0.08;
          cowHeadRef.current.rotation.x = Math.sin(t * 5.0) * 0.05;
        }
      } else if (data.type === ObjectType.SLEEPING_DOG) {
        // Sleeping street dog rhythmic breathing & rising Zzz rings
        visualRef.current.position.y = baseHeight;
        if (dogSleepRef.current) {
          dogSleepRef.current.position.y = 0.42 + ((t * 0.35) % 0.45);
          dogSleepRef.current.rotation.y = t * 1.5;
        }
      } else if (data.type === ObjectType.VEG_CRATE_PILE) {
        visualRef.current.position.y = baseHeight;
      } else if (data.type !== ObjectType.OBSTACLE && data.type !== ObjectType.DEBRIS) {
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
        // Slight engine idle rumble for Auto-Rickshaw
        visualRef.current.position.y = baseHeight + Math.sin(t * 30 + data.position[0]) * 0.02;
      }
    }
  });

  const shadowGeo = useMemo(() => {
    if (data.type === ObjectType.LETTER) return SHADOW_LETTER_GEO;
    if (data.type === ObjectType.GEM || data.type === ObjectType.CHAI) return SHADOW_GEM_GEO;
    if (data.type === ObjectType.SHOP_PORTAL) return null;
    if (data.type === ObjectType.ALIEN) return SHADOW_ALIEN_GEO;
    if (data.type === ObjectType.MISSILE) return SHADOW_MISSILE_GEO;
    if (data.type === ObjectType.DEBRIS || data.type === ObjectType.SLEEPING_DOG) return SHADOW_DEBRIS_GEO;
    return SHADOW_DEFAULT_GEO;
  }, [data.type]);

  return (
    <group ref={groupRef} position={[data.position[0], 0, data.position[2]]}>
      {data.type !== ObjectType.SHOP_PORTAL && shadowGeo && (
        <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} geometry={shadowGeo}>
          <meshBasicMaterial color="#000000" opacity={0.35} transparent depthWrite={false} />
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

        {/* --- OBSTACLE: INDIAN YELLOW-GREEN AUTO-RICKSHAW (TUK-TUK) --- */}
        {data.type === ObjectType.OBSTACLE && (
          <group position={[0, -OBSTACLE_HEIGHT / 2, 0]}>
            {/* Green Lower Cabin Body */}
            <mesh castShadow receiveShadow position={[0, 0.56, 0]} geometry={AUTO_LOWER_BODY_GEO} material={ENTITY_MATS.autoGreen} />
            {/* Front Steering Nose Cone */}
            <mesh castShadow position={[0, 0.52, 1.05]} rotation={[Math.PI / 2, 0, 0]} geometry={AUTO_NOSE_GEO} material={ENTITY_MATS.autoGreen} />
            {/* Yellow Canopy Frame */}
            <mesh castShadow position={[0, 1.22, -0.05]} geometry={AUTO_CANOPY_GEO} material={ENTITY_MATS.autoYellow} />
            {/* Rounded Yellow Canvas Roof Top */}
            <mesh castShadow position={[0, 1.54, -0.05]} rotation={[0, Math.PI / 2, 0]} geometry={AUTO_ROOF_TOP_GEO} material={ENTITY_MATS.autoYellow} />
            {/* Front Windshield Glass */}
            <mesh position={[0, 1.18, 0.84]} geometry={AUTO_WINDSHIELD_GEO} material={ENTITY_MATS.autoGlass} />
            {/* Iconic Single Central Headlight */}
            <mesh position={[0, 0.65, 1.38]} geometry={AUTO_HEADLIGHT_GEO} material={ENTITY_MATS.headlight} />
            {/* 3 Wheels (1 Front, 2 Rear) */}
            <mesh position={[0, 0.26, 1.15]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[-0.68, 0.26, -0.65]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
            <mesh position={[0.68, 0.26, -0.65]} rotation={[0, 0, Math.PI / 2]} geometry={AUTO_WHEEL_GEO} material={ENTITY_MATS.tireBlack} />
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

