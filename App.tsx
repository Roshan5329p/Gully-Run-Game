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

  // Camera shake state — used sparingly only on major obstacle collisions with a cooldown
  const shakeTimerRef = useRef(0);
  const shakeDurationRef = useRef(0.36);
  const shakeIntensityRef = useRef(0);
  const lastMajorShakeTimeRef = useRef(0);

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

    window.addEventListener('major-collision', triggerMajorCollisionShake);
    return () => {
      window.removeEventListener('major-collision', triggerMajorCollisionShake);
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

    // Smooth Y-lerp camera tracking so double jumps maintain clear forward visibility without losing player framing
    const targetX = playerX * (isMobile ? 0.72 : 0.58);
    const targetY = 4.45 + cappedExtraLanes * heightFactor + playerY * 0.48;
    const targetZ = 6.55 + cappedExtraLanes * distFactor;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 7, safeDelta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 5, safeDelta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4, safeDelta);

    lookTargetRef.current.x = THREE.MathUtils.damp(lookTargetRef.current.x, playerX * 0.48, 8, safeDelta);
    lookTargetRef.current.y = THREE.MathUtils.damp(lookTargetRef.current.y, 0.85 + playerY * 0.32, 6, safeDelta);
    lookTargetRef.current.z = THREE.MathUtils.damp(lookTargetRef.current.z, -24, 6, safeDelta);

    // Apply decaying Screen-Shake when Uncle's Chappal whooshes within range of the player
    if (shakeTimerRef.current > 0) {
      shakeTimerRef.current = Math.max(0, shakeTimerRef.current - safeDelta);
      const decay =
        shakeDurationRef.current > 0 ? shakeTimerRef.current / shakeDurationRef.current : 0;
      const amp = shakeIntensityRef.current * decay * decay;
      const t = state.clock.elapsedTime;
      const shakeX = (Math.sin(t * 68) + Math.cos(t * 93) * 0.6) * amp;
      const shakeY = (Math.cos(t * 74) + Math.sin(t * 107) * 0.6) * amp * 0.85;

      camera.position.x += shakeX;
      camera.position.y += shakeY;
      camera.lookAt(
        lookTargetRef.current.x + shakeX * 1.35,
        lookTargetRef.current.y + shakeY * 1.35,
        lookTargetRef.current.z
      );
      camera.rotation.z += Math.sin(t * 58) * amp * 0.055;
    } else {
      camera.lookAt(lookTargetRef.current);
    }
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
