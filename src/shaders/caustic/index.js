import {UniformsLib, UniformsUtils, DoubleSide, Vector2, FrontSide, LessDepth, NeverDepth, NotEqualDepth, GreaterDepth, Vector3, CustomBlending, SrcAlphaFactor, OneMinusSrcAlphaFactor, AddEquation, AlwaysDepth, Matrix4} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';
import { Color } from 'three';

const CausticShader = {
	uniforms: UniformsUtils.merge([
    {
      time: {value: 0.0},

      opacity: {value: 0.9},

      speed: {value: 1.0},

      height: {value: 1.0},
      heightBounds: {value: new Vector2()},
      center: {value: new Vector3()},

      uvScale: {value: 16.0},
      waterColor: {value: new Color(173, 165, 48).multiplyScalar(1.0 / 255.0)},
      highWaterColor: {value: new Color(212, 139, 57).multiplyScalar(1.0 / 255.0)},

      resolution: {value: new Vector2()},

      envMap: {value: null},
      depthMap: {value: null},
      causticDepthMap: {value: null},

      cameraProjectionInverse: {value: new Matrix4()},
      cameraViewInverse: {value: new Matrix4()}
    }
  ]),

  extensions: {
    derivatives: true
  },

	vertexShader,
  fragmentShader,
  
  transparent: true,
  // alphaTest: 0.1,

  // wireframe: true,

  side: DoubleSide,

  depthTest: false,
  depthWrite: true,

  // depthFunc: AlwaysDepth,

  // blending: CustomBlending,
  // blendEquation: AddEquation,
  // blendSrc: SrcAlphaFactor,
  // blendDst: OneMinusSrcAlphaFactor,

  // polygonOffset: true,
  // polygonOffsetFactor: 0,
  // polygonOffsetUnits: -32
};

export default CausticShader;
