import {UniformsLib, UniformsUtils, DoubleSide, Vector2} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';
import { Color } from 'three/build/three.module';

const IcePrepassShader = {
	uniforms: UniformsUtils.merge([
    UniformsLib["common"],
    UniformsLib["normalmap"],
    {
      envMap: {value: null},
      resolution: {value: new Vector2(512, 512)},
      depthScale: {value: 0.005},
      noiseScale: {value: 64.0},
      iceColor: {value: new Color(110.0 / 255.0, 154.0 / 255.0, 188.0 / 255.0)}
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
