import {UniformsLib, UniformsUtils, DoubleSide, Vector2, FrontSide} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';
import { Color } from 'three';

const WaterShader = {
	uniforms: UniformsUtils.merge([
    {
      time: {value: 0.0},

      height: {value: 0.072},
      heightBounds: {value: new Vector2()},

      uvScale: {value: 16},
      waterColor: {value: new Color(173, 165, 48).multiplyScalar(1.0 / 255.0)},
      highWaterColor: {value: new Color(212, 139, 57).multiplyScalar(1.0 / 255.0)},

      resolution: {value: new Vector2()},

      envMap: {value: null}
    }
  ]),

	vertexShader,
  fragmentShader,
  
  transparent: true,

  // wireframe: true,

  side: DoubleSide,


  // depthWrite: false,
  // depthTest: true,

  // polygonOffset: true,
  // polygonOffsetFactor: -4,
  // polygonOffsetUnits: 1
};

export default WaterShader;
