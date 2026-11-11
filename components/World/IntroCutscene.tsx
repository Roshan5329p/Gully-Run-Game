/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { GameStatus } from '../../types';
import { audio } from '../System/Audio';

export const INTRO_TOTAL_DURATION = 5.4;

// Geometries for the Gully Cricket Intro Scene
const BAT_BLADE_GEO = new THREE.BoxGeometry(0.14, 0.62, 0.045);
const BAT_HANDLE_GEO = new THREE.CylinderGeometry(0.024, 0.024, 0.34, 8);
const BAT_GRIP_RING_GEO = new THREE.TorusGeometry(0.026, 0.006, 6, 12);
const CRICKET_BALL_GEO = new THREE.SphereGeometry(0.095, 16, 16);
const BALL_SEAM_GEO = new THREE.TorusGeometry(0.096, 0.01, 6, 20);

// Sharma Uncle's Window & Balcony Geometries
const BALCONY_WALL_GEO = new THREE.BoxGeometry(2.4, 3.2, 0.35);
const WINDOW_FRAME_OUTER_GEO = new THREE.BoxGeometry(1.55, 1.75, 0.42);
const WINDOW_SILL_GEO = new THREE.BoxGeometry(1.85, 0.16, 0.65);
const WINDOW_GLASS_GEO = new THREE.BoxGeometry(1.32, 1.48, 0.06);
const GLASS_SHARD_GEO = new THREE.TetrahedronGeometry(0.14, 0);
const UNCLE_CUP_GEO = new THREE.CylinderGeometry(0.09, 0.065, 0.22, 10);

const SHARD_COUNT = 22;

interface ShardData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  scale: number;
}

