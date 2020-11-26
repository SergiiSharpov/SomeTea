import {UniformsUtils, DoubleSide} from 'three';

import vertexShader from './vert.glsl';
import fragmentShader from './frag.glsl';
import { Color, DataTexture, RGBFormat } from 'three';

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
      roughness: {value: 0.0},
      roughnessMap: {value: getWhiteTexture()},
      reflectivity: {value: 0.96},
      glassColor: {value: new Color(1.0, 1.0, 1.0)},
      fresnelPower: {value: 1.0},
      absorption: {value: 0.25}
    }
  ]),

	vertexShader,
  fragmentShader,
  
  transparent: true,

  side: DoubleSide
};

export default GlassShader;
