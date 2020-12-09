import {UniformsLib, UniformsUtils, DoubleSide, Vector2, FrontSide, LessDepth, NeverDepth, NotEqualDepth, GreaterDepth, Vector3, CustomBlending, SrcAlphaFactor, OneMinusSrcAlphaFactor, AddEquation, AlwaysDepth} from 'three';

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
  // alphaTest: 0.1,

  // wireframe: true,

  side: FrontSide,

  depthTest: true,
  depthWrite: true,

  // depthFunc: AlwaysDepth,

  // blending: CustomBlending,
  // blendEquation: AddEquation,
  // blendSrc: SrcAlphaFactor,
  // blendDst: OneMinusSrcAlphaFactor,

  // polygonOffset: true,
  // polygonOffsetFactor: -1,
  // polygonOffsetUnits: -8
};

export default WaterShader;
