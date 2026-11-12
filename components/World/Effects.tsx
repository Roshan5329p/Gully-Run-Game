/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useStore } from '../../store';

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

  if (isSoftwareGl) return null;

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <Bloom
        luminanceThreshold={isChaiBoostActive ? 0.62 : 0.82}
        mipmapBlur
        intensity={isChaiBoostActive ? 1.15 : 0.65}
        radius={isChaiBoostActive ? 0.68 : 0.5}
        levels={6}
      />
      <Vignette
        eskil={false}
        offset={isChaiBoostActive ? 0.16 : 0.12}
        darkness={isChaiBoostActive ? 0.54 : 0.42}
      />
    </EffectComposer>
  );
};
