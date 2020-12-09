import {UniformsUtils, DoubleSide} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';

const WaterDepthShader = {
	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide,

  depthTest: true,
  depthWrite: true
};

export default WaterDepthShader;
