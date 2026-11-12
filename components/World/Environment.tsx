/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useStore } from '../../store';
import { LANE_WIDTH } from '../../types';

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
const DOME_GEO = new THREE.SphereGeometry(12, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const SPIRE_GEO = new THREE.ConeGeometry(2.2, 9, 8);

// Shared smoothed sunset progress (0 = Bright Afternoon, 0.5 = Golden Hour, 1 = Deep Sunset/Dusk)
const sunsetState = {
  progress: 0,
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

// Dynamic Skybox Dome, Atmospheric Fog, and Afternoon-to-Sunset Lighting Controller
const DynamicSkyAndLighting: React.FC = () => {
  const { scene } = useThree();
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.PointLight>(null);
  const streetLightNearRef = useRef<THREE.PointLight>(null);
  const streetLightFarRef = useRef<THREE.PointLight>(null);

  const colorStops = useMemo(
    () => ({
      // Sky Zenith (Top of dome)
      zenithAfternoon: new THREE.Color('#2563eb'),
      zenithGolden: new THREE.Color('#7c2d12'),
      zenithSunset: new THREE.Color('#13112c'),

      // Sky Mid-Horizon
      midAfternoon: new THREE.Color('#7dd3fc'),
      midGolden: new THREE.Color('#d96b38'),
      midSunset: new THREE.Color('#581c4f'),

      // Lower Horizon & Fog Color
      horizonAfternoon: new THREE.Color('#f6d59e'),
      horizonGolden: new THREE.Color('#d96b38'),
      horizonSunset: new THREE.Color('#882433'),

      // Hemisphere Sky & Ground
      hemiSkyAfternoon: new THREE.Color('#bae6fd'),
      hemiSkyGolden: new THREE.Color('#ffbe76'),
      hemiSkySunset: new THREE.Color('#f472b6'),

      hemiGroundAfternoon: new THREE.Color('#8c583a'),
      hemiGroundGolden: new THREE.Color('#4a2511'),
      hemiGroundSunset: new THREE.Color('#1a1026'),

      // Directional Sun Light
      dirAfternoon: new THREE.Color('#fffbeb'),
      dirGolden: new THREE.Color('#ffd89b'),
      dirSunset: new THREE.Color('#fb7185'),

      // Horizon Rim Light
      rimAfternoon: new THREE.Color('#fde047'),
      rimGolden: new THREE.Color('#ff7b00'),
      rimSunset: new THREE.Color('#ef4444'),

      // Cutting Chai Warm Masala-Amber Grade Targets
      chaiZenithWarm: new THREE.Color('#92400e'),
      chaiMidWarm: new THREE.Color('#ea580c'),
      chaiHorizonWarm: new THREE.Color('#f59e0b'),
      chaiSunWarm: new THREE.Color('#fde047'),

      // Scratch colors
      scratchZenith: new THREE.Color(),
      scratchMid: new THREE.Color(),
      scratchHorizon: new THREE.Color(),
      scratchHemiSky: new THREE.Color(),
      scratchHemiGround: new THREE.Color(),
      scratchDir: new THREE.Color(),
      scratchRim: new THREE.Color(),
    }),
    []
  );

  const chaiWarmthRef = useRef(0);

  const skyUniforms = useMemo(
    () => ({
      uZenithColor: { value: new THREE.Color('#2563eb') },
      uMidColor: { value: new THREE.Color('#7dd3fc') },
      uHorizonColor: { value: new THREE.Color('#f6d59e') },
    }),
    []
  );

  useFrame((_, delta) => {
    const { distance, isChaiBoostActive } = useStore.getState();
    // Full transition from Bright Afternoon (0m) -> Golden Hour (~675m) -> Sunset Dusk (~1350m+)
    const targetProgress = THREE.MathUtils.clamp(distance / 1350, 0, 1);
    const lerpSpeed = distance < 5 ? 6.0 : 1.8;
    sunsetState.progress = THREE.MathUtils.lerp(
      sunsetState.progress,
      targetProgress,
      Math.min(1, delta * lerpSpeed)
    );

    // Smoothly ramp the Golden Masala-Amber Colour Grade when Cutting Chai is active
    chaiWarmthRef.current = THREE.MathUtils.lerp(
      chaiWarmthRef.current,
      isChaiBoostActive ? 1.0 : 0.0,
      Math.min(1, delta * 5.5)
    );
    const chaiW = chaiWarmthRef.current;

    const t = sunsetState.progress;
    // Street lamps begin warming up in late afternoon (t = 0.22) and reach full glow at dusk (t = 0.88)
    sunsetState.lampIntensity = THREE.MathUtils.smoothstep(t, 0.22, 0.88);

    // Compute interpolated sky & fog colors
    sampleThreeStopColor(t, colorStops.zenithAfternoon, colorStops.zenithGolden, colorStops.zenithSunset, colorStops.scratchZenith);
    sampleThreeStopColor(t, colorStops.midAfternoon, colorStops.midGolden, colorStops.midSunset, colorStops.scratchMid);
    sampleThreeStopColor(t, colorStops.horizonAfternoon, colorStops.horizonGolden, colorStops.horizonSunset, colorStops.scratchHorizon);

    // Apply Golden Masala-Amber Colour Grade shift when Cutting Chai is active
    if (chaiW > 0.005) {
      colorStops.scratchZenith.lerp(colorStops.chaiZenithWarm, chaiW * 0.42);
      colorStops.scratchMid.lerp(colorStops.chaiMidWarm, chaiW * 0.48);
      colorStops.scratchHorizon.lerp(colorStops.chaiHorizonWarm, chaiW * 0.52);
    }

    if (skyMatRef.current) {
      skyMatRef.current.uniforms.uZenithColor.value.copy(colorStops.scratchZenith);
      skyMatRef.current.uniforms.uMidColor.value.copy(colorStops.scratchMid);
      skyMatRef.current.uniforms.uHorizonColor.value.copy(colorStops.scratchHorizon);
    }

    // Sync scene background and atmospheric fog with horizon color
    if (scene.background instanceof THREE.Color) {
      scene.background.copy(colorStops.scratchHorizon);
    } else {
      scene.background = colorStops.scratchHorizon.clone();
    }

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(colorStops.scratchHorizon);
      scene.fog.near = THREE.MathUtils.lerp(46, 32, t) - chaiW * 4;
      scene.fog.far = THREE.MathUtils.lerp(180, 152, t);
    }

    // Update Hemisphere Light
    if (hemiLightRef.current) {
      sampleThreeStopColor(t, colorStops.hemiSkyAfternoon, colorStops.hemiSkyGolden, colorStops.hemiSkySunset, colorStops.scratchHemiSky);
      sampleThreeStopColor(t, colorStops.hemiGroundAfternoon, colorStops.hemiGroundGolden, colorStops.hemiGroundSunset, colorStops.scratchHemiGround);
      if (chaiW > 0.005) {
        colorStops.scratchHemiSky.lerp(colorStops.chaiSunWarm, chaiW * 0.55);
        colorStops.scratchHemiGround.lerp(colorStops.chaiMidWarm, chaiW * 0.45);
      }
      hemiLightRef.current.color.copy(colorStops.scratchHemiSky);
      hemiLightRef.current.groundColor.copy(colorStops.scratchHemiGround);
      hemiLightRef.current.intensity = THREE.MathUtils.lerp(1.15, 0.48, t) + chaiW * 0.35;
    }

    // Update Directional Sunlight angle, color, and intensity
    if (dirLightRef.current) {
      sampleThreeStopColor(t, colorStops.dirAfternoon, colorStops.dirGolden, colorStops.dirSunset, colorStops.scratchDir);
      if (chaiW > 0.005) {
        colorStops.scratchDir.lerp(colorStops.chaiSunWarm, chaiW * 0.6);
      }
      dirLightRef.current.color.copy(colorStops.scratchDir);
      dirLightRef.current.intensity = THREE.MathUtils.lerp(2.2, 0.85, t) + chaiW * 0.55;
      dirLightRef.current.position.set(
        THREE.MathUtils.lerp(26, 10, t),
        THREE.MathUtils.lerp(46, 14, t),
        THREE.MathUtils.lerp(22, -12, t)
      );
    }

    // Update Sunset Horizon Rim Light
    if (rimLightRef.current) {
      sampleThreeStopColor(t, colorStops.rimAfternoon, colorStops.rimGolden, colorStops.rimSunset, colorStops.scratchRim);
      if (chaiW > 0.005) {
        colorStops.scratchRim.lerp(colorStops.chaiHorizonWarm, chaiW * 0.65);
      }
      rimLightRef.current.color.copy(colorStops.scratchRim);
      rimLightRef.current.intensity = THREE.MathUtils.lerp(1.2, 4.0, t) + chaiW * 1.4;
    }

    // Update Dynamic Street Lamp Illumination along the active road corridor
    const lampLightPower = sunsetState.lampIntensity * 2.8 + chaiW * 0.8;
    if (streetLightNearRef.current) {
      streetLightNearRef.current.intensity = lampLightPower;
    }
    if (streetLightFarRef.current) {
      streetLightFarRef.current.intensity = lampLightPower;
    }
  });

  return (
    <>
      <color attach="background" args={['#f6d59e']} />
      <fog attach="fog" args={['#f6d59e', 46, 180]} />

      {/* Procedural Gradient Skybox Dome */}
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

            void main() {
              float h = clamp(normalize(vWorldPos).y, 0.0, 1.0);
              vec3 lowerMix = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
              vec3 skyColor = mix(lowerMix, uZenithColor, smoothstep(0.22, 0.78, h));
              gl_FragColor = vec4(skyColor, 1.0);
            }
          `}
        />
      </mesh>

      {/* Dynamic 3-Point Afternoon-to-Sunset Lighting Rig */}
      <hemisphereLight ref={hemiLightRef} args={['#bae6fd', '#8c583a', 1.15]} />
      <directionalLight
        ref={dirLightRef}
        castShadow
        position={[26, 46, 22]}
        intensity={2.2}
        color="#fffbeb"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0005}
      />
      {/* Rim / Backlight from the Setting Sun */}
      <pointLight ref={rimLightRef} position={[0, 26, -140]} intensity={1.2} color="#fde047" distance={220} decay={1.8} />

      {/* Warm Sodium-Vapor Street Lamp Fill Lights along the player's corridor */}
      <pointLight ref={streetLightNearRef} position={[0, 7.5, -4]} intensity={0} color="#fbbf24" distance={28} decay={1.6} />
      <pointLight ref={streetLightFarRef} position={[0, 7.5, -26]} intensity={0} color="#f59e0b" distance={32} decay={1.6} />
    </>
  );
};

// Floating Golden Dust & Marigold Petals in the Bazaar Air
const BazaarParticles: React.FC = () => {
  const speed = useStore(state => state.speed);
  const count = 900;
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
      let x = (Math.random() - 0.5) * 90;
      let y = Math.random() * 28 + 0.5;
      let z = -220 + Math.random() * 250;

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
      z += activeSpeed * delta * 1.15;
      posAttr[i * 3 + 1] += Math.sin(state.clock.elapsedTime * 2 + i) * delta * 0.3;

      if (z > 25) {
        z = -210 - Math.random() * 20;
        posAttr[i * 3] = (Math.random() - 0.5) * 90;
        posAttr[i * 3 + 1] = Math.random() * 28 + 0.5;
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
      <pointsMaterial size={0.28} vertexColors transparent opacity={0.75} sizeAttenuation />
    </points>
  );
};

// Indian Asphalt Street, Dashed Lane Markings, and Black-Yellow Footpath Curbs
const IndianRoad: React.FC = () => {
  const { laneCount, speed } = useStore();
  const dashGroupRef = useRef<THREE.Group>(null);
  const curbLeftRef = useRef<THREE.Mesh>(null);
  const curbRightRef = useRef<THREE.Mesh>(null);
  const offsetRef = useRef(0);
  const { gl } = useThree();

  const roadWidth = laneCount * LANE_WIDTH;

  const separators = useMemo(() => {
    const lines: number[] = [];
    const startX = -roadWidth / 2;
    for (let i = 1; i < laneCount; i++) {
      lines.push(startX + i * LANE_WIDTH);
    }
    return lines;
  }, [laneCount, roadWidth]);

  // Procedural Indian Black-and-Yellow Striped Footpath Curb Texture
  const curbTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const stripes = 16;
    const sh = canvas.height / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#facc15' : '#18181b';
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

  useFrame((_, delta) => {
    const activeSpeed = speed > 0 ? speed : 4;
    offsetRef.current = (offsetRef.current + activeSpeed * delta) % 8;
    if (dashGroupRef.current) {
      dashGroupRef.current.position.z = offsetRef.current;
    }
    curbTexture.offset.y = -offsetRef.current * 0.15;
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
      {/* Outer Terracotta Dusty Bazaar Ground */}
      <mesh position={[0, -0.06, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <meshStandardMaterial color="#7c3f23" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Main Asphalt Road */}
      <mesh position={[0, -0.01, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[roadWidth + 0.8, 250]} />
        <meshStandardMaterial color="#2b2d34" roughness={0.85} metalness={0.08} />
      </mesh>

      {/* Continuous Side Yellow Edge Lines */}
      <mesh position={[-roadWidth / 2, 0.01, -90]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.12, 240]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <mesh position={[roadWidth / 2, 0.01, -90]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.12, 240]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>

      {/* Black & Yellow Striped Indian Concrete Footpath Curbs */}
      <mesh ref={curbLeftRef} position={[-roadWidth / 2 - 0.65, 0.14, -90]} receiveShadow castShadow>
        <boxGeometry args={[0.9, 0.28, 240]} />
        <meshStandardMaterial map={curbTexture} roughness={0.7} />
      </mesh>
      <mesh ref={curbRightRef} position={[roadWidth / 2 + 0.65, 0.14, -90]} receiveShadow castShadow>
        <boxGeometry args={[0.9, 0.28, 240]} />
        <meshStandardMaterial map={curbTexture} roughness={0.7} />
      </mesh>

      {/* Scrolling White Dashed Lane Dividers */}
      <group ref={dashGroupRef}>
        {separators.map((x, idx) => (
          <group key={`lane-sep-${idx}`} position={[x, 0.015, 0]}>
            {dashPositionsZ.map((z, j) => (
              <mesh key={j} position={[0, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.1, 3.6]} />
                <meshBasicMaterial color="#f8fafc" transparent opacity={0.75} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
};

// Scrolling Indian Bazaar Buildings, Signboards, Electric Poles & Marigold Garlands
const IndianStreetScenery: React.FC = () => {
  const { laneCount, speed } = useStore();
  const { gl } = useThree();
  const blocksRef = useRef<THREE.Group>(null);

  const NUM_PAIRS = 14;
  const SPACING = 16;
  const TOTAL_SPAN = NUM_PAIRS * SPACING;

  // Generate crisp procedural Hindi + English shop signboards
  const signMaterials = useMemo(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    return SHOP_SPECS.map(spec => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      // Signboard background
      ctx.fillStyle = spec.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Decorative Indian border
      ctx.strokeStyle = spec.border;
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

      // Text
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
        emissiveIntensity: 0.1,
      });
    });
  }, [gl]);

  const sharedMats = useMemo(() => ({
    shutter: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.7 }),
    waterTank: new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.3 }),
    pole: new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.8, metalness: 0.2 }),
    bulb: new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#fbbf24',
      emissiveIntensity: 0.1,
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
  }), []);

  const buildingPairs = useMemo(() => {
    return Array.from({ length: NUM_PAIRS }, (_, i) => ({
      id: i,
      initialZ: 20 - i * SPACING,
      leftSpecIdx: i % SHOP_SPECS.length,
      rightSpecIdx: (i + 3) % SHOP_SPECS.length,
      leftHeightScale: 0.85 + ((i * 7) % 4) * 0.12,
      rightHeightScale: 0.85 + ((i * 5) % 4) * 0.12,
      hasGarland: i % 2 === 0,
    }));
  }, []);

  const roadHalfWidth = (laneCount * LANE_WIDTH) / 2;
  const sideOffset = roadHalfWidth + 4.4;

  useFrame((state, delta) => {
    if (!blocksRef.current) return;
    const activeSpeed = speed > 0 ? speed : 3;
    const moveZ = activeSpeed * delta;

    blocksRef.current.children.forEach(child => {
      child.position.z += moveZ;
      if (child.position.z > 28) {
        child.position.z -= TOTAL_SPAN;
      }
    });

    // Dynamically scale street lamp bulb glow, volumetric halos, road light pools, and shop signboards
    const lampLvl = sunsetState.lampIntensity;
    const flicker = 0.96 + Math.sin(state.clock.elapsedTime * 11.0) * 0.04;

    sharedMats.bulb.emissiveIntensity = THREE.MathUtils.lerp(0.12, 3.8, lampLvl) * flicker;
    sharedMats.lampHalo.opacity = THREE.MathUtils.lerp(0.0, 0.55, lampLvl) * flicker;
    sharedMats.lampPool.opacity = THREE.MathUtils.lerp(0.0, 0.34, lampLvl) * flicker;

    const signGlow = THREE.MathUtils.lerp(0.08, 0.82, lampLvl);
    for (let i = 0; i < signMaterials.length; i++) {
      signMaterials[i].emissiveIntensity = signGlow;
    }

    const garlandGlow = THREE.MathUtils.lerp(0.18, 0.55, lampLvl);
    sharedMats.marigoldOrange.emissiveIntensity = garlandGlow;
    sharedMats.marigoldYellow.emissiveIntensity = garlandGlow;
  });

  // Marigold garland points across the street
  const garlandPoints = useMemo(() => {
    const pts: { xRatio: number; yDrop: number; isOrange: boolean }[] = [];
    const steps = 12;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps; // 0 to 1
      const xRatio = (t - 0.5) * 2; // -1 to 1
      const yDrop = Math.cos(xRatio * (Math.PI / 2)) * 1.4; // catenary sag
      pts.push({ xRatio, yDrop, isOrange: s % 2 === 0 });
    }
    return pts;
  }, []);

  return (
    <group ref={blocksRef}>
      {buildingPairs.map(pair => {
        const leftSpec = SHOP_SPECS[pair.leftSpecIdx];
        const rightSpec = SHOP_SPECS[pair.rightSpecIdx];

        return (
          <group key={pair.id} position={[0, 0, pair.initialZ]}>
            {/* --- LEFT SHOP BUILDING --- */}
            <group position={[-sideOffset, 0, 0]}>
              {/* Main Ground & First Floor */}
              <mesh castShadow receiveShadow position={[0, 4.25 * pair.leftHeightScale, 0]} scale={[1, pair.leftHeightScale, 1]} geometry={BUILDING_BASE_GEO}>
                <meshStandardMaterial color={leftSpec.wallColor} roughness={0.85} metalness={0.05} />
              </mesh>
              {/* Upper Haveli Story */}
              <mesh castShadow position={[-0.2, 9.2 * pair.leftHeightScale, 0]} geometry={BUILDING_UPPER_GEO}>
                <meshStandardMaterial color={leftSpec.wallColor} roughness={0.8} metalness={0.05} />
              </mesh>
              {/* Parapet Roof Trim */}
              <mesh position={[0, 11.6 * pair.leftHeightScale, 0]} geometry={PARAPET_GEO}>
                <meshStandardMaterial color={leftSpec.trimColor} roughness={0.6} metalness={0.15} />
              </mesh>
              {/* Rooftop Black Water Tank */}
              <mesh position={[0, 12.5 * pair.leftHeightScale, -1.5]} geometry={WATER_TANK_GEO} material={sharedMats.waterTank} />
              {/* Shop Shutter Recess */}
              <mesh position={[2.75, 1.6, 0]} geometry={SHUTTER_GEO} material={sharedMats.shutter} />
              {/* Sloped Bazaar Awning */}
              <mesh position={[3.3, 3.3, 0]} rotation={[0, 0, -0.25]} geometry={AWNING_GEO}>
                <meshStandardMaterial color={leftSpec.awningColor} roughness={0.6} metalness={0.1} />
              </mesh>
              {/* Glowing Hindi/English Shop Signboard */}
              <mesh position={[2.85, 4.3, 0]} geometry={SIGNBOARD_GEO} material={signMaterials[pair.leftSpecIdx]} />
              {/* Upper Balcony (Jharokha) */}
              <mesh position={[2.9, 6.5, 0]} geometry={BALCONY_GEO}>
                <meshStandardMaterial color={leftSpec.trimColor} roughness={0.65} metalness={0.2} />
              </mesh>
              {/* Street Electric Pole, Warm Sodium Lamp, Volumetric Halo & Ground Light Pool */}
              <group position={[3.3, 0, 4.2]}>
                <mesh position={[0, 4.25, 0]} geometry={POLE_GEO} material={sharedMats.pole} />
                <mesh position={[0.6, 8.1, 0]} geometry={POLE_ARM_GEO} material={sharedMats.pole} />
                <mesh position={[1.2, 7.9, 0]} geometry={LAMP_BULB_GEO} material={sharedMats.bulb} />
                <mesh position={[1.2, 7.9, 0]} geometry={LAMP_HALO_GEO} material={sharedMats.lampHalo} />
                <mesh position={[1.6, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={LAMP_POOL_GEO} material={sharedMats.lampPool} />
              </group>
            </group>

            {/* --- RIGHT SHOP BUILDING --- */}
            <group position={[sideOffset, 0, 0]}>
              <mesh castShadow receiveShadow position={[0, 4.25 * pair.rightHeightScale, 0]} scale={[1, pair.rightHeightScale, 1]} geometry={BUILDING_BASE_GEO}>
                <meshStandardMaterial color={rightSpec.wallColor} roughness={0.85} metalness={0.05} />
              </mesh>
              <mesh castShadow position={[0.2, 9.2 * pair.rightHeightScale, 0]} geometry={BUILDING_UPPER_GEO}>
                <meshStandardMaterial color={rightSpec.wallColor} roughness={0.8} metalness={0.05} />
              </mesh>
              <mesh position={[0, 11.6 * pair.rightHeightScale, 0]} geometry={PARAPET_GEO}>
                <meshStandardMaterial color={rightSpec.trimColor} roughness={0.6} metalness={0.15} />
              </mesh>
              <mesh position={[0, 12.5 * pair.rightHeightScale, 1.5]} geometry={WATER_TANK_GEO} material={sharedMats.waterTank} />
              <mesh position={[-2.75, 1.6, 0]} geometry={SHUTTER_GEO} material={sharedMats.shutter} />
              <mesh position={[-3.3, 3.3, 0]} rotation={[0, 0, 0.25]} geometry={AWNING_GEO}>
                <meshStandardMaterial color={rightSpec.awningColor} roughness={0.6} metalness={0.1} />
              </mesh>
              <mesh position={[-2.85, 4.3, 0]} rotation={[0, Math.PI, 0]} geometry={SIGNBOARD_GEO} material={signMaterials[pair.rightSpecIdx]} />
              <mesh position={[-2.9, 6.5, 0]} geometry={BALCONY_GEO}>
                <meshStandardMaterial color={rightSpec.trimColor} roughness={0.65} metalness={0.2} />
              </mesh>
              <group position={[-3.3, 0, 4.2]}>
                <mesh position={[0, 4.25, 0]} geometry={POLE_GEO} material={sharedMats.pole} />
                <mesh position={[-0.6, 8.1, 0]} geometry={POLE_ARM_GEO} material={sharedMats.pole} />
                <mesh position={[-1.2, 7.9, 0]} geometry={LAMP_BULB_GEO} material={sharedMats.bulb} />
                <mesh position={[-1.2, 7.9, 0]} geometry={LAMP_HALO_GEO} material={sharedMats.lampHalo} />
                <mesh position={[-1.6, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={LAMP_POOL_GEO} material={sharedMats.lampPool} />
              </group>
            </group>

            {/* --- OVERHEAD MARIGOLD TORAN GARLAND ACROSS THE STREET --- */}
            {pair.hasGarland && (
              <group position={[0, 8.2, 4.2]}>
                {garlandPoints.map((pt, idx) => (
                  <mesh
                    key={idx}
                    position={[pt.xRatio * (sideOffset - 3.2), -pt.yDrop, 0]}
                    geometry={MARIGOLD_CLUSTER_GEO}
                    material={pt.isOrange ? sharedMats.marigoldOrange : sharedMats.marigoldYellow}
                  />
                ))}
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};

// Descending Afternoon-to-Sunset Sun & Horizon Mandir / Haveli Domes
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
      silAfternoon: new THREE.Color('#6b3418'),
      silGolden: new THREE.Color('#431407'),
      silSunset: new THREE.Color('#1a0812'),
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
    () => new THREE.MeshStandardMaterial({ color: '#6b3418', roughness: 0.9, metalness: 0.1 }),
    []
  );

  useFrame(state => {
    const t = sunsetState.progress;
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      sampleThreeStopColor(t, sunColors.topAfternoon, sunColors.topGolden, sunColors.topSunset, sunColors.scratchTop);
      sampleThreeStopColor(t, sunColors.botAfternoon, sunColors.botGolden, sunColors.botSunset, sunColors.scratchBot);
      matRef.current.uniforms.uColorTop.value.copy(sunColors.scratchTop);
      matRef.current.uniforms.uColorBottom.value.copy(sunColors.scratchBot);
    }
    if (groupRef.current) {
      // Sun descends from high afternoon (y = 43) down behind the Mandir domes (y = 14) as sunset progresses
      const baseSunY = THREE.MathUtils.lerp(43, 14, t);
      groupRef.current.position.y = baseSunY + Math.sin(state.clock.elapsedTime * 0.25) * 0.5;
    }
    sampleThreeStopColor(t, sunColors.silAfternoon, sunColors.silGolden, sunColors.silSunset, sunColors.scratchSil);
    silhouetteMat.color.copy(sunColors.scratchSil);
  });

  return (
    <group position={[0, 0, -185]}>
      {/* Glowing Indian Sun Descending from Afternoon to Sunset */}
      <group ref={groupRef} position={[0, 43, -10]}>
        <mesh>
          <sphereGeometry args={[34, 32, 32]} />
          <shaderMaterial
            ref={matRef}
            uniforms={uniforms}
            transparent
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
                vec3 finalColor = mix(color, color * 0.78, (1.0 - band) * fade);
                gl_FragColor = vec4(finalColor, 0.95);
              }
            `}
          />
        </mesh>
      </group>

      {/* Horizon Mandir & Haveli Domes Silhouette */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 6, 0]} geometry={DOME_GEO} material={silhouetteMat} />
        <mesh position={[0, 21, 0]} geometry={SPIRE_GEO} material={silhouetteMat} />
        <mesh position={[-22, 2, 4]} scale={[0.7, 0.7, 0.7]} geometry={DOME_GEO} material={silhouetteMat} />
        <mesh position={[-22, 12, 4]} scale={[0.7, 0.7, 0.7]} geometry={SPIRE_GEO} material={silhouetteMat} />
        <mesh position={[22, 2, 4]} scale={[0.7, 0.7, 0.7]} geometry={DOME_GEO} material={silhouetteMat} />
        <mesh position={[22, 12, 4]} scale={[0.7, 0.7, 0.7]} geometry={SPIRE_GEO} material={silhouetteMat} />
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

