/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store';
import { GameStatus, LANE_WIDTH } from '../../types';
import { audio } from '../System/Audio';

// Reusable vector to avoid GC allocations in useFrame
const _playerWorldPos = new THREE.Vector3();

// Lane Camping Constants (5 seconds total: 4.0s dwell + 1.0s red target telegraph -> throw at 5.0s)
const LANE_WINDUP_THRESHOLD = 4.0;
const LANE_THROW_THRESHOLD = 5.0;
const THROWN_CHAPPAL_SPEED = 28.0;

// Dialogue Banks for Sharma Uncle
const STANDARD_UNCLE_DIALOGUES = [
  'Bhaag mat, ruk tu!',
  'Oye! Khidki tod ke kahaan bhaagta hai?!',
  'Sharma ji ke bete ke 99% aaye hain!',
  'Tere Papa ko abhi phone lagata hoon!',
  'Subah 5 baje utha karo, mobile chhodo!',
  'Gully mein cricket band karwaunga!',
  'Ruko beta! Board exam ke marks dikhao!',
];

const CLOSE_RANGE_UNCLE_DIALOGUES = [
  'Bhaag mat, ruk tu!',
  'Chappal khayega kya?! Ruk abhi!',
  'Pakad liya beta, ab kahaan jayega?!',
  'Ruk tu! Kaan pakad ke ghar le jaunga!',
  'Ek kadam aur bhaaga toh khair nahi!',
  'Aaj toh teri khair nahi beta, ruk!',
];

const WINDUP_THROW_DIALOGUES = [
  'Ek hi lane mein bhaagega?! Le chappal!',
  'Seedha bhaagta hai?! Yeh le flying chappal!',
  'Nishana pakka hai mera! Bach ke dikha!',
];

const STUMBLE_UNCLE_DIALOGUES = [
  'Kachre mein phisal gaya beta! Pakad liya!',
  'Arey ladkhadaya! Ab kahaan bhaagega?!',
  'Chai ke kulhad pe phisal gaya! Ruk abhi!',
];

const CHAI_BOOST_UNCLE_DIALOGUES = [
  'Arey! Cutting chai pi ke rocket ban gaya?!',
  'Raju ki chai pi li kya?! Itni tez!',
  'Oye! Chai pi ke kahaan udd raha hai?!',
];

// Shared Geometries for the Chasing Uncle ("Sharma Ji")
const BELLY_GEO = new THREE.SphereGeometry(0.36, 16, 16);
const KURTA_TORSO_GEO = new THREE.CylinderGeometry(0.28, 0.36, 0.68, 12);
const KURTA_FLARE_GEO = new THREE.CylinderGeometry(0.35, 0.42, 0.25, 12);
const VEST_GEO = new THREE.CylinderGeometry(0.30, 0.37, 0.62, 12);
const HEAD_GEO = new THREE.SphereGeometry(0.23, 16, 16);
const HAIR_SIDE_GEO = new THREE.BoxGeometry(0.48, 0.14, 0.28);
const BEARD_GEO = new THREE.SphereGeometry(0.22, 12, 12);
const MUSTACHE_GEO = new THREE.CylinderGeometry(0.03, 0.015, 0.22, 8);
const GLASS_FRAME_GEO = new THREE.TorusGeometry(0.065, 0.012, 8, 16);
const EYEBROW_GEO = new THREE.BoxGeometry(0.09, 0.025, 0.03);
const ARM_GEO = new THREE.CylinderGeometry(0.08, 0.065, 0.52, 8);
const HAND_GEO = new THREE.SphereGeometry(0.075, 10, 10);
const DHOTI_LEG_GEO = new THREE.CylinderGeometry(0.14, 0.10, 0.62, 10);
const CHAPPAL_SOLE_GEO = new THREE.BoxGeometry(0.16, 0.035, 0.34);
const CHAPPAL_STRAP_GEO = new THREE.TorusGeometry(0.07, 0.015, 6, 12, Math.PI);
const SHADOW_GEO = new THREE.CircleGeometry(0.6, 24);

