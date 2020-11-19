import {UniformsLib, UniformsUtils, DoubleSide} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';

const IcePrepassShader = {
	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide
};

export default IcePrepassShader;
