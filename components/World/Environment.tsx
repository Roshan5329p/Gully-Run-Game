/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStore, calculateGullyLightingGrade, getEnvironmentZone } from '../../store';
import { LANE_WIDTH, GameStatus } from '../../types';
import { audio } from '../System/Audio';

// Building & Prop Shared Geometries
const BUILDING_BASE_GEO = new THREE.BoxGeometry(5.5, 8.5, 9.0);
const BUILDING_UPPER_GEO = new THREE.BoxGeometry(5.1, 4.5, 8.4);
const PARAPET_GEO = new THREE.BoxGeometry(5.6, 0.7, 9.2);
const AWNING_GEO = new THREE.BoxGeometry(1.8, 0.25, 8.2);
const SIGNBOARD_GEO = new THREE.BoxGeometry(0.25, 1.4, 7.6);
const BALCONY_GEO = new THREE.BoxGeometry(1.2, 0.9, 4.5);
const WATER_TANK_GEO = new THREE.CylinderGeometry(0.75, 0.75, 1.4, 12);
const SHUTTER_GEO = new THREE.BoxGeometry(0.15, 3.2, 6.8);
const POLE_GEO = new THREE.CylinderGeometry(0.12, 0.16, 8.5, 8);
const POLE_ARM_GEO = new THREE.BoxGeometry(1.4, 0.12, 0.12);
const LAMP_BULB_GEO = new THREE.SphereGeometry(0.24, 10, 10);
const LAMP_HALO_GEO = new THREE.SphereGeometry(0.95, 12, 12);
const LAMP_POOL_GEO = new THREE.CircleGeometry(3.4, 16);
const MARIGOLD_CLUSTER_GEO = new THREE.SphereGeometry(0.22, 8, 8);
const BUNTING_FLAG_GEO = new THREE.ConeGeometry(0.24, 0.48, 3);
const DOME_GEO = new THREE.SphereGeometry(12, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const SPIRE_GEO = new THREE.ConeGeometry(2.2, 9, 8);

// Roadside Palm Trees, Market Stalls, Barrels, Matka Pots & Hanging Shop Signs (Inspired by Reference Street Scene)
const PALM_TRUNK_GEO = new THREE.CylinderGeometry(0.16, 0.26, 6.4, 8);
const PALM_FROND_GEO = new THREE.BoxGeometry(2.3, 0.08, 0.52);
const PALM_GRATE_GEO = new THREE.BoxGeometry(1.3, 0.06, 1.3);
const STALL_POST_GEO = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
const STALL_CANOPY_GEO = new THREE.BoxGeometry(1.85, 0.14, 3.4);
const STALL_TABLE_GEO = new THREE.BoxGeometry(1.4, 0.75, 2.8);
const BARREL_GEO = new THREE.CylinderGeometry(0.36, 0.32, 0.88, 10);
const MATKA_POT_GEO = new THREE.SphereGeometry(0.26, 10, 10);
const HANGING_BRACKET_GEO = new THREE.BoxGeometry(1.4, 0.08, 0.08);
const HANGING_SIGN_GEO = new THREE.BoxGeometry(0.1, 1.15, 1.15);

// Shared smoothed day/night & sunset progress
const sunsetState = {
  progress: 0,
  nightFactor: 0,
  lampIntensity: 0,
};

// Helper to interpolate across 3 time-of-day color stops (Afternoon -> Golden Hour -> Sunset/Dusk)
function sampleThreeStopColor(
  t: number,
  afternoon: THREE.Color,
  goldenHour: THREE.Color,
  sunset: THREE.Color,
  target: THREE.Color
): THREE.Color {
  if (t <= 0.5) {
    return target.lerpColors(afternoon, goldenHour, t * 2);
  }
  return target.lerpColors(goldenHour, sunset, (t - 0.5) * 2);
}

interface ShopSpec {
  titleHindi: string;
  titleEng: string;
  bg: string;
  text: string;
  border: string;
  wallColor: string;
  trimColor: string;
  awningColor: string;
}

const SHOP_SPECS: ShopSpec[] = [
  {
    titleHindi: 'शर्मा स्वीट्स',
    titleEng: 'SHARMA SWEETS',
    bg: '#b91c1c',
    text: '#fef08a',
    border: '#f59e0b',
    wallColor: '#e07a5f', // Jaipur Terracotta Pink
    trimColor: '#f4f1de',
    awningColor: '#d97706',
  },
  {
    titleHindi: 'राजू चायवाला',
    titleEng: 'RAJU CHAI TAPRI',
    bg: '#1e3a8a',
    text: '#ffffff',
    border: '#38bdf8',
    wallColor: '#eab308', // Marigold Ochre
    trimColor: '#78350f',
    awningColor: '#15803d',
  },
  {
    titleHindi: 'गुप्ता किराना',
    titleEng: 'GUPTA KIRANA',
    bg: '#065f46',
    text: '#fde047',
    border: '#fbbf24',
    wallColor: '#60a5fa', // Jodhpur Blue
    trimColor: '#eff6ff',
    awningColor: '#dc2626',
  },
  {
    titleHindi: 'शाही लस्सी घर',
    titleEng: 'ROYAL LASSI',
    bg: '#7c2d12',
    text: '#fed7aa',
    border: '#fb923c',
    wallColor: '#f3d5b5', // Warm Sandstone
    trimColor: '#9a3412',
    awningColor: '#0284c7',
  },
  {
    titleHindi: 'बॉम्बे टेलर्स',
    titleEng: 'BOMBAY TAILORS',
    bg: '#581c87',
    text: '#f5d0fe',
    border: '#e879f9',
    wallColor: '#6ee7b7', // Mint Haveli Green
    trimColor: '#064e3b',
    awningColor: '#ea580c',
  },
  {
    titleHindi: 'लक्ष्मी भंडार',
    titleEng: 'LAXMI BAZAAR',
    bg: '#991b1b',
    text: '#ffffff',
    border: '#facc15',
    wallColor: '#fb923c', // Saffron Orange
    trimColor: '#431407',
    awningColor: '#2563eb',
  },
];

// Studio RoomEnvironment reflection initializer for PBR materials
const StudioEnvironmentSetup: React.FC = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();
    return () => {
      envTexture.dispose();
    };
  }, [gl, scene]);

  return null;
};

