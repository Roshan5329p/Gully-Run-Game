/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from './components/World/Environment';
import { Player } from './components/World/Player';
import { UncleChaser } from './components/World/UncleChaser';
import { LevelManager } from './components/World/LevelManager';
import { Effects, isSoftwareGl } from './components/World/Effects';
import { HUD } from './components/UI/HUD';
import { useStore } from './store';

// Dynamic Camera Controller with frame-rate independent exponential damping
const CameraController = () => {
  const { camera, size } = useThree();
  const { laneCount } = useStore();

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const aspect = size.width / size.height;
    const isMobile = aspect < 1.2;

    const heightFactor = isMobile ? 2.0 : 0.5;
    const distFactor = isMobile ? 4.5 : 1.0;

    const extraLanes = Math.max(0, laneCount - 3);

    const targetY = 6.2 + extraLanes * heightFactor;
    const targetZ = 10.0 + extraLanes * distFactor;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 4, safeDelta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4, safeDelta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4, safeDelta);

    camera.lookAt(0, 0.3, -24);
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
