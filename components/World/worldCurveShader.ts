/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Shared Curved World Uniforms (Subway Surfers style horizon bend).
 * Updated once per frame in the main animation loop and referenced by all
 * road, building, prop, obstacle, collectible, shadow, and character materials.
 */
export const WORLD_CURVE_UNIFORMS = {
  uCurveX: { value: 0.0 },
  uCurveY: { value: 0.0008 },
};

export function updateWorldCurveUniforms(elapsedTime: number) {
  WORLD_CURVE_UNIFORMS.uCurveX.value = Math.sin(elapsedTime * 0.28) * 0.0005;
  WORLD_CURVE_UNIFORMS.uCurveY.value = 0.0008;
}

export interface WorldCurvePatchOptions {
  fresnelRim?: boolean;
  rimColor?: string | number;
  rimPower?: number;
  rimStrength?: number;
}

const CURVED_PROJECT_VERTEX = `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
float distSq = mvPosition.z * mvPosition.z;
mvPosition.y -= distSq * uCurveY;
mvPosition.x += distSq * uCurveX;
gl_Position = projectionMatrix * mvPosition;
`;

/**
 * Patches a Three.js material via `onBeforeCompile` so it bends seamlessly along
 * the curved street horizon and optionally receives a crisp Fresnel rim highlight.
 */
export function applyWorldCurve<T extends THREE.Material>(
  material: T,
  options: WorldCurvePatchOptions = {}
): T {
  const tag = options.fresnelRim ? '__worldCurvedRimPatched' : '__worldCurvedPatched';
  if ((material as any)[tag]) return material;
  (material as any)[tag] = true;

  const useFresnel =
    Boolean(options.fresnelRim) &&
    (material instanceof THREE.MeshStandardMaterial ||
      material instanceof THREE.MeshPhysicalMaterial);

  const rimColor = new THREE.Color(options.rimColor ?? '#fef3c7');
  const rimPower = options.rimPower ?? 2.6;
  const rimStrength = options.rimStrength ?? 0.38;

  const prevOnBeforeCompile = material.onBeforeCompile;
  material.customProgramCacheKey = () =>
    useFresnel ? 'gully-curved-world-rim-v1' : 'gully-curved-world-v1';

  material.onBeforeCompile = (shader, renderer) => {
    if (prevOnBeforeCompile) {
      prevOnBeforeCompile.call(material, shader, renderer);
    }

    shader.uniforms.uCurveX = WORLD_CURVE_UNIFORMS.uCurveX;
    shader.uniforms.uCurveY = WORLD_CURVE_UNIFORMS.uCurveY;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
uniform float uCurveX;
uniform float uCurveY;`
    );

    if (shader.vertexShader.includes('#include <project_vertex>')) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        CURVED_PROJECT_VERTEX
      );
    } else if (shader.vertexShader.includes('gl_Position = projectionMatrix * mvPosition;')) {
      // Supports SpriteMaterial where mvPosition is computed directly without #include <project_vertex>
      shader.vertexShader = shader.vertexShader.replace(
        'gl_Position = projectionMatrix * mvPosition;',
        `float distSq = mvPosition.z * mvPosition.z;
mvPosition.y -= distSq * uCurveY;
mvPosition.x += distSq * uCurveX;
gl_Position = projectionMatrix * mvPosition;`
      );
    }

    if (useFresnel && shader.fragmentShader.includes('#include <opaque_fragment>')) {
      shader.uniforms.uRimColor = { value: rimColor };
      shader.uniforms.uRimPower = { value: rimPower };
      shader.uniforms.uRimStrength = { value: rimStrength };

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimStrength;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `float gullyRimDot = 1.0 - saturate( dot( normalize( normal ), normalize( vViewPosition ) ) );
float gullyRimTerm = pow( gullyRimDot, uRimPower ) * uRimStrength;
outgoingLight += uRimColor * gullyRimTerm;
#include <opaque_fragment>`
      );
    }
  };

  material.needsUpdate = true;
  return material;
}
