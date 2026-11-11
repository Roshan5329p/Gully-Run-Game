/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH, GameStatus } from '../../types';
import { audio } from '../System/Audio';

// Physics Constants
const GRAVITY = 50;
const JUMP_FORCE = 16; // Results in ~2.56 height (v^2 / 2g)

// Composite 10-Part Geometries for Gully Kid Player
const HOODIE_TORSO_GEO = new THREE.CylinderGeometry(0.24, 0.21, 0.62, 10);
const BACKPACK_GEO = new THREE.BoxGeometry(0.32, 0.42, 0.18);
const BACKPACK_POCKET_GEO = new THREE.BoxGeometry(0.24, 0.2, 0.08);
const HEAD_GEO = new THREE.SphereGeometry(0.21, 16, 16);
const HAIR_TOP_GEO = new THREE.SphereGeometry(0.225, 12, 12);
const HAIR_SPIKE_GEO = new THREE.ConeGeometry(0.08, 0.18, 6);
const ARM_GEO = new THREE.CylinderGeometry(0.075, 0.06, 0.56, 8);
const HAND_GEO = new THREE.SphereGeometry(0.068, 10, 10);
const HIPS_GEO = new THREE.CylinderGeometry(0.2, 0.19, 0.2, 10);
const LEG_GEO = new THREE.CylinderGeometry(0.095, 0.075, 0.66, 8);
const SNEAKER_GEO = new THREE.BoxGeometry(0.15, 0.1, 0.28);
const SHADOW_GEO = new THREE.CircleGeometry(0.5, 32);

// Hand-held Cutting Chai Glass Geometries (for Quick Sip Animation)
const HAND_CHAI_GLASS_GEO = new THREE.CylinderGeometry(0.075, 0.052, 0.18, 10);
const HAND_CHAI_LIQUID_GEO = new THREE.CylinderGeometry(0.068, 0.048, 0.13, 10);
const HAND_CHAI_FOAM_GEO = new THREE.TorusGeometry(0.064, 0.014, 8, 12);

// Trailing Steam Puff Geometry
const STEAM_PUFF_GEO = new THREE.DodecahedronGeometry(0.22, 1);
const STEAM_POOL_SIZE = 32;
const SIP_DURATION = 3.0; // Duration of the high-energy sip animation in seconds

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