// Dynamic Skybox Dome, Atmospheric Fog, and Full Day/Night Colour Grading Controller
const DynamicSkyAndLighting: React.FC = () => {
  const { gl, scene } = useThree();
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.PointLight>(null);
  const streetLightNearRef = useRef<THREE.PointLight>(null);
  const streetLightFarRef = useRef<THREE.PointLight>(null);

  const scratchColors = useMemo(
    () => ({
      zenith: new THREE.Color('#1d4ed8'),
      mid: new THREE.Color('#60a5fa'),
      horizon: new THREE.Color('#fef3c7'),
      sunDisc: new THREE.Color('#fffef0'),
      hemiSky: new THREE.Color('#e0f2fe'),
      hemiGround: new THREE.Color('#a1623b'),
      dir: new THREE.Color('#fffdf4'),
      rim: new THREE.Color('#fef08a'),
      targetZenith: new THREE.Color(),
      targetMid: new THREE.Color(),
      targetHorizon: new THREE.Color(),
      targetSunDisc: new THREE.Color(),
      targetHemiSky: new THREE.Color(),
      targetHemiGround: new THREE.Color(),
      targetDir: new THREE.Color(),
      targetRim: new THREE.Color(),
      // Cutting Chai Warm Masala-Amber Grade Targets
      chaiZenithWarm: new THREE.Color('#92400e'),
      chaiMidWarm: new THREE.Color('#ea580c'),
      chaiHorizonWarm: new THREE.Color('#f59e0b'),
      chaiSunWarm: new THREE.Color('#fde047'),
      sunDirVec: new THREE.Vector3(0.2, 0.55, -0.8).normalize(),
    }),
    []
  );

  const chaiWarmthRef = useRef(0);
  const smoothedScoreRef = useRef(0);
  const smoothedDistRef = useRef(0);

  const skyUniforms = useMemo(
    () => ({
      uZenithColor: { value: new THREE.Color('#1d4ed8') },
      uMidColor: { value: new THREE.Color('#60a5fa') },
      uHorizonColor: { value: new THREE.Color('#fef3c7') },
      uSunColor: { value: new THREE.Color('#fffef0') },
      uSunDir: { value: new THREE.Vector3(0.18, 0.52, -0.83).normalize() },
      uGoldenHourFactor: { value: 0.0 },
      uNightFactor: { value: 0.0 },
      uTime: { value: 0.0 },
    }),
    []
  );

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const { score, distance, isChaiBoostActive } = useStore.getState();

    // Smoothly damp score & distance inputs so sudden score jumps (combos, wave clears)
    // produce a gradual, cinematic colour-grading transition rather than an abrupt snap.
    const dampLambda = score === 0 && distance < 5 ? 8.0 : 1.35;
    smoothedScoreRef.current = THREE.MathUtils.damp(
      smoothedScoreRef.current,
      score,
      dampLambda,
      safeDelta
    );
    smoothedDistRef.current = THREE.MathUtils.damp(
      smoothedDistRef.current,
      distance,
      dampLambda,
      safeDelta
    );

    // Compute the continuous Day/Night cycle lighting & colour grading profile
    const grade = calculateGullyLightingGrade(
      smoothedScoreRef.current,
      smoothedDistRef.current
    );

    sunsetState.progress = grade.sunsetProgress;
    sunsetState.nightFactor = grade.nightFactor;
    sunsetState.lampIntensity = grade.lampIntensity;

    // Smoothly ramp the Golden Masala-Amber Colour Grade when Cutting Chai is active
    chaiWarmthRef.current = THREE.MathUtils.damp(
      chaiWarmthRef.current,
      isChaiBoostActive ? 1.0 : 0.0,
      5.5,
      safeDelta
    );
    const chaiW = chaiWarmthRef.current;

    // Parse target hex colors from the lighting grade profile
    scratchColors.targetZenith.set(grade.zenithHex);
    scratchColors.targetMid.set(grade.midSkyHex);
    scratchColors.targetHorizon.set(grade.horizonHex);
    scratchColors.targetSunDisc.set(grade.sunDiscHex);
    scratchColors.targetHemiSky.set(grade.hemiSkyHex);
    scratchColors.targetHemiGround.set(grade.hemiGroundHex);
    scratchColors.targetDir.set(grade.dirSunHex);
    scratchColors.targetRim.set(grade.rimLightHex);

    // Apply Golden Masala-Amber Colour Grade shift when Cutting Chai is active
    if (chaiW > 0.005) {
      scratchColors.targetZenith.lerp(scratchColors.chaiZenithWarm, chaiW * 0.42);
      scratchColors.targetMid.lerp(scratchColors.chaiMidWarm, chaiW * 0.48);
      scratchColors.targetHorizon.lerp(scratchColors.chaiHorizonWarm, chaiW * 0.52);
      scratchColors.targetHemiSky.lerp(scratchColors.chaiSunWarm, chaiW * 0.55);
      scratchColors.targetHemiGround.lerp(scratchColors.chaiMidWarm, chaiW * 0.45);
      scratchColors.targetDir.lerp(scratchColors.chaiSunWarm, chaiW * 0.6);
      scratchColors.targetRim.lerp(scratchColors.chaiHorizonWarm, chaiW * 0.65);
    }

    scratchColors.zenith.copy(scratchColors.targetZenith);
    scratchColors.mid.copy(scratchColors.targetMid);
    scratchColors.horizon.copy(scratchColors.targetHorizon);
    scratchColors.sunDisc.copy(scratchColors.targetSunDisc);

    // Update skybox sun/moon direction vector
    const sunElevation = THREE.MathUtils.lerp(0.56, 0.18, grade.sunsetProgress * (1 - grade.nightFactor * 0.45));
    const sunAzimuthX = THREE.MathUtils.lerp(0.24, -0.14, grade.sunsetProgress);
    scratchColors.sunDirVec.set(sunAzimuthX, sunElevation, -0.88).normalize();

    if (skyMatRef.current) {
      skyMatRef.current.uniforms.uZenithColor.value.copy(scratchColors.zenith);
      skyMatRef.current.uniforms.uMidColor.value.copy(scratchColors.mid);
      skyMatRef.current.uniforms.uHorizonColor.value.copy(scratchColors.horizon);
      skyMatRef.current.uniforms.uSunColor.value.copy(scratchColors.sunDisc);
      skyMatRef.current.uniforms.uSunDir.value.copy(scratchColors.sunDirVec);
      skyMatRef.current.uniforms.uGoldenHourFactor.value = Math.min(
        1,
        grade.goldenHourFactor + chaiW * 0.35
      );
      skyMatRef.current.uniforms.uNightFactor.value = grade.nightFactor;
      skyMatRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }

    // Update renderer ACES Filmic tone mapping exposure (controlled to avoid daytime white washout)
    gl.toneMappingExposure = grade.toneMappingExposure + chaiW * 0.02;

    // Sync scene background and atmospheric fog with horizon color
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(scratchColors.horizon);
    } else {
      scene.background = scratchColors.horizon.clone();
    }

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(scratchColors.horizon);
      scene.fog.near = grade.fogNear - chaiW * 4;
      scene.fog.far = grade.fogFar;
    }

    // Update Hemisphere Light
    if (hemiLightRef.current) {
      hemiLightRef.current.color.copy(scratchColors.targetHemiSky);
      hemiLightRef.current.groundColor.copy(scratchColors.targetHemiGround);
      hemiLightRef.current.intensity = grade.hemiIntensity + chaiW * 0.12;
    }

    // Update Directional Sunlight/Moonlight angle, color, and intensity
    if (dirLightRef.current) {
      dirLightRef.current.color.copy(scratchColors.targetDir);
      dirLightRef.current.intensity = grade.dirSunIntensity + chaiW * 0.2;
      dirLightRef.current.position.set(
        grade.dirSunPosition[0],
        grade.dirSunPosition[1],
        grade.dirSunPosition[2]
      );
    }

    // Update Horizon Rim Light
    if (rimLightRef.current) {
      rimLightRef.current.color.copy(scratchColors.targetRim);
      rimLightRef.current.intensity = grade.rimLightIntensity + chaiW * 0.5;
    }

    // Update Dynamic Street Lamp Illumination along the active road corridor
    const lampLightPower = sunsetState.lampIntensity * 3.1 + chaiW * 0.8;
    if (streetLightNearRef.current) {
      streetLightNearRef.current.intensity = lampLightPower;
    }
    if (streetLightFarRef.current) {
      streetLightFarRef.current.intensity = lampLightPower;
    }
  });

  return (
    <>
      <color attach="background" args={['#fef3c7']} />
      <fog attach="fog" args={['#fef3c7', 48, 185]} />

      {/* Procedural Gradient Skybox Dome with Day/Night Cycle, Sun/Moon Disc & Twinkling Night Stars */}
      <mesh position={[0, 0, -60]} scale={[1, 1, 1]}>
        <sphereGeometry args={[230, 32, 24]} />
        <shaderMaterial
          ref={skyMatRef}
          uniforms={skyUniforms}
          side={THREE.BackSide}
          depthWrite={false}
          vertexShader={`
            varying vec3 vWorldPos;
            void main() {
              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vWorldPos = worldPosition.xyz;
              gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
          `}
          fragmentShader={`
            varying vec3 vWorldPos;
            uniform vec3 uZenithColor;
            uniform vec3 uMidColor;
            uniform vec3 uHorizonColor;
            uniform vec3 uSunColor;
            uniform vec3 uSunDir;
            uniform float uGoldenHourFactor;
            uniform float uNightFactor;
            uniform float uTime;

            float hash(vec2 p) {
              return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
            }

            void main() {
              vec3 viewDir = normalize(vWorldPos);
              float h = clamp(viewDir.y, 0.0, 1.0);
              vec3 lowerMix = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
              vec3 skyColor = mix(lowerMix, uZenithColor, smoothstep(0.22, 0.78, h));

              // Sun / Moon Disc & Solar/Lunar Halo
              float sunDot = max(dot(viewDir, normalize(uSunDir)), 0.0);
              float sunDisc = smoothstep(0.9965 - uGoldenHourFactor * 0.0025, 0.9992, sunDot);
              float sunHalo = pow(sunDot, mix(18.0, 7.5, uGoldenHourFactor)) * (0.35 + uGoldenHourFactor * 0.55);

              skyColor += uSunColor * sunHalo;
              skyColor = mix(skyColor, uSunColor, sunDisc);

              // Procedural Twinkling Night Stars in Upper Sky Hemisphere during Dusk & Night
              if (uNightFactor > 0.05 && h > 0.12) {
                vec2 starGrid = floor(viewDir.xz / (viewDir.y + 0.35) * 145.0);
                float starVal = hash(starGrid);
                if (starVal > 0.986) {
                  float twinkle = 0.55 + 0.45 * sin(uTime * 3.2 + starVal * 90.0);
                  float starMask = smoothstep(0.12, 0.38, h) * uNightFactor * twinkle;
                  skyColor += vec3(0.95, 0.97, 1.0) * starMask * 0.95;
                }
              }

              gl_FragColor = vec4(skyColor, 1.0);
            }
          `}
        />
      </mesh>

      {/* Dynamic 3-Point Day-to-Night Lighting Rig */}
      <hemisphereLight ref={hemiLightRef} args={['#e0f2fe', '#a1623b', 1.24]} />
      <directionalLight
        ref={dirLightRef}
        castShadow
        position={[28, 48, 24]}
        intensity={2.35}
        color="#fffdf4"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0005}
      />
      {/* Rim / Backlight from the Horizon */}
      <pointLight ref={rimLightRef} position={[0, 26, -140]} intensity={1.1} color="#fef08a" distance={220} decay={1.8} />

      {/* Warm Sodium-Vapor Street Lamp Fill Lights along the player's corridor */}
      <pointLight ref={streetLightNearRef} position={[0, 7.5, -4]} intensity={0} color="#fbbf24" distance={28} decay={1.6} />
      <pointLight ref={streetLightFarRef} position={[0, 7.5, -26]} intensity={0} color="#f59e0b" distance={32} decay={1.6} />
    </>
  );
};

