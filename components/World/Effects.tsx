/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useStore, calculateGullyLightingGrade } from '../../store';

export const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

export const Effects: React.FC = () => {
  const isChaiBoostActive = useStore(state => state.isChaiBoostActive);
  const score = useStore(state => state.score);
  const distance = useStore(state => state.distance);

  if (isSoftwareGl) return null;

  const grade = calculateGullyLightingGrade(score, distance);

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <Bloom
        luminanceThreshold={isChaiBoostActive ? 0.86 : grade.bloomThreshold}
        mipmapBlur
        intensity={isChaiBoostActive ? 0.36 : grade.bloomIntensity}
        radius={isChaiBoostActive ? 0.48 : 0.38 + grade.goldenHourFactor * 0.08}
        levels={5}
      />
      <Vignette
        eskil={false}
        offset={isChaiBoostActive ? 0.16 : 0.14}
        darkness={isChaiBoostActive ? 0.42 : grade.vignetteDarkness}
      />
    </EffectComposer>
  );
};
