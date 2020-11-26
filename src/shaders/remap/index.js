import {UniformsUtils, DoubleSide} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';

const RemapShader = {
	uniforms: UniformsUtils.merge([
    {
      map: {value: null}
    }
  ]),

	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide,

  depthTest: true,
  depthWrite: false
};

export default RemapShader;
