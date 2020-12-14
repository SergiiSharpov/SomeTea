import {UniformsUtils, DoubleSide} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';

const BubbleShader = {
	uniforms: UniformsUtils.merge([
    {
      opacity: {value: 0.0}
    }
  ]),

	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide,

  depthTest: true,
  depthWrite: true
};

export default BubbleShader;
