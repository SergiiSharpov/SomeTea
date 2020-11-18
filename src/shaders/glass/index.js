import {UniformsLib, UniformsUtils, DoubleSide} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';
import { Color } from 'three';

/**
 * Based on Nvidia Cg tutorial
 */
const GlassShader = {
	uniforms: UniformsUtils.merge([
    UniformsLib["common"],
    UniformsLib["normalmap"],
    {
      envMap: {value: null},
      cubeMap: {value: null},
      roughness: {value: 0.0},
      reflectivity: {value: 0.96},
      glassColor: {value: new Color(1.0, 1.0, 1.0)},
      fresnelPower: {value: 1.0},
      absorption: {value: 0.25},
      normalPower: {value: 1.0},
      refractionRatio: {value: 0.0}
    }
  ]),

  defines: {
    USE_NORMALMAP: "",
    TANGENTSPACE_NORMALMAP: "",

    USE_UV: ""
  },

	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide,

  // depthWrite: false,
  // depthTest: false
};

export default GlassShader;