// Thrown Chappal & High-Visibility Red Target Telegraph Geometries
const THROWN_CHAPPAL_SOLE_GEO = new THREE.BoxGeometry(0.44, 0.08, 0.92);
const THROWN_CHAPPAL_STRAP_GEO = new THREE.TorusGeometry(0.19, 0.038, 8, 16, Math.PI);
const THROWN_CHAPPAL_AURA_GEO = new THREE.TorusGeometry(0.45, 0.032, 10, 24);
const TARGET_OUTER_RING_GEO = new THREE.RingGeometry(0.78, 1.04, 32);
const TARGET_INNER_RING_GEO = new THREE.RingGeometry(0.32, 0.5, 24);
const TARGET_LANE_STRIPE_GEO = new THREE.PlaneGeometry(1.35, 7.5);
const TARGET_BORDER_LINE_GEO = new THREE.PlaneGeometry(0.08, 7.5);

export const UncleChaser: React.FC = () => {
  const uncleGroupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const chappalHandRef = useRef<THREE.Group>(null);
  const heldChappalGroupRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  // World-Space Telegraph & Thrown Chappal Refs
  const targetMarkerGroupRef = useRef<THREE.Group>(null);
  const targetBullseyeRef = useRef<THREE.Group>(null);
  const thrownChappalGroupRef = useRef<THREE.Group>(null);
  const thrownChappalSpinRef = useRef<THREE.Group>(null);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const surgeTimer = useRef(0);
  const shoutPulseTimer = useRef(0);
  const closeSwipeCooldownRef = useRef(0);
  const uncleJumpY = useRef(0);

  // Lane-Camping Attack FSM Refs
  const attackStateRef = useRef<'IDLE' | 'WINDUP' | 'THROWN'>('IDLE');
  const trackedLaneRef = useRef<number>(0);
  const laneDwellTimeRef = useRef<number>(0);
  const lockedLaneXRef = useRef<number>(0);
  const projZRef = useRef<number>(0);

  const { status, lives, maxLives } = useStore();

  // Floating Comic Bubble & Lock-On UI State
  const [dialogue, setDialogue] = useState<string>('Bhaag mat, ruk tu!');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [isLockingOn, setIsLockingOn] = useState<boolean>(false);
  const [popScale, setPopScale] = useState<boolean>(false);
  const [introStormedOut, setIntroStormedOut] = useState<boolean>(false);
  const lastDialogueRef = useRef<string>('Bhaag mat, ruk tu!');

  // Pick a random non-repeating line from the appropriate pool and trigger audio + pop animation
  const triggerNewDialogue = useCallback((urgentMode: boolean, forceSpecificLine?: string) => {
    const pool = urgentMode ? CLOSE_RANGE_UNCLE_DIALOGUES : STANDARD_UNCLE_DIALOGUES;
    let nextLine = forceSpecificLine;

    if (!nextLine) {
      const candidates = pool.filter(line => line !== lastDialogueRef.current);
      nextLine = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
    }

    lastDialogueRef.current = nextLine;
    setDialogue(nextLine);
    setIsUrgent(urgentMode);
    setPopScale(true);
    shoutPulseTimer.current = 0.45;
    audio.playUncleShout(urgentMode);

    const timer = window.setTimeout(() => setPopScale(false), 180);
    return () => window.clearTimeout(timer);
  }, []);

  // Reset attack state when game status changes
  useEffect(() => {
    attackStateRef.current = 'IDLE';
    laneDwellTimeRef.current = 0;
    setIsLockingOn(false);
    if (status === GameStatus.INTRO) {
      setIntroStormedOut(false);
      if (uncleGroupRef.current) {
        uncleGroupRef.current.position.set(2.4, 0, 2.4);
      }
    } else if (uncleGroupRef.current) {
      uncleGroupRef.current.visible = true;
    }
    if (targetMarkerGroupRef.current) targetMarkerGroupRef.current.visible = false;
    if (thrownChappalGroupRef.current) thrownChappalGroupRef.current.visible = false;
    if (heldChappalGroupRef.current) heldChappalGroupRef.current.visible = true;
  }, [status]);

  // Trigger initial shout on run start and cycle continuously every 3.2s during PLAYING
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;

    const closeToPlayer = lives <= 2;
    triggerNewDialogue(closeToPlayer, 'Bhaag mat, ruk tu!');

    const interval = window.setInterval(() => {
      if (attackStateRef.current === 'WINDUP') return;
      const currentlyClose = useStore.getState().lives <= 2 || surgeTimer.current > 0;
      triggerNewDialogue(currentlyClose);
    }, 3200);

    return () => window.clearInterval(interval);
  }, [status, triggerNewDialogue]);

  // Escalate when player loses a life
  useEffect(() => {
    if (status === GameStatus.PLAYING && lives < maxLives && lives > 0) {
      triggerNewDialogue(true);
    }
  }, [lives, maxLives, status, triggerNewDialogue]);

  // Listen for player hits and bazaar debris stumbles so Uncle surges forward menacingly
  useEffect(() => {
    const onHit = () => {
      surgeTimer.current = 1.35;
      laneDwellTimeRef.current = 0;
      if (attackStateRef.current === 'WINDUP') {
        attackStateRef.current = 'IDLE';
        setIsLockingOn(false);
        if (targetMarkerGroupRef.current) targetMarkerGroupRef.current.visible = false;
      }
      triggerNewDialogue(true, Math.random() < 0.5 ? 'Bhaag mat, ruk tu!' : undefined);
    };

    const onStumble = () => {
      surgeTimer.current = 2.2;
      const stumbleLine =
        STUMBLE_UNCLE_DIALOGUES[Math.floor(Math.random() * STUMBLE_UNCLE_DIALOGUES.length)];
      triggerNewDialogue(true, stumbleLine);
    };

    const onChaiBoost = () => {
      surgeTimer.current = 0; // Immediate recovery from stumble surge!
      const chaiLine =
        CHAI_BOOST_UNCLE_DIALOGUES[Math.floor(Math.random() * CHAI_BOOST_UNCLE_DIALOGUES.length)];
      triggerNewDialogue(false, chaiLine);
    };

    const onIntroUncleStorm = () => {
      setIntroStormedOut(true);
      setDialogue('Meri khidki aur chai tod di?! RUK BETA!');
      setIsUrgent(true);
      setPopScale(true);
      shoutPulseTimer.current = 1.2;
      window.setTimeout(() => setPopScale(false), 220);
    };

    window.addEventListener('player-hit', onHit);
    window.addEventListener('player-stumble', onStumble);
    window.addEventListener('chai-boost', onChaiBoost);
    window.addEventListener('intro-uncle-storm', onIntroUncleStorm);
    return () => {
      window.removeEventListener('player-hit', onHit);
      window.removeEventListener('player-stumble', onStumble);
      window.removeEventListener('chai-boost', onChaiBoost);
      window.removeEventListener('intro-uncle-storm', onIntroUncleStorm);
    };
  }, [triggerNewDialogue]);

  // Authentic PBR Materials with calibrated roughness/metalness contrast
  const materials = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: '#c68652', roughness: 0.65, metalness: 0.05 }),
    kurta: new THREE.MeshStandardMaterial({ color: '#f5ebd6', roughness: 0.85, metalness: 0.02 }),
    vest: new THREE.MeshStandardMaterial({ color: '#5c3317', roughness: 0.75, metalness: 0.08 }),
    dhoti: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0.0 }),
    hair: new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.8, metalness: 0.1 }),
    mustache: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7, metalness: 0.1 }),
    glasses: new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.2, metalness: 0.85 }),
    chappalLeather: new THREE.MeshStandardMaterial({ color: '#6e3512', roughness: 0.5, metalness: 0.15 }),
    chappalGoldStrap: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.3, metalness: 0.5 }),
    chappalAura: new THREE.MeshBasicMaterial({ color: '#ff3d00' }),
    targetOuter: new THREE.MeshBasicMaterial({
      color: '#ef4444',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
    targetInner: new THREE.MeshBasicMaterial({
      color: '#facc15',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    }),
    targetStripe: new THREE.MeshBasicMaterial({
      color: '#ef4444',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    shadow: new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0.38, transparent: true, depthWrite: false }),
  }), []);

  useFrame((state, delta) => {
    if (!uncleGroupRef.current) return;

    // Locate Player object in scene
    if (!playerObjRef.current) {
      const group = state.scene.getObjectByName('PlayerGroup');
      if (group && group.children.length > 0) {
        playerObjRef.current = group.children[0];
      }
    }

    const safeDelta = Math.min(delta, 0.05);

    if (surgeTimer.current > 0) {
      surgeTimer.current = Math.max(0, surgeTimer.current - safeDelta);
    }
    if (shoutPulseTimer.current > 0) {
      shoutPulseTimer.current = Math.max(0, shoutPulseTimer.current - safeDelta);
    }

    // Handle Intro Cutscene visibility & storm-out position
    if (status === GameStatus.INTRO) {
      uncleGroupRef.current.visible = introStormedOut;
      if (!introStormedOut) {
        uncleGroupRef.current.position.set(2.4, 0, 2.4);
        return;
      }
    } else {
      uncleGroupRef.current.visible = true;
    }

    // Clear, generous Z spacing between Player (z = 0) and Uncle (z = 3.4 to 5.2),
    // which narrows to z = 1.85 on stumble or widens to z = 6.2 when pulling away with Cutting Chai!
    const { isStumbling, isChaiBoostActive } = useStore.getState();
    const lifeRatio = Math.max(0, Math.min(1, (lives - 1) / Math.max(1, maxLives - 1)));
    let targetZ = 3.4 + lifeRatio * 1.8; // 5.2m behind at 3 lives, 4.3m at 2 lives, 3.4m at 1 life
    if (status === GameStatus.INTRO) {
      targetZ = 2.6; // Right behind the player as Uncle storms out of his house!
    } else if (isChaiBoostActive) {
      targetZ = 6.2; // Player pulls away from Uncle with Cutting Chai speed boost!
    } else if (surgeTimer.current > 0 || isStumbling) {
      targetZ = 1.85; // Narrows distance right behind player's heels during a debris stumble!
    }
    if (status === GameStatus.GAME_OVER) {
      targetZ = 0.85;
    }

    // Track player's X and Y with slight chase delay
    let targetX = 0;
    let targetY = 0;
    if (playerObjRef.current) {
      playerObjRef.current.getWorldPosition(_playerWorldPos);
      targetX = _playerWorldPos.x;
      targetY = Math.max(0, _playerWorldPos.y * 0.85);
    }

    // --- 5-SECOND LANE-CAMPING CHAPPAL ATTACK FSM ---
    if (status === GameStatus.PLAYING) {
      const currentPlayerLane = Math.round(targetX / LANE_WIDTH);

      if (attackStateRef.current === 'IDLE') {
        if (currentPlayerLane !== trackedLaneRef.current) {
          trackedLaneRef.current = currentPlayerLane;
          laneDwellTimeRef.current = 0;
        } else {
          laneDwellTimeRef.current += safeDelta;
          if (laneDwellTimeRef.current >= LANE_WINDUP_THRESHOLD) {
            // Enter 1-second Telegraph Wind-up (4.0s -> 5.0s)
            attackStateRef.current = 'WINDUP';
            lockedLaneXRef.current = trackedLaneRef.current * LANE_WIDTH;
            setIsLockingOn(true);

            if (targetMarkerGroupRef.current) {
              targetMarkerGroupRef.current.visible = true;
              targetMarkerGroupRef.current.position.set(lockedLaneXRef.current, 0.035, 0);
            }

            const warningLine =
              WINDUP_THROW_DIALOGUES[Math.floor(Math.random() * WINDUP_THROW_DIALOGUES.length)];
            triggerNewDialogue(true, warningLine);
            audio.playChappalWindup();
          }
        }
      } else if (attackStateRef.current === 'WINDUP') {
        laneDwellTimeRef.current += safeDelta;

        // Animate bullseye reticle pulse during the 1s telegraph
        if (targetBullseyeRef.current) {
          const windupProgress = Math.min(
            1,
            (laneDwellTimeRef.current - LANE_WINDUP_THRESHOLD) /
              (LANE_THROW_THRESHOLD - LANE_WINDUP_THRESHOLD)
          );
          const pulse = 1 + Math.sin(windupProgress * Math.PI * 8) * 0.16;
          targetBullseyeRef.current.scale.set(pulse, 1, pulse);
        }

        if (laneDwellTimeRef.current >= LANE_THROW_THRESHOLD) {
          // 5.0s reached: Launch the Flying Chappal!
          attackStateRef.current = 'THROWN';
          setIsLockingOn(false);
          projZRef.current = uncleGroupRef.current.position.z - 0.4;

          if (targetMarkerGroupRef.current) {
            targetMarkerGroupRef.current.visible = false;
          }
          if (heldChappalGroupRef.current) {
            heldChappalGroupRef.current.visible = false;
          }
          if (thrownChappalGroupRef.current) {
            thrownChappalGroupRef.current.visible = true;
            thrownChappalGroupRef.current.position.set(lockedLaneXRef.current, 0.65, projZRef.current);
          }

          const throwPan = THREE.MathUtils.clamp((lockedLaneXRef.current - _playerWorldPos.x) / 4.0, -1, 1);
          audio.playChappalThrow(throwPan);
        }
      } else if (attackStateRef.current === 'THROWN') {
        const prevZ = projZRef.current;
        projZRef.current -= THROWN_CHAPPAL_SPEED * safeDelta;
        const currZ = projZRef.current;

        if (thrownChappalGroupRef.current) {
          thrownChappalGroupRef.current.position.set(lockedLaneXRef.current, 0.65, currZ);
        }
        if (thrownChappalSpinRef.current) {
          thrownChappalSpinRef.current.rotation.x -= safeDelta * 24;
          thrownChappalSpinRef.current.rotation.y += safeDelta * 14;
        }

        // Trigger spatialized spinning chappal whoosh + screen-shake as the chappal gets within 2.6m of the player!
        if (prevZ >= 2.6 && currZ < 2.6) {
          const dxFlyby = Math.abs(lockedLaneXRef.current - _playerWorldPos.x);
          const flybyPan = THREE.MathUtils.clamp((lockedLaneXRef.current - _playerWorldPos.x) / 3.5, -1, 1);
          const proximity = THREE.MathUtils.clamp(1.38 - dxFlyby / (LANE_WIDTH * 2.2), 0.75, 1.38);
          audio.playChappalWhoosh(flybyPan, proximity);
          window.dispatchEvent(
            new CustomEvent('chappal-near', {
              detail: { intensity: 0.28 * proximity, duration: 0.38 },
            })
          );
        }

        // Swept collision check when chappal crosses player's Z plane (z = 0)
        const crossedPlayerZ = prevZ >= -0.6 && currZ <= 0.6;
        if (crossedPlayerZ) {
          const dx = Math.abs(_playerWorldPos.x - lockedLaneXRef.current);
          const playerJumpedOver = _playerWorldPos.y >= 1.15;

          if (dx < 0.85 && !playerJumpedOver) {
            // Direct Chappal Hit!
            window.dispatchEvent(new Event('player-hit'));
            window.dispatchEvent(
              new CustomEvent('particle-burst', {
                detail: { position: [lockedLaneXRef.current, 0.7, 0], color: '#ff3d00' },
              })
            );

            // Reset projectile and restore Uncle's held chappal
            attackStateRef.current = 'IDLE';
            laneDwellTimeRef.current = 0;
            trackedLaneRef.current = currentPlayerLane;
            if (thrownChappalGroupRef.current) thrownChappalGroupRef.current.visible = false;
            if (heldChappalGroupRef.current) heldChappalGroupRef.current.visible = true;
          } else {
            // Player cleanly escaped Uncle's thrown chappal (switched lanes or jumped over it)!
            useStore.getState().registerComboAction('Escaped Uncle Chappal!', 35);
            audio.playComboTick(useStore.getState().comboCount);
          }
        }

        // Reload Uncle's hand once the dodged chappal flies past the player down the street
        if (currZ < -38) {
          attackStateRef.current = 'IDLE';
          laneDwellTimeRef.current = 0;
          trackedLaneRef.current = currentPlayerLane;
          if (thrownChappalGroupRef.current) thrownChappalGroupRef.current.visible = false;
          if (heldChappalGroupRef.current) heldChappalGroupRef.current.visible = true;
        }
      }
    }

    // Smoothly damp Uncle's X, Y, Z
    uncleGroupRef.current.position.x = THREE.MathUtils.damp(
      uncleGroupRef.current.position.x,
      targetX + Math.sin(state.clock.elapsedTime * 3.5) * 0.14,
      9,
      safeDelta
    );

    uncleJumpY.current = THREE.MathUtils.damp(uncleJumpY.current, targetY, 10, safeDelta);
    uncleGroupRef.current.position.y = uncleJumpY.current;

    uncleGroupRef.current.position.z = THREE.MathUtils.damp(
      uncleGroupRef.current.position.z,
      targetZ,
      6,
      safeDelta
    );

    // When Uncle himself closes in within chappal-striking distance (<= 2.65m behind player),
    // his waving chappal slices the air right behind the player with a whoosh & screen-shake!
    if (closeSwipeCooldownRef.current > 0) {
      closeSwipeCooldownRef.current = Math.max(0, closeSwipeCooldownRef.current - safeDelta);
    }
    if (
      status === GameStatus.PLAYING &&
      attackStateRef.current === 'IDLE' &&
      uncleGroupRef.current.position.z <= 2.65 &&
      closeSwipeCooldownRef.current <= 0
    ) {
      closeSwipeCooldownRef.current = 1.65;
      const unclePan = THREE.MathUtils.clamp(
        (uncleGroupRef.current.position.x - _playerWorldPos.x) / 3.5,
        -1,
        1
      );
      audio.playChappalWhoosh(unclePan, 1.05);
      window.dispatchEvent(
        new CustomEvent('chappal-near', {
          detail: { intensity: 0.24, duration: 0.32 },
        })
      );
    }

    // Banking into lane turns
    const xDiff = targetX - uncleGroupRef.current.position.x;
    uncleGroupRef.current.rotation.z = THREE.MathUtils.damp(
      uncleGroupRef.current.rotation.z,
      -xDiff * 0.18,
      10,
      safeDelta
    );

    // Skeletal sprinting & chappal-waving / wind-up animation
    const runSpeed = status === GameStatus.PLAYING ? 28 : 6;
    const t = state.clock.elapsedTime * runSpeed;
    const shoutBoost = shoutPulseTimer.current > 0 ? 1.5 : 1.0;

    if (bodyRef.current) {
      bodyRef.current.position.y = 1.05 + Math.abs(Math.sin(t)) * 0.14;
      bodyRef.current.rotation.x = 0.18 + Math.sin(t * 2) * 0.04;
      bodyRef.current.rotation.y = Math.sin(t) * 0.12;
    }

    if (headRef.current) {
      headRef.current.rotation.z = Math.sin(t * 0.5) * 0.08 * shoutBoost;
      headRef.current.rotation.x = -0.1 + Math.abs(Math.cos(t)) * 0.08 * shoutBoost;
    }

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(t) * 0.95;
      leftArmRef.current.rotation.z = -0.2;
    }

    // Right arm animation: Wind-up cocked back -> Throw snap -> Standard waving
    if (rightArmRef.current) {
      if (attackStateRef.current === 'WINDUP') {
        rightArmRef.current.rotation.x = THREE.MathUtils.damp(
          rightArmRef.current.rotation.x,
          -3.05,
          12,
          safeDelta
        );
        rightArmRef.current.rotation.z = 0.45;
      } else if (attackStateRef.current === 'THROWN' && projZRef.current > -4) {
        rightArmRef.current.rotation.x = THREE.MathUtils.damp(
          rightArmRef.current.rotation.x,
          -0.9,
          18,
          safeDelta
        );
        rightArmRef.current.rotation.z = 0.1;
      } else {
        const waveBoost = (surgeTimer.current > 0 ? 1.6 : 1.0) * shoutBoost;
        rightArmRef.current.rotation.x = -2.45 + Math.sin(t * 1.4) * 0.45 * waveBoost;
        rightArmRef.current.rotation.z = 0.25 + Math.cos(t * 1.4) * 0.2;
      }
    }

    if (chappalHandRef.current) {
      chappalHandRef.current.rotation.x = Math.sin(t * 2) * 0.35 * shoutBoost;
    }

    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = Math.sin(t + Math.PI) * 1.15;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = Math.sin(t) * 1.15;
    }

    // Ground contact shadow
    if (shadowRef.current) {
      const h = uncleGroupRef.current.position.y;
      const s = Math.max(0.3, 1 - (h / 2.5) * 0.4);
      shadowRef.current.scale.set(s, s, s);
    }
  });

  return (
    <>
      {/* World-Space Red Lane Target Marker (Visible during 4.0s–5.0s Wind-Up) */}
      <group ref={targetMarkerGroupRef} visible={false} position={[0, 0.035, 0]}>
        {/* Bullseye Rings directly under Player (z = 0) */}
        <group ref={targetBullseyeRef}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={TARGET_OUTER_RING_GEO} material={materials.targetOuter} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={TARGET_INNER_RING_GEO} material={materials.targetInner} />
        </group>

        {/* Full-Lane Trajectory Corridor Stripe spanning from Uncle (z = +4.5) past Player to (z = -3.0) */}
        <mesh
          position={[0, -0.005, 0.75]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={TARGET_LANE_STRIPE_GEO}
          material={materials.targetStripe}
        />
        <mesh
          position={[-0.68, 0.005, 0.75]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={TARGET_BORDER_LINE_GEO}
          material={materials.targetOuter}
        />
        <mesh
          position={[0.68, 0.005, 0.75]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={TARGET_BORDER_LINE_GEO}
          material={materials.targetOuter}
        />

        {/* Forward Ground Warning Callout in front of the Player (z = -2.2) so it is never blocked */}
        {isLockingOn && status === GameStatus.PLAYING && (
          <Html
            position={[0, 0.35, -2.2]}
            center
            distanceFactor={9}
            zIndexRange={[40, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div className="bg-red-600 text-amber-100 border-2 border-yellow-300 px-3 py-1 rounded-md shadow-lg font-cyber font-extrabold text-xs tracking-wider uppercase whitespace-nowrap">
              Chappal Lock-On · Move or Jump!
            </div>
          </Html>
        )}
      </group>

      {/* World-Space Forward-Flying Thrown Chappal Projectile */}
      <group ref={thrownChappalGroupRef} visible={false} position={[0, 0.65, 3.5]}>
        <group ref={thrownChappalSpinRef}>
          <mesh castShadow geometry={THROWN_CHAPPAL_SOLE_GEO} material={materials.chappalLeather} />
          <mesh
            position={[0, 0.055, 0.08]}
            rotation={[Math.PI / 3, 0, 0]}
            geometry={THROWN_CHAPPAL_STRAP_GEO}
            material={materials.chappalGoldStrap}
          />
          <mesh geometry={THROWN_CHAPPAL_AURA_GEO} material={materials.chappalAura} />
        </group>
      </group>

      {/* Chasing Uncle 3D Character Rig (Positioned at z = 3.4..5.2 for clear spacing behind Player) */}
      <group ref={uncleGroupRef} position={[0, 0, 4.8]}>
        {/* Side-Anchored Floating Comic Speech Bubble (Offset to Uncle's right flank so center lane & lock-on reticle stay 100% clear) */}
        {(status === GameStatus.PLAYING || (status === GameStatus.INTRO && introStormedOut)) && (
          <Html
            position={[1.55, 1.45, 0.2]}
            center
            distanceFactor={8.5}
            zIndexRange={[30, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="select-none pointer-events-none transition-transform duration-150 ease-out"
              style={{
                transform: popScale ? 'scale(1.1) rotate(-1deg)' : 'scale(1) rotate(0deg)',
              }}
            >
              <div
                className={`relative px-3 py-1.5 rounded-xl border-[2.5px] border-[#1c0d06] shadow-[3px_3px_0px_#1c0d06] min-w-[145px] max-w-[195px] text-left ${
                  isUrgent ? 'bg-[#fef08a]' : 'bg-[#fffbeb]'
                }`}
              >
                <div
                  className={`text-[9px] font-extrabold uppercase tracking-wider mb-0.5 ${
                    isUrgent ? 'text-red-700' : 'text-amber-800'
                  }`}
                >
                  {isLockingOn ? 'Throwing Chappal!' : isUrgent ? 'Sharma Uncle · Close!' : 'Sharma Uncle'}
                </div>
                <p className="font-cyber font-extrabold text-[#1c0d06] text-[11px] md:text-xs leading-tight">
                  “{dialogue}”
                </p>

                {/* Left-Pointing Comic Speech Tail toward Uncle's Head */}
                <div
                  className={`absolute top-1/2 -left-2 -translate-y-1/2 w-3.5 h-3.5 rotate-45 border-l-[2.5px] border-b-[2.5px] border-[#1c0d06] ${
                    isUrgent ? 'bg-[#fef08a]' : 'bg-[#fffbeb]'
                  }`}
                />
              </div>
            </div>
          </Html>
        )}

        <group ref={bodyRef} position={[0, 1.05, 0]}>
          {/* Kurta Torso & Nehru Jacket (Sadri) */}
          <mesh castShadow position={[0, 0.22, 0]} geometry={KURTA_TORSO_GEO} material={materials.kurta} />
          <mesh castShadow position={[0, 0.24, 0]} scale={[1.02, 1, 0.98]} geometry={VEST_GEO} material={materials.vest} />

          {/* Prominent Uncle Potbelly */}
          <mesh castShadow position={[0, 0.12, -0.14]} scale={[1.05, 0.95, 1.0]} geometry={BELLY_GEO} material={materials.kurta} />

          {/* Lower Kurta Flare */}
          <mesh castShadow position={[0, -0.12, 0]} geometry={KURTA_FLARE_GEO} material={materials.kurta} />

          {/* Uncle Head */}
          <group ref={headRef} position={[0, 0.72, -0.02]}>
            <mesh castShadow geometry={HEAD_GEO} material={materials.skin} />

            {/* Balding Crown with Side & Back Hair Fringe */}
            <mesh castShadow position={[0, 0.02, 0.06]} geometry={HAIR_SIDE_GEO} material={materials.hair} />

            {/* Salt-and-Pepper Beard */}
            <mesh position={[0, -0.08, -0.05]} scale={[1.0, 0.85, 1.0]} geometry={BEARD_GEO} material={materials.hair} />

            {/* Iconic Handlebar Mustache (Mooch) */}
            <mesh position={[-0.08, -0.04, -0.21]} rotation={[0, 0, Math.PI / 2.3]} geometry={MUSTACHE_GEO} material={materials.mustache} />
            <mesh position={[0.08, -0.04, -0.21]} rotation={[0, 0, -Math.PI / 2.3]} geometry={MUSTACHE_GEO} material={materials.mustache} />

            {/* Spectacles */}
            <mesh position={[-0.08, 0.04, -0.21]} geometry={GLASS_FRAME_GEO} material={materials.glasses} />
            <mesh position={[0.08, 0.04, -0.21]} geometry={GLASS_FRAME_GEO} material={materials.glasses} />

            {/* Angry Furrowed Eyebrows */}
            <mesh position={[-0.08, 0.12, -0.21]} rotation={[0, 0, -0.3]} geometry={EYEBROW_GEO} material={materials.mustache} />
            <mesh position={[0.08, 0.12, -0.21]} rotation={[0, 0, 0.3]} geometry={EYEBROW_GEO} material={materials.mustache} />
          </group>

          {/* Left Arm */}
          <group position={[-0.38, 0.42, 0]}>
            <group ref={leftArmRef}>
              <mesh castShadow position={[0, -0.22, 0]} geometry={ARM_GEO} material={materials.kurta} />
              <mesh position={[0, -0.5, 0]} geometry={HAND_GEO} material={materials.skin} />
            </group>
          </group>

          {/* Right Arm Raised Holding the Chappal! */}
          <group position={[0.38, 0.42, 0]}>
            <group ref={rightArmRef}>
              <mesh castShadow position={[0, -0.22, 0]} geometry={ARM_GEO} material={materials.kurta} />
              <group ref={chappalHandRef} position={[0, -0.5, 0]}>
                <mesh geometry={HAND_GEO} material={materials.skin} />
                {/* The Mighty Chappal (Slipper) in Uncle's Hand (hidden while flying through the air) */}
                <group ref={heldChappalGroupRef} position={[0, -0.12, -0.1]} rotation={[Math.PI / 2, 0, 0.2]}>
                  <mesh castShadow geometry={CHAPPAL_SOLE_GEO} material={materials.chappalLeather} />
                  <mesh position={[0, 0.03, -0.03]} rotation={[Math.PI / 3, 0, 0]} geometry={CHAPPAL_STRAP_GEO} material={materials.vest} />
                </group>
              </group>
            </group>
          </group>

          {/* Left Dhoti Leg & Chappal */}
          <group position={[-0.15, -0.22, 0]}>
            <group ref={leftLegRef}>
              <mesh castShadow position={[0, -0.28, 0]} geometry={DHOTI_LEG_GEO} material={materials.dhoti} />
              <mesh position={[0, -0.62, -0.05]} geometry={CHAPPAL_SOLE_GEO} material={materials.chappalLeather} />
            </group>
          </group>

          {/* Right Dhoti Leg & Chappal */}
          <group position={[0.15, -0.22, 0]}>
            <group ref={rightLegRef}>
              <mesh castShadow position={[0, -0.28, 0]} geometry={DHOTI_LEG_GEO} material={materials.dhoti} />
              <mesh position={[0, -0.62, -0.05]} geometry={CHAPPAL_SOLE_GEO} material={materials.chappalLeather} />
            </group>
          </group>
        </group>

        {/* Contact Grounding Shadow */}
        <mesh
          ref={shadowRef}
          position={[0, 0.025, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          geometry={SHADOW_GEO}
          material={materials.shadow}
        />
      </group>
    </>
  );
};
