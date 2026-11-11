/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { Suspense, useRef } from 'react';
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

// Dynamic Camera Controller with frame-rate independent exponential damping
const CameraController = () => {
  const { camera, size } = useThree();
  const { laneCount, status } = useStore();
  const lookTargetRef = useRef(new THREE.Vector3(0, 0.3, -24));

  useFrame((_, delta) => {
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
        camY = THREE.MathUtils.lerp(4.2, 6.2, swoopRatio);
        camZ = THREE.MathUtils.lerp(7.2, 10.0, swoopRatio);
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

    const heightFactor = isMobile ? 2.0 : 0.5;
    const distFactor = isMobile ? 4.5 : 1.0;

    const extraLanes = Math.max(0, laneCount - 3);

    const targetY = 6.2 + extraLanes * heightFactor;
    const targetZ = 10.0 + extraLanes * distFactor;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 4, safeDelta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4, safeDelta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4, safeDelta);

    lookTargetRef.current.x = THREE.MathUtils.damp(lookTargetRef.current.x, 0, 6, safeDelta);
    lookTargetRef.current.y = THREE.MathUtils.damp(lookTargetRef.current.y, 0.3, 6, safeDelta);
    lookTargetRef.current.z = THREE.MathUtils.damp(lookTargetRef.current.z, -24, 6, safeDelta);
    camera.lookAt(lookTargetRef.current);
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
          toneMappingExposure: 1.1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ position: [0, 5.5, 8.2], fov: 60 }}
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
