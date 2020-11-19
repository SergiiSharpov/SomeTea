import {UniformsLib, UniformsUtils, DoubleSide} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';
import { Color } from 'three';

/**
 * Based on Nvidia Cg tutorial
 */
const GlassShader = {
	uniforms: UniformsUtils.merge([
    {
      envMap: {value: null},
      normalMap: {value: null},
      cubeMap: {value: null},
      roughness: {value: 0.0},
      reflectivity: {value: 0.96},
      glassColor: {value: new Color(1.0, 1.0, 1.0)},
      fresnelPower: {value: 1.0},
      absorption: {value: 0.25}
    }
  ]),

	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide
};

export default GlassShader;
