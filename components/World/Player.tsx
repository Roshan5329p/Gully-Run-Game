/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, CHARACTER_PROFILES } from '../../store';
import { LANE_WIDTH, GameStatus, SLIDE_DURATION, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';
import { applyWorldCurve } from './worldCurveShader';

// Physics Constants (tuned for generous hang-time & obstacle jump clearance window)
const GRAVITY = 36;
const JUMP_FORCE = 15.4; // Higher arc + longer hang time (~0.92s total airtime with apex float)
const JUMP_BUFFER_WINDOW = 0.18; // ~11 frames of pre-landing jump input buffering at 60fps

// Composite 10-Part Geometries for Gully Kid Player
const HOODIE_TORSO_GEO = new THREE.CylinderGeometry(0.24, 0.21, 0.62, 10);
const BACKPACK_GEO = new THREE.BoxGeometry(0.32, 0.42, 0.18);
const BACKPACK_POCKET_GEO = new THREE.BoxGeometry(0.24, 0.2, 0.08);
const HEAD_GEO = new THREE.SphereGeometry(0.21, 16, 16);
const HAIR_TOP_GEO = new THREE.SphereGeometry(0.225, 12, 12);
const HAIR_SPIKE_GEO = new THREE.ConeGeometry(0.08, 0.18, 6);
const ARM_GEO = new THREE.CylinderGeometry(0.075, 0.066, 0.28, 8);
const FOREARM_GEO = new THREE.CylinderGeometry(0.064, 0.052, 0.28, 8);
const HAND_GEO = new THREE.SphereGeometry(0.068, 10, 10);
const HIPS_GEO = new THREE.CylinderGeometry(0.2, 0.19, 0.2, 10);
const LEG_GEO = new THREE.CylinderGeometry(0.095, 0.082, 0.34, 8);
const SHIN_GEO = new THREE.CylinderGeometry(0.08, 0.065, 0.34, 8);
const SNEAKER_GEO = new THREE.BoxGeometry(0.15, 0.1, 0.28);
const SHADOW_GEO = new THREE.CircleGeometry(0.58, 32);

// Hand-held Cutting Chai Glass Geometries (for Quick Sip Animation)
const HAND_CHAI_GLASS_GEO = new THREE.CylinderGeometry(0.075, 0.052, 0.18, 10);
const HAND_CHAI_LIQUID_GEO = new THREE.CylinderGeometry(0.068, 0.048, 0.13, 10);
const HAND_CHAI_FOAM_GEO = new THREE.TorusGeometry(0.064, 0.014, 8, 12);
const COIN_AURA_RING_GEO = new THREE.TorusGeometry(0.45, 0.032, 8, 24);
const SHIELD_TORUS_GEO = new THREE.TorusGeometry(0.72, 0.045, 16, 36);
const SHIELD_AURA_GEO = new THREE.SphereGeometry(0.85, 20, 16);
const DIZZY_STAR_GEO = new THREE.OctahedronGeometry(0.08, 0);

// Trailing Steam Puff & Footstep Bazaar Dust Geometries (Cut by 50% for optimal performance & visual clarity)
const STEAM_PUFF_GEO = new THREE.DodecahedronGeometry(0.22, 1);
const STEAM_POOL_SIZE = 24;
const SIP_DURATION = 4.0; // Duration of the 4.0s Cutting Chai rush & hand-held cup steam trail

const DUST_PUFF_GEO = new THREE.DodecahedronGeometry(0.15, 0);
const DUST_POOL_SIZE = 28;
const DUST_RING_GEO = new THREE.RingGeometry(0.18, 0.34, 16);
const DUST_RING_POOL_SIZE = 12;

interface DustRingParticle {
  active: boolean;
  age: number;
  maxLife: number;
  pos: THREE.Vector3;
  startScale: number;
  endScale: number;
  maxOpacity: number;
}

interface SteamParticle {
  active: boolean;
  age: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  startScale: number;
  endScale: number;
  seed: number;
  isGoldenWisp: boolean;
}

interface FootDustParticle {
  active: boolean;
  age: number;
  maxLife: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  startScale: number;
  endScale: number;
  seed: number;
}

export const Player: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const squashGroupRef = useRef<THREE.Group>(null);
  const squashScaleRef = useRef(new THREE.Vector3(1, 1, 1));
  const bodyRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  
  // Limb & Joint Refs for Articulated Kinematics
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const backpackRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const handChaiCupRef = useRef<THREE.Group>(null);
  const dizzyHaloRef = useRef<THREE.Group>(null);
  const coinRingRef = useRef<THREE.Mesh>(null);
  const shieldRingRef = useRef<THREE.Mesh>(null);

  // Steam & Footstep Dust Particle Refs & State Pools
  const steamMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dustMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dustRingMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sipTimer = useRef(0);
  const slideTimer = useRef(0);
  const hitRecoilTimer = useRef(0);
  const coinRingTimer = useRef(0);
  const steamSpawnAccumulator = useRef(0);
  const nextSteamIdx = useRef(0);
  const dustSpawnAccumulator = useRef(0);
  const nextDustIdx = useRef(0);
  const nextDustRingIdx = useRef(0);
  const prevLaneRef = useRef(0);
  const prevStrideSignRef = useRef(1);

  const steamParticles = useMemo<SteamParticle[]>(() => {
    return Array.from({ length: STEAM_POOL_SIZE }, (_, i) => ({
      active: false,
      age: 0,
      maxLife: 0.85,
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(),
      startScale: 0.18,
      endScale: 0.78,
      seed: i * 1.37,
      isGoldenWisp: i % 3 === 0,
    }));
  }, []);

  const steamMaterials = useMemo(() => {
    return Array.from({ length: STEAM_POOL_SIZE }, (_, i) => {
      const isGold = i % 3 === 0;
      const isSpice = i % 5 === 0;
      return applyWorldCurve(
        new THREE.MeshStandardMaterial({
          color: isSpice ? '#fed7aa' : isGold ? '#fef08a' : '#fffbeb',
          emissive: isSpice ? '#ea580c' : isGold ? '#f59e0b' : '#fde68a',
          emissiveIntensity: isSpice ? 0.75 : isGold ? 0.68 : 0.42,
          roughness: 0.88,
          metalness: 0.0,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
    });
  }, []);

  const dustParticles = useMemo<FootDustParticle[]>(() => {
    return Array.from({ length: DUST_POOL_SIZE }, (_, i) => ({
      active: false,
      age: 0,
      maxLife: 0.48,
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(),
      startScale: 0.14,
      endScale: 0.48,
      seed: i * 1.91,
    }));
  }, []);

  const dustMaterials = useMemo(() => {
    // Warm Indian bazaar street dust palette (sandstone ochre, terracotta clay, sunlit khaki)
    const palette = ['#d6b38e', '#c2956b', '#e5c49f', '#b48256'];
    return Array.from({ length: DUST_POOL_SIZE }, (_, i) => {
      const col = palette[i % palette.length];
      return applyWorldCurve(
        new THREE.MeshStandardMaterial({
          color: col,
          emissive: '#78350f',
          emissiveIntensity: 0.14,
          roughness: 0.95,
          metalness: 0.0,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
    });
  }, []);

  const dustRings = useMemo<DustRingParticle[]>(() => {
    return Array.from({ length: DUST_RING_POOL_SIZE }, () => ({
      active: false,
      age: 0,
      maxLife: 0.32,
      pos: new THREE.Vector3(0, -100, 0),
      startScale: 0.42,
      endScale: 1.55,
      maxOpacity: 0.22,
    }));
  }, []);

  const dustRingMaterials = useMemo(() => {
    return Array.from({ length: DUST_RING_POOL_SIZE }, () =>
      applyWorldCurve(
        new THREE.MeshBasicMaterial({
          color: '#e7d5b8',
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
    );
  }, []);

  const spawnDustRing = (x: number, y: number, z: number, endScale = 1.55, maxOpacity = 0.22) => {
    const idx = nextDustRingIdx.current;
    nextDustRingIdx.current = (nextDustRingIdx.current + 1) % DUST_RING_POOL_SIZE;
    const ring = dustRings[idx];
    ring.active = true;
    ring.age = 0;
    ring.maxLife = 0.26 + Math.random() * 0.08;
    ring.pos.set(x, y, z);
    ring.startScale = 0.42;
    ring.endScale = endScale;
    ring.maxOpacity = maxOpacity;
  };

  const {
    status,
    laneCount,
    takeDamage,
    hasDoubleJump,
    activateImmortality,
    isImmortalityActive,
    isChaiBoostActive,
    selectedCharacter,
    hasShield,
    togglePause,
  } = useStore();
  const prevStatus = useRef(status);
  
  const [lane, setLane] = React.useState(0);
  const targetX = useRef(0);
  
  // Physics State (using Refs for immediate logic updates)
  const isJumping = useRef(false);
  const velocityY = useRef(0);
  const jumpsPerformed = useRef(0); 
  const spinRotation = useRef(0); // For double jump flip
  const jumpBufferTimer = useRef(0); // Buffers early jump presses just before landing

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const isInvincible = useRef(false);
  const lastDamageTime = useRef(0);

  // Memoized PBR Materials with distinct roughness/metalness contrast
  const {
    hoodieMaterial,
    jeansMaterial,
    backpackMaterial,
    pocketMaterial,
    skinMaterial,
    hairMaterial,
    sneakerMaterial,
    shadowMaterial,
    chaiGlassMaterial,
    chaiLiquidMaterial,
    chaiFoamMaterial,
    dizzyStarMaterial,
    coinRingMaterial,
    shieldTorusMaterial,
    shieldAuraMaterial,
  } = useMemo(() => {
      const charProfile =
        CHARACTER_PROFILES.find((c) => c.id === selectedCharacter) || CHARACTER_PROFILES[0];
      const hoodieColor = isImmortalityActive
        ? '#ffb300'
        : isChaiBoostActive
        ? '#d97706'
        : charProfile.shirtHex;
      const sneakerColor = isImmortalityActive
        ? '#ffffff'
        : isChaiBoostActive
        ? '#fbbf24'
        : charProfile.shoeAccentHex;
      
      const rimOpts = {
          fresnelRim: true,
          rimColor: isChaiBoostActive ? '#fef08a' : '#fed7aa',
          rimPower: 2.4,
          rimStrength: isChaiBoostActive ? 0.52 : 0.38,
      };

      return {
          hoodieMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({
              color: hoodieColor,
              roughness: isImmortalityActive || isChaiBoostActive ? 0.28 : 0.75,
              metalness: isImmortalityActive ? 0.8 : isChaiBoostActive ? 0.45 : 0.1,
              emissive: isImmortalityActive ? '#ff8f00' : isChaiBoostActive ? '#f59e0b' : '#000000',
              emissiveIntensity: isImmortalityActive ? 0.5 : isChaiBoostActive ? 0.42 : 0
          }), rimOpts),
          jeansMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({ color: charProfile.jeansHex, roughness: 0.85, metalness: 0.05 }), rimOpts),
          backpackMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({ color: charProfile.vestHex, roughness: 0.6, metalness: 0.2 }), rimOpts),
          pocketMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({ color: charProfile.headbandHex, roughness: 0.4, metalness: 0.3 }), rimOpts),
          skinMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#d2905c', roughness: 0.6, metalness: 0.05 }), rimOpts),
          hairMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#181311', roughness: 0.8, metalness: 0.1 }), rimOpts),
          sneakerMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({
              color: sneakerColor,
              roughness: 0.35,
              metalness: 0.25,
              emissive: isChaiBoostActive ? '#f59e0b' : '#000000',
              emissiveIntensity: isChaiBoostActive ? 0.35 : 0,
          }), rimOpts),
          shadowMaterial: applyWorldCurve(new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0.35, transparent: true, depthWrite: false })),
          chaiGlassMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({
              color: '#e0f2fe',
              roughness: 0.15,
              metalness: 0.1,
              transparent: true,
              opacity: 0.55,
          })),
          chaiLiquidMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({
              color: '#b45309',
              emissive: '#f59e0b',
              emissiveIntensity: 0.55,
              roughness: 0.3,
              metalness: 0.05,
          })),
          chaiFoamMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({
              color: '#fef3c7',
              emissive: '#fde68a',
              emissiveIntensity: 0.35,
              roughness: 0.7,
          })),
          dizzyStarMaterial: applyWorldCurve(new THREE.MeshBasicMaterial({
              color: '#fde047',
          })),
          coinRingMaterial: applyWorldCurve(new THREE.MeshBasicMaterial({
              color: '#ffd700',
              transparent: true,
              opacity: 0,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
          })),
          shieldTorusMaterial: applyWorldCurve(new THREE.MeshStandardMaterial({
              color: '#38bdf8',
              emissive: '#06b6d4',
              emissiveIntensity: 0.9,
              roughness: 0.2,
              metalness: 0.8,
          })),
          shieldAuraMaterial: applyWorldCurve(new THREE.MeshBasicMaterial({
              color: '#06b6d4',
              wireframe: false,
              transparent: true,
              opacity: 0.22,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
          })),
      };
  }, [isImmortalityActive, isChaiBoostActive, selectedCharacter]);

  // --- Reset State on Game Start (except when resuming from pause) ---
  useEffect(() => {
      if (status === GameStatus.PLAYING && prevStatus.current !== GameStatus.PAUSED) {
          isJumping.current = false;
          jumpsPerformed.current = 0;
          velocityY.current = 0;
          spinRotation.current = 0;
          sipTimer.current = 0;
          slideTimer.current = 0;
          hitRecoilTimer.current = 0;
          coinRingTimer.current = 0;
          steamSpawnAccumulator.current = 0;
          dustSpawnAccumulator.current = 0;
          prevLaneRef.current = 0;
          squashScaleRef.current.set(1, 1, 1);
          steamParticles.forEach((p, idx) => {
              p.active = false;
              const mesh = steamMeshRefs.current[idx];
              if (mesh) mesh.visible = false;
          });
          dustParticles.forEach((p, idx) => {
              p.active = false;
              const mesh = dustMeshRefs.current[idx];
              if (mesh) mesh.visible = false;
          });
          dustRings.forEach((r, idx) => {
              r.active = false;
              const mesh = dustRingMeshRefs.current[idx];
              if (mesh) mesh.visible = false;
          });
          if (groupRef.current) {
              groupRef.current.position.y = 0;
              groupRef.current.rotation.z = 0;
              groupRef.current.userData.isSliding = false;
          }
          if (squashGroupRef.current) squashGroupRef.current.scale.set(1, 1, 1);
          if (bodyRef.current) bodyRef.current.rotation.x = 0;
      }
      prevStatus.current = status;
  }, [status, steamParticles, dustParticles, dustRings]);

  // --- Trigger High-Energy Sip Animation on Cutting Chai Pickup & Coin Collection Ring ---
  useEffect(() => {
      const handleChaiBoost = () => {
          sipTimer.current = SIP_DURATION;
          if (groupRef.current) {
              const px = groupRef.current.position.x;
              const py = groupRef.current.position.y;
              for (let i = 0; i < 10; i++) {
                  const idx = nextSteamIdx.current;
                  nextSteamIdx.current = (nextSteamIdx.current + 1) % STEAM_POOL_SIZE;
                  const p = steamParticles[idx];
                  p.active = true;
                  p.age = 0;
                  p.maxLife = 0.6 + Math.random() * 0.35;
                  p.pos.set(
                      px + (Math.random() - 0.5) * 0.55,
                      py + 1.25 + Math.random() * 0.45,
                      0.05 + Math.random() * 0.3
                  );
                  p.vel.set(
                      (Math.random() - 0.5) * 1.6,
                      2.3 + Math.random() * 1.5,
                      6.5 + Math.random() * 3.5
                  );
                  p.startScale = 0.22 + Math.random() * 0.1;
                  p.endScale = 0.78 + Math.random() * 0.28;
              }
          }
      };

      const handleCoinCollected = () => {
          coinRingTimer.current = 0.38;
      };

      window.addEventListener('chai-boost', handleChaiBoost);
      window.addEventListener('coin-collected', handleCoinCollected);
      return () => {
          window.removeEventListener('chai-boost', handleChaiBoost);
          window.removeEventListener('coin-collected', handleCoinCollected);
      };
  }, [steamParticles]);
  
  // Safety: Clamp lane if laneCount changes (e.g. restart)
  useEffect(() => {
      const maxLane = Math.floor(laneCount / 2);
      if (Math.abs(lane) > maxLane) {
          setLane(l => Math.max(Math.min(l, maxLane), -maxLane));
      }
  }, [laneCount, lane]);

  // --- Controls (Keyboard & Touch) ---
  const triggerJump = () => {
    const maxJumps = hasDoubleJump ? 2 : 1;

    // Cancel active slide when jumping
    slideTimer.current = 0;
    if (groupRef.current) {
        groupRef.current.userData.isSliding = false;
    }

    if (!isJumping.current) {
        audio.playJump(false);
        isJumping.current = true;
        jumpsPerformed.current = 1;
        velocityY.current = JUMP_FORCE;
        jumpBufferTimer.current = 0;
        squashScaleRef.current.set(0.88, 1.16, 0.88);
    } else if (jumpsPerformed.current < maxJumps) {
        audio.playJump(true);
        jumpsPerformed.current += 1;
        velocityY.current = JUMP_FORCE;
        spinRotation.current = 0;
        jumpBufferTimer.current = 0;
        squashScaleRef.current.set(0.88, 1.16, 0.88);
    } else {
        // Buffer jump input if pressed slightly early while descending toward the ground
        jumpBufferTimer.current = JUMP_BUFFER_WINDOW;
    }
  };

  const triggerSlide = () => {
    // Mid-air fast-fall: immediately plunge downward into a rapid slide landing when pressing Down during a jump
    if (isJumping.current) {
        audio.playFastFall();
        velocityY.current = -34;
    } else {
        audio.playSlide();
        squashScaleRef.current.set(1.12, 0.86, 1.12);
        if (groupRef.current) {
            spawnDustRing(groupRef.current.position.x, 0.045, 0.12, 1.48, 0.22);
        }
    }
    slideTimer.current = SLIDE_DURATION;
    if (groupRef.current) {
        groupRef.current.userData.isSliding = true;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      audio.unlock();
      const targetEl = e.target as HTMLElement | null;
      if (
        targetEl &&
        (targetEl.tagName === 'INPUT' ||
          targetEl.tagName === 'TEXTAREA' ||
          targetEl.tagName === 'SELECT' ||
          targetEl.closest('[data-ui-modal="true"]'))
      ) {
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (status === GameStatus.PLAYING || status === GameStatus.PAUSED) {
          togglePause();
          return;
        }
      }

      if (status !== GameStatus.PLAYING) return;
      const maxLane = Math.floor(laneCount / 2);

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setLane(l => Math.max(l - 1, -maxLane));
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setLane(l => Math.min(l + 1, maxLane));
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') triggerJump();
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') triggerSlide();
      else if (e.key === ' ' || e.key === 'Enter') {
          activateImmortality();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, laneCount, hasDoubleJump, activateImmortality, togglePause]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      audio.unlock();
      const targetEl = e.target as HTMLElement | null;
      if (targetEl && (targetEl.closest('button') || targetEl.closest('[data-ui-modal="true"]'))) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (status !== GameStatus.PLAYING) return;
        const targetEl = e.target as HTMLElement | null;
        if (targetEl && (targetEl.closest('button') || targetEl.closest('[data-ui-modal="true"]'))) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        const maxLane = Math.floor(laneCount / 2);

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
             if (deltaX > 0) setLane(l => Math.min(l + 1, maxLane));
             else setLane(l => Math.max(l - 1, -maxLane));
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -30) {
            triggerJump();
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 30) {
            triggerSlide();
        } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            activateImmortality();
        }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  // --- Animation Loop ---
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const safeDelta = Math.min(delta, 0.05);

    if (status === GameStatus.INTRO) {
        const introT = (window as any).__gullyIntroTime || 0;
        groupRef.current.position.set(0, 0, 0);
        groupRef.current.rotation.set(0, 0, 0);

        if (introT < 1.85) {
            // Phase 1: Gully Cricket Batting Stance & Sixer Follow-Through!
            if (bodyRef.current) {
                bodyRef.current.position.y = 1.1;
                bodyRef.current.rotation.y = THREE.MathUtils.damp(bodyRef.current.rotation.y, -0.45, 10, safeDelta);
                bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, -0.08, 10, safeDelta);
            }
            const swingDone = introT > 0.78;
            if (rightArmRef.current) {
                rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, swingDone ? 2.15 : 0.85, 16, safeDelta);
                rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, swingDone ? -0.35 : -0.2, 16, safeDelta);
            }
            if (leftArmRef.current) {
                leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, swingDone ? 1.85 : 0.75, 16, safeDelta);
            }
            if (headRef.current) {
                // Watch the ball soar toward Sharma Uncle's window!
                headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, swingDone ? -0.55 : 0.15, 12, safeDelta);
                headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, swingDone ? 0.35 : 0, 12, safeDelta);
            }
        } else if (introT < 2.95) {
            // Phase 2: Window Shatters! Hands on head in cartoon shock ("Oh no, Uncle's window!")
            if (bodyRef.current) {
                bodyRef.current.position.y = 1.14 + Math.abs(Math.sin(introT * 18)) * 0.08;
                bodyRef.current.rotation.y = THREE.MathUtils.damp(bodyRef.current.rotation.y, -0.65, 12, safeDelta);
            }
            if (leftArmRef.current) {
                leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, 2.55, 18, safeDelta);
                leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0.38, 18, safeDelta);
            }
            if (rightArmRef.current) {
                rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, 2.55, 18, safeDelta);
                rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -0.38, 18, safeDelta);
            }
            if (headRef.current) {
                headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, -0.35, 12, safeDelta);
                headRef.current.rotation.x = Math.sin(introT * 24) * 0.12;
            }
        } else {
            // Phase 3: Uncle Storms Out! Kid turns straight ahead and scrambles into a high-tempo sprint!
            const scrambleTime = state.clock.elapsedTime * 34;
            if (bodyRef.current) {
                bodyRef.current.position.y = 1.1 + Math.abs(Math.sin(scrambleTime)) * 0.12;
                bodyRef.current.rotation.y = THREE.MathUtils.damp(bodyRef.current.rotation.y, 0, 14, safeDelta);
                bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, -0.14, 14, safeDelta);
            }
            if (leftArmRef.current) {
                leftArmRef.current.rotation.x = Math.sin(scrambleTime) * 1.05;
                leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0, 14, safeDelta);
            }
            if (rightArmRef.current) {
                rightArmRef.current.rotation.x = Math.sin(scrambleTime + Math.PI) * 1.05;
                rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, 0, 14, safeDelta);
            }
            if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(scrambleTime + Math.PI) * 1.15;
            if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(scrambleTime) * 1.15;
            if (headRef.current) {
                headRef.current.rotation.y = 0.65; // Looking back in panic at Uncle!
                headRef.current.rotation.x = 0;
            }
        }
        return;
    }

    if (status !== GameStatus.PLAYING && status !== GameStatus.SHOP) return;

    // 1. Horizontal Position with exponential damping
    targetX.current = lane * LANE_WIDTH;
    groupRef.current.position.x = THREE.MathUtils.damp(
        groupRef.current.position.x, 
        targetX.current, 
        15,
        safeDelta
    );

    const xDiff = targetX.current - groupRef.current.position.x;

    // Emit compact ground dust ring on sharp grounded lane cuts
    if (lane !== prevLaneRef.current) {
        prevLaneRef.current = lane;
        if (!isJumping.current && status === GameStatus.PLAYING) {
            spawnDustRing(groupRef.current.position.x, 0.045, 0.1, 1.34, 0.2);
        }
    }

    // Spring-based squash-and-stretch recovery back to neutral (1, 1, 1)
    if (squashGroupRef.current) {
        squashScaleRef.current.x = THREE.MathUtils.damp(squashScaleRef.current.x, 1, 14, safeDelta);
        squashScaleRef.current.y = THREE.MathUtils.damp(squashScaleRef.current.y, 1, 14, safeDelta);
        squashScaleRef.current.z = THREE.MathUtils.damp(squashScaleRef.current.z, 1, 14, safeDelta);
        squashGroupRef.current.scale.copy(squashScaleRef.current);
    }

    // Expressive torso yaw twist into lane changes
    if (bodyRef.current) {
        bodyRef.current.rotation.y = THREE.MathUtils.damp(
            bodyRef.current.rotation.y,
            -xDiff * 0.18,
            14,
            safeDelta
        );
    }

    // 2. Physics (Jump, Apex Hang-Time & Slide Timer)
    if (slideTimer.current > 0) {
        slideTimer.current = Math.max(0, slideTimer.current - safeDelta);
    }
    if (jumpBufferTimer.current > 0) {
        jumpBufferTimer.current = Math.max(0, jumpBufferTimer.current - safeDelta);
    }
    if (hitRecoilTimer.current > 0) {
        hitRecoilTimer.current = Math.max(0, hitRecoilTimer.current - safeDelta);
    }
    if (coinRingTimer.current > 0) {
        coinRingTimer.current = Math.max(0, coinRingTimer.current - safeDelta);
    }
    const isSliding = slideTimer.current > 0;
    const isHitRecoiling = hitRecoilTimer.current > 0;
    groupRef.current.userData.isSliding = isSliding;

    // Update spinning golden dizzy stars halo above head during collision recovery
    if (dizzyHaloRef.current) {
        const showDizzy = isInvincible.current && !isImmortalityActive;
        dizzyHaloRef.current.visible = showDizzy;
        if (showDizzy) {
            dizzyHaloRef.current.rotation.y = state.clock.elapsedTime * 5.5;
        }
    }

    // Update expanding golden sparkle ring around player on coin collection
    if (coinRingRef.current) {
        if (coinRingTimer.current > 0) {
            coinRingRef.current.visible = true;
            const progress = 1 - coinRingTimer.current / 0.38;
            const ringScale = 0.65 + progress * 1.45;
            coinRingRef.current.scale.setScalar(ringScale);
            coinRingMaterial.opacity = (1 - progress) * 0.85;
        } else {
            coinRingRef.current.visible = false;
        }
    }

    // Smoothly spin waist-level glowing shield torus
    if (shieldRingRef.current && hasShield) {
        shieldRingRef.current.rotation.z += safeDelta * 2.8;
    }

    if (isJumping.current) {
        groupRef.current.position.y += velocityY.current * safeDelta;
        // Apex hang-time float: reduce gravity by 38% near the top of the jump arc
        // so the player stays elevated longer and has a wider frame window to clear obstacles
        const isNearApex = Math.abs(velocityY.current) < 5.5 && groupRef.current.position.y > 1.2;
        const effectiveGravity = isNearApex ? GRAVITY * 0.62 : GRAVITY;
        velocityY.current -= effectiveGravity * safeDelta;

        if (groupRef.current.position.y <= 0) {
            const impactVel = Math.abs(velocityY.current);
            groupRef.current.position.y = 0;
            isJumping.current = false;
            jumpsPerformed.current = 0;
            velocityY.current = 0;
            if (bodyRef.current && !isSliding) bodyRef.current.rotation.x = 0;
            squashScaleRef.current.set(1.16, 0.82, 1.16);
            audio.playLandingThump();
            if (typeof window !== 'undefined' && impactVel > 6) {
                window.dispatchEvent(new CustomEvent('player-landed', { detail: { impactVel } }));
            }

            // Emit compact footstep landing dust ring + radial touchdown puffs
            const px = groupRef.current.position.x;
            spawnDustRing(
                px,
                0.045,
                0.06,
                impactVel > 16 ? 1.95 : 1.56,
                impactVel > 16 ? 0.3 : 0.24
            );
            for (let i = 0; i < 8; i++) {
                const idx = nextDustIdx.current;
                nextDustIdx.current = (nextDustIdx.current + 1) % DUST_POOL_SIZE;
                const dp = dustParticles[idx];
                const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
                dp.active = true;
                dp.age = 0;
                dp.maxLife = 0.36 + Math.random() * 0.16;
                dp.pos.set(
                    px + Math.cos(angle) * 0.22,
                    0.06 + Math.random() * 0.05,
                    0.08 + Math.sin(angle) * 0.18
                );
                dp.vel.set(
                    Math.cos(angle) * (1.2 + Math.random() * 0.8),
                    0.65 + Math.random() * 0.55,
                    3.5 + Math.random() * 2.5
                );
                dp.startScale = 0.16 + Math.random() * 0.06;
                dp.endScale = 0.48 + Math.random() * 0.18;
            }

            // Execute buffered jump immediately on landing if the player pressed jump a few frames early!
            if (jumpBufferTimer.current > 0) {
                jumpBufferTimer.current = 0;
                triggerJump();
            }
        }

        // Double Jump Flip
        if (jumpsPerformed.current === 2 && bodyRef.current && !isSliding) {
             spinRotation.current -= safeDelta * 15;
             if (spinRotation.current < -Math.PI * 2) spinRotation.current = -Math.PI * 2;
             bodyRef.current.rotation.x = spinRotation.current;
        }
    }

    // Banking (smooth ±0.22 rad lane lean) & Collision Recoil Rotation
    const leanTargetZ = THREE.MathUtils.clamp(xDiff / Math.max(1, LANE_WIDTH), -1, 1) * -0.22;
    groupRef.current.rotation.z = THREE.MathUtils.damp(groupRef.current.rotation.z, leanTargetZ, 14, safeDelta);
    groupRef.current.rotation.x = isHitRecoiling
        ? -0.32 * (hitRecoilTimer.current / 0.48)
        : isJumping.current
        ? 0.14
        : isSliding
        ? 0
        : 0.08;

    // 3. Skeletal & Stumble / Slide / Hit Recoil / Quick Chai Sip / Chai Boost Animation
    const { isStumbling, isChaiBoostActive: chaiActiveNow, speed } = useStore.getState();
    const time = state.clock.elapsedTime * (chaiActiveNow ? 35 : 26);

    if (sipTimer.current > 0) {
        sipTimer.current = Math.max(0, sipTimer.current - safeDelta);
    }
    const isSipping = sipTimer.current > 0;

    // Show/hide and scale the 3D Cutting Chai glass in the player's right hand during the sip!
    if (handChaiCupRef.current) {
        if (isSipping) {
            handChaiCupRef.current.visible = true;
            const sipProgress = 1 - sipTimer.current / SIP_DURATION;
            const cupScale =
                sipProgress < 0.08
                    ? THREE.MathUtils.smoothstep(sipProgress, 0, 0.08)
                    : sipProgress > 0.92
                    ? 1 - THREE.MathUtils.smoothstep(sipProgress, 0.92, 1.0)
                    : 1.0;
            handChaiCupRef.current.scale.setScalar(Math.max(0.01, cupScale));
        } else {
            handChaiCupRef.current.visible = false;
        }
    }
    
    if (!isJumping.current) {
        if (isHitRecoiling) {
            // Dramatic Collision Knockback Recoil Pose when hitting an obstacle!
            const recoilRatio = hitRecoilTimer.current / 0.48;
            if (bodyRef.current) {
                bodyRef.current.position.y = 1.04 + Math.sin(recoilRatio * Math.PI) * 0.14;
                bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, -0.52, 22, safeDelta);
                bodyRef.current.rotation.z = Math.sin(time * 2.2) * 0.18;
            }
            if (leftArmRef.current) {
                leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, 1.45, 22, safeDelta);
                leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0.55, 22, safeDelta);
            }
            if (rightArmRef.current) {
                rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, 1.45, 22, safeDelta);
                rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -0.55, 22, safeDelta);
            }
            if (leftLegRef.current) leftLegRef.current.rotation.x = -0.35;
            if (rightLegRef.current) rightLegRef.current.rotation.x = 0.45;
            if (leftKneeRef.current) leftKneeRef.current.rotation.x = -0.35;
            if (rightKneeRef.current) rightKneeRef.current.rotation.x = -0.55;
            if (leftElbowRef.current) leftElbowRef.current.rotation.x = 0.45;
            if (rightElbowRef.current) rightElbowRef.current.rotation.x = 0.45;
            if (headRef.current) {
                headRef.current.rotation.x = 0.38;
                headRef.current.rotation.y = Math.sin(time * 2.5) * 0.35;
            }
        } else if (isSliding) {
            // Feet-First Parkour Bazaar Slide Pose (ducks under Stray Cows & Overhead Veg Crate Racks!)
            if (bodyRef.current) {
                bodyRef.current.position.y = THREE.MathUtils.damp(bodyRef.current.position.y, 0.45, 22, safeDelta);
                bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, -1.08, 22, safeDelta);
                bodyRef.current.rotation.y = THREE.MathUtils.damp(bodyRef.current.rotation.y, 0.15, 18, safeDelta);
                bodyRef.current.rotation.z = THREE.MathUtils.damp(bodyRef.current.rotation.z, 0.12, 16, safeDelta);
            }
            if (leftLegRef.current) {
                leftLegRef.current.rotation.x = THREE.MathUtils.damp(leftLegRef.current.rotation.x, 0.42, 20, safeDelta);
            }
            if (rightLegRef.current) {
                rightLegRef.current.rotation.x = THREE.MathUtils.damp(rightLegRef.current.rotation.x, -0.78, 20, safeDelta);
            }
            if (leftKneeRef.current) {
                leftKneeRef.current.rotation.x = THREE.MathUtils.damp(leftKneeRef.current.rotation.x, -0.15, 20, safeDelta);
            }
            if (rightKneeRef.current) {
                rightKneeRef.current.rotation.x = THREE.MathUtils.damp(rightKneeRef.current.rotation.x, -1.25, 20, safeDelta);
            }
            if (leftArmRef.current) {
                leftArmRef.current.rotation.x = THREE.MathUtils.damp(leftArmRef.current.rotation.x, 0.65, 20, safeDelta);
                leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0.35, 20, safeDelta);
            }
            if (leftElbowRef.current) {
                leftElbowRef.current.rotation.x = THREE.MathUtils.damp(leftElbowRef.current.rotation.x, 0.55, 20, safeDelta);
            }
            if (rightArmRef.current) {
                rightArmRef.current.rotation.x = THREE.MathUtils.damp(rightArmRef.current.rotation.x, isSipping ? 1.85 : 0.65, 20, safeDelta);
                rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, -0.35, 20, safeDelta);
                rightArmRef.current.rotation.y = 0;
            }
            if (rightElbowRef.current) {
                rightElbowRef.current.rotation.x = THREE.MathUtils.damp(rightElbowRef.current.rotation.x, isSipping ? 0.9 : 0.55, 20, safeDelta);
            }
            if (headRef.current) {
                headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, -0.68, 20, safeDelta);
                headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, 0, 20, safeDelta);
            }
        } else if (isStumbling) {
            // Stumbling on Bazaar Debris: pitch forward and flail arms to regain balance!
            if (leftArmRef.current) {
                leftArmRef.current.rotation.x = -1.6 + Math.sin(time * 1.8) * 0.9;
                leftArmRef.current.rotation.z = 0;
            }
            if (rightArmRef.current) {
                rightArmRef.current.rotation.x = -1.6 + Math.cos(time * 1.8) * 0.9;
                rightArmRef.current.rotation.z = 0;
                rightArmRef.current.rotation.y = 0;
            }
            if (leftElbowRef.current) leftElbowRef.current.rotation.x = 0.65;
            if (rightElbowRef.current) rightElbowRef.current.rotation.x = 0.65;
            if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(time * 0.7 + Math.PI) * 0.65;
            if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time * 0.7) * 0.65;
            if (leftKneeRef.current) leftKneeRef.current.rotation.x = -0.65;
            if (rightKneeRef.current) rightKneeRef.current.rotation.x = -0.65;
            if (bodyRef.current) {
                bodyRef.current.position.y = 0.96 + Math.abs(Math.sin(time * 1.5)) * 0.08;
                bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, 0.48, 12, safeDelta);
                bodyRef.current.rotation.y = Math.sin(time * 1.5) * 0.16;
                bodyRef.current.rotation.z = Math.sin(time * 1.5) * 0.14;
            }
            if (headRef.current) {
                headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, 0.2, 10, safeDelta);
            }
        } else {
            // High-tempo articulated leg stride (thigh + asymmetric knee bend) with lateral dodge flare
            const legAmplitude = chaiActiveNow ? 1.18 : 1.02;
            const lSwing = Math.sin(time + Math.PI);
            const rSwing = Math.sin(time);

            // Stride-locked procedural footstep audio at heel-strike zero-crossings
            const currentStrideSign = rSwing >= 0 ? 1 : -1;
            if (currentStrideSign !== prevStrideSignRef.current) {
                prevStrideSignRef.current = currentStrideSign;
                const { level: currentLvl } = useStore.getState();
                if (status === GameStatus.PLAYING && speed > 1) {
                    audio.playFootstep(currentLvl >= 3);
                }
            }

            if (leftLegRef.current) leftLegRef.current.rotation.x = lSwing * legAmplitude;
            if (rightLegRef.current) rightLegRef.current.rotation.x = rSwing * legAmplitude;

            // Asymmetric knee flexion: bends deep during rear push-off/recovery, extends cleanly before heel strike
            if (leftKneeRef.current) {
                leftKneeRef.current.rotation.x = -0.15 - Math.max(0, -Math.cos(time + Math.PI)) * 1.05;
            }
            if (rightKneeRef.current) {
                rightKneeRef.current.rotation.x = -0.15 - Math.max(0, -Math.cos(time)) * 1.05;
            }

            // Left arm counter-swings dynamically with natural elbow flexion + flares out on lane dodge
            if (leftArmRef.current) {
                leftArmRef.current.rotation.x = rSwing * (chaiActiveNow ? 0.98 : 0.78);
                leftArmRef.current.rotation.z = THREE.MathUtils.damp(
                    leftArmRef.current.rotation.z,
                    Math.max(0, -xDiff * 0.22),
                    14,
                    safeDelta
                );
            }
            if (leftElbowRef.current) {
                leftElbowRef.current.rotation.x = 0.65 + Math.max(0, rSwing) * 0.45;
            }

            if (isSipping) {
                // HIGH-ENERGY RUNNING SIP ANIMATION:
                const gulpOsc = Math.sin(sipTimer.current * 28) * 0.14;
                if (rightArmRef.current) {
                    rightArmRef.current.rotation.x = THREE.MathUtils.damp(
                        rightArmRef.current.rotation.x,
                        1.45 + gulpOsc,
                        22,
                        safeDelta
                    );
                    rightArmRef.current.rotation.z = THREE.MathUtils.damp(
                        rightArmRef.current.rotation.z,
                        -0.42,
                        22,
                        safeDelta
                    );
                    rightArmRef.current.rotation.y = THREE.MathUtils.damp(
                        rightArmRef.current.rotation.y,
                        -0.25,
                        22,
                        safeDelta
                    );
                }
                if (rightElbowRef.current) {
                    rightElbowRef.current.rotation.x = THREE.MathUtils.damp(rightElbowRef.current.rotation.x, 1.05, 22, safeDelta);
                }
                if (headRef.current) {
                    headRef.current.rotation.x = THREE.MathUtils.damp(
                        headRef.current.rotation.x,
                        0.46 + gulpOsc * 0.65,
                        20,
                        safeDelta
                    );
                    headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, 0, 20, safeDelta);
                }
                if (bodyRef.current) {
                    bodyRef.current.position.y = 1.15 + Math.abs(Math.sin(time)) * 0.13;
                    bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, -0.08, 14, safeDelta);
                    bodyRef.current.rotation.y = Math.sin(time) * 0.08;
                    bodyRef.current.rotation.z = THREE.MathUtils.damp(bodyRef.current.rotation.z, 0, 12, safeDelta);
                }
            } else {
                // Normal or Chai-Turbo Sprint Arm & Head Pose
                if (rightArmRef.current) {
                    rightArmRef.current.rotation.x = lSwing * (chaiActiveNow ? 0.98 : 0.78);
                    rightArmRef.current.rotation.z = THREE.MathUtils.damp(
                        rightArmRef.current.rotation.z,
                        Math.min(0, -xDiff * 0.22),
                        14,
                        safeDelta
                    );
                    rightArmRef.current.rotation.y = THREE.MathUtils.damp(rightArmRef.current.rotation.y, 0, 14, safeDelta);
                }
                if (rightElbowRef.current) {
                    rightElbowRef.current.rotation.x = 0.65 + Math.max(0, lSwing) * 0.45;
                }
                if (bodyRef.current) {
                    bodyRef.current.position.y = THREE.MathUtils.damp(
                        bodyRef.current.position.y,
                        1.1 + Math.abs(Math.sin(time)) * (chaiActiveNow ? 0.14 : 0.11),
                        18,
                        safeDelta
                    );
                    const targetLeanX = chaiActiveNow ? -0.14 : -0.04;
                    bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, targetLeanX, 12, safeDelta);
                    // Hip-shoulder counter-rotation opposing leg swing
                    bodyRef.current.rotation.y = Math.sin(time) * (chaiActiveNow ? 0.14 : 0.1);
                    bodyRef.current.rotation.z = THREE.MathUtils.damp(bodyRef.current.rotation.z, -xDiff * 0.08, 12, safeDelta);
                }
                if (headRef.current) {
                    headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, 0, 12, safeDelta);
                    const dodgeLookY = -xDiff * 0.25;
                    const glanceBackY = !chaiActiveNow && Math.abs(xDiff) < 0.2 && Math.sin(state.clock.elapsedTime * 2.2) > 0.78 ? 0.65 : dodgeLookY;
                    headRef.current.rotation.y = THREE.MathUtils.damp(headRef.current.rotation.y, glanceBackY, 14, safeDelta);
                }
            }
            // Secondary backpack vertical bounce & tilt lag
            if (backpackRef.current) {
                backpackRef.current.position.y = Math.sin(time * 2 - 0.8) * 0.028;
                backpackRef.current.rotation.x = -0.05 + Math.cos(time * 2 - 0.6) * 0.06;
            }
        }
    } else {
        const jumpPoseSpeed = safeDelta * 12;
        if (leftArmRef.current) {
            leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -2.15, jumpPoseSpeed);
            leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.28, jumpPoseSpeed);
        }
        if (leftElbowRef.current) {
            leftElbowRef.current.rotation.x = THREE.MathUtils.lerp(leftElbowRef.current.rotation.x, 0.45, jumpPoseSpeed);
        }
        if (rightArmRef.current) {
            if (isSipping) {
                const gulpOsc = Math.sin(sipTimer.current * 28) * 0.14;
                rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 1.45 + gulpOsc, jumpPoseSpeed * 2);
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.42, jumpPoseSpeed * 2);
            } else {
                rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -2.15, jumpPoseSpeed);
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.28, jumpPoseSpeed);
            }
        }
        if (rightElbowRef.current) {
            rightElbowRef.current.rotation.x = THREE.MathUtils.lerp(rightElbowRef.current.rotation.x, isSipping ? 1.05 : 0.45, jumpPoseSpeed);
        }
        if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0.72, jumpPoseSpeed);
        if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, -0.45, jumpPoseSpeed);
        if (leftKneeRef.current) leftKneeRef.current.rotation.x = THREE.MathUtils.lerp(leftKneeRef.current.rotation.x, -0.95, jumpPoseSpeed);
        if (rightKneeRef.current) rightKneeRef.current.rotation.x = THREE.MathUtils.lerp(rightKneeRef.current.rotation.x, -0.65, jumpPoseSpeed);

        if (backpackRef.current) {
            backpackRef.current.position.y = THREE.MathUtils.lerp(backpackRef.current.position.y, 0.05, jumpPoseSpeed);
            backpackRef.current.rotation.x = THREE.MathUtils.lerp(backpackRef.current.rotation.x, -0.18, jumpPoseSpeed);
        }
        if (bodyRef.current) {
            bodyRef.current.rotation.y = THREE.MathUtils.lerp(bodyRef.current.rotation.y, 0, jumpPoseSpeed);
            if (jumpsPerformed.current !== 2) bodyRef.current.position.y = 1.1;
        }
    }

    // 4. Billowing Masala 'Steam' Particle Trail from BOTH the Cup and Runner during Cutting Chai Rush
    if (chaiActiveNow || isSipping) {
        const spawnInterval = 0.022;
        steamSpawnAccumulator.current += safeDelta;

        while (steamSpawnAccumulator.current >= spawnInterval) {
            steamSpawnAccumulator.current -= spawnInterval;
            const idx = nextSteamIdx.current;
            nextSteamIdx.current = (nextSteamIdx.current + 1) % STEAM_POOL_SIZE;
            const p = steamParticles[idx];

            p.active = true;
            p.age = 0;
            p.maxLife = 0.62 + Math.random() * 0.35;

            const px = groupRef.current.position.x;
            const py = groupRef.current.position.y;
            const fromCup = idx % 2 === 0 && isSipping;

            if (fromCup) {
                p.pos.set(
                    px + 0.18 + (Math.random() - 0.5) * 0.26,
                    py + 1.52 + Math.random() * 0.24,
                    -0.02 + Math.random() * 0.18
                );
            } else {
                p.pos.set(
                    px + (Math.random() - 0.5) * 0.58,
                    py + 0.85 + Math.random() * 0.75,
                    0.22 + Math.random() * 0.24
                );
            }

            const trailSpeedZ = Math.max(5.8, speed * 0.3) + Math.random() * 2.8;
            p.vel.set(
                (Math.random() - 0.5) * 1.25,
                1.85 + Math.random() * 1.5,
                trailSpeedZ
            );
            p.startScale = p.isGoldenWisp ? 0.16 : 0.22 + Math.random() * 0.08;
            p.endScale = p.isGoldenWisp ? 0.48 : 0.72 + Math.random() * 0.28;
        }
    } else {
        steamSpawnAccumulator.current = 0;
    }

    // Update all active steam particles in world space
    const clockTime = state.clock.elapsedTime;
    for (let i = 0; i < STEAM_POOL_SIZE; i++) {
        const p = steamParticles[i];
        const mesh = steamMeshRefs.current[i];
        if (!mesh) continue;

        if (!p.active) {
            if (mesh.visible) mesh.visible = false;
            continue;
        }

        p.age += safeDelta;
        if (p.age >= p.maxLife) {
            p.active = false;
            mesh.visible = false;
            continue;
        }

        const lifeRatio = p.age / p.maxLife;
        mesh.visible = true;

        p.pos.x += (p.vel.x + Math.sin(clockTime * 6 + p.seed) * 0.75) * safeDelta;
        p.pos.y += p.vel.y * safeDelta;
        p.pos.z += p.vel.z * safeDelta;

        mesh.position.copy(p.pos);

        const currentScale = THREE.MathUtils.lerp(p.startScale, p.endScale, lifeRatio);
        mesh.scale.setScalar(currentScale);

        mesh.rotation.x += safeDelta * 1.8;
        mesh.rotation.y += safeDelta * 2.2;
        mesh.rotation.z += safeDelta * 1.5;

        const alpha =
            lifeRatio < 0.18
                ? (lifeRatio / 0.18) * 0.39
                : (1 - (lifeRatio - 0.18) / 0.82) * 0.39;
        steamMaterials[i].opacity = Math.max(0, alpha);
    }

    // 5. Dynamic Speed-Scaled Footstep Bazaar Dust Particle Emitter at the Player's Feet
    const speedRatio = Math.max(0.4, speed / RUN_SPEED_BASE);
    if (!isJumping.current && status === GameStatus.PLAYING && speed > 1) {
        const slideDensityBoost = isSliding ? 1.35 : 1.0;
        const targetEmissionRate = THREE.MathUtils.clamp(
            18 * Math.pow(speedRatio, 1.35) * slideDensityBoost,
            10,
            64
        );
        const dustInterval = 1 / targetEmissionRate;
        dustSpawnAccumulator.current += safeDelta;

        while (dustSpawnAccumulator.current >= dustInterval) {
            dustSpawnAccumulator.current -= dustInterval;
            const idx = nextDustIdx.current;
            nextDustIdx.current = (nextDustIdx.current + 1) % DUST_POOL_SIZE;
            const dp = dustParticles[idx];

            dp.active = true;
            dp.age = 0;
            dp.maxLife = 0.34 + Math.random() * 0.22;

            const px = groupRef.current.position.x;
            const footSide = idx % 2 === 0 ? -1 : 1;
            const lateralSpread = isSliding ? 0.24 : 0.13;

            dp.pos.set(
                px + footSide * lateralSpread + (Math.random() - 0.5) * 0.12,
                0.05 + Math.random() * 0.07,
                0.16 + Math.random() * 0.18
            );

            const kickBackZ = Math.max(4.5, speed * 0.32) + Math.random() * 2.2;
            const kickUpY = (0.55 + Math.random() * 0.65) * Math.min(1.6, 0.8 + speedRatio * 0.35);
            dp.vel.set(
                footSide * (0.25 + Math.random() * 0.45) + (Math.random() - 0.5) * 0.4,
                kickUpY,
                kickBackZ
            );

            const sizeBoost = Math.min(1.45, 0.85 + speedRatio * 0.25);
            dp.startScale = (0.11 + Math.random() * 0.05) * sizeBoost;
            dp.endScale = (0.34 + Math.random() * 0.18) * sizeBoost;
        }
    } else {
        dustSpawnAccumulator.current = 0;
    }

    // Update all active footstep dust particles in world space
    for (let i = 0; i < DUST_POOL_SIZE; i++) {
        const dp = dustParticles[i];
        const mesh = dustMeshRefs.current[i];
        if (!mesh) continue;

        if (!dp.active) {
            if (mesh.visible) mesh.visible = false;
            continue;
        }

        dp.age += safeDelta;
        if (dp.age >= dp.maxLife) {
            dp.active = false;
            mesh.visible = false;
            continue;
        }

        const lifeRatio = dp.age / dp.maxLife;
        mesh.visible = true;

        dp.pos.x += (dp.vel.x + Math.sin(clockTime * 8 + dp.seed) * 0.35) * safeDelta;
        dp.pos.y = Math.max(0.03, dp.pos.y + dp.vel.y * safeDelta);
        dp.pos.z += dp.vel.z * safeDelta;
        dp.vel.y -= 1.8 * safeDelta;

        mesh.position.copy(dp.pos);

        const currentScale = THREE.MathUtils.lerp(dp.startScale, dp.endScale, lifeRatio);
        mesh.scale.setScalar(currentScale);

        mesh.rotation.x += safeDelta * 2.6;
        mesh.rotation.y += safeDelta * 2.1;

        const maxOpacity = Math.min(0.34, 0.21 + speedRatio * 0.06);
        const alpha =
            lifeRatio < 0.2
                ? (lifeRatio / 0.2) * maxOpacity
                : (1 - (lifeRatio - 0.2) / 0.8) * maxOpacity;
        dustMaterials[i].opacity = Math.max(0, alpha);
    }

    // Update compact footstep dust rings under runner shoes
    for (let i = 0; i < DUST_RING_POOL_SIZE; i++) {
        const ring = dustRings[i];
        const mesh = dustRingMeshRefs.current[i];
        if (!mesh) continue;

        if (!ring.active) {
            if (mesh.visible) mesh.visible = false;
            continue;
        }

        ring.age += safeDelta;
        if (ring.age >= ring.maxLife) {
            ring.active = false;
            mesh.visible = false;
            continue;
        }

        const ratio = ring.age / ring.maxLife;
        mesh.visible = true;
        ring.pos.z += Math.max(4.5, speed * 0.28) * safeDelta;
        mesh.position.copy(ring.pos);
        mesh.scale.setScalar(THREE.MathUtils.lerp(ring.startScale, ring.endScale, ratio));
        dustRingMaterials[i].opacity = (1 - ratio) * ring.maxOpacity;
    }

    // 6. Dynamic Shadow
    if (shadowRef.current) {
        const height = groupRef.current.position.y;
        const scale = Math.max(0.2, 1 - (height / 2.5) * 0.5);
        const runStretch = isJumping.current ? 1 : 1 + Math.abs(Math.sin(time)) * 0.3;

        shadowRef.current.scale.set(scale, scale, scale * runStretch);
        const material = shadowRef.current.material as THREE.MeshBasicMaterial;
        if (material && !Array.isArray(material)) {
            material.opacity = Math.max(0.1, 0.35 - (height / 2.5) * 0.2);
        }
    }

    // Invincibility / Immortality Flicker
    const showFlicker = isInvincible.current || isImmortalityActive;
    if (showFlicker) {
        if (isInvincible.current) {
             if (Date.now() - lastDamageTime.current > 1500) {
                isInvincible.current = false;
                groupRef.current.visible = true;
             } else {
                groupRef.current.visible = Math.floor(Date.now() / 50) % 2 === 0;
             }
        } 
        if (isImmortalityActive) {
            groupRef.current.visible = true; 
        }
    } else {
        groupRef.current.visible = true;
    }
  });

  // Damage Handler with Collision Knockback Recoil
  useEffect(() => {
     const checkHit = () => {
        const { isChaiBoostActive: chaiInvincibleNow } = useStore.getState();
        if (isInvincible.current || isImmortalityActive || chaiInvincibleNow) return;
        audio.playDamage();
        takeDamage();
        isInvincible.current = true;
        lastDamageTime.current = Date.now();
        hitRecoilTimer.current = 0.48;
     };
     window.addEventListener('player-hit', checkHit);
     return () => window.removeEventListener('player-hit', checkHit);
  }, [takeDamage, isImmortalityActive]);

  return (
    <>
      <group ref={groupRef} position={[0, 0, 0]}>
        <group ref={squashGroupRef} position={[0, 0, 0]}>
          <group ref={bodyRef} position={[0, 1.15, 0]} scale={[1.18, 1.18, 1.18]}> 
          
          {/* Teal Hoodie Torso */}
          <mesh castShadow position={[0, 0.2, 0]} geometry={HOODIE_TORSO_GEO} material={hoodieMaterial} />

          {/* School / Gully Backpack with Secondary Spring Bounce */}
          <group ref={backpackRef}>
            <mesh castShadow position={[0, 0.22, 0.19]} geometry={BACKPACK_GEO} material={backpackMaterial} />
            <mesh position={[0, 0.14, 0.29]} geometry={BACKPACK_POCKET_GEO} material={pocketMaterial} />
          </group>

          {/* Head, Spiky Indian Boy Hair & Collision Dizzy Stars Halo */}
          <group ref={headRef} position={[0, 0.65, 0]}>
              <mesh castShadow geometry={HEAD_GEO} material={skinMaterial} />
              <mesh castShadow position={[0, 0.06, 0.02]} geometry={HAIR_TOP_GEO} material={hairMaterial} />
              <mesh position={[0, 0.26, -0.05]} rotation={[-0.3, 0, 0]} geometry={HAIR_SPIKE_GEO} material={hairMaterial} />
              <mesh position={[-0.1, 0.23, 0]} rotation={[0, 0, 0.4]} geometry={HAIR_SPIKE_GEO} material={hairMaterial} />
              <mesh position={[0.1, 0.23, 0]} rotation={[0, 0, -0.4]} geometry={HAIR_SPIKE_GEO} material={hairMaterial} />
              {/* Orbiting Golden Stars Halo when recovering from a Major Collision */}
              <group ref={dizzyHaloRef} position={[0, 0.36, 0]} visible={false}>
                  <mesh position={[0.28, 0, 0]} geometry={DIZZY_STAR_GEO} material={dizzyStarMaterial} />
                  <mesh position={[-0.14, 0, 0.24]} geometry={DIZZY_STAR_GEO} material={dizzyStarMaterial} />
                  <mesh position={[-0.14, 0, -0.24]} geometry={DIZZY_STAR_GEO} material={dizzyStarMaterial} />
              </group>
          </group>

          {/* Articulated 2-Segment Hoodie Arms & Hands */}
          <group position={[0.31, 0.4, 0]}>
              <group ref={rightArmRef}>
                  <mesh position={[0, -0.14, 0]} castShadow geometry={ARM_GEO} material={hoodieMaterial} />
                  <group ref={rightElbowRef} position={[0, -0.28, 0]}>
                      <mesh position={[0, -0.14, 0]} castShadow geometry={FOREARM_GEO} material={hoodieMaterial} />
                      <mesh position={[0, -0.28, 0]} geometry={HAND_GEO} material={skinMaterial} />
                      {/* 3D Cutting Chai Glass held in the right hand during the Quick Sip animation */}
                      <group
                        ref={handChaiCupRef}
                        visible={false}
                        position={[-0.03, -0.31, -0.06]}
                        rotation={[Math.PI * 0.72, 0, 0.25]}
                      >
                          <mesh geometry={HAND_CHAI_LIQUID_GEO} material={chaiLiquidMaterial} position={[0, -0.01, 0]} />
                          <mesh geometry={HAND_CHAI_FOAM_GEO} material={chaiFoamMaterial} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} />
                          <mesh geometry={HAND_CHAI_GLASS_GEO} material={chaiGlassMaterial} />
                      </group>
                  </group>
              </group>
          </group>
          <group position={[-0.31, 0.4, 0]}>
              <group ref={leftArmRef}>
                   <mesh position={[0, -0.14, 0]} castShadow geometry={ARM_GEO} material={hoodieMaterial} />
                   <group ref={leftElbowRef} position={[0, -0.28, 0]}>
                       <mesh position={[0, -0.14, 0]} castShadow geometry={FOREARM_GEO} material={hoodieMaterial} />
                       <mesh position={[0, -0.28, 0]} geometry={HAND_GEO} material={skinMaterial} />
                   </group>
              </group>
          </group>

          {/* Articulated 2-Segment Denim Jeans Legs + Orange Sneakers */}
          <mesh position={[0, -0.15, 0]} geometry={HIPS_GEO} material={jeansMaterial} />

          <group position={[0.12, -0.25, 0]}>
              <group ref={rightLegRef}>
                   <mesh position={[0, -0.17, 0]} castShadow geometry={LEG_GEO} material={jeansMaterial} />
                   <group ref={rightKneeRef} position={[0, -0.34, 0]}>
                       <mesh position={[0, -0.17, 0]} castShadow geometry={SHIN_GEO} material={jeansMaterial} />
                       <mesh position={[0, -0.35, -0.04]} castShadow geometry={SNEAKER_GEO} material={sneakerMaterial} />
                   </group>
              </group>
          </group>
          <group position={[-0.12, -0.25, 0]}>
              <group ref={leftLegRef}>
                   <mesh position={[0, -0.17, 0]} castShadow geometry={LEG_GEO} material={jeansMaterial} />
                   <group ref={leftKneeRef} position={[0, -0.34, 0]}>
                       <mesh position={[0, -0.17, 0]} castShadow geometry={SHIN_GEO} material={jeansMaterial} />
                       <mesh position={[0, -0.35, -0.04]} castShadow geometry={SNEAKER_GEO} material={sneakerMaterial} />
                   </group>
              </group>
          </group>
        </group>
        </group>

        {/* Expanding Golden Coin-Collection Sparkle Ring */}
        <mesh
          ref={coinRingRef}
          visible={false}
          position={[0, 0.95, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          geometry={COIN_AURA_RING_GEO}
          material={coinRingMaterial}
        />

        {/* Active Auto-Rickshaw Bumper Shield: Waist-Level Glowing Torus Ring + Translucent Aura */}
        {hasShield && (
          <group position={[0, 0.95, 0]}>
            <mesh
              ref={shieldRingRef}
              rotation={[Math.PI / 2, 0, 0]}
              geometry={SHIELD_TORUS_GEO}
              material={shieldTorusMaterial}
            />
            <mesh
              geometry={SHIELD_AURA_GEO}
              material={shieldAuraMaterial}
            />
          </group>
        )}
        
        <mesh ref={shadowRef} position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={SHADOW_GEO} material={shadowMaterial} />
      </group>

      {/* World-Space Trailing 'Steam' Particles behind the Player during Cutting Chai Boost */}
      <group>
        {steamParticles.map((_, i) => (
          <mesh
            key={`steam-${i}`}
            ref={(el) => {
              steamMeshRefs.current[i] = el;
            }}
            visible={false}
            geometry={STEAM_PUFF_GEO}
            material={steamMaterials[i]}
          />
        ))}
      </group>

      {/* World-Space Footstep Bazaar Street Dust Particles at the Player's Feet */}
      <group>
        {dustParticles.map((_, i) => (
          <mesh
            key={`dust-${i}`}
            ref={(el) => {
              dustMeshRefs.current[i] = el;
            }}
            visible={false}
            geometry={DUST_PUFF_GEO}
            material={dustMaterials[i]}
          />
        ))}
      </group>

      {/* Compact Low-Opacity Footstep Dust Rings (Landings, Slides, Sharp Lane Cuts) */}
      <group>
        {dustRings.map((_, i) => (
          <mesh
            key={`dust-ring-${i}`}
            ref={(el) => {
              dustRingMeshRefs.current[i] = el;
            }}
            visible={false}
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={DUST_RING_GEO}
            material={dustRingMaterials[i]}
          />
        ))}
      </group>
    </>
  );
};