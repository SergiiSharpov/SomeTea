import {UniformsLib, UniformsUtils, DoubleSide, Vector2, Matrix4} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';
import { Color } from 'three/build/three.module';

const IcePrepassShader = {
	uniforms: UniformsUtils.merge([
    {
      envMap: {value: null},
      noiseMap: {value: null},
      resolution: {value: new Vector2(512, 512)},
      fresnelPower: {value: 0.5},
      bumpScale: {value: 0.2},
      reflectivity: {value: 0.75},
      roughness: {value: 0.0},
      iceColor: {value: new Color(110.0 / 255.0, 154.0 / 255.0, 188.0 / 255.0)},

      cameraProjection: {value: new Matrix4()},
      cameraView: {value: new Matrix4()},
      causticMap: {value: null},

      time: {value: 0.0},
      speed: {value: 1.0},
      uvScale: {value: 16.0},
      height: {value: 1.0},
      heightBounds: {value: new Vector2()},
      waterColor: {value: new Color()},
    }
  ]),

	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide,

  // depthWrute: false
};

export default IcePrepassShader;
