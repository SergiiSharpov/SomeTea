varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;

varying float wavePower;
varying vec2 vUv;

varying vec3 oldPosition;
varying vec3 newPosition;
varying float waterDepth;
varying float depth;

varying vec3 resColor;

uniform samplerCube envMap;
uniform sampler2D depthMap;
uniform sampler2D causticDepthMap;

uniform float height;
uniform vec2 heightBounds;

uniform float opacity;
uniform float time;
uniform vec2 resolution;

uniform float uvScale;
uniform vec3 waterColor;
uniform vec3 highWaterColor;

uniform float speed;
uniform vec3 center;

varying mat4 vWPMatrix;

vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 mapN ) {
	vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
	vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
	vec2 st0 = dFdx( vUv.st );
	vec2 st1 = dFdy( vUv.st );
	float scale = sign( st1.t * st0.s - st0.t * st1.s );
	vec3 S = normalize( ( q0 * st1.t - q1 * st0.t ) * scale );
	vec3 T = normalize( ( - q0 * st1.s + q1 * st0.s ) * scale );
	vec3 N = normalize( surf_norm );
	mat3 tsn = mat3( S, T, N );
	mapN.xy *= ( float( gl_FrontFacing ) * 2.0 - 1.0 );
	return normalize( tsn * mapN );
}


const float causticsFactor = 0.99;
const float causticScale = 0.1;

// main
void main() {
  float causticsIntensity = 0.;

  //if (depth <= waterDepth) {
    float oldArea = length(dFdx(oldPosition)) * length(dFdy(oldPosition));
    float newArea = length(dFdx(vec3(newPosition.x, depth, newPosition.z))) * length(dFdy(vec3(newPosition.x, depth, newPosition.z)));

    float ratio;

    // Prevent dividing by zero (debug NVidia drivers)
    if (newArea == 0.) {
      // Arbitrary large value
      ratio = 2.0e+20;
    } else {
      ratio = oldArea / newArea;
    }

    causticsIntensity = causticsFactor * ratio;
  //}

  // gl_FragColor = vec4(vec3(causticsIntensity), 1.0);//depth
  //gl_FragColor = vec4(vec3(1.0 - causticsIntensity) * causticsIntensity * 4.0, 1.0);//depth

  gl_FragColor = vec4(vec3(1.0 - causticsIntensity), 1.0);//depth
}