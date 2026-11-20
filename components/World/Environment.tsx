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
import { applyWorldCurve, updateWorldCurveUniforms } from './worldCurveShader';

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
const LAMP_CONE_GEO = new THREE.ConeGeometry(2.6, 7.8, 16, 1, true);
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

// Outer Backdrop Silhouette & Zone Overhead Prop Geometries
const BACKDROP_SILHOUETTE_GEO = new THREE.BoxGeometry(8.5, 22.0, 10.5);
const FESTIVAL_ARCH_PILLAR_GEO = new THREE.CylinderGeometry(0.24, 0.28, 6.4, 10);
const FESTIVAL_ARCH_BEAM_GEO = new THREE.BoxGeometry(10.5, 0.48, 0.65);
const FESTIVAL_ARCH_BANNER_GEO = new THREE.BoxGeometry(7.2, 0.95, 0.12);
const METRO_VIADUCT_PILLAR_GEO = new THREE.CylinderGeometry(0.55, 0.65, 8.2, 10);
const METRO_VIADUCT_DECK_GEO = new THREE.BoxGeometry(15.5, 1.45, 4.4);
const METRO_TRACK_RAIL_GEO = new THREE.BoxGeometry(15.2, 0.18, 0.18);
const BARREL_GEO = new THREE.CylinderGeometry(0.36, 0.32, 0.88, 10);
const MATKA_POT_GEO = new THREE.SphereGeometry(0.26, 10, 10);
const HANGING_BRACKET_GEO = new THREE.BoxGeometry(1.4, 0.08, 0.08);
const HANGING_SIGN_GEO = new THREE.BoxGeometry(0.1, 1.15, 1.15);

// Overhead Electrical Cables (CatmullRomCurve3), Bamboo/Fabric Overhang Banners & Festival Lantern Orbs
const ELECTRICAL_CABLE_CURVE_A = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-7.6, 7.6, -2.2),
  new THREE.Vector3(-3.8, 6.85, -1.4),
  new THREE.Vector3(0, 6.55, -0.4),
  new THREE.Vector3(3.8, 6.95, 0.8),
  new THREE.Vector3(7.6, 7.65, 1.8),
]);
const ELECTRICAL_CABLE_CURVE_B = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-7.6, 8.0, 1.2),
  new THREE.Vector3(-3.5, 7.15, 0.5),
  new THREE.Vector3(0, 6.88, -0.2),
  new THREE.Vector3(3.5, 7.25, -1.1),
  new THREE.Vector3(7.6, 7.9, -2.0),
]);
const ELECTRICAL_CABLE_GEO_A = new THREE.TubeGeometry(ELECTRICAL_CABLE_CURVE_A, 18, 0.028, 6, false);
const ELECTRICAL_CABLE_GEO_B = new THREE.TubeGeometry(ELECTRICAL_CABLE_CURVE_B, 18, 0.024, 6, false);
const OVERHANG_BAMBOO_GEO = new THREE.CylinderGeometry(0.055, 0.065, 14.5, 8);
const OVERHANG_FABRIC_GEO = new THREE.BoxGeometry(8.8, 0.72, 0.08);
const LANTERN_CORD_GEO = new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6);
const LANTERN_ORB_GEO = new THREE.SphereGeometry(0.24, 12, 12);
const LANTERN_GLOW_GEO = new THREE.SphereGeometry(0.58, 12, 12);

// Shared smoothed day/night & sunset progress
const sunsetState = {
  progress: 0,
  nightFactor: 0,
  lampIntensity: 0,
  isFestival: false,
  isMetroNight: false,
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

// Studio RoomEnvironment reflection initializer + explicit ACES Filmic & sRGB renderer setup
const StudioEnvironmentSetup: React.FC = () => {
  const { gl, scene } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.outputColorSpace = THREE.SRGBColorSpace;
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

// Zone-Aware Lighting & FogExp2 Target Presets (Subway Surfers Golden-Hour -> Twilight -> Temple Run Night)
const ZONE_LIGHT_PRESETS = {
  brightDay: {
    zenith: new THREE.Color('#0284c7'),
    mid: new THREE.Color('#38bdf8'),
    horizon: new THREE.Color('#fde2c4'), // Light peach horizon fog
    sunDisc: new THREE.Color('#fffbeb'),
    hemiSky: new THREE.Color('#bae6fd'), // Cool sky-blue hemisphere fill
    hemiGround: new THREE.Color('#9a5b32'),
    hemiIntensity: 1.24,
    dirSun: new THREE.Color('#fff1d0'), // Warm golden-hour directional sunlight
    dirIntensity: 2.45,
    rim: new THREE.Color('#fde047'),
    fogDensity: 0.0044,
    lampTarget: 0.12,
    exposure: 0.94,
  },
  festivalTwilight: {
    zenith: new THREE.Color('#3b0764'),
    mid: new THREE.Color('#c2410c'),
    horizon: new THREE.Color('#d97706'), // Warm amber sunset FogExp2
    sunDisc: new THREE.Color('#fed7aa'),
    hemiSky: new THREE.Color('#fb923c'),
    hemiGround: new THREE.Color('#451a03'),
    hemiIntensity: 0.95,
    dirSun: new THREE.Color('#ff9e00'),
    dirIntensity: 1.92,
    rim: new THREE.Color('#fb923c'),
    fogDensity: 0.0074,
    lampTarget: 0.85,
    exposure: 0.90,
  },
  metroNight: {
    zenith: new THREE.Color('#070b1e'),
    mid: new THREE.Color('#1e1b4b'),
    horizon: new THREE.Color('#27184f'), // Dense indigo/violet FogExp2
    sunDisc: new THREE.Color('#e2e8f0'),
    hemiSky: new THREE.Color('#6366f1'),
    hemiGround: new THREE.Color('#0f0724'),
    hemiIntensity: 0.68,
    dirSun: new THREE.Color('#93c5fd'),
    dirIntensity: 1.18,
    rim: new THREE.Color('#f59e0b'),
    fogDensity: 0.0112,
    lampTarget: 1.0,
    exposure: 0.88,
  },
};

// Dynamic Skybox Dome, Atmospheric FogExp2, Curved World Uniform Update & Zone Lighting Controller
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
      zenith: new THREE.Color('#0284c7'),
      mid: new THREE.Color('#38bdf8'),
      horizon: new THREE.Color('#fde2c4'),
      sunDisc: new THREE.Color('#fffbeb'),
      hemiSky: new THREE.Color('#bae6fd'),
      hemiGround: new THREE.Color('#9a5b32'),
      dir: new THREE.Color('#fff1d0'),
      rim: new THREE.Color('#fde047'),
      targetZenith: new THREE.Color(),
      targetMid: new THREE.Color(),
      targetHorizon: new THREE.Color(),
      targetSunDisc: new THREE.Color(),
      targetHemiSky: new THREE.Color(),
      targetHemiGround: new THREE.Color(),
      targetDir: new THREE.Color(),
      targetRim: new THREE.Color(),
      chaiZenithWarm: new THREE.Color('#92400e'),
      chaiMidWarm: new THREE.Color('#ea580c'),
      chaiHorizonWarm: new THREE.Color('#f59e0b'),
      chaiSunWarm: new THREE.Color('#fde047'),
      sunDirVec: new THREE.Vector3(0.2, 0.55, -0.8).normalize(),
    }),
    []
  );

  const chaiWarmthRef = useRef(0);
  const festivalBlendRef = useRef(0);
  const nightBlendRef = useRef(0);
  const smoothedFogDensityRef = useRef(0.0044);
  const smoothedHemiIntensityRef = useRef(1.24);
  const smoothedDirIntensityRef = useRef(2.45);
  const smoothedExposureRef = useRef(0.94);

  const skyUniforms = useMemo(
    () => ({
      uZenithColor: { value: new THREE.Color('#0284c7') },
      uMidColor: { value: new THREE.Color('#38bdf8') },
      uHorizonColor: { value: new THREE.Color('#fde2c4') },
      uSunColor: { value: new THREE.Color('#fffbeb') },
      uSunDir: { value: new THREE.Vector3(0.18, 0.52, -0.83).normalize() },
      uGoldenHourFactor: { value: 0.25 },
      uNightFactor: { value: 0.0 },
      uTime: { value: 0.0 },
    }),
    []
  );

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const { score, distance, level, isChaiBoostActive } = useStore.getState();

    // Oscillate curved-world X wave (-0.0005 .. +0.0005) cleanly inside the main animation loop
    updateWorldCurveUniforms(t);

    const activeZone = getEnvironmentZone(distance, level);
    const isMetroNight = activeZone.id === 'METRO_NIGHT_BAZAAR' || level >= 4;
    const isFestival = !isMetroNight && (activeZone.id === 'FESTIVAL_STREET' || level === 3);

    sunsetState.isFestival = isFestival;
    sunsetState.isMetroNight = isMetroNight;

    // Smoothly blend lighting targets between Zone 1/2 (Bright Golden-Hour), Zone 3 (Festival Twilight), Wave 4+ (Metro Night)
    const snapLambda = score === 0 && distance < 5 ? 8.0 : 1.6;
    festivalBlendRef.current = THREE.MathUtils.damp(festivalBlendRef.current, isFestival ? 1.0 : 0.0, snapLambda, safeDelta);
    nightBlendRef.current = THREE.MathUtils.damp(nightBlendRef.current, isMetroNight ? 1.0 : 0.0, snapLambda, safeDelta);

    const fBlend = festivalBlendRef.current;
    const nBlend = nightBlendRef.current;

    const blendPresetColor = (dayC: THREE.Color, festC: THREE.Color, nightC: THREE.Color, out: THREE.Color) => {
      out.copy(dayC).lerp(festC, fBlend).lerp(nightC, nBlend);
    };

    blendPresetColor(ZONE_LIGHT_PRESETS.brightDay.zenith, ZONE_LIGHT_PRESETS.festivalTwilight.zenith, ZONE_LIGHT_PRESETS.metroNight.zenith, scratchColors.targetZenith);
    blendPresetColor(ZONE_LIGHT_PRESETS.brightDay.mid, ZONE_LIGHT_PRESETS.festivalTwilight.mid, ZONE_LIGHT_PRESETS.metroNight.mid, scratchColors.targetMid);
    blendPresetColor(ZONE_LIGHT_PRESETS.brightDay.horizon, ZONE_LIGHT_PRESETS.festivalTwilight.horizon, ZONE_LIGHT_PRESETS.metroNight.horizon, scratchColors.targetHorizon);
    blendPresetColor(ZONE_LIGHT_PRESETS.brightDay.sunDisc, ZONE_LIGHT_PRESETS.festivalTwilight.sunDisc, ZONE_LIGHT_PRESETS.metroNight.sunDisc, scratchColors.targetSunDisc);
    blendPresetColor(ZONE_LIGHT_PRESETS.brightDay.hemiSky, ZONE_LIGHT_PRESETS.festivalTwilight.hemiSky, ZONE_LIGHT_PRESETS.metroNight.hemiSky, scratchColors.targetHemiSky);
    blendPresetColor(ZONE_LIGHT_PRESETS.brightDay.hemiGround, ZONE_LIGHT_PRESETS.festivalTwilight.hemiGround, ZONE_LIGHT_PRESETS.metroNight.hemiGround, scratchColors.targetHemiGround);
    blendPresetColor(ZONE_LIGHT_PRESETS.brightDay.dirSun, ZONE_LIGHT_PRESETS.festivalTwilight.dirSun, ZONE_LIGHT_PRESETS.metroNight.dirSun, scratchColors.targetDir);
    blendPresetColor(ZONE_LIGHT_PRESETS.brightDay.rim, ZONE_LIGHT_PRESETS.festivalTwilight.rim, ZONE_LIGHT_PRESETS.metroNight.rim, scratchColors.targetRim);

    // Subtle intra-zone atmospheric progression from calculateGullyLightingGrade
    const grade = calculateGullyLightingGrade(score, distance);
    const sunsetProg = Math.max(fBlend * 0.62 + nBlend * 0.96, grade.sunsetProgress * 0.25);

    sunsetState.progress = sunsetProg;
    sunsetState.nightFactor = nBlend;
    sunsetState.lampIntensity = THREE.MathUtils.clamp(
      ZONE_LIGHT_PRESETS.brightDay.lampTarget * (1 - fBlend - nBlend) +
        ZONE_LIGHT_PRESETS.festivalTwilight.lampTarget * fBlend +
        ZONE_LIGHT_PRESETS.metroNight.lampTarget * nBlend,
      0,
      1
    );

    // Smoothly ramp the Golden Masala-Amber Colour Grade when Cutting Chai is active
    chaiWarmthRef.current = THREE.MathUtils.damp(
      chaiWarmthRef.current,
      isChaiBoostActive ? 1.0 : 0.0,
      5.5,
      safeDelta
    );
    const chaiW = chaiWarmthRef.current;

    if (chaiW > 0.005) {
      scratchColors.targetZenith.lerp(scratchColors.chaiZenithWarm, chaiW * 0.42);
      scratchColors.targetMid.lerp(scratchColors.chaiMidWarm, chaiW * 0.48);
      scratchColors.targetHorizon.lerp(scratchColors.chaiHorizonWarm, chaiW * 0.52);
      scratchColors.targetHemiSky.lerp(scratchColors.chaiSunWarm, chaiW * 0.55);
      scratchColors.targetHemiGround.lerp(scratchColors.chaiMidWarm, chaiW * 0.45);
      scratchColors.targetDir.lerp(scratchColors.chaiSunWarm, chaiW * 0.6);
      scratchColors.targetRim.lerp(scratchColors.chaiHorizonWarm, chaiW * 0.65);
    }

    scratchColors.zenith.lerp(scratchColors.targetZenith, Math.min(1, safeDelta * 4));
    scratchColors.mid.lerp(scratchColors.targetMid, Math.min(1, safeDelta * 4));
    scratchColors.horizon.lerp(scratchColors.targetHorizon, Math.min(1, safeDelta * 4));
    scratchColors.sunDisc.lerp(scratchColors.targetSunDisc, Math.min(1, safeDelta * 4));

    const sunElevation = THREE.MathUtils.lerp(0.56, 0.16, fBlend * 0.72 + nBlend * 0.45);
    const sunAzimuthX = THREE.MathUtils.lerp(0.24, -0.14, sunsetProg);
    scratchColors.sunDirVec.set(sunAzimuthX, sunElevation, -0.88).normalize();

    if (skyMatRef.current) {
      skyMatRef.current.uniforms.uZenithColor.value.copy(scratchColors.zenith);
      skyMatRef.current.uniforms.uMidColor.value.copy(scratchColors.mid);
      skyMatRef.current.uniforms.uHorizonColor.value.copy(scratchColors.horizon);
      skyMatRef.current.uniforms.uSunColor.value.copy(scratchColors.sunDisc);
      skyMatRef.current.uniforms.uSunDir.value.copy(scratchColors.sunDirVec);
      skyMatRef.current.uniforms.uGoldenHourFactor.value = Math.min(
        1,
        0.25 + fBlend * 0.7 + chaiW * 0.35
      );
      skyMatRef.current.uniforms.uNightFactor.value = nBlend;
      skyMatRef.current.uniforms.uTime.value = t;
    }

    const targetExposure =
      ZONE_LIGHT_PRESETS.brightDay.exposure * (1 - fBlend) * (1 - nBlend) +
      ZONE_LIGHT_PRESETS.festivalTwilight.exposure * fBlend +
      ZONE_LIGHT_PRESETS.metroNight.exposure * nBlend +
      chaiW * 0.04;
    smoothedExposureRef.current = THREE.MathUtils.damp(smoothedExposureRef.current, targetExposure, 3, safeDelta);
    gl.toneMappingExposure = smoothedExposureRef.current;

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(scratchColors.horizon);
    } else {
      scene.background = scratchColors.horizon.clone();
    }

    const targetFogDensity =
      ZONE_LIGHT_PRESETS.brightDay.fogDensity * Math.max(0, 1 - fBlend - nBlend) +
      ZONE_LIGHT_PRESETS.festivalTwilight.fogDensity * fBlend +
      ZONE_LIGHT_PRESETS.metroNight.fogDensity * nBlend +
      chaiW * 0.001;
    smoothedFogDensityRef.current = THREE.MathUtils.damp(smoothedFogDensityRef.current, targetFogDensity, 2.5, safeDelta);

    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(scratchColors.horizon);
      scene.fog.density = smoothedFogDensityRef.current;
    }

    const targetHemiInt =
      ZONE_LIGHT_PRESETS.brightDay.hemiIntensity * Math.max(0, 1 - fBlend - nBlend) +
      ZONE_LIGHT_PRESETS.festivalTwilight.hemiIntensity * fBlend +
      ZONE_LIGHT_PRESETS.metroNight.hemiIntensity * nBlend +
      chaiW * 0.14;
    smoothedHemiIntensityRef.current = THREE.MathUtils.damp(smoothedHemiIntensityRef.current, targetHemiInt, 3, safeDelta);

    if (hemiLightRef.current) {
      hemiLightRef.current.color.lerp(scratchColors.targetHemiSky, Math.min(1, safeDelta * 4));
      hemiLightRef.current.groundColor.lerp(scratchColors.targetHemiGround, Math.min(1, safeDelta * 4));
      hemiLightRef.current.intensity = smoothedHemiIntensityRef.current;
    }

    const targetDirInt =
      ZONE_LIGHT_PRESETS.brightDay.dirIntensity * Math.max(0, 1 - fBlend - nBlend) +
      ZONE_LIGHT_PRESETS.festivalTwilight.dirIntensity * fBlend +
      ZONE_LIGHT_PRESETS.metroNight.dirIntensity * nBlend +
      chaiW * 0.2;
    smoothedDirIntensityRef.current = THREE.MathUtils.damp(smoothedDirIntensityRef.current, targetDirInt, 3, safeDelta);

    if (dirLightRef.current) {
      dirLightRef.current.color.lerp(scratchColors.targetDir, Math.min(1, safeDelta * 4));
      dirLightRef.current.intensity = smoothedDirIntensityRef.current;
      dirLightRef.current.position.set(
        28 - sunsetProg * 18,
        THREE.MathUtils.lerp(48, 20, sunsetProg),
        24 - sunsetProg * 48
      );
    }

    if (rimLightRef.current) {
      rimLightRef.current.color.lerp(scratchColors.targetRim, Math.min(1, safeDelta * 4));
      rimLightRef.current.intensity = 1.15 + fBlend * 0.65 + nBlend * 0.8 + chaiW * 0.5;
    }

    // Dynamic Street Lamp & Twilight Illumination along active road corridor (with subtle night sodium flicker)
    const sodiumFlicker = nBlend > 0.25 ? 0.88 + Math.sin(t * 23) * 0.08 + Math.sin(t * 51) * 0.04 : 1.0;
    const lampLightPower = (sunsetState.lampIntensity * 3.8 + fBlend * 1.4 + chaiW * 0.8) * sodiumFlicker;
    if (streetLightNearRef.current) {
      streetLightNearRef.current.intensity = lampLightPower;
      streetLightNearRef.current.color.set(nBlend > 0.5 ? '#f59e0b' : '#fbbf24');
    }
    if (streetLightFarRef.current) {
      streetLightFarRef.current.intensity = lampLightPower;
      streetLightFarRef.current.color.set(nBlend > 0.5 ? '#fb923c' : '#f59e0b');
    }
  });

  return (
    <>
      <color attach="background" args={['#fde2c4']} />
      <fogExp2 attach="fog" args={['#fde2c4', 0.0044]} />

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
        shadow-mapSize={[1536, 1536]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={5}
        shadow-camera-far={95}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
      />
      {/* Rim / Backlight from the Horizon */}
      <pointLight ref={rimLightRef} position={[0, 26, -140]} intensity={1.1} color="#fef08a" distance={220} decay={1.8} />

      {/* Warm Sodium-Vapor Street Lamp Fill Lights along the player's corridor */}
      <pointLight ref={streetLightNearRef} position={[0, 7.5, -4]} intensity={0} color="#fbbf24" distance={28} decay={1.6} />
      <pointLight ref={streetLightFarRef} position={[0, 7.5, -26]} intensity={0} color="#f59e0b" distance={32} decay={1.6} />
    </>
  );
};