export const Player: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  
  // Limb Refs for Animation
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const handChaiCupRef = useRef<THREE.Group>(null);

  // Steam Particle Refs & State Pool
  const steamMeshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sipTimer = useRef(0);
  const steamSpawnAccumulator = useRef(0);
  const nextSteamIdx = useRef(0);

  const steamParticles = useMemo<SteamParticle[]>(() => {
    return Array.from({ length: STEAM_POOL_SIZE }, (_, i) => ({
      active: false,
      age: 0,
      maxLife: 0.75,
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(),
      startScale: 0.18,
      endScale: 0.72,
      seed: i * 1.37,
      isGoldenWisp: i % 4 === 0,
    }));
  }, []);

  const steamMaterials = useMemo(() => {
    return Array.from({ length: STEAM_POOL_SIZE }, (_, i) => {
      const isGold = i % 4 === 0;
      return new THREE.MeshStandardMaterial({
        color: isGold ? '#fef08a' : '#fffbeb',
        emissive: isGold ? '#f59e0b' : '#fde68a',
        emissiveIntensity: isGold ? 0.65 : 0.35,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
    });
  }, []);

  const { status, laneCount, takeDamage, hasDoubleJump, activateImmortality, isImmortalityActive, isChaiBoostActive } = useStore();
  
  const [lane, setLane] = React.useState(0);
  const targetX = useRef(0);
  
  // Physics State (using Refs for immediate logic updates)
  const isJumping = useRef(false);
  const velocityY = useRef(0);
  const jumpsPerformed = useRef(0); 
  const spinRotation = useRef(0); // For double jump flip

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
  } = useMemo(() => {
      const hoodieColor = isImmortalityActive ? '#ffb300' : isChaiBoostActive ? '#0d9488' : '#0f766e'; // Teal hoodie or golden blessing aura
      const sneakerColor = isImmortalityActive ? '#ffffff' : '#ea580c'; // Orange sneakers
      
      return {
          hoodieMaterial: new THREE.MeshStandardMaterial({
              color: hoodieColor,
              roughness: isImmortalityActive ? 0.2 : 0.75,
              metalness: isImmortalityActive ? 0.8 : 0.1,
              emissive: isImmortalityActive ? '#ff8f00' : isChaiBoostActive ? '#f59e0b' : '#000000',
              emissiveIntensity: isImmortalityActive ? 0.5 : isChaiBoostActive ? 0.22 : 0
          }),
          jeansMaterial: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.85, metalness: 0.05 }),
          backpackMaterial: new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.6, metalness: 0.2 }),
          pocketMaterial: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4, metalness: 0.3 }),
          skinMaterial: new THREE.MeshStandardMaterial({ color: '#d2905c', roughness: 0.6, metalness: 0.05 }),
          hairMaterial: new THREE.MeshStandardMaterial({ color: '#181311', roughness: 0.8, metalness: 0.1 }),
          sneakerMaterial: new THREE.MeshStandardMaterial({ color: sneakerColor, roughness: 0.35, metalness: 0.25 }),
          shadowMaterial: new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0.35, transparent: true, depthWrite: false }),
          chaiGlassMaterial: new THREE.MeshStandardMaterial({
              color: '#e0f2fe',
              roughness: 0.15,
              metalness: 0.1,
              transparent: true,
              opacity: 0.55,
          }),
          chaiLiquidMaterial: new THREE.MeshStandardMaterial({
              color: '#b45309',
              emissive: '#f59e0b',
              emissiveIntensity: 0.55,
              roughness: 0.3,
              metalness: 0.05,
          }),
          chaiFoamMaterial: new THREE.MeshStandardMaterial({
              color: '#fef3c7',
              emissive: '#fde68a',
              emissiveIntensity: 0.35,
              roughness: 0.7,
          }),
      };
  }, [isImmortalityActive, isChaiBoostActive]);

  // --- Reset State on Game Start ---
  useEffect(() => {
      if (status === GameStatus.PLAYING) {
          isJumping.current = false;
          jumpsPerformed.current = 0;
          velocityY.current = 0;
          spinRotation.current = 0;
          sipTimer.current = 0;
          steamSpawnAccumulator.current = 0;
          steamParticles.forEach((p, idx) => {
              p.active = false;
              const mesh = steamMeshRefs.current[idx];
              if (mesh) mesh.visible = false;
          });
          if (groupRef.current) groupRef.current.position.y = 0;
          if (bodyRef.current) bodyRef.current.rotation.x = 0;
      }
  }, [status, steamParticles]);

  // --- Trigger High-Energy Sip Animation on Cutting Chai Pickup ---
  useEffect(() => {
      const handleChaiBoost = () => {
          sipTimer.current = SIP_DURATION;
          // Immediate burst of 6 celebratory steam puffs right as the player takes a sip!
          if (groupRef.current) {
              const px = groupRef.current.position.x;
              const py = groupRef.current.position.y;
              for (let i = 0; i < 6; i++) {
                  const idx = nextSteamIdx.current;
                  nextSteamIdx.current = (nextSteamIdx.current + 1) % STEAM_POOL_SIZE;
                  const p = steamParticles[idx];
                  p.active = true;
                  p.age = 0;
                  p.maxLife = 0.55 + Math.random() * 0.35;
                  p.pos.set(
                      px + (Math.random() - 0.5) * 0.45,
                      py + 1.55 + Math.random() * 0.25,
                      0.1 + Math.random() * 0.25
                  );
                  p.vel.set(
                      (Math.random() - 0.5) * 1.4,
                      2.2 + Math.random() * 1.4,
                      6.5 + Math.random() * 3.5
                  );
                  p.startScale = 0.22 + Math.random() * 0.08;
                  p.endScale = 0.72 + Math.random() * 0.25;
              }
          }
      };
      window.addEventListener('chai-boost', handleChaiBoost);
      return () => window.removeEventListener('chai-boost', handleChaiBoost);
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

    if (!isJumping.current) {
        audio.playJump(false);
        isJumping.current = true;
        jumpsPerformed.current = 1;
        velocityY.current = JUMP_FORCE;
    } else if (jumpsPerformed.current < maxJumps) {
        audio.playJump(true);
        jumpsPerformed.current += 1;
        velocityY.current = JUMP_FORCE;
        spinRotation.current = 0;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      const maxLane = Math.floor(laneCount / 2);

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setLane(l => Math.max(l - 1, -maxLane));
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setLane(l => Math.min(l + 1, maxLane));
      else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') triggerJump();
      else if (e.key === ' ' || e.key === 'Enter') {
          activateImmortality();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (status !== GameStatus.PLAYING) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        const maxLane = Math.floor(laneCount / 2);

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
             if (deltaX > 0) setLane(l => Math.min(l + 1, maxLane));
             else setLane(l => Math.max(l - 1, -maxLane));
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -30) {
            triggerJump();
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
    if (status !== GameStatus.PLAYING && status !== GameStatus.SHOP) return;

    const safeDelta = Math.min(delta, 0.05);

    // 1. Horizontal Position with exponential damping
    targetX.current = lane * LANE_WIDTH;
    groupRef.current.position.x = THREE.MathUtils.damp(
        groupRef.current.position.x, 
        targetX.current, 
        15,
        safeDelta
    );

    // 2. Physics (Jump)
    if (isJumping.current) {
        groupRef.current.position.y += velocityY.current * safeDelta;
        velocityY.current -= GRAVITY * safeDelta;

        if (groupRef.current.position.y <= 0) {
            groupRef.current.position.y = 0;
            isJumping.current = false;
            jumpsPerformed.current = 0;
            velocityY.current = 0;
            if (bodyRef.current) bodyRef.current.rotation.x = 0;
        }

        // Double Jump Flip
        if (jumpsPerformed.current === 2 && bodyRef.current) {
             spinRotation.current -= safeDelta * 15;
             if (spinRotation.current < -Math.PI * 2) spinRotation.current = -Math.PI * 2;
             bodyRef.current.rotation.x = spinRotation.current;
        }
    }

    // Banking & Stumble Rotation
    const xDiff = targetX.current - groupRef.current.position.x;
    groupRef.current.rotation.z = -xDiff * 0.2; 
    groupRef.current.rotation.x = isJumping.current ? 0.12 : 0.08; 

    // 3. Skeletal & Stumble / Quick Chai Sip / Chai Boost Animation
    const { isStumbling, isChaiBoostActive: chaiActiveNow, speed } = useStore.getState();
    const time = state.clock.elapsedTime * (chaiActiveNow ? 35 : 26);

    if (sipTimer.current > 0) {
        sipTimer.current = Math.max(0, sipTimer.current - safeDelta);
    }
    const isSipping = sipTimer.current > 0;

    // Show/hide and scale the 3D Cutting Chai glass in the player's right hand during the 3-second sip!
    if (handChaiCupRef.current) {
        if (isSipping) {
            handChaiCupRef.current.visible = true;
            // Smooth pop-in at start of sip and pop-out at end of 3s sip
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
        if (isStumbling) {
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
            if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(time * 0.7 + Math.PI) * 0.65;
            if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time * 0.7) * 0.65;
            if (bodyRef.current) {
                bodyRef.current.position.y = 0.96 + Math.abs(Math.sin(time * 1.5)) * 0.08;
                bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, 0.48, 12, safeDelta);
                bodyRef.current.rotation.z = Math.sin(time * 1.5) * 0.14;
            }
            if (headRef.current) {
                headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, 0.2, 10, safeDelta);
            }
        } else {
            // High-tempo leg stride
            const legAmplitude = chaiActiveNow ? 1.18 : 1.05;
            if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(time + Math.PI) * legAmplitude;
            if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time) * legAmplitude;

            // Left arm counter-swings dynamically
            if (leftArmRef.current) {
                leftArmRef.current.rotation.x = Math.sin(time) * (chaiActiveNow ? 1.05 : 0.8);
                leftArmRef.current.rotation.z = THREE.MathUtils.damp(leftArmRef.current.rotation.z, 0, 12, safeDelta);
            }

            if (isSipping) {
                // HIGH-ENERGY RUNNING SIP ANIMATION:
                // Right arm brings the steaming Cutting Chai glass up to the mouth while head tilts back for 3 quick gulps!
                const gulpOsc = Math.sin(sipTimer.current * 28) * 0.14;
                if (rightArmRef.current) {
                    rightArmRef.current.rotation.x = THREE.MathUtils.damp(
                        rightArmRef.current.rotation.x,
                        2.08 + gulpOsc,
                        22,
                        safeDelta
                    );
                    rightArmRef.current.rotation.z = THREE.MathUtils.damp(
                        rightArmRef.current.rotation.z,
                        -0.52,
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
                    // Energetic mid-stride hop while gulping the chai
                    bodyRef.current.position.y = 1.15 + Math.abs(Math.sin(time)) * 0.13;
                    bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, -0.08, 14, safeDelta);
                    bodyRef.current.rotation.z = THREE.MathUtils.damp(bodyRef.current.rotation.z, 0, 12, safeDelta);
                }
            } else {
                // Normal or Chai-Turbo Sprint Arm & Head Pose
                if (rightArmRef.current) {
                    rightArmRef.current.rotation.x = Math.sin(time + Math.PI) * (chaiActiveNow ? 1.05 : 0.8);
                    rightArmRef.current.rotation.z = THREE.MathUtils.damp(rightArmRef.current.rotation.z, 0, 14, safeDelta);
                    rightArmRef.current.rotation.y = THREE.MathUtils.damp(rightArmRef.current.rotation.y, 0, 14, safeDelta);
                }
                if (bodyRef.current) {
                    bodyRef.current.position.y = 1.1 + Math.abs(Math.sin(time)) * (chaiActiveNow ? 0.13 : 0.1);
                    // Slight aerodynamic forward sprint lean during Chai Boost
                    const targetLeanX = chaiActiveNow ? -0.14 : 0;
                    bodyRef.current.rotation.x = THREE.MathUtils.damp(bodyRef.current.rotation.x, targetLeanX, 10, safeDelta);
                    bodyRef.current.rotation.z = THREE.MathUtils.damp(bodyRef.current.rotation.z, 0, 10, safeDelta);
                }
                if (headRef.current) {
                    headRef.current.rotation.x = THREE.MathUtils.damp(headRef.current.rotation.x, 0, 12, safeDelta);
                    // Occasional nervous glance back at Uncle (unless locked-in during Chai Boost!)
                    headRef.current.rotation.y =
                        !chaiActiveNow && Math.sin(state.clock.elapsedTime * 2.2) > 0.75 ? 0.65 : 0;
                }
            }
        }
    } else {
        const jumpPoseSpeed = safeDelta * 10;
        if (leftArmRef.current) leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -2.4, jumpPoseSpeed);
        if (rightArmRef.current) {
            if (isSipping) {
                const gulpOsc = Math.sin(sipTimer.current * 28) * 0.14;
                rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 2.08 + gulpOsc, jumpPoseSpeed * 2);
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.52, jumpPoseSpeed * 2);
            } else {
                rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -2.4, jumpPoseSpeed);
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, 0, jumpPoseSpeed);
            }
        }
        if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0.5, jumpPoseSpeed);
        if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, -0.5, jumpPoseSpeed);
        
        if (bodyRef.current && jumpsPerformed.current !== 2) bodyRef.current.position.y = 1.1; 
    }

    // 4. Trailing 'Steam' Particle Effect for the Duration of the Cutting Chai Speed Boost
    if (chaiActiveNow || isSipping) {
        // Emit 30-40 steam puffs per second while boosting (even denser during the initial sip!)
        const spawnInterval = isSipping ? 0.022 : 0.032;
        steamSpawnAccumulator.current += safeDelta;

        while (steamSpawnAccumulator.current >= spawnInterval) {
            steamSpawnAccumulator.current -= spawnInterval;
            const idx = nextSteamIdx.current;
            nextSteamIdx.current = (nextSteamIdx.current + 1) % STEAM_POOL_SIZE;
            const p = steamParticles[idx];

            p.active = true;
            p.age = 0;
            p.maxLife = 0.55 + Math.random() * 0.35;

            const px = groupRef.current.position.x;
            const py = groupRef.current.position.y;

            if (isSipping) {
                // Emit steam from the hot Cutting Chai cup & player's head/shoulders during the sip
                p.pos.set(
                    px + (Math.random() - 0.5) * 0.38,
                    py + 1.52 + Math.random() * 0.25,
                    0.05 + Math.random() * 0.22
                );
            } else {
                // Emit trailing steam slipstream behind the player's head, shoulders, and backpack
                p.pos.set(
                    px + (Math.random() - 0.5) * 0.52,
                    py + 1.15 + Math.random() * 0.55,
                    0.24 + Math.random() * 0.18
                );
            }

            // Drift backward in +Z (trailing behind the runner) and curl upward in +Y
            const trailSpeedZ = Math.max(5.5, speed * 0.28) + Math.random() * 2.5;
            p.vel.set(
                (Math.random() - 0.5) * 1.1,
                1.7 + Math.random() * 1.4,
                trailSpeedZ
            );
            p.startScale = p.isGoldenWisp ? 0.15 : 0.2 + Math.random() * 0.08;
            p.endScale = p.isGoldenWisp ? 0.42 : 0.65 + Math.random() * 0.25;
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

        // Billowing upward rise + backward slipstream drift + organic lateral curl
        p.pos.x += (p.vel.x + Math.sin(clockTime * 6 + p.seed) * 0.75) * safeDelta;
        p.pos.y += p.vel.y * safeDelta;
        p.pos.z += p.vel.z * safeDelta;

        mesh.position.copy(p.pos);

        // Expand as steam rises and dissipates
        const currentScale = THREE.MathUtils.lerp(p.startScale, p.endScale, lifeRatio);
        mesh.scale.setScalar(currentScale);

        mesh.rotation.x += safeDelta * 1.8;
        mesh.rotation.y += safeDelta * 2.2;
        mesh.rotation.z += safeDelta * 1.5;

        // Smooth fade-in then billowy fade-out
        const alpha =
            lifeRatio < 0.18
                ? (lifeRatio / 0.18) * 0.78
                : (1 - (lifeRatio - 0.18) / 0.82) * 0.78;
        steamMaterials[i].opacity = Math.max(0, alpha);
    }

    // 5. Dynamic Shadow
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

  // Damage Handler
  useEffect(() => {
     const checkHit = () => {
        if (isInvincible.current || isImmortalityActive) return;
        audio.playDamage();
        takeDamage();
        isInvincible.current = true;
        lastDamageTime.current = Date.now();
     };
     window.addEventListener('player-hit', checkHit);
     return () => window.removeEventListener('player-hit', checkHit);
  }, [takeDamage, isImmortalityActive]);

  return (
    <>
      <group ref={groupRef} position={[0, 0, 0]}>
        <group ref={bodyRef} position={[0, 1.1, 0]}> 
          
          {/* Teal Hoodie Torso */}
          <mesh castShadow position={[0, 0.2, 0]} geometry={HOODIE_TORSO_GEO} material={hoodieMaterial} />

          {/* School / Gully Backpack */}
          <mesh castShadow position={[0, 0.22, 0.19]} geometry={BACKPACK_GEO} material={backpackMaterial} />
          <mesh position={[0, 0.14, 0.29]} geometry={BACKPACK_POCKET_GEO} material={pocketMaterial} />

          {/* Head & Spiky Indian Boy Hair */}
          <group ref={headRef} position={[0, 0.65, 0]}>
              <mesh castShadow geometry={HEAD_GEO} material={skinMaterial} />
              <mesh castShadow position={[0, 0.06, 0.02]} geometry={HAIR_TOP_GEO} material={hairMaterial} />
              <mesh position={[0, 0.26, -0.05]} rotation={[-0.3, 0, 0]} geometry={HAIR_SPIKE_GEO} material={hairMaterial} />
              <mesh position={[-0.1, 0.23, 0]} rotation={[0, 0, 0.4]} geometry={HAIR_SPIKE_GEO} material={hairMaterial} />
              <mesh position={[0.1, 0.23, 0]} rotation={[0, 0, -0.4]} geometry={HAIR_SPIKE_GEO} material={hairMaterial} />
          </group>

          {/* Hoodie Arms & Hands */}
          <group position={[0.31, 0.4, 0]}>
              <group ref={rightArmRef}>
                  <mesh position={[0, -0.24, 0]} castShadow geometry={ARM_GEO} material={hoodieMaterial} />
                  <mesh position={[0, -0.53, 0]} geometry={HAND_GEO} material={skinMaterial} />
                  {/* 3D Cutting Chai Glass held in the right hand during the Quick Sip animation */}
                  <group
                    ref={handChaiCupRef}
                    visible={false}
                    position={[-0.03, -0.56, -0.06]}
                    rotation={[Math.PI * 0.72, 0, 0.25]}
                  >
                      <mesh geometry={HAND_CHAI_LIQUID_GEO} material={chaiLiquidMaterial} position={[0, -0.01, 0]} />
                      <mesh geometry={HAND_CHAI_FOAM_GEO} material={chaiFoamMaterial} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} />
                      <mesh geometry={HAND_CHAI_GLASS_GEO} material={chaiGlassMaterial} />
                  </group>
              </group>
          </group>
          <group position={[-0.31, 0.4, 0]}>
              <group ref={leftArmRef}>
                   <mesh position={[0, -0.24, 0]} castShadow geometry={ARM_GEO} material={hoodieMaterial} />
                   <mesh position={[0, -0.53, 0]} geometry={HAND_GEO} material={skinMaterial} />
              </group>
          </group>

          {/* Denim Jeans Hips & Legs + Orange Sneakers */}
          <mesh position={[0, -0.15, 0]} geometry={HIPS_GEO} material={jeansMaterial} />

          <group position={[0.12, -0.25, 0]}>
              <group ref={rightLegRef}>
                   <mesh position={[0, -0.32, 0]} castShadow geometry={LEG_GEO} material={jeansMaterial} />
                   <mesh position={[0, -0.66, -0.04]} castShadow geometry={SNEAKER_GEO} material={sneakerMaterial} />
              </group>
          </group>
          <group position={[-0.12, -0.25, 0]}>
              <group ref={leftLegRef}>
                   <mesh position={[0, -0.32, 0]} castShadow geometry={LEG_GEO} material={jeansMaterial} />
                   <mesh position={[0, -0.66, -0.04]} castShadow geometry={SNEAKER_GEO} material={sneakerMaterial} />
              </group>
          </group>
        </group>
        
        <mesh ref={shadowRef} position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={SHADOW_GEO} material={shadowMaterial} />
      </group>

      {/* World-Space Trailing 'Steam' Particles behind the Player during Cutting Chai Boost */}
      <group>
        {steamParticles.map((_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              steamMeshRefs.current[i] = el;
            }}
            visible={false}
            geometry={STEAM_PUFF_GEO}
            material={steamMaterials[i]}
          />
        ))}
      </group>
    </>
  );
};