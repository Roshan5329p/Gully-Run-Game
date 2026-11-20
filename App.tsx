/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from './components/World/Environment';
import { Player } from './components/World/Player';
import { UncleChaser } from './components/World/UncleChaser';
import { LevelManager } from './components/World/LevelManager';
import { IntroCutscene } from './components/World/IntroCutscene';
import { Effects, isSoftwareGl } from './components/World/Effects';
import { HUD } from './components/UI/HUD';
import { useStore } from './store';
import { GameStatus } from './types';

// Dynamic Camera Controller with frame-rate independent exponential damping & Chappal Proximity Screen-Shake
const CameraController = () => {
  const { camera, size, scene } = useThree();
  const { laneCount, status } = useStore();
  const lookTargetRef = useRef(new THREE.Vector3(0, 0.3, -24));
  const playerGroupRef = useRef<THREE.Object3D | null>(null);

  // Camera shake, brief micro-shake & physical landing compression / lane-cut roll state
  const shakeTimerRef = useRef(0);
  const shakeDurationRef = useRef(0.36);
  const shakeIntensityRef = useRef(0);
  const lastMajorShakeTimeRef = useRef(0);
  const microShakeTimerRef = useRef(0);
  const microShakeAmpRef = useRef(0);
  const landingDipRef = useRef(0);
  const laneRollRef = useRef(0);

  useEffect(() => {
    const triggerMajorCollisionShake = () => {
      if (useStore.getState().reducedCameraShake) return;
      const now = performance.now();
      // Enforce a 1.4s minimum cooldown so camera shake is used sparingly on major impacts only
      if (now - lastMajorShakeTimeRef.current < 1400) return;
      lastMajorShakeTimeRef.current = now;
      shakeIntensityRef.current = 0.42;
      shakeDurationRef.current = 0.36;
      shakeTimerRef.current = 0.36;
    };

    const handleMicroShake = (e: Event) => {
      if (useStore.getState().reducedCameraShake) return;
      const customEv = e as CustomEvent<{ intensity?: number; duration?: number; dip?: number }>;
      microShakeAmpRef.current = Math.max(microShakeAmpRef.current, customEv.detail?.intensity ?? 0.085);
      microShakeTimerRef.current = Math.max(microShakeTimerRef.current, customEv.detail?.duration ?? 0.12);
      if (customEv.detail?.dip) {
        landingDipRef.current = Math.max(landingDipRef.current, customEv.detail.dip);
      }
    };

    const handlePlayerLanded = (e: Event) => {
      const customEv = e as CustomEvent<{ impactVel?: number }>;
      const impactVel = customEv.detail?.impactVel || 12;
      const reduced = useStore.getState().reducedCameraShake;
      landingDipRef.current = reduced ? 0.05 : Math.min(0.28, impactVel * 0.011);
      if (!reduced && impactVel > 16) {
        microShakeAmpRef.current = Math.max(microShakeAmpRef.current, 0.075);
        microShakeTimerRef.current = Math.max(microShakeTimerRef.current, 0.12);
      }
    };

    window.addEventListener('major-collision', triggerMajorCollisionShake);
    window.addEventListener('micro-shake', handleMicroShake);
    window.addEventListener('player-landed', handlePlayerLanded);
    return () => {
      window.removeEventListener('major-collision', triggerMajorCollisionShake);
      window.removeEventListener('micro-shake', handleMicroShake);
      window.removeEventListener('player-landed', handlePlayerLanded);
    };
  }, []);

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const aspect = size.width / size.height;
    const isMobile = aspect < 1.2;

    if (status === GameStatus.INTRO) {
      const introT = (window as any).__gullyIntroTime || 0;
      let camX = -2.4;
      let camY = 2.5;
      let camZ = 4.2;
      let lookX = 0.8;
      let lookY = 1.4;
      let lookZ = 0.2;

      if (introT >= 1.1 && introT < 2.95) {
        // Frame Sharma Uncle's window shattering & the player's reaction!
        camX = -1.6;
        camY = 3.1;
        camZ = 5.4;
        lookX = 1.6;
        lookY = 2.45;
        lookZ = 1.9;
      } else if (introT >= 2.95) {
        // Frame Sharma Uncle storming out onto the street & swoop behind the runner!
        const swoopRatio = Math.min(1, (introT - 2.95) / 2.2);
        camX = THREE.MathUtils.lerp(-0.8, 0, swoopRatio);
        camY = THREE.MathUtils.lerp(4.2, 5.8, swoopRatio);
        camZ = THREE.MathUtils.lerp(7.2, 9.2, swoopRatio);
        lookX = 0;
        lookY = THREE.MathUtils.lerp(1.3, 0.3, swoopRatio);
        lookZ = THREE.MathUtils.lerp(0.8, -18, swoopRatio);
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, camX, 6, safeDelta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, camY, 6, safeDelta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, camZ, 6, safeDelta);

      lookTargetRef.current.x = THREE.MathUtils.damp(lookTargetRef.current.x, lookX, 8, safeDelta);
      lookTargetRef.current.y = THREE.MathUtils.damp(lookTargetRef.current.y, lookY, 8, safeDelta);
      lookTargetRef.current.z = THREE.MathUtils.damp(lookTargetRef.current.z, lookZ, 8, safeDelta);
      camera.lookAt(lookTargetRef.current);
      return;
    }

    // Locate the player's 3D group so the camera can smoothly follow horizontal lane movement
    if (!playerGroupRef.current) {
      const pg = scene.getObjectByName('PlayerGroup');
      if (pg && pg.children.length > 0) {
        playerGroupRef.current = pg.children[0];
      }
    }
    const playerX = playerGroupRef.current ? playerGroupRef.current.position.x : 0;
    const playerY = playerGroupRef.current ? Math.max(0, playerGroupRef.current.position.y) : 0;

    // Cap camera pullback at 2 extra lanes max so Wave 3+ never zooms far out
    const cappedExtraLanes = Math.min(2, Math.max(0, laneCount - 3));
    const heightFactor = isMobile ? 0.42 : 0.18;
    const distFactor = isMobile ? 0.82 : 0.32;

    const { speed, isChaiBoostActive, reducedCameraShake, lives, isStumbling, level } = useStore.getState();

    // Speed-reactive FOV expansion (+6 to +8 deg during Chai Rush / high-speed waves)
    if (camera instanceof THREE.PerspectiveCamera) {
      const isHighSpeedWave = status === GameStatus.PLAYING && (level >= 3 || speed >= 26);
      const speedBonus =
        status === GameStatus.PLAYING
          ? isHighSpeedWave
            ? THREE.MathUtils.clamp(6.0 + Math.max(0, speed - 26) * 0.15, 6.0, 8.0)
            : Math.min(3.2, Math.max(0, (speed - 20) * 0.42))
          : 0;
      const chaiFovBoost = isChaiBoostActive && status === GameStatus.PLAYING ? 7.2 : 0;
      const targetFov = THREE.MathUtils.clamp(60 + Math.max(speedBonus, chaiFovBoost), 60, 68);
      const nextFov = THREE.MathUtils.damp(camera.fov, targetFov, 5, safeDelta);
      if (Math.abs(camera.fov - nextFov) > 0.01) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }

    // Smooth Y-lerp camera tracking + physical landing compression dip
    landingDipRef.current = THREE.MathUtils.damp(landingDipRef.current, 0, 14, safeDelta);
    const targetX = playerX * (isMobile ? 0.72 : 0.58);
    const targetY = 4.45 + cappedExtraLanes * heightFactor + playerY * 0.48 - landingDipRef.current;
    const targetZ = 6.55 + cappedExtraLanes * distFactor;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 7, safeDelta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 5, safeDelta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4, safeDelta);

    lookTargetRef.current.x = THREE.MathUtils.damp(lookTargetRef.current.x, playerX * 0.48, 8, safeDelta);
    lookTargetRef.current.y = THREE.MathUtils.damp(lookTargetRef.current.y, 0.85 + playerY * 0.32 - landingDipRef.current * 0.45, 6, safeDelta);
    lookTargetRef.current.z = THREE.MathUtils.damp(lookTargetRef.current.z, -24, 6, safeDelta);

    // Subtle Dutch roll camera banking (+/- 0.04 rad) during horizontal lane switches
    const targetRoll = reducedCameraShake ? 0 : THREE.MathUtils.clamp((targetX - camera.position.x) * -0.036, -0.04, 0.04);
    laneRollRef.current = THREE.MathUtils.damp(laneRollRef.current, targetRoll, 10, safeDelta);

    // Combine major collision shake, brief 120ms impact/near-miss micro-shake, and Uncle close-range heartbeat tremor
    let offsetX = 0;
    let offsetY = 0;
    let extraRoll = 0;
    const t = state.clock.elapsedTime;

    if (shakeTimerRef.current > 0) {
      shakeTimerRef.current = Math.max(0, shakeTimerRef.current - safeDelta);
      const decay =
        shakeDurationRef.current > 0 ? shakeTimerRef.current / shakeDurationRef.current : 0;
      const amp = shakeIntensityRef.current * decay * decay;
      offsetX += (Math.sin(t * 68) + Math.cos(t * 93) * 0.6) * amp;
      offsetY += (Math.cos(t * 74) + Math.sin(t * 107) * 0.6) * amp * 0.85;
      extraRoll += Math.sin(t * 58) * amp * 0.055;
    }

    if (microShakeTimerRef.current > 0) {
      microShakeTimerRef.current = Math.max(0, microShakeTimerRef.current - safeDelta);
      const mDecay = Math.min(1, microShakeTimerRef.current / 0.12);
      const mAmp = microShakeAmpRef.current * mDecay;
      if (microShakeTimerRef.current <= 0) microShakeAmpRef.current = 0;
      offsetX += Math.sin(t * 92) * mAmp;
      offsetY += Math.cos(t * 110) * mAmp * 0.9;
      extraRoll += Math.sin(t * 76) * mAmp * 0.03;
    }

    if (
      status === GameStatus.PLAYING &&
      !isChaiBoostActive &&
      !reducedCameraShake &&
      (lives <= 2 || isStumbling)
    ) {
      const urgencyScale = lives <= 1 || isStumbling ? 1.0 : 0.65;
      const hbPhase = (t * 1.35) % 1;
      const lub = Math.exp(-Math.pow((hbPhase - 0.14) * 18, 2));
      const dub = Math.exp(-Math.pow((hbPhase - 0.28) * 18, 2)) * 0.72;
      const pulse = (lub + dub) * urgencyScale;
      offsetX += Math.sin(t * 48) * pulse * 0.028;
      offsetY += Math.cos(t * 56) * pulse * 0.022;
    }

    camera.position.x += offsetX;
    camera.position.y += offsetY;
    camera.lookAt(
      lookTargetRef.current.x + offsetX * 1.35,
      lookTargetRef.current.y + offsetY * 1.35,
      lookTargetRef.current.z
    );
    camera.rotation.z += laneRollRef.current + extraRoll;
  });

  return null;
};

function Scene() {
  return (
    <>
      <Environment />
      <group>
        {/* Player Group identified for LevelManager and UncleChaser tracking */}
        <group userData={{ isPlayer: true }} name="PlayerGroup">
          <Player />
        </group>
        {/* Gully Cricket Sixer & Shattered Window Intro Scene */}
        <IntroCutscene />
        {/* Angry Neighborhood Uncle chasing the player */}
        <UncleChaser />
        <LevelManager />
      </group>
      <Effects />
    </>
  );
}

function App() {
  return (
    <div className="relative w-full h-screen bg-[#2a120a] overflow-hidden select-none">
      <HUD />
      <Canvas
        shadows={!isSoftwareGl}
        dpr={isSoftwareGl ? 1 : [1, 2]}
        gl={{
          antialias: !isSoftwareGl,
          stencil: false,
          depth: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ position: [0, 4.45, 6.55], fov: 60 }}
      >
        <CameraController />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