// Zone-Reactive Weather & Atmospheric Particles (Dust/Marigold Petals -> Festival Embers -> Zone 3 Monsoon Drizzle)
const RAIN_DROP_COUNT = 110;
const RAIN_STREAK_GEO = new THREE.BoxGeometry(0.018, 0.72, 0.018);

const BazaarParticles: React.FC = () => {
  const speed = useStore(state => state.speed);
  const count = 80;
  const meshRef = useRef<THREE.Points>(null);
  const rainInstancedRef = useRef<THREE.InstancedMesh>(null);

  const rainScratch = useMemo(() => new THREE.Object3D(), []);
  const rainDrops = useMemo(() => {
    return Array.from({ length: RAIN_DROP_COUNT }, () => ({
      x: (Math.random() - 0.5) * 26,
      y: Math.random() * 14,
      z: -65 + Math.random() * 75,
      velY: 22 + Math.random() * 8,
    }));
  }, []);

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

  const dustPointsMat = useMemo(
    () =>
      applyWorldCurve(
        new THREE.PointsMaterial({
          size: 0.14,
          vertexColors: true,
          transparent: true,
          opacity: 0.18,
          sizeAttenuation: true,
        })
      ),
    []
  );

  const rainStreakMat = useMemo(
    () =>
      applyWorldCurve(
        new THREE.MeshBasicMaterial({
          color: '#bae6fd',
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
        })
      ),
    []
  );

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const { level, distance } = useStore.getState();
    const zone = getEnvironmentZone(distance, level);
    const activeSpeed = speed > 0 ? speed : 3;
    const isFestival = zone.hasTriangleBunting;
    const isMonsoonZone = level >= 4 || zone.id === 'METRO_NIGHT_BAZAAR';

    if (meshRef.current) {
      const posAttr = meshRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        let z = posAttr[i * 3 + 2];
        z += activeSpeed * safeDelta * 1.1;
        // Festival embers rise slightly; afternoon dust gently hovers
        const verticalDrift = isFestival ? 0.55 : Math.sin(state.clock.elapsedTime * 1.8 + i) * 0.22;
        posAttr[i * 3 + 1] += verticalDrift * safeDelta;

        if (z > 22 || posAttr[i * 3 + 1] > 22) {
          const side = i % 2 === 0 ? 1 : -1;
          z = -185 - Math.random() * 20;
          posAttr[i * 3] = side * (9.5 + Math.random() * 24);
          posAttr[i * 3 + 1] = isFestival ? 1.5 + Math.random() * 8 : Math.random() * 18 + 2.5;
        }
        posAttr[i * 3 + 2] = z;
      }
      meshRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Zone 3 / Monsoon Drizzle
    if (rainInstancedRef.current) {
      rainInstancedRef.current.visible = isMonsoonZone;
      if (isMonsoonZone) {
        rainStreakMat.opacity = THREE.MathUtils.damp(rainStreakMat.opacity, 0.28, 3, safeDelta);
        for (let i = 0; i < RAIN_DROP_COUNT; i++) {
          const drop = rainDrops[i];
          drop.y -= drop.velY * safeDelta;
          drop.z += activeSpeed * safeDelta * 0.85;
          drop.x -= safeDelta * 2.2; // Slight monsoon wind slant
          if (drop.y < 0 || drop.z > 10) {
            drop.y = 12 + Math.random() * 4;
            drop.z = -65 + Math.random() * 72;
            drop.x = (Math.random() - 0.5) * 26;
          }
          rainScratch.position.set(drop.x, drop.y, drop.z);
          rainScratch.rotation.set(0.18, 0, 0.12);
          rainScratch.updateMatrix();
          rainInstancedRef.current.setMatrixAt(i, rainScratch.matrix);
        }
        rainInstancedRef.current.instanceMatrix.needsUpdate = true;
      } else {
        rainStreakMat.opacity = 0;
      }
    }
  });

  return (
    <>
      <points ref={meshRef} material={dustPointsMat}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
        </bufferGeometry>
      </points>
      <instancedMesh
        ref={rainInstancedRef}
        args={[RAIN_STREAK_GEO, rainStreakMat, RAIN_DROP_COUNT]}
        visible={false}
      />
    </>
  );
};

