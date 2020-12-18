import {UniformsUtils, DoubleSide, AdditiveBlending} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';

const BubbleShader = {
	uniforms: UniformsUtils.merge([
    {
      opacity: {value: 0.0},
      bubblesPower: {value: 1.0}
    }
  ]),

	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide,

  depthTest: true,
  depthWrite: true,

  // blending: AdditiveBlending
};

export default BubbleShader;