// Subtle Floating Marigold Petals & Dust along the Bazaar Sides (Kept outside central road sightline for crisp visibility)
const BazaarParticles: React.FC = () => {
  const speed = useStore(state => state.speed);
  const count = 160;
  const meshRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#ffb703'), // Marigold yellow
      new THREE.Color('#fb8500'), // Marigold orange
      new THREE.Color('#fff3b0'), // Golden dust
    ];

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (9.5 + Math.random() * 24);
      const y = Math.random() * 18 + 2.5;
      const z = -190 + Math.random() * 210;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const c = palette[i % palette.length];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const posAttr = meshRef.current.geometry.attributes.position.array as Float32Array;
    const activeSpeed = speed > 0 ? speed : 3;

    for (let i = 0; i < count; i++) {
      let z = posAttr[i * 3 + 2];
      z += activeSpeed * delta * 1.1;
      posAttr[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 1.8 + i) * delta * 0.22;

      if (z > 22) {
        const side = i % 2 === 0 ? 1 : -1;
        z = -185 - Math.random() * 20;
        posAttr[i * 3] = side * (9.5 + Math.random() * 24);
        posAttr[i * 3 + 1] = Math.random() * 18 + 2.5;
      }
      posAttr[i * 3 + 2] = z;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.15} vertexColors transparent opacity={0.36} sizeAttenuation />
    </points>
  );
};