// Indian Street Road: Curved Desaturated Weathered Asphalt Surface across all street environments
const IndianRoad: React.FC = () => {
  const { laneCount, speed } = useStore();
  const dashGroupRef = useRef<THREE.Group>(null);
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
    tex.repeat.set(1, 30);
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    return tex;
  }, [gl]);

  // Procedural 256x256 Desaturated Asphalt Albedo (Tyre-Wear Streaks + Painted Cracks), Puddle Roughness & Aggregate Bump
  const { roadAlbedoTex, roadRoughnessTex, roadBumpTex, sidewalkBumpTex } = useMemo(() => {
    const size = 256;
    const maxAniso = gl.capabilities.getMaxAnisotropy();

    const albedoCanvas = document.createElement('canvas');
    const roughCanvas = document.createElement('canvas');
    const bumpCanvas = document.createElement('canvas');
    albedoCanvas.width = roughCanvas.width = bumpCanvas.width = size;
    albedoCanvas.height = roughCanvas.height = bumpCanvas.height = size;

    const aCtx = albedoCanvas.getContext('2d')!;
    const rCtx = roughCanvas.getContext('2d')!;
    const bCtx = bumpCanvas.getContext('2d')!;

    // Slightly desaturated charcoal-slate asphalt base so colourful autos/coins pop immediately
    aCtx.fillStyle = '#2d3138';
    aCtx.fillRect(0, 0, size, size);
    rCtx.fillStyle = 'rgb(228, 228, 228)';
    rCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = 'rgb(128, 128, 128)';
    bCtx.fillRect(0, 0, size, size);

    // Subtle longitudinal tyre-wear streaks down lane centers
    for (let t = 0; t < 6; t++) {
      const x = 28 + t * 38 + (t % 2) * 6;
      aCtx.fillStyle = 'rgba(26, 28, 32, 0.42)';
      aCtx.fillRect(x, 0, 14, size);
      rCtx.fillStyle = 'rgba(182, 182, 182, 0.38)';
      rCtx.fillRect(x, 0, 12, size);
    }

    // Aggregate stone speckle (low-saturation neutral grey grain)
    for (let i = 0; i < 3600; i++) {
      const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * size;
      const y = ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1 * size;
      const shade = 38 + (i % 24);
      aCtx.fillStyle = `rgb(${shade}, ${shade + 1}, ${shade + 2})`;
      aCtx.fillRect(x, y, 2, 2);

      const bVal = 96 + (i % 64);
      bCtx.fillStyle = `rgb(${bVal}, ${bVal}, ${bVal})`;
      bCtx.fillRect(x, y, 2, 2);
    }

    // Fine painted/tar-sealed hairline asphalt cracks
    const drawHairlineCrack = (startX: number, startY: number, steps: number, seed: number) => {
      aCtx.strokeStyle = 'rgba(18, 20, 24, 0.72)';
      aCtx.lineWidth = 1.25;
      bCtx.strokeStyle = 'rgb(70, 70, 70)';
      bCtx.lineWidth = 1.4;
      aCtx.beginPath();
      bCtx.beginPath();
      let cx = startX;
      let cy = startY;
      aCtx.moveTo(cx, cy);
      bCtx.moveTo(cx, cy);
      for (let s = 1; s <= steps; s++) {
        cx += Math.sin(seed * 19.3 + s * 2.7) * 14;
        cy += size / steps;
        aCtx.lineTo(cx, cy);
        bCtx.lineTo(cx, cy);
      }
      aCtx.stroke();
      bCtx.stroke();
    };
    drawHairlineCrack(64, 0, 10, 1.4);
    drawHairlineCrack(188, 0, 11, 3.8);
    drawHairlineCrack(124, 20, 8, 6.2);

    // Specular wet puddles & oil-sheen patches (low roughness ~0.08 in core)
    const puddles = [
      { x: 58, y: 60, rx: 24, ry: 36 },
      { x: 190, y: 105, rx: 26, ry: 44 },
      { x: 122, y: 182, rx: 32, ry: 34 },
      { x: 48, y: 215, rx: 20, ry: 28 },
    ];
    puddles.forEach(p => {
      const rGrad = rCtx.createRadialGradient(p.x, p.y, 3, p.x, p.y, Math.max(p.rx, p.ry));
      rGrad.addColorStop(0, 'rgb(18, 18, 18)');
      rGrad.addColorStop(0.55, 'rgb(44, 44, 44)');
      rGrad.addColorStop(0.85, 'rgb(135, 135, 135)');
      rGrad.addColorStop(1, 'rgba(228, 228, 228, 0)');
      rCtx.fillStyle = rGrad;
      rCtx.beginPath();
      rCtx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      rCtx.fill();

      aCtx.fillStyle = 'rgba(22, 25, 30, 0.32)';
      aCtx.beginPath();
      aCtx.ellipse(p.x, p.y, p.rx * 0.78, p.ry * 0.78, 0, 0, Math.PI * 2);
      aCtx.fill();
    });

    // Sidewalk interlocking paver block bump texture
    const swCanvas = document.createElement('canvas');
    swCanvas.width = 256;
    swCanvas.height = 256;
    const swCtx = swCanvas.getContext('2d')!;
    swCtx.fillStyle = 'rgb(165, 165, 165)';
    swCtx.fillRect(0, 0, 256, 256);
    swCtx.strokeStyle = 'rgb(75, 75, 75)';
    swCtx.lineWidth = 3;
    const tileW = 64;
    const tileH = 32;
    for (let row = 0; row < 256 / tileH; row++) {
      const rowOffset = (row % 2) * (tileW / 2);
      for (let col = -1; col < 256 / tileW + 1; col++) {
        swCtx.strokeRect(col * tileW + rowOffset, row * tileH, tileW, tileH);
      }
    }

    const prepTex = (canvas: HTMLCanvasElement, isColor: boolean, repX: number, repY: number) => {
      const tex = new THREE.CanvasTexture(canvas);
      if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repX, repY);
      tex.anisotropy = maxAniso;
      return tex;
    };

    return {
      roadAlbedoTex: prepTex(albedoCanvas, true, 1, 31.25),
      roadRoughnessTex: prepTex(roughCanvas, false, 1, 31.25),
      roadBumpTex: prepTex(bumpCanvas, false, 1, 31.25),
      sidewalkBumpTex: prepTex(swCanvas, false, 2, 62.5),
    };
  }, [gl]);

  // Curved Materials for Road, Sidewalks, Curbs, Gutters & Lane Dividers
  const roadMats = useMemo(() => {
    const initialZone = getEnvironmentZone(0, 1);
    return {
      outerGround: applyWorldCurve(
        new THREE.MeshStandardMaterial({
          color: initialZone.outerGroundHex,
          roughness: 0.92,
          metalness: 0.02,
        })
      ),
      sidewalkLeft: applyWorldCurve(
        new THREE.MeshStandardMaterial({
          color: initialZone.sidewalkHex,
          bumpMap: sidewalkBumpTex,
          bumpScale: 0.025,
          roughness: 0.85,
          metalness: 0.04,
        })
      ),
      sidewalkRight: applyWorldCurve(
        new THREE.MeshStandardMaterial({
          color: initialZone.sidewalkHex,
          bumpMap: sidewalkBumpTex,
          bumpScale: 0.025,
          roughness: 0.85,
          metalness: 0.04,
        })
      ),
      road: applyWorldCurve(
        new THREE.MeshStandardMaterial({
          color: '#ffffff',
          map: roadAlbedoTex,
          roughnessMap: roadRoughnessTex,
          bumpMap: roadBumpTex,
          bumpScale: 0.022,
          roughness: 0.88,
          metalness: 0.05,
        })
      ),
      gutter: applyWorldCurve(new THREE.MeshBasicMaterial({ color: '#f59e0b' })),
      curb: applyWorldCurve(new THREE.MeshStandardMaterial({ map: curbTexture, roughness: 0.7 })),
      dash: applyWorldCurve(
        new THREE.MeshBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.82 })
      ),
    };
  }, [curbTexture, roadAlbedoTex, roadBumpTex, roadRoughnessTex, sidewalkBumpTex]);

  const targetSidewalkColor = useMemo(() => new THREE.Color(), []);
  const targetOuterColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const activeSpeed = speed > 0 ? speed : 4;
    offsetRef.current = (offsetRef.current + activeSpeed * safeDelta) % 8;
    const tilePhase = offsetRef.current / 8;
    if (dashGroupRef.current) {
      dashGroupRef.current.position.z = offsetRef.current;
    }
    curbTexture.offset.y = -offsetRef.current * 0.15;
    roadAlbedoTex.offset.y = tilePhase;
    roadRoughnessTex.offset.y = tilePhase;
    roadBumpTex.offset.y = tilePhase;
    sidewalkBumpTex.offset.y = tilePhase * 2;

    const stateNow = useStore.getState();
    const zone = getEnvironmentZone(stateNow.distance, stateNow.level);
    const isWetZone = stateNow.level >= 4 || zone.id === 'METRO_NIGHT_BAZAAR';
    roadMats.road.roughness = isWetZone ? 0.64 : 0.86;
    roadMats.road.metalness = isWetZone ? 0.16 : 0.05;

    targetSidewalkColor.set(zone.sidewalkHex);
    roadMats.sidewalkLeft.color.lerp(targetSidewalkColor, Math.min(1, safeDelta * 3));
    roadMats.sidewalkRight.color.lerp(targetSidewalkColor, Math.min(1, safeDelta * 3));

    targetOuterColor.set(zone.outerGroundHex);
    roadMats.outerGround.color.lerp(targetOuterColor, Math.min(1, safeDelta * 3));
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
      {/* Outer Courtyard Ground (Subdivided longitudinally for smooth World Curve) */}
      <mesh position={[0, -0.08, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={roadMats.outerGround}>
        <planeGeometry args={[260, 260, 16, 64]} />
      </mesh>

      {/* Wide Raised Pedestrian Sidewalk Promenades on Left & Right */}
      <mesh position={[-(roadWidth / 2 + 3.4), 0.04, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={roadMats.sidewalkLeft}>
        <planeGeometry args={[5.8, 250, 2, 64]} />
      </mesh>
      <mesh position={[roadWidth / 2 + 3.4, 0.04, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={roadMats.sidewalkRight}>
        <planeGeometry args={[5.8, 250, 2, 64]} />
      </mesh>

      {/* Main Street Surface (Curved Desaturated Weathered Asphalt with Tyre Streaks & Cracks) */}
      <mesh position={[0, -0.01, -90]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={roadMats.road}>
        <planeGeometry args={[roadWidth + 0.8, 250, 4, 64]} />
      </mesh>

      {/* Continuous Side Gutter / Edge Lines */}
      <mesh position={[-roadWidth / 2, 0.01, -90]} rotation={[-Math.PI / 2, 0, 0]} material={roadMats.gutter}>
        <planeGeometry args={[0.16, 240, 1, 64]} />
      </mesh>
      <mesh position={[roadWidth / 2, 0.01, -90]} rotation={[-Math.PI / 2, 0, 0]} material={roadMats.gutter}>
        <planeGeometry args={[0.16, 240, 1, 64]} />
      </mesh>

      {/* Raised Indian Footpath Curbs (64 depth segments for smooth World Curve) */}
      <mesh position={[-roadWidth / 2 - 0.55, 0.13, -90]} receiveShadow castShadow material={roadMats.curb}>
        <boxGeometry args={[0.7, 0.26, 240, 1, 1, 64]} />
      </mesh>
      <mesh position={[roadWidth / 2 + 0.55, 0.13, -90]} receiveShadow castShadow material={roadMats.curb}>
        <boxGeometry args={[0.7, 0.26, 240, 1, 1, 64]} />
      </mesh>

      {/* Scrolling Lane Dividers */}
      <group ref={dashGroupRef}>
        {separators.map((x, idx) => (
          <group key={`lane-sep-${idx}`} position={[x, 0.015, 0]}>
            {dashPositionsZ.map((z, j) => (
              <mesh key={j} position={[0, 0, z]} rotation={[-Math.PI / 2, 0, 0]} material={roadMats.dash}>
                <planeGeometry args={[0.12, 3.6]} />
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

  // Generate crisp procedural Hindi + English shop signboards (curved shader enabled)
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

      return applyWorldCurve(
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.3,
          metalness: 0.1,
          emissive: new THREE.Color(spec.border),
          emissiveIntensity: 0.15,
        })
      );
    });
  }, [gl]);

  // Projecting Hanging Shop Icon Signs (Steaming Chai Cup & Zaveri Diamond Icon)
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
      return applyWorldCurve(
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.35,
          emissive: new THREE.Color(border),
          emissiveIntensity: 0.2,
        })
      );
    };

    return [
      createIconSign('#fef3c7', '#78350f', '☕', 'CHAI'),
      createIconSign('#1e3a8a', '#38bdf8', '💎', 'ZAVERI'),
      createIconSign('#991b1b', '#facc15', '🍬', 'MITHAI'),
    ];
  }, [gl]);

  // Striped Market Stall Canopy Texture
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
      return applyWorldCurve(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 }));
    };
    return [
      createStripeMat('#dc2626', '#facc15'), // Red & Yellow striped canopy
      createStripeMat('#0284c7', '#f8fafc'), // Blue & White striped canopy
      createStripeMat('#16a34a', '#fde047'), // Green & Yellow striped canopy
    ];
  }, []);

  // 256x256 Procedural AO-Gradient & Weathered Textures for Shop Facades and Rolling Shutters
  const { facadeAoTex, shutterAoTex, shutterBumpTex, stuccoBumpTex } = useMemo(() => {
    // 1. 256x256 Shop Facade AO Gradient (25%+ darker & weathered/grimy near street level, bright/warm near roof)
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 256;
    fCanvas.height = 256;
    const fCtx = fCanvas.getContext('2d')!;
    const fGrad = fCtx.createLinearGradient(0, 0, 0, 256);
    fGrad.addColorStop(0.0, 'rgb(255, 250, 242)'); // Warm bright highlight near roof
    fGrad.addColorStop(0.58, 'rgb(236, 230, 222)');
    fGrad.addColorStop(0.84, 'rgb(202, 194, 184)');
    fGrad.addColorStop(1.0, 'rgb(176, 168, 158)'); // ~30% darker AO near street level
    fCtx.fillStyle = fGrad;
    fCtx.fillRect(0, 0, 256, 256);

    // Subtle rain runoff streaks & weathered street grime concentrated near the lower half
    for (let s = 0; s < 38; s++) {
      const sx = ((Math.sin(s * 31.7) * 43758.5) % 1 + 1) % 1 * 256;
      const sh = 24 + (s % 55);
      fCtx.fillStyle = s % 2 === 0 ? 'rgba(90, 76, 62, 0.08)' : 'rgba(65, 58, 52, 0.06)';
      fCtx.fillRect(sx, 256 - sh, 4 + (s % 6), sh);
    }
    for (let i = 0; i < 1800; i++) {
      const x = ((Math.sin(i * 19.3) * 43758.5) % 1 + 1) % 1 * 256;
      const y = 140 + ((Math.sin(i * 61.9) * 43758.5) % 1 + 1) % 1 * 116;
      fCtx.fillStyle = i % 3 === 0 ? 'rgba(72, 62, 52, 0.08)' : 'rgba(120, 110, 96, 0.06)';
      fCtx.fillRect(x, y, 2, 2);
    }
    const fTex = new THREE.CanvasTexture(fCanvas);
    fTex.colorSpace = THREE.SRGBColorSpace;
    fTex.anisotropy = gl.capabilities.getMaxAnisotropy();

    // 2. 256x256 Rolling Metal Shutter AO & Corrugated Grime Texture
    const shCanvas = document.createElement('canvas');
    shCanvas.width = 256;
    shCanvas.height = 256;
    const shCtx = shCanvas.getContext('2d')!;
    const shGrad = shCtx.createLinearGradient(0, 0, 0, 256);
    shGrad.addColorStop(0.0, 'rgb(110, 124, 140)');
    shGrad.addColorStop(0.65, 'rgb(88, 100, 116)');
    shGrad.addColorStop(1.0, 'rgb(62, 68, 78)'); // Darker & road-splashed near curb
    shCtx.fillStyle = shGrad;
    shCtx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 8) {
      shCtx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      shCtx.fillRect(0, y, 256, 2);
      shCtx.fillStyle = 'rgba(226, 232, 240, 0.14)';
      shCtx.fillRect(0, y + 2, 256, 1);
    }
    for (let i = 0; i < 650; i++) {
      const gx = ((Math.sin(i * 47.1) * 43758.5) % 1 + 1) % 1 * 256;
      const gy = 175 + ((Math.sin(i * 83.3) * 43758.5) % 1 + 1) % 1 * 81;
      shCtx.fillStyle = 'rgba(78, 52, 32, 0.16)';
      shCtx.fillRect(gx, gy, 3, 2);
    }
    const shTex = new THREE.CanvasTexture(shCanvas);
    shTex.colorSpace = THREE.SRGBColorSpace;
    shTex.anisotropy = gl.capabilities.getMaxAnisotropy();

    // 3. Corrugated rolling metal shutter bump ribs
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 128;
    sCanvas.height = 128;
    const sCtx = sCanvas.getContext('2d')!;
    for (let y = 0; y < 128; y++) {
      const wave = Math.floor(128 + Math.sin((y / 128) * Math.PI * 2 * 14) * 95);
      sCtx.fillStyle = `rgb(${wave},${wave},${wave})`;
      sCtx.fillRect(0, y, 128, 1);
    }
    const sTex = new THREE.CanvasTexture(sCanvas);
    sTex.wrapS = THREE.RepeatWrapping;
    sTex.wrapT = THREE.RepeatWrapping;

    // 4. Weathered Indian haveli plaster/brick stucco bump grain
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 256;
    wCanvas.height = 256;
    const wCtx = wCanvas.getContext('2d')!;
    wCtx.fillStyle = 'rgb(138,138,138)';
    wCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3200; i++) {
      const x = ((Math.sin(i * 41.2) * 43758.5) % 1 + 1) % 1 * 256;
      const y = ((Math.sin(i * 93.7) * 43758.5) % 1 + 1) % 1 * 256;
      const g = 100 + (i % 70);
      wCtx.fillStyle = `rgb(${g},${g},${g})`;
      wCtx.fillRect(x, y, 3, 2);
    }
    const wTex = new THREE.CanvasTexture(wCanvas);
    wTex.wrapS = THREE.RepeatWrapping;
    wTex.wrapT = THREE.RepeatWrapping;
    wTex.repeat.set(2, 2);

    return { facadeAoTex: fTex, shutterAoTex: shTex, shutterBumpTex: sTex, stuccoBumpTex: wTex };
  }, [gl]);

  const sharedMats = useMemo(() => ({
    shutter: applyWorldCurve(
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: shutterAoTex,
        bumpMap: shutterBumpTex,
        bumpScale: 0.045,
        roughness: 0.46,
        metalness: 0.62,
      })
    ),
    waterTank: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.3 })),
    pole: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.8, metalness: 0.2 })),
    windowGlass: applyWorldCurve(
      new THREE.MeshStandardMaterial({
        color: '#fef08a',
        emissive: '#f59e0b',
        emissiveIntensity: 0.35,
        roughness: 0.2,
      })
    ),
    bulb: applyWorldCurve(
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        emissive: '#fbbf24',
        emissiveIntensity: 0.15,
        roughness: 0.2,
      })
    ),
    lampHalo: applyWorldCurve(
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    ),
    lampCone: applyWorldCurve(
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    ),
    lampPool: applyWorldCurve(
      new THREE.MeshBasicMaterial({
        color: '#f59e0b',
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    ),
    marigoldOrange: applyWorldCurve(
      new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.6, emissive: '#ea580c', emissiveIntensity: 0.25 })
    ),
    marigoldYellow: applyWorldCurve(
      new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.6, emissive: '#eab308', emissiveIntensity: 0.25 })
    ),
    palmTrunk: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.9 })),
    palmFrond: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.65 })),
    palmGrate: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.8, metalness: 0.4 })),
    stallWood: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 })),
    barrelWood: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.8, metalness: 0.15 })),
    matkaGreen: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.35, metalness: 0.1 })),
    matkaTerracotta: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#c2410c', roughness: 0.7 })),
    concreteViaduct: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.88, metalness: 0.12 })),
    metroRail: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.35, metalness: 0.7 })),
    festivalArchWood: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.75, metalness: 0.05 })),
    festivalArchBanner: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.65, metalness: 0.08, emissive: '#9a3412', emissiveIntensity: 0.2 })),
    electricalCable: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.85, metalness: 0.2 })),
    bambooPole: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.85, metalness: 0.05 })),
    overhangBanners: [
      applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.68 })),
      applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.68 })),
      applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.68 })),
    ],
    festivalLanternOrb: applyWorldCurve(
      new THREE.MeshStandardMaterial({
        color: '#fed7aa',
        emissive: '#f97316',
        emissiveIntensity: 1.6,
        roughness: 0.25,
      })
    ),
    festivalLanternHalo: applyWorldCurve(
      new THREE.MeshBasicMaterial({
        color: '#fb923c',
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    ),
    buntingColors: [
      applyWorldCurve(new THREE.MeshBasicMaterial({ color: '#ef4444' })),
      applyWorldCurve(new THREE.MeshBasicMaterial({ color: '#facc15' })),
      applyWorldCurve(new THREE.MeshBasicMaterial({ color: '#38bdf8' })),
      applyWorldCurve(new THREE.MeshBasicMaterial({ color: '#22c55e' })),
      applyWorldCurve(new THREE.MeshBasicMaterial({ color: '#ec4899' })),
    ],
    // Zone Wall, Trim & Awning Cached Curved Materials (mutated cleanly by activeZone)
    wallPaletteMats: [0, 1, 2].map(() =>
      applyWorldCurve(
        new THREE.MeshStandardMaterial({
          color: '#d97706',
          map: facadeAoTex,
          bumpMap: stuccoBumpTex,
          bumpScale: 0.03,
          roughness: 0.84,
          metalness: 0.05,
        })
      )
    ),
    trimMat: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#e6ccb2', roughness: 0.58, metalness: 0.12 })),
    backdropMat: applyWorldCurve(new THREE.MeshStandardMaterial({ color: '#7f5539', roughness: 0.96, metalness: 0.02 })),
    awningMats: SHOP_SPECS.map(spec =>
      applyWorldCurve(new THREE.MeshStandardMaterial({ color: spec.awningColor, roughness: 0.62, metalness: 0.1 }))
    ),
  }), [facadeAoTex, shutterAoTex, shutterBumpTex, stuccoBumpTex]);

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

    // Dynamically scale street lamp bulb glow, volumetric halos, road light pools, festival lanterns & shop walls
    const zoneNow = getEnvironmentZone(useStore.getState().distance, useStore.getState().level);
    const lampLvl = sunsetState.lampIntensity;
    const isMetroNight = sunsetState.isMetroNight;
    const isFest = sunsetState.isFestival;

    const baseFlicker = isMetroNight
      ? 0.84 + Math.sin(state.clock.elapsedTime * 27.0) * 0.1 + Math.sin(state.clock.elapsedTime * 61.0) * 0.06
      : 0.96 + Math.sin(state.clock.elapsedTime * 11.0) * 0.04;

    sharedMats.bulb.emissiveIntensity = THREE.MathUtils.lerp(0.18, 3.8, lampLvl) * baseFlicker;
    sharedMats.lampHalo.opacity = THREE.MathUtils.lerp(0.0, 0.48, lampLvl) * baseFlicker;
    sharedMats.lampCone.opacity = THREE.MathUtils.lerp(0.0, isMetroNight ? 0.19 : 0.14, lampLvl) * baseFlicker;
    sharedMats.lampPool.opacity = THREE.MathUtils.lerp(0.0, 0.34, lampLvl) * baseFlicker;
    sharedMats.windowGlass.emissiveIntensity = THREE.MathUtils.lerp(0.28, 1.55, lampLvl);

    const signGlow = THREE.MathUtils.lerp(0.15, 0.92, lampLvl);
    for (let i = 0; i < signMaterials.length; i++) {
      signMaterials[i].emissiveIntensity = signGlow;
    }

    const garlandGlow = isFest ? 0.65 + Math.sin(state.clock.elapsedTime * 4) * 0.12 : THREE.MathUtils.lerp(0.18, 0.45, lampLvl);
    sharedMats.marigoldOrange.emissiveIntensity = garlandGlow;
    sharedMats.marigoldYellow.emissiveIntensity = garlandGlow;

    const lanternFlicker = 0.9 + Math.sin(state.clock.elapsedTime * 5.2) * 0.1;
    sharedMats.festivalLanternOrb.emissiveIntensity = (isFest ? 2.1 : 0.95) * lanternFlicker;
    sharedMats.festivalLanternHalo.opacity = (isFest ? 0.42 : 0.22) * lanternFlicker;

    // Sync cached curved zone wall, trim & backdrop colors cleanly
    for (let w = 0; w < 3; w++) {
      sharedMats.wallPaletteMats[w].color.set(zoneNow.wallPalette[w]);
    }
    sharedMats.trimMat.color.set(zoneNow.trimHex);
    sharedMats.backdropMat.color.set(zoneNow.outerGroundHex);
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
        const leftWallMat = sharedMats.wallPaletteMats[pair.leftPaletteIdx];
        const rightWallMat = sharedMats.wallPaletteMats[pair.rightPaletteIdx];

        return (
          <group key={pair.id} position={[0, 0, pair.initialZ]}>
            {/* --- LEFT SHOP BUILDING & SIDEWALK PROMENADE --- */}
            <group position={[-sideOffset, 0, 0]}>
              {/* Main Ground & First Floor (Curved + 256x256 Weathered AO Gradient) */}
              <mesh
                castShadow
                receiveShadow
                position={[0, 4.25 * pair.leftHeightScale, 0]}
                scale={[1, pair.leftHeightScale, 1]}
                geometry={BUILDING_BASE_GEO}
                material={leftWallMat}
              />
              {/* Upper Haveli Story */}
              <mesh
                castShadow
                position={[-0.2, 9.2 * pair.leftHeightScale, 0]}
                geometry={BUILDING_UPPER_GEO}
                material={leftWallMat}
              />
              {/* Parapet Roof Trim */}
              <mesh position={[0, 11.6 * pair.leftHeightScale, 0]} geometry={PARAPET_GEO} material={sharedMats.trimMat} />
              {/* Illuminated Upper Haveli Windows (Left & Right Bays) */}
              {[-2.2, 2.2].map((winZ, wIdx) => (
                <group key={wIdx} position={[2.42, 8.9 * pair.leftHeightScale, winZ]}>
                  <mesh geometry={WINDOW_FRAME_GEO} material={sharedMats.trimMat} />
                  <mesh geometry={WINDOW_GLASS_GEO} material={sharedMats.windowGlass} />
                </group>
              ))}
              {/* Rooftop Black Water Tank */}
              <mesh position={[0, 12.5 * pair.leftHeightScale, -1.5]} geometry={WATER_TANK_GEO} material={sharedMats.waterTank} />
              {/* Shop Shutter Recess (256x256 AO + Corrugated Steel) */}
              <mesh position={[2.75, 1.6, 0]} geometry={SHUTTER_GEO} material={sharedMats.shutter} />
              {/* Sloped Bazaar Awning */}
              <mesh
                position={[3.25, 3.3, 0]}
                rotation={[0, 0, -0.22]}
                geometry={AWNING_GEO}
                material={sharedMats.awningMats[pair.leftSpecIdx]}
              />
              {/* Glowing Hindi/English Shop Signboard */}
              <mesh position={[2.85, 4.35, 0]} geometry={SIGNBOARD_GEO} material={signMaterials[pair.leftSpecIdx]} />
              {/* Upper Balcony (Jharokha) */}
              <mesh position={[2.9, 6.55, 0]} geometry={BALCONY_GEO} material={sharedMats.trimMat} />

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
                    <mesh position={[1.35, 3.95, 0]} rotation={[0, 0, -0.05]} geometry={LAMP_CONE_GEO} material={sharedMats.lampCone} />
                    <mesh position={[1.6, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={LAMP_POOL_GEO} material={sharedMats.lampPool} />
                  </group>
                </>
              )}
            </group>

            {/* --- RIGHT SHOP BUILDING & SIDEWALK PROMENADE --- */}
            <group position={[sideOffset, 0, 0]}>
              <mesh
                castShadow
                receiveShadow
                position={[0, 4.25 * pair.rightHeightScale, 0]}
                scale={[1, pair.rightHeightScale, 1]}
                geometry={BUILDING_BASE_GEO}
                material={rightWallMat}
              />
              <mesh
                castShadow
                position={[0.2, 9.2 * pair.rightHeightScale, 0]}
                geometry={BUILDING_UPPER_GEO}
                material={rightWallMat}
              />
              <mesh position={[0, 11.6 * pair.rightHeightScale, 0]} geometry={PARAPET_GEO} material={sharedMats.trimMat} />
              {/* Illuminated Upper Haveli Windows (Left & Right Bays) */}
              {[-2.2, 2.2].map((winZ, wIdx) => (
                <group key={wIdx} position={[-2.42, 8.9 * pair.rightHeightScale, winZ]}>
                  <mesh geometry={WINDOW_FRAME_GEO} material={sharedMats.trimMat} />
                  <mesh geometry={WINDOW_GLASS_GEO} material={sharedMats.windowGlass} />
                </group>
              ))}
              <mesh position={[0, 12.5 * pair.rightHeightScale, 1.5]} geometry={WATER_TANK_GEO} material={sharedMats.waterTank} />
              <mesh position={[-2.75, 1.6, 0]} geometry={SHUTTER_GEO} material={sharedMats.shutter} />
              <mesh
                position={[-3.25, 3.3, 0]}
                rotation={[0, 0, 0.22]}
                geometry={AWNING_GEO}
                material={sharedMats.awningMats[pair.rightSpecIdx]}
              />
              <mesh position={[-2.85, 4.35, 0]} rotation={[0, Math.PI, 0]} geometry={SIGNBOARD_GEO} material={signMaterials[pair.rightSpecIdx]} />
              <mesh position={[-2.9, 6.55, 0]} geometry={BALCONY_GEO} material={sharedMats.trimMat} />

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
                    <mesh position={[-1.35, 3.95, 0]} rotation={[0, 0, 0.05]} geometry={LAMP_CONE_GEO} material={sharedMats.lampCone} />
                    <mesh position={[-1.6, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={LAMP_POOL_GEO} material={sharedMats.lampPool} />
                  </group>
                </>
              )}
            </group>

            {/* --- OVERHEAD CURVED ELECTRICAL CABLES (CatmullRomCurve3) & BAMBOO/FABRIC CANOPY IN ALL ZONES --- */}
            <group>
              <mesh geometry={ELECTRICAL_CABLE_GEO_A} material={sharedMats.electricalCable} />
              <mesh geometry={ELECTRICAL_CABLE_GEO_B} material={sharedMats.electricalCable} />
              {/* Occasional Bamboo + Fabric Overhang Banners spanning high overhead across the street */}
              {pair.id % 2 === 0 && (
                <group position={[0, 7.05, 0]}>
                  <mesh rotation={[0, 0, Math.PI / 2]} geometry={OVERHANG_BAMBOO_GEO} material={sharedMats.bambooPole} />
                  <mesh position={[0, -0.38, 0]} geometry={OVERHANG_FABRIC_GEO} material={sharedMats.overhangBanners[pair.id % 3]} />
                </group>
              )}
            </group>

            {/* --- OVERHEAD MARIGOLD TORAN GARLAND & FESTIVAL LANTERN ORBS / TRIANGLE BUNTING --- */}
            {pair.hasGarland && (
              <group position={[0, 8.4, 0]}>
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
                    {/* Hanging Warm-Orange Glowing Festival Lantern Orbs in Level 3 Festival Street */}
                    {(level === 3 || activeZone.id === 'FESTIVAL_STREET') && idx % 3 === 1 && (
                      <group position={[0, -0.55, 0]}>
                        <mesh position={[0, 0.28, 0]} geometry={LANTERN_CORD_GEO} material={sharedMats.electricalCable} />
                        <mesh geometry={LANTERN_ORB_GEO} material={sharedMats.festivalLanternOrb} />
                        <mesh geometry={LANTERN_GLOW_GEO} material={sharedMats.festivalLanternHalo} />
                      </group>
                    )}
                  </group>
                ))}
              </group>
            )}

            {/* --- UNIQUE ZONE OVERHEAD PROPS --- */}
            {/* Level 3 / Festival Street: Traditional Grand Marigold Floral Entrance Arch + Lantern Accent */}
            {pair.id % 4 === 1 && activeZone.hasTriangleBunting && (
              <group position={[0, 0, 0]}>
                <mesh position={[-roadHalfWidth - 1.25, 3.2, 0]} geometry={FESTIVAL_ARCH_PILLAR_GEO} material={sharedMats.festivalArchWood} />
                <mesh position={[roadHalfWidth + 1.25, 3.2, 0]} geometry={FESTIVAL_ARCH_PILLAR_GEO} material={sharedMats.festivalArchWood} />
                {/* Marigold Wraps around pillars */}
                <mesh position={[-roadHalfWidth - 1.25, 3.2, 0]} scale={[1.15, 0.95, 1.15]} geometry={FESTIVAL_ARCH_PILLAR_GEO} material={sharedMats.marigoldOrange} />
                <mesh position={[roadHalfWidth + 1.25, 3.2, 0]} scale={[1.15, 0.95, 1.15]} geometry={FESTIVAL_ARCH_PILLAR_GEO} material={sharedMats.marigoldYellow} />
                {/* High Elevated Floral Crossbeam (y = 6.4m, safely clearing player jumps) */}
                <mesh position={[0, 6.4, 0]} geometry={FESTIVAL_ARCH_BEAM_GEO} material={sharedMats.festivalArchWood} />
                <mesh position={[0, 6.4, 0.05]} scale={[0.98, 0.8, 1.1]} geometry={FESTIVAL_ARCH_BEAM_GEO} material={sharedMats.marigoldOrange} />
                <mesh position={[0, 7.05, 0]} geometry={FESTIVAL_ARCH_BANNER_GEO} material={sharedMats.festivalArchBanner} />
                {/* Glowing Hanging Lanterns beneath Swagat Dwar Arch */}
                {[-3.0, 0, 3.0].map((lx, lIdx) => (
                  <group key={lIdx} position={[lx, 5.75, 0]}>
                    <mesh position={[0, 0.32, 0]} geometry={LANTERN_CORD_GEO} material={sharedMats.electricalCable} />
                    <mesh geometry={LANTERN_ORB_GEO} material={sharedMats.festivalLanternOrb} />
                    <mesh geometry={LANTERN_GLOW_GEO} material={sharedMats.festivalLanternHalo} />
                  </group>
                ))}
              </group>
            )}

            {/* Wave 4 / Cyber Metro Bazaar: Concrete Metro Viaduct Beams Framing Top Viewport (Temple Run Mood) */}
            {pair.id % 3 === 1 && (level >= 4 || activeZone.id === 'METRO_NIGHT_BAZAAR') && (
              <group position={[0, 0, 0]}>
                <mesh position={[-roadHalfWidth - 2.5, 4.1, 0]} geometry={METRO_VIADUCT_PILLAR_GEO} material={sharedMats.concreteViaduct} />
                <mesh position={[roadHalfWidth + 2.5, 4.1, 0]} geometry={METRO_VIADUCT_PILLAR_GEO} material={sharedMats.concreteViaduct} />
                {/* Elevated Girder Deck framing the upper viewport (y = 7.6m center -> 6.87m clear soffit) */}
                <mesh position={[0, 7.6, 0]} geometry={METRO_VIADUCT_DECK_GEO} material={sharedMats.concreteViaduct} />
                <mesh position={[0, 8.42, 0.9]} geometry={METRO_TRACK_RAIL_GEO} material={sharedMats.metroRail} />
                <mesh position={[0, 8.42, -0.9]} geometry={METRO_TRACK_RAIL_GEO} material={sharedMats.metroRail} />
              </group>
            )}

            {/* --- OUTER BACKDROP BUILDING SILHOUETTES (Left & Right - Occludes side ground planes & creates deep skyline) --- */}
            <group position={[-sideOffset - 8.5, 0, 0]}>
              <mesh
                position={[0, 9.5 * pair.leftHeightScale, 0]}
                scale={[1, pair.leftHeightScale * 1.35, 1]}
                geometry={BACKDROP_SILHOUETTE_GEO}
                material={sharedMats.backdropMat}
              />
            </group>
            <group position={[sideOffset + 8.5, 0, 0]}>
              <mesh
                position={[0, 9.5 * pair.rightHeightScale, 0]}
                scale={[1, pair.rightHeightScale * 1.35, 1]}
                geometry={BACKDROP_SILHOUETTE_GEO}
                material={sharedMats.backdropMat}
              />
            </group>
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