export const IntroCutscene: React.FC = () => {
  const { status, completeIntro } = useStore();

  const elapsedRef = useRef(0);
  const hitTriggeredRef = useRef(false);
  const shatterTriggeredRef = useRef(false);
  const uncleStormTriggeredRef = useRef(false);

  const batGroupRef = useRef<THREE.Group>(null);
  const ballGroupRef = useRef<THREE.Group>(null);
  const intactGlassRef = useRef<THREE.Mesh>(null);
  const brokenHoleRef = useRef<THREE.Mesh>(null);
  const windowChaiCupRef = useRef<THREE.Mesh>(null);
  const shardMeshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const shards = useMemo<ShardData[]>(() => {
    return Array.from({ length: SHARD_COUNT }, () => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      rotSpeed: new THREE.Vector3(),
      scale: 0.7 + Math.random() * 0.9,
    }));
  }, []);

  const materials = useMemo(
    () => ({
      willowWood: new THREE.MeshStandardMaterial({ color: '#d99b52', roughness: 0.55, metalness: 0.05 }),
      rubberGrip: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8, metalness: 0.0 }),
      gripStripe: new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.6 }),
      cricketLeather: new THREE.MeshStandardMaterial({
        color: '#b91c1c',
        roughness: 0.3,
        metalness: 0.15,
        emissive: '#ef4444',
        emissiveIntensity: 0.25,
      }),
      ballSeam: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }),
      wallStucco: new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.85 }),
      woodFrame: new THREE.MeshStandardMaterial({ color: '#5c2d0c', roughness: 0.7 }),
      windowSill: new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.75 }),
      glassPane: new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        emissive: '#38bdf8',
        emissiveIntensity: 0.35,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.75,
      }),
      darkInterior: new THREE.MeshBasicMaterial({ color: '#1c0d06' }),
      chaiCup: new THREE.MeshStandardMaterial({
        color: '#fef3c7',
        emissive: '#f59e0b',
        emissiveIntensity: 0.3,
        roughness: 0.3,
      }),
    }),
    []
  );

  // Reset intro timeline whenever GameStatus.INTRO starts
  useEffect(() => {
    if (status === GameStatus.INTRO) {
      elapsedRef.current = 0;
      hitTriggeredRef.current = false;
      shatterTriggeredRef.current = false;
      uncleStormTriggeredRef.current = false;

      if (intactGlassRef.current) intactGlassRef.current.visible = true;
      if (brokenHoleRef.current) brokenHoleRef.current.visible = false;
      shardMeshRefs.current.forEach(mesh => {
        if (mesh) mesh.visible = false;
      });
    }
  }, [status]);

  // Allow skipping intro with Space, Enter, or Escape
  useEffect(() => {
    if (status !== GameStatus.INTRO) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        completeIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, completeIntro]);

  useFrame((_, delta) => {
    if (status !== GameStatus.INTRO) return;

    const safeDelta = Math.min(delta, 0.05);
    elapsedRef.current += safeDelta;
    const t = elapsedRef.current;

    // Expose intro progress for HUD captions and CameraController
    (window as any).__gullyIntroTime = t;

    // --- PHASE 1: PITCH & MASSIVE SIXER BAT SWING (0.0s -> 0.80s) ---
    const hitTime = 0.8;
    const shatterTime = 1.85;
    const uncleStormTime = 2.95;

    if (batGroupRef.current) {
      if (t < hitTime) {
        // Wind-up then explosive forward cricket swing
        const swingRatio = Math.max(0, (t - 0.35) / (hitTime - 0.35));
        const swingAngle = THREE.MathUtils.lerp(-1.1, 0.85, THREE.MathUtils.smoothstep(swingRatio, 0, 1));
        batGroupRef.current.position.set(0.38, 1.08, -0.18);
        batGroupRef.current.rotation.set(swingAngle, -0.35, -0.45);
      } else if (t < uncleStormTime) {
        // Follow-through pose admiring the sixer!
        batGroupRef.current.position.set(0.32, 1.32, -0.25);
        batGroupRef.current.rotation.set(1.25, -0.6, -0.25);
      } else {
        // Panic! Drop the cricket bat on the street before bolting!
        const dropT = t - uncleStormTime;
        const dropY = Math.max(0.08, 1.32 - dropT * dropT * 9.5);
        batGroupRef.current.position.set(0.45 + dropT * 0.3, dropY, -0.2 + dropT * 0.4);
        batGroupRef.current.rotation.set(Math.PI / 2, dropT * 4.0, 0.8);
      }
    }

    // --- CRICKET BALL TRAJECTORY ---
    if (ballGroupRef.current) {
      if (t < hitTime) {
        // Bowled from down the street toward the batter
        const pitchRatio = t / hitTime;
        const ballZ = THREE.MathUtils.lerp(-5.2, -0.28, pitchRatio);
        // Bounce once at pitchRatio = 0.55
        const bounceY =
          pitchRatio < 0.55
            ? THREE.MathUtils.lerp(1.4, 0.12, pitchRatio / 0.55)
            : THREE.MathUtils.lerp(0.12, 1.02, (pitchRatio - 0.55) / 0.45);
        ballGroupRef.current.position.set(0.28, bounceY, ballZ);
        ballGroupRef.current.rotation.x += safeDelta * 18;
      } else if (t < shatterTime) {
        if (!hitTriggeredRef.current) {
          hitTriggeredRef.current = true;
          audio.playCricketBatHit();
          window.dispatchEvent(
            new CustomEvent('particle-burst', {
              detail: { position: [0.3, 1.05, -0.25], color: '#fbbf24' },
            })
          );
        }

        // High parabolic SIXER arc from batter [0.28, 1.02, -0.28] straight into Sharma Uncle's window [2.35, 3.05, 2.25]!
        const flightRatio = (t - hitTime) / (shatterTime - hitTime);
        const bx = THREE.MathUtils.lerp(0.28, 2.35, flightRatio);
        const bz = THREE.MathUtils.lerp(-0.28, 2.25, flightRatio);
        const arcBoost = Math.sin(flightRatio * Math.PI) * 1.45;
        const by = THREE.MathUtils.lerp(1.02, 3.05, flightRatio) + arcBoost;

        ballGroupRef.current.position.set(bx, by, bz);
        ballGroupRef.current.rotation.x -= safeDelta * 25;
        ballGroupRef.current.rotation.y += safeDelta * 15;
      } else {
        // Ball disappears inside Sharma Uncle's living room after shattering the glass!
        ballGroupRef.current.visible = false;
      }
    }

    // --- PHASE 2: WINDOW SHATTER & FLYING CHAI CUP (t >= 1.85s) ---
    if (t >= shatterTime && !shatterTriggeredRef.current) {
      shatterTriggeredRef.current = true;
      audio.playWindowShatter();
      window.dispatchEvent(new Event('intro-window-shatter'));

      if (intactGlassRef.current) intactGlassRef.current.visible = false;
      if (brokenHoleRef.current) brokenHoleRef.current.visible = true;

      // Initialize 22 exploding glass shards from window center [2.35, 3.05, 2.25]
      shards.forEach((s, idx) => {
        s.pos.set(
          2.35 + (Math.random() - 0.5) * 0.9,
          3.05 + (Math.random() - 0.5) * 0.9,
          2.15 + (Math.random() - 0.5) * 0.2
        );
        s.vel.set(
          -1.8 - Math.random() * 2.8,
          1.2 + Math.random() * 2.6,
          (Math.random() - 0.5) * 2.5
        );
        s.rotSpeed.set(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14
        );
        const mesh = shardMeshRefs.current[idx];
        if (mesh) {
          mesh.visible = true;
          mesh.position.copy(s.pos);
          mesh.scale.setScalar(s.scale);
        }
      });
    }

    if (shatterTriggeredRef.current) {
      // Animate exploding glass shards
      shards.forEach((s, idx) => {
        const mesh = shardMeshRefs.current[idx];
        if (!mesh || !mesh.visible) return;

        s.vel.y -= 14 * safeDelta;
        s.pos.addScaledVector(s.vel, safeDelta);
        if (s.pos.y < 0.06) {
          s.pos.y = 0.06;
          s.vel.y *= -0.35;
          s.vel.x *= 0.7;
          s.vel.z *= 0.7;
        }
        mesh.position.copy(s.pos);
        mesh.rotation.x += s.rotSpeed.x * safeDelta;
        mesh.rotation.y += s.rotSpeed.y * safeDelta;
        mesh.rotation.z += s.rotSpeed.z * safeDelta;
      });

      // Knock Sharma Uncle's windowsill chai cup flying off the ledge!
      if (windowChaiCupRef.current) {
        const dtShatter = t - shatterTime;
        windowChaiCupRef.current.position.set(
          2.05 - dtShatter * 1.9,
          Math.max(0.1, 2.32 + dtShatter * 1.4 - dtShatter * dtShatter * 6.5),
          2.15 - dtShatter * 0.6
        );
        windowChaiCupRef.current.rotation.z += safeDelta * 12;
        windowChaiCupRef.current.rotation.x += safeDelta * 8;
      }
    } else if (windowChaiCupRef.current) {
      windowChaiCupRef.current.position.set(2.05, 2.32, 2.15);
      windowChaiCupRef.current.rotation.set(0, 0, 0);
    }

    // --- PHASE 3: UNCLE STORMS OUT SHOUTING (t >= 2.95s) ---
    if (t >= uncleStormTime && !uncleStormTriggeredRef.current) {
      uncleStormTriggeredRef.current = true;
      audio.playUncleShout(true);
      window.dispatchEvent(new Event('intro-uncle-storm'));
    }

    // --- COMPLETE INTRO & LAUNCH CHASE (t >= 5.4s) ---
    if (t >= INTRO_TOTAL_DURATION) {
      completeIntro();
    }
  });

  if (status !== GameStatus.INTRO) return null;

  return (
    <group>
      {/* 1. Kashmir Willow Cricket Bat held by the Player */}
      <group ref={batGroupRef} position={[0.38, 1.08, -0.18]}>
        <mesh castShadow geometry={BAT_BLADE_GEO} material={materials.willowWood} position={[0, 0.15, 0]} />
        <mesh castShadow geometry={BAT_HANDLE_GEO} material={materials.rubberGrip} position={[0, 0.6, 0]} />
        <mesh geometry={BAT_GRIP_RING_GEO} material={materials.gripStripe} position={[0, 0.68, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={BAT_GRIP_RING_GEO} material={materials.gripStripe} position={[0, 0.54, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </group>

      {/* 2. Red Leather Gully Cricket Ball */}
      <group ref={ballGroupRef} position={[0.28, 1.2, -5.2]}>
        <mesh castShadow geometry={CRICKET_BALL_GEO} material={materials.cricketLeather} />
        <mesh geometry={BALL_SEAM_GEO} material={materials.ballSeam} />
      </group>

      {/* 3. Sharma Uncle's House Balcony & Glass Window on the Right Side of the Gully */}
      <group position={[2.65, 0, 2.25]} rotation={[0, -Math.PI / 2.3, 0]}>
        {/* House Facade Wall */}
        <mesh receiveShadow castShadow position={[0, 2.2, 0]} geometry={BALCONY_WALL_GEO} material={materials.wallStucco} />
        {/* Wooden Window Frame */}
        <mesh castShadow position={[0, 3.05, 0.06]} geometry={WINDOW_FRAME_OUTER_GEO} material={materials.woodFrame} />
        {/* Dark Room Interior Behind Glass */}
        <mesh position={[0, 3.05, 0.25]} ref={brokenHoleRef} visible={false} geometry={WINDOW_GLASS_GEO} material={materials.darkInterior} />
        {/* Intact Reflective Sky-Blue Window Glass Pane */}
        <mesh ref={intactGlassRef} position={[0, 3.05, 0.26]} geometry={WINDOW_GLASS_GEO} material={materials.glassPane} />
        {/* Terracotta Windowsill Ledge */}
        <mesh castShadow position={[0, 2.15, 0.25]} geometry={WINDOW_SILL_GEO} material={materials.windowSill} />
      </group>

      {/* 4. Sharma Uncle's Prized Afternoon Chai Cup Sitting on the Windowsill */}
      <mesh
        ref={windowChaiCupRef}
        castShadow
        position={[2.05, 2.32, 2.15]}
        geometry={UNCLE_CUP_GEO}
        material={materials.chaiCup}
      />

      {/* 5. Pool of 22 Exploding 3D Glass Shards */}
      {shards.map((_, i) => (
        <mesh
          key={i}
          ref={el => {
            shardMeshRefs.current[i] = el;
          }}
          visible={false}
          geometry={GLASS_SHARD_GEO}
          material={materials.glassPane}
        />
      ))}
    </group>
  );
};