// Indian Street Road: Permanent Black Asphalt Surface across all street environments
const IndianRoad: React.FC = () => {
  const { laneCount, speed, distance, level } = useStore();
  const dashGroupRef = useRef<THREE.Group>(null);
  const roadMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const sidewalkLeftMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const sidewalkRightMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const outerGroundMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const curbLeftRef = useRef<THREE.Mesh>(null);
  const curbRightRef = useRef<THREE.Mesh>(null);
  const offsetRef = useRef(0);
  const { gl } = useThree();

  const roadWidth = laneCount * LANE_WIDTH;
  const activeZone = getEnvironmentZone(distance, level);

  const separators = useMemo(() => {
    const lines: number[] = [];
    const startX = -roadWidth / 2;
    for (let i = 1; i < laneCount; i++) {
      lines.push(startX + i * LANE_WIDTH);
    }
    return lines;
  }, [laneCount, roadWidth]);

  // Procedural Indian Footpath Curb Texture
  const curbTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const stripes = 16;
    const sh = canvas.height / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#27272a';
      ctx.fillRect(0, i * sh, canvas.width, sh);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 14);
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    return tex;
  }, [gl]);

  const targetSidewalkColor = useMemo(() => new THREE.Color(), []);
  const targetOuterColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const activeSpeed = speed > 0 ? speed : 4;
    offsetRef.current = (offsetRef.current + activeSpeed * delta) % 8;
    if (dashGroupRef.current) {
      dashGroupRef.current.position.z = offsetRef.current;
    }
    curbTexture.offset.y = -offsetRef.current * 0.15;

    const zone = getEnvironmentZone(useStore.getState().distance, useStore.getState().level);
    if (roadMatRef.current) {
      // Keep the road surface permanently black irrespective of environment or lighting changes
      roadMatRef.current.color.set('#111318');
    }
    if (sidewalkLeftMatRef.current && sidewalkRightMatRef.current) {
      targetSidewalkColor.set(zone.sidewalkHex);
      sidewalkLeftMatRef.current.color.lerp(targetSidewalkColor, Math.min(1, delta * 3));
      sidewalkRightMatRef.current.color.lerp(targetSidewalkColor, Math.min(1, delta * 3));
    }
    if (outerGroundMatRef.current) {
      targetOuterColor.set(zone.outerGroundHex);
      outerGroundMatRef.current.color.lerp(targetOuterColor, Math.min(1, delta * 3));
    }
  });

  const dashPositionsZ = useMemo(() => {
    const arr: number[] = [];
    for (let z = -200; z <= 20; z += 8) {
      arr.push(z);
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Outer Courtyard Ground */}
      <mesh position={[0, -0.08, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial
          ref={outerGroundMatRef}
          color={activeZone.outerGroundHex}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      {/* Wide Raised Pedestrian Sidewalk Promenades on Left & Right (Clear Separation Between Road & Bazaar Shops) */}
      <mesh position={[-(roadWidth / 2 + 3.4), 0.04, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.8, 250]} />
        <meshStandardMaterial
          ref={sidewalkLeftMatRef}
          color={activeZone.sidewalkHex}
          roughness={0.85}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[roadWidth / 2 + 3.4, 0.04, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.8, 250]} />
        <meshStandardMaterial
          ref={sidewalkRightMatRef}
          color={activeZone.sidewalkHex}
          roughness={0.85}
          metalness={0.04}
        />
      </mesh>

      {/* Main Street Surface (Permanently Black Asphalt Irrespective of Environment Changes) */}
      <mesh position={[0, -0.01, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roadWidth + 0.8, 250]} />
        <meshStandardMaterial
          ref={roadMatRef}
          color="#111318"
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      {/* Continuous Side Gutter / Edge Lines */}
      <mesh position={[-roadWidth / 2, 0.01, -90]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.16, 240]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[roadWidth / 2, 0.01, -90]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.16, 240]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>

      {/* Raised Indian Footpath Curbs */}
      <mesh ref={curbLeftRef} position={[-roadWidth / 2 - 0.55, 0.13, -90]} receiveShadow castShadow>
        <boxGeometry args={[0.7, 0.26, 240]} />
        <meshStandardMaterial map={curbTexture} roughness={0.7} />
      </mesh>
      <mesh ref={curbRightRef} position={[roadWidth / 2 + 0.55, 0.13, -90]} receiveShadow castShadow>
        <boxGeometry args={[0.7, 0.26, 240]} />
        <meshStandardMaterial map={curbTexture} roughness={0.7} />
      </mesh>

      {/* Scrolling Lane Dividers */}
      <group ref={dashGroupRef}>
        {separators.map((x, idx) => (
          <group key={`lane-sep-${idx}`} position={[x, 0.015, 0]}>
            {dashPositionsZ.map((z, j) => (
              <mesh key={j} position={[0, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.12, 3.6]} />
                <meshBasicMaterial
                  color="#f8fafc"
                  transparent
                  opacity={0.82}
                />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
};

interface BazaarShoutSpec {
  phrase: string;
  isBalcony: boolean;
  voicePatternIdx: number;
  speakerLabel?: string;
}

const BAZAAR_STALL_SHOUTS: BazaarShoutSpec[] = [
  { phrase: 'Ae! Sambhal ke!', isBalcony: false, voicePatternIdx: 0 },
  { phrase: 'Dekh ke chalo!', isBalcony: false, voicePatternIdx: 1 },
  { phrase: 'Oye! Meri dukaan bacha ke!', isBalcony: false, voicePatternIdx: 2 },
  { phrase: 'Arey! Garam chai hai, dekh ke!', isBalcony: false, voicePatternIdx: 3 },
  { phrase: 'Hato re! Gully mein mat bhaago!', isBalcony: true, voicePatternIdx: 4, speakerLabel: 'Padosi Auntie · Balcony' },
  { phrase: 'Ae beta! Samosa gira doge!', isBalcony: false, voicePatternIdx: 0 },
  { phrase: 'Oye! Dekh ke chalo भाई!', isBalcony: true, voicePatternIdx: 1, speakerLabel: 'Verma Ji · Balcony' },
  { phrase: 'Ae! Sabzi ka thela bacha ke!', isBalcony: false, voicePatternIdx: 2 },
];

interface ActiveStallShout {
  pairId: number;
  side: 'LEFT' | 'RIGHT';
  isBalcony: boolean;
  speaker: string;
  phrase: string;
}

const WINDOW_FRAME_GEO = new THREE.BoxGeometry(0.18, 1.55, 1.15);
const WINDOW_GLASS_GEO = new THREE.BoxGeometry(0.22, 1.25, 0.88);

// Scrolling Indian Bazaar Buildings, Roadside Palm Trees, Striped Market Stalls, Hanging Shop Signs & Overhead Festival Bunting
const IndianStreetScenery: React.FC = () => {
  const { laneCount, speed, status, distance, level } = useStore();
  const { gl, scene } = useThree();
  const blocksRef = useRef<THREE.Group>(null);
  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const lastShoutTimeRef = useRef<number>(0);
  const lastShoutIdxRef = useRef<number>(-1);
  const shoutClearTimerRef = useRef<number | null>(null);
  const [activeShout, setActiveShout] = useState<ActiveStallShout | null>(null);

  const activeZone = getEnvironmentZone(distance, level);

  useEffect(() => {
    if (status !== GameStatus.PLAYING) {
      setActiveShout(null);
    }
    return () => {
      if (shoutClearTimerRef.current) window.clearTimeout(shoutClearTimerRef.current);
    };
  }, [status]);

  const NUM_PAIRS = 12;
  const SPACING = 20;
  const TOTAL_SPAN = NUM_PAIRS * SPACING;

  // Generate crisp procedural Hindi + English shop signboards
  const signMaterials = useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    return SHOP_SPECS.map(spec => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = spec.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = spec.border;
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

      ctx.fillStyle = spec.text;
      ctx.textAlign = 'center';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(spec.titleHindi, canvas.width / 2, 54);
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(spec.titleEng, canvas.width / 2, 98);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;

      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.3,
        metalness: 0.1,
        emissive: new THREE.Color(spec.border),
        emissiveIntensity: 0.12,
      });
    });
  }, [gl]);

  // Projecting Hanging Shop Icon Signs (Steaming Chai Cup & Zaveri Diamond Icon like Reference Screenshot)
  const hangingSignMats = useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    const createIconSign = (bg: string, border: string, icon: string, label: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = border;
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, 116, 116);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 54px sans-serif';
      ctx.fillText(icon, 64, 68);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = border;
      ctx.fillText(label, 64, 106);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        emissive: new THREE.Color(border),
        emissiveIntensity: 0.2,
      });
    };

    return [
      createIconSign('#fef3c7', '#78350f', '☕', 'CHAI'),
      createIconSign('#1e3a8a', '#38bdf8', '💎', 'ZAVERI'),
      createIconSign('#991b1b', '#facc15', '🍬', 'MITHAI'),
    ];
  }, [gl]);

  // Striped Market Stall Canopy Texture (Red-Yellow-Red & Blue-White-Blue from Reference Screenshot)
  const stripedCanopyMats = useMemo(() => {
    const createStripeMat = (c1: string, c2: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 === 0 ? c1 : c2;
        ctx.fillRect(0, i * 32, 128, 32);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 });
    };
    return [
      createStripeMat('#dc2626', '#facc15'), // Red & Yellow striped canopy
      createStripeMat('#0284c7', '#f8fafc'), // Blue & White striped canopy
      createStripeMat('#16a34a', '#fde047'), // Green & Yellow striped canopy
    ];
  }, []);

  const sharedMats = useMemo(() => ({
    shutter: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.7 }),
    waterTank: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.3 }),
    pole: new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.8, metalness: 0.2 }),
    windowGlass: new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 0.35,
      roughness: 0.2,
    }),
    bulb: new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#fbbf24',
      emissiveIntensity: 0.15,
      roughness: 0.2,
    }),
    lampHalo: new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    lampPool: new THREE.MeshBasicMaterial({
      color: '#f59e0b',
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    marigoldOrange: new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.6, emissive: '#ea580c', emissiveIntensity: 0.2 }),
    marigoldYellow: new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.6, emissive: '#eab308', emissiveIntensity: 0.2 }),
    palmTrunk: new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.9 }),
    palmFrond: new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.65 }),
    palmGrate: new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.8, metalness: 0.4 }),
    stallWood: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 }),
    barrelWood: new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.8, metalness: 0.15 }),
    matkaGreen: new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.35, metalness: 0.1 }),
    matkaTerracotta: new THREE.MeshStandardMaterial({ color: '#c2410c', roughness: 0.7 }),
    buntingColors: [
      new THREE.MeshBasicMaterial({ color: '#ef4444' }),
      new THREE.MeshBasicMaterial({ color: '#facc15' }),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' }),
      new THREE.MeshBasicMaterial({ color: '#22c55e' }),
      new THREE.MeshBasicMaterial({ color: '#ec4899' }),
    ],
  }), []);

  // Separate alternating blocks cleanly so market stalls and palm trees never overlap on the same block
  const buildingPairs = useMemo(() => {
    return Array.from({ length: NUM_PAIRS }, (_, i) => ({
      id: i,
      initialZ: 20 - i * SPACING,
      leftSpecIdx: i % SHOP_SPECS.length,
      rightSpecIdx: (i + 3) % SHOP_SPECS.length,
      leftPaletteIdx: i % 3,
      rightPaletteIdx: (i + 1) % 3,
      leftHeightScale: 0.9 + ((i * 7) % 3) * 0.1,
      rightHeightScale: 0.9 + ((i * 5) % 3) * 0.1,
      hasGarland: i % 3 === 0,
      hasMarketStall: i % 2 === 0,
      hasPalmPair: i % 2 === 1,
      hangingSignIdx: i % 3,
    }));
  }, []);

  const roadHalfWidth = (laneCount * LANE_WIDTH) / 2;
  // Wide promenade offset so buildings, stalls, and palm trees frame the street cleanly without crowding the lanes
  const sideOffset = roadHalfWidth + 6.0;

  useFrame((state, delta) => {
    if (!blocksRef.current) return;
    const activeSpeed = speed > 0 ? speed : 3;
    const moveZ = activeSpeed * delta;

    if (!playerObjRef.current) {
      const pg = scene.getObjectByName('PlayerGroup');
      if (pg && pg.children.length > 0) {
        playerObjRef.current = pg.children[0];
      }
    }
    const playerX = playerObjRef.current ? playerObjRef.current.position.x : 0;
    const now = state.clock.elapsedTime;

    blocksRef.current.children.forEach((child, pairIdx) => {
      const prevZ = child.position.z;
      child.position.z += moveZ;

      // Trigger spatialized shopkeeper / neighbor voice clip as the player approaches a bazaar stall pair (z = -7.5m)
      if (
        status === GameStatus.PLAYING &&
        prevZ < -7.5 &&
        child.position.z >= -7.5 &&
        now - lastShoutTimeRef.current >= 2.25
      ) {
        lastShoutTimeRef.current = now;

        const preferRight =
          Math.abs(playerX) > 0.6
            ? playerX > 0
              ? Math.random() < 0.75
              : Math.random() < 0.25
            : Math.random() < 0.5;
        const side: 'LEFT' | 'RIGHT' = preferRight ? 'RIGHT' : 'LEFT';

        let shoutIdx = Math.floor(Math.random() * BAZAAR_STALL_SHOUTS.length);
        if (shoutIdx === lastShoutIdxRef.current) {
          shoutIdx = (shoutIdx + 1) % BAZAAR_STALL_SHOUTS.length;
        }
        lastShoutIdxRef.current = shoutIdx;
        const shoutSpec = BAZAAR_STALL_SHOUTS[shoutIdx];

        const pairData = buildingPairs[pairIdx];
        const shopSpec =
          side === 'LEFT'
            ? SHOP_SPECS[pairData.leftSpecIdx]
            : SHOP_SPECS[pairData.rightSpecIdx];

        const worldX =
          side === 'LEFT'
            ? -(sideOffset - (shoutSpec.isBalcony ? 2.9 : 3.2))
            : sideOffset - (shoutSpec.isBalcony ? 2.9 : 3.2);
        const worldY = shoutSpec.isBalcony ? 6.6 : 2.5;

        audio.playSpatialBazaarYell(
          shoutSpec.voicePatternIdx,
          worldX,
          worldY,
          child.position.z,
          playerX,
          activeSpeed
        );

        const speaker = shoutSpec.speakerLabel || `${shopSpec.titleEng} · ${side === 'LEFT' ? 'Left Stall' : 'Right Stall'}`;
        setActiveShout({
          pairId: pairData.id,
          side,
          isBalcony: shoutSpec.isBalcony,
          speaker,
          phrase: shoutSpec.phrase,
        });

        if (shoutClearTimerRef.current) window.clearTimeout(shoutClearTimerRef.current);
        shoutClearTimerRef.current = window.setTimeout(() => {
          setActiveShout(null);
        }, 1750);
      }

      if (child.position.z > 28) {
        child.position.z -= TOTAL_SPAN;
      }
    });

    // Dynamically scale street lamp bulb glow, volumetric halos, road light pools, and shop signboards
    const lampLvl = sunsetState.lampIntensity;
    const flicker = 0.96 + Math.sin(state.clock.elapsedTime * 11.0) * 0.04;

    sharedMats.bulb.emissiveIntensity = THREE.MathUtils.lerp(0.15, 3.4, lampLvl) * flicker;
    sharedMats.lampHalo.opacity = THREE.MathUtils.lerp(0.0, 0.42, lampLvl) * flicker;
    sharedMats.lampPool.opacity = THREE.MathUtils.lerp(0.0, 0.28, lampLvl) * flicker;
    sharedMats.windowGlass.emissiveIntensity = THREE.MathUtils.lerp(0.28, 1.35, lampLvl);

    const signGlow = THREE.MathUtils.lerp(0.12, 0.78, lampLvl);
    for (let i = 0; i < signMaterials.length; i++) {
      signMaterials[i].emissiveIntensity = signGlow;
    }

    const garlandGlow = THREE.MathUtils.lerp(0.18, 0.5, lampLvl);
    sharedMats.marigoldOrange.emissiveIntensity = garlandGlow;
    sharedMats.marigoldYellow.emissiveIntensity = garlandGlow;
  });

  // Overhead garland / festival bunting points across the street
  const garlandPoints = useMemo(() => {
    const pts: { xRatio: number; yDrop: number; isOrange: boolean; colorIdx: number }[] = [];
    const steps = 12;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const xRatio = (t - 0.5) * 2;
      const yDrop = Math.cos(xRatio * (Math.PI / 2)) * 1.25;
      pts.push({ xRatio, yDrop, isOrange: s % 2 === 0, colorIdx: s % 5 });
    }
    return pts;
  }, []);

  const palmFrondAngles = useMemo(() => [0, 1.05, 2.1, 3.14, 4.19, 5.24], []);

  return (
    <group ref={blocksRef}>
      {buildingPairs.map(pair => {
        const leftSpec = SHOP_SPECS[pair.leftSpecIdx];
        const rightSpec = SHOP_SPECS[pair.rightSpecIdx];
        const leftWallColor = activeZone.wallPalette[pair.leftPaletteIdx];
        const rightWallColor = activeZone.wallPalette[pair.rightPaletteIdx];

        return (
          <group key={pair.id} position={[0, 0, pair.initialZ]}>
            {/* --- LEFT SHOP BUILDING & SIDEWALK PROMENADE --- */}
            <group position={[-sideOffset, 0, 0]}>
              {/* Main Ground & First Floor */}
              <mesh castShadow receiveShadow position={[0, 4.25 * pair.leftHeightScale, 0]} scale={[1, pair.leftHeightScale, 1]} geometry={BUILDING_BASE_GEO}>
                <meshStandardMaterial color={leftWallColor} roughness={0.82} metalness={0.05} />
              </mesh>
              {/* Upper Haveli Story */}
              <mesh castShadow position={[-0.2, 9.2 * pair.leftHeightScale, 0]} geometry={BUILDING_UPPER_GEO}>
                <meshStandardMaterial color={leftWallColor} roughness={0.78} metalness={0.05} />
              </mesh>
              {/* Parapet Roof Trim */}
              <mesh position={[0, 11.6 * pair.leftHeightScale, 0]} geometry={PARAPET_GEO}>
                <meshStandardMaterial color={activeZone.trimHex} roughness={0.55} metalness={0.12} />
              </mesh>
              {/* Illuminated Upper Haveli Windows (Left & Right Bays) */}
              {[-2.2, 2.2].map((winZ, wIdx) => (
                <group key={wIdx} position={[2.42, 8.9 * pair.leftHeightScale, winZ]}>
                  <mesh geometry={WINDOW_FRAME_GEO}>
                    <meshStandardMaterial color={activeZone.trimHex} roughness={0.6} />
                  </mesh>
                  <mesh geometry={WINDOW_GLASS_GEO} material={sharedMats.windowGlass} />
                </group>
              ))}
              {/* Rooftop Black Water Tank */}
              <mesh position={[0, 12.5 * pair.leftHeightScale, -1.5]} geometry={WATER_TANK_GEO} material={sharedMats.waterTank} />
              {/* Shop Shutter Recess */}
              <mesh position={[2.75, 1.6, 0]} geometry={SHUTTER_GEO} material={sharedMats.shutter} />
              {/* Sloped Bazaar Awning */}
              <mesh position={[3.25, 3.3, 0]} rotation={[0, 0, -0.22]} geometry={AWNING_GEO}>
                <meshStandardMaterial color={leftSpec.awningColor} roughness={0.6} metalness={0.1} />
              </mesh>
              {/* Glowing Hindi/English Shop Signboard */}
              <mesh position={[2.85, 4.35, 0]} geometry={SIGNBOARD_GEO} material={signMaterials[pair.leftSpecIdx]} />
              {/* Upper Balcony (Jharokha) */}
              <mesh position={[2.9, 6.55, 0]} geometry={BALCONY_GEO}>
                <meshStandardMaterial color={activeZone.trimHex} roughness={0.6} metalness={0.15} />
              </mesh>

              {/* EVEN BLOCKS: Roadside Open Market Stall with Striped Canopy, Wooden Barrel, Clay Matka & Hanging Shop Sign */}
              {pair.hasMarketStall && (
                <>
                  <group position={[3.2, 5.6, 3.2]}>
                    <mesh position={[0, 0.65, 0]} geometry={HANGING_BRACKET_GEO} material={sharedMats.pole} />
                    <mesh position={[0.35, 0, 0]} rotation={[0, Math.PI / 2, 0]} geometry={HANGING_SIGN_GEO} material={hangingSignMats[pair.hangingSignIdx]} />
                  </group>
                  <group position={[3.65, 0.04, 0]}>
                    <mesh position={[0, 2.35, 0]} rotation={[0, 0, -0.2]} geometry={STALL_CANOPY_GEO} material={stripedCanopyMats[pair.id % stripedCanopyMats.length]} />
                    <mesh position={[0.65, 1.18, 1.4]} geometry={STALL_POST_GEO} material={sharedMats.stallWood} />
                    <mesh position={[0.65, 1.18, -1.4]} geometry={STALL_POST_GEO} material={sharedMats.stallWood} />
                    <mesh position={[0.1, 0.38, 0]} geometry={STALL_TABLE_GEO} material={sharedMats.stallWood} />
                    {/* Wooden Barrel & Green/Terracotta Matka Pots beside stall */}
                    <mesh position={[0.5, 0.44, 2.15]} geometry={BARREL_GEO} material={sharedMats.barrelWood} />
                    <mesh position={[0.65, 0.24, 2.7]} geometry={MATKA_POT_GEO} material={sharedMats.matkaGreen} />
                  </group>
                </>
              )}

              {/* ODD BLOCKS: Roadside Tropical Palm Tree in Sidewalk Grate & Street Lamp Pole */}
              {pair.hasPalmPair && (
                <>
                  {activeZone.hasPalmTrees && (
                    <group position={[3.85, 0.04, -1.2]}>
                      <mesh position={[0, 0.03, 0]} geometry={PALM_GRATE_GEO} material={sharedMats.palmGrate} />
                      <mesh position={[0, 3.3, 0]} rotation={[0, 0, -0.04]} geometry={PALM_TRUNK_GEO} material={sharedMats.palmTrunk} />
                      <group position={[0.12, 6.5, 0]}>
                        {palmFrondAngles.map((ang, fIdx) => (
                          <mesh
                            key={fIdx}
                            rotation={[0.22, ang, -0.34]}
                            position={[Math.cos(ang) * 0.85, -0.1, Math.sin(ang) * 0.85]}
                            geometry={PALM_FROND_GEO}
                            material={sharedMats.palmFrond}
                          />
                        ))}
                      </group>
                    </group>
                  )}
                  <group position={[4.1, 0.04, 5.2]}>
                    <mesh position={[0, 4.25, 0]} geometry={POLE_GEO} material={sharedMats.pole} />
                    <mesh position={[0.6, 8.1, 0]} geometry={POLE_ARM_GEO} material={sharedMats.pole} />
                    <mesh position={[1.2, 7.9, 0]} geometry={LAMP_BULB_GEO} material={sharedMats.bulb} />
                    <mesh position={[1.2, 7.9, 0]} geometry={LAMP_HALO_GEO} material={sharedMats.lampHalo} />
                    <mesh position={[1.6, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={LAMP_POOL_GEO} material={sharedMats.lampPool} />
                  </group>
                </>
              )}
            </group>

            {/* --- RIGHT SHOP BUILDING & SIDEWALK PROMENADE --- */}
            <group position={[sideOffset, 0, 0]}>
              <mesh castShadow receiveShadow position={[0, 4.25 * pair.rightHeightScale, 0]} scale={[1, pair.rightHeightScale, 1]} geometry={BUILDING_BASE_GEO}>
                <meshStandardMaterial color={rightWallColor} roughness={0.82} metalness={0.05} />
              </mesh>
              <mesh castShadow position={[0.2, 9.2 * pair.rightHeightScale, 0]} geometry={BUILDING_UPPER_GEO}>
                <meshStandardMaterial color={rightWallColor} roughness={0.78} metalness={0.05} />
              </mesh>
              <mesh position={[0, 11.6 * pair.rightHeightScale, 0]} geometry={PARAPET_GEO}>
                <meshStandardMaterial color={activeZone.trimHex} roughness={0.55} metalness={0.12} />
              </mesh>
              {/* Illuminated Upper Haveli Windows (Left & Right Bays) */}
              {[-2.2, 2.2].map((winZ, wIdx) => (
                <group key={wIdx} position={[-2.42, 8.9 * pair.rightHeightScale, winZ]}>
                  <mesh geometry={WINDOW_FRAME_GEO}>
                    <meshStandardMaterial color={activeZone.trimHex} roughness={0.6} />
                  </mesh>
                  <mesh geometry={WINDOW_GLASS_GEO} material={sharedMats.windowGlass} />
                </group>
              ))}
              <mesh position={[0, 12.5 * pair.rightHeightScale, 1.5]} geometry={WATER_TANK_GEO} material={sharedMats.waterTank} />
              <mesh position={[-2.75, 1.6, 0]} geometry={SHUTTER_GEO} material={sharedMats.shutter} />
              <mesh position={[-3.25, 3.3, 0]} rotation={[0, 0, 0.22]} geometry={AWNING_GEO}>
                <meshStandardMaterial color={rightSpec.awningColor} roughness={0.6} metalness={0.1} />
              </mesh>
              <mesh position={[-2.85, 4.35, 0]} rotation={[0, Math.PI, 0]} geometry={SIGNBOARD_GEO} material={signMaterials[pair.rightSpecIdx]} />
              <mesh position={[-2.9, 6.55, 0]} geometry={BALCONY_GEO}>
                <meshStandardMaterial color={activeZone.trimHex} roughness={0.6} metalness={0.15} />
              </mesh>

              {/* EVEN BLOCKS: Roadside Open Market Stall with Striped Canopy & Projecting Hanging Sign */}
              {pair.hasMarketStall && (
                <>
                  <group position={[-3.2, 5.6, -3.2]}>
                    <mesh position={[0, 0.65, 0]} geometry={HANGING_BRACKET_GEO} material={sharedMats.pole} />
                    <mesh position={[-0.35, 0, 0]} rotation={[0, Math.PI / 2, 0]} geometry={HANGING_SIGN_GEO} material={hangingSignMats[(pair.hangingSignIdx + 1) % 3]} />
                  </group>
                  <group position={[-3.65, 0.04, 0]}>
                    <mesh position={[0, 2.35, 0]} rotation={[0, 0, 0.2]} geometry={STALL_CANOPY_GEO} material={stripedCanopyMats[(pair.id + 1) % stripedCanopyMats.length]} />
                    <mesh position={[-0.65, 1.18, 1.4]} geometry={STALL_POST_GEO} material={sharedMats.stallWood} />
                    <mesh position={[-0.65, 1.18, -1.4]} geometry={STALL_POST_GEO} material={sharedMats.stallWood} />
                    <mesh position={[-0.1, 0.38, 0]} geometry={STALL_TABLE_GEO} material={sharedMats.stallWood} />
                    <mesh position={[-0.5, 0.44, -2.15]} geometry={BARREL_GEO} material={sharedMats.barrelWood} />
                    <mesh position={[-0.65, 0.24, -2.7]} geometry={MATKA_POT_GEO} material={sharedMats.matkaTerracotta} />
                  </group>
                </>
              )}

              {/* ODD BLOCKS: Roadside Tropical Palm Tree & Street Lamp Pole */}
              {pair.hasPalmPair && (
                <>
                  {activeZone.hasPalmTrees && (
                    <group position={[-3.85, 0.04, 1.2]}>
                      <mesh position={[0, 0.03, 0]} geometry={PALM_GRATE_GEO} material={sharedMats.palmGrate} />
                      <mesh position={[0, 3.3, 0]} rotation={[0, 0, 0.04]} geometry={PALM_TRUNK_GEO} material={sharedMats.palmTrunk} />
                      <group position={[-0.12, 6.5, 0]}>
                        {palmFrondAngles.map((ang, fIdx) => (
                          <mesh
                            key={fIdx}
                            rotation={[0.22, ang, -0.34]}
                            position={[Math.cos(ang) * 0.85, -0.1, Math.sin(ang) * 0.85]}
                            geometry={PALM_FROND_GEO}
                            material={sharedMats.palmFrond}
                          />
                        ))}
                      </group>
                    </group>
                  )}
                  <group position={[-4.1, 0.04, 5.2]}>
                    <mesh position={[0, 4.25, 0]} geometry={POLE_GEO} material={sharedMats.pole} />
                    <mesh position={[-0.6, 8.1, 0]} geometry={POLE_ARM_GEO} material={sharedMats.pole} />
                    <mesh position={[-1.2, 7.9, 0]} geometry={LAMP_BULB_GEO} material={sharedMats.bulb} />
                    <mesh position={[-1.2, 7.9, 0]} geometry={LAMP_HALO_GEO} material={sharedMats.lampHalo} />
                    <mesh position={[-1.6, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={LAMP_POOL_GEO} material={sharedMats.lampPool} />
                  </group>
                </>
              )}
            </group>

            {/* --- OVERHEAD MARIGOLD TORAN GARLAND & COLORFUL FESTIVAL TRIANGLE BUNTING (Raised High at y=9.6 for Unobstructed Horizon View) --- */}
            {pair.hasGarland && (
              <group position={[0, 9.6, 0]}>
                {garlandPoints.map((pt, idx) => (
                  <group key={idx} position={[pt.xRatio * (sideOffset - 3.4), -pt.yDrop, 0]}>
                    <mesh
                      geometry={MARIGOLD_CLUSTER_GEO}
                      material={pt.isOrange ? sharedMats.marigoldOrange : sharedMats.marigoldYellow}
                    />
                    {activeZone.hasTriangleBunting && idx > 0 && idx < garlandPoints.length - 1 && (
                      <mesh
                        position={[0, -0.32, 0]}
                        rotation={[Math.PI, 0, 0]}
                        geometry={BUNTING_FLAG_GEO}
                        material={sharedMats.buntingColors[pt.colorIdx]}
                      />
                    )}
                  </group>
                ))}
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};

// Descending Afternoon-to-Sunset Sun & Crisp Horizon Mandir / Haveli Skyline Landmarks
const IndianSunsetHorizon: React.FC = () => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const sunColors = useMemo(
    () => ({
      topAfternoon: new THREE.Color('#ffffff'),
      topGolden: new THREE.Color('#fffbeb'),
      topSunset: new THREE.Color('#fde047'),
      botAfternoon: new THREE.Color('#fde047'),
      botGolden: new THREE.Color('#ea580c'),
      botSunset: new THREE.Color('#b91c1c'),
      scratchTop: new THREE.Color(),
      scratchBot: new THREE.Color(),
      scratchSil: new THREE.Color(),
    }),
    []
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorTop: { value: new THREE.Color('#ffffff') },
      uColorBottom: { value: new THREE.Color('#fde047') },
    }),
    []
  );

  const silhouetteMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#b45309',
        roughness: 0.75,
        metalness: 0.12,
        fog: false,
      }),
    []
  );

  const trimDomeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fde68a',
        emissive: '#f59e0b',
        emissiveIntensity: 0.35,
        roughness: 0.4,
        metalness: 0.3,
        fog: false,
      }),
    []
  );

  useFrame((state, delta) => {
    const t = sunsetState.progress;
    const night = sunsetState.nightFactor;
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      sampleThreeStopColor(t, sunColors.topAfternoon, sunColors.topGolden, sunColors.topSunset, sunColors.scratchTop);
      sampleThreeStopColor(t, sunColors.botAfternoon, sunColors.botGolden, sunColors.botSunset, sunColors.scratchBot);
      if (night > 0.1) {
        // Cool silver-gold moon glow at night
        sunColors.scratchTop.lerp(new THREE.Color('#f8fafc'), night * 0.85);
        sunColors.scratchBot.lerp(new THREE.Color('#93c5fd'), night * 0.85);
      }
      matRef.current.uniforms.uColorTop.value.copy(sunColors.scratchTop);
      matRef.current.uniforms.uColorBottom.value.copy(sunColors.scratchBot);
    }
    if (groupRef.current) {
      // Sun descends from afternoon (y = 40) down to sunset (y = 16), then Moon rises at night (y = 32)
      const daySunY = THREE.MathUtils.lerp(40, 16, t);
      const baseSunY = THREE.MathUtils.lerp(daySunY, 32, night);
      groupRef.current.position.y = baseSunY + Math.sin(state.clock.elapsedTime * 0.25) * 0.5;
      const discScale = THREE.MathUtils.lerp(1.0, 0.58, night);
      groupRef.current.scale.setScalar(discScale);
    }
    const zone = getEnvironmentZone(useStore.getState().distance, useStore.getState().level);
    sunColors.scratchSil.set(zone.horizonDomeHex);
    silhouetteMat.color.lerp(sunColors.scratchSil, Math.min(1, delta * 3));
    trimDomeMat.emissiveIntensity = THREE.MathUtils.lerp(0.25, 0.95, sunsetState.lampIntensity);
  });

  return (
    <group position={[0, 0, -155]}>
      {/* Glowing Indian Sun / Moon Disc on the Horizon */}
      <group ref={groupRef} position={[0, 40, -12]}>
        <mesh>
          <sphereGeometry args={[28, 32, 32]} />
          <shaderMaterial
            ref={matRef}
            uniforms={uniforms}
            transparent
            fog={false}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              varying vec2 vUv;
              uniform float uTime;
              uniform vec3 uColorTop;
              uniform vec3 uColorBottom;

              void main() {
                vec3 color = mix(uColorBottom, uColorTop, vUv.y);
                float shimmer = sin((vUv.y * 28.0) - (uTime * 0.8));
                float band = smoothstep(0.1, 0.25, shimmer);
                float fade = smoothstep(0.65, 0.2, vUv.y);
                vec3 finalColor = mix(color, color * 0.82, (1.0 - band) * fade);
                gl_FragColor = vec4(finalColor, 0.95);
              }
            `}
          />
        </mesh>
      </group>

      {/* Crisp Horizon Mandir & Royal Haveli Skyline Landmarks (Fog-exempt for clear distant comprehension) */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 6, 0]} geometry={DOME_GEO} material={silhouetteMat} />
        <mesh position={[0, 21, 0]} geometry={SPIRE_GEO} material={trimDomeMat} />
        <mesh position={[-22, 2, 4]} scale={[0.7, 0.7, 0.7]} geometry={DOME_GEO} material={silhouetteMat} />
        <mesh position={[-22, 12, 4]} scale={[0.7, 0.7, 0.7]} geometry={SPIRE_GEO} material={trimDomeMat} />
        <mesh position={[22, 2, 4]} scale={[0.7, 0.7, 0.7]} geometry={DOME_GEO} material={silhouetteMat} />
        <mesh position={[22, 12, 4]} scale={[0.7, 0.7, 0.7]} geometry={SPIRE_GEO} material={trimDomeMat} />
      </group>
    </group>
  );
};

export const Environment: React.FC = () => {
  return (
    <>
      <StudioEnvironmentSetup />
      <DynamicSkyAndLighting />
      <BazaarParticles />
      <IndianRoad />
      <IndianStreetScenery />
      <IndianSunsetHorizon />
    </>
  );
};


