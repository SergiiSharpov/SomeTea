import {UniformsUtils, DoubleSide, BackSide, Color, DataTexture, RGBFormat, FrontSide, LessDepth, GreaterDepth, EqualDepth, NotEqualDepth, AlwaysDepth, NeverDepth, CustomBlending, SrcAlphaFactor, OneMinusSrcAlphaFactor, AddEquation, SrcColorFactor, GreaterEqualDepth, Vector2} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';

const getWhiteTexture = () => {
  const width = 2;
  const height = 2;

  const size = width * height;
  const data = new Uint8Array( 3 * size );
  const color = new Color( 0xffffff );

  const r = Math.floor( color.r * 255 );
  const g = Math.floor( color.g * 255 );
  const b = Math.floor( color.b * 255 );

  for ( let i = 0; i < size; i ++ ) {

    const stride = i * 3;

    data[ stride ] = r;
    data[ stride + 1 ] = g;
    data[ stride + 2 ] = b;

  }

  // used the buffer to create a DataTexture

  return new DataTexture( data, width, height, RGBFormat );
}

/**
 * Based on Nvidia Cg tutorial
 */
const GlassShader = {
	uniforms: UniformsUtils.merge([
    {
      waterMap: {value: null},
      envMap: {value: null},
      normalMap: {value: null},
      cubeMap: {value: null},
      thicknessMap: {value: null},
      
      roughness: {value: 0.0},
      roughnessMap: {value: getWhiteTexture()},
      reflectivity: {value: 0.96},
      glassColor: {value: new Color(1.0, 1.0, 1.0)},
      fresnelPower: {value: 1.0},
      absorption: {value: 0.08},

      waterColor: {value: new Color(173, 165, 48).multiplyScalar(1.0 / 255.0)},
      highWaterColor: {value: new Color(212, 139, 57).multiplyScalar(1.0 / 255.0)},

      time: {value: 0.0},
      speed: {value: 1.0},
      uvScale: {value: 16.0},
      height: {value: 1.0},
      heightBounds: {value: new Vector2()},
    }
  ]),

	vertexShader,
  fragmentShader,
  
  transparent: true,
  // alphaTest: 0.9999,

  // side: BackSide,

  depthTest: true,
  depthWrite: true,

  // wireframe: true,

  // blending: CustomBlending,
  // blendEquation: AddEquation,
  // blendSrc: SrcAlphaFactor,
  // blendDst: OneMinusSrcAlphaFactor,

  polygonOffset: true,
  polygonOffsetFactor: 0,
  polygonOffsetUnits: -2,

  // depthFunc: LessDepth

  // stencilWrite: true
};

export default GlassShader;
