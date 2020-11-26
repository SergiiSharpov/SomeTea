import {UniformsLib, UniformsUtils, DoubleSide, Vector2, FrontSide, LessDepth, NeverDepth, NotEqualDepth, GreaterDepth, Vector3} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';
import { Color } from 'three';

const WaterShader = {
	uniforms: UniformsUtils.merge([
    {
      time: {value: 0.0},

      opacity: {value: 0.9},

      speed: {value: 1.0},
      depth: {value: 0.0},

      height: {value: 1.0},
      heightBounds: {value: new Vector2()},
      center: {value: new Vector3()},

      uvScale: {value: 128},
      waterColor: {value: new Color(173, 165, 48).multiplyScalar(1.0 / 255.0)},
      highWaterColor: {value: new Color(212, 139, 57).multiplyScalar(1.0 / 255.0)},

      resolution: {value: new Vector2()},

      envMap: {value: null},
      depthMap: {value: null}
    }
  ]),

	vertexShader,
  fragmentShader,
  
  transparent: true,

  // wireframe: true,

  side: FrontSide,


  depthWrite: false,
  depthTest: true,

  // depthFunc: GreaterDepth

  //alphaTest: 0.9,

  polygonOffset: true,
  polygonOffsetFactor: -4,
  //polygonOffsetUnits: 1
};

export default WaterShader;
