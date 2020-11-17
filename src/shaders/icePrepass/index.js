import {UniformsLib, UniformsUtils, DoubleSide} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';

const IcePrepassShader = {
	uniforms: UniformsUtils.merge([
    UniformsLib["common"],
    UniformsLib["normalmap"],
    {
      envMap: {value: null}
    }
  ]),

  defines: {
    USE_NORMALMAP: "",
    TANGENTSPACE_NORMALMAP: "",

    USE_UV: "",
  },

	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide
};

export default IcePrepassShader;
