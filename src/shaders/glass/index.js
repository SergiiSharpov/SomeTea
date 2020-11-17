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
      glassColor: {value: new Color(0.0, 0.5, 1.0)}
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

  side: DoubleSide
};

export default GlassShader;
