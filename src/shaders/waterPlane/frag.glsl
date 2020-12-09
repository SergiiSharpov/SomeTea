varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;
varying vec4 vCausticViewUv;
varying vec4 vViewRealUv;

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
uniform sampler2D causticMap;
uniform sampler2D innerMap;

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


// Indices of refraction
const float Air = 1.0;
const float Water = 1.333;

// Air to glass ratio of the indices of refraction (Eta)
const float Eta = Air / Water;
const float EtaDelta = 1.0 - Eta;
 
// see http://en.wikipedia.org/wiki/Refractive_index Reflectivity
const float R0 = ((Air - Water) * (Air - Water)) / ((Air + Water) * (Air + Water));

const float causticsFactor = 0.99;
const float causticScale = 0.1;

// main
void main() {

	float alpha = texture2D(causticDepthMap, vUv.xy).a;
	// if (alpha == 0.) {
	// 	discard;
	// }
  
  float caustic = texture2D(causticMap, vViewUv.xy).r;
	vec3 innerColor = texture2D(innerMap, vCausticViewUv.xy).rgb;

  vec3 viewDirection = normalize(vPosition - cameraPosition);
  vec3 targetNormal = normalize(vNormal);

	vec3 dirLight = vec3(0.808049, 0.685002, 0.42915);
	float light = pow(clamp(dot(dirLight, targetNormal), 0.0, 1.0), 4.0);

  vec3 v_refraction = refract(viewDirection, targetNormal, Eta);// + EtaDelta * sin(roughness * 3.14 * 0.5 * rougnessMultiplyer)
	vec3 v_reflection = reflect(viewDirection, targetNormal);

	vec4 refractColor0 = textureCube( envMap, v_refraction * vec3(-1.0, 1.0, 1.0));
	vec4 reflectColor0 = textureCube( envMap, v_reflection * vec3(-1.0, 1.0, 1.0));

  float v_fresnel = clamp(1.0 - dot(-viewDirection, targetNormal), 0., 1.);
	// see http://en.wikipedia.org/wiki/Schlick%27s_approximation
	float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, 8.0)));

	vec3 innerPart = mix(waterColor, innerColor, length(innerColor));
	vec3 reflectionColor = mix(innerColor, reflectColor0.rgb, 0.2);
  vec3 refColor = mix(waterColor, reflectionColor, v_fresnel_ratio);
  vec3 resColor = reflectionColor.rgb * waterColor + (v_fresnel_ratio + light) * 0.2;

	//resColor = mix(waterColor, innerColor, length(resColor));

	// * texture2D(innerMap, vUv.xy).a;

  gl_FragColor = vec4(resColor.rgb, alpha);

  // gl_FragColor = vec4(pow(waterColor, vec3(0.65)) + caustic, 1.0);
  // gl_FragColor = vec4(caustic, caustic, caustic, 1.0);
  // gl_FragColor = vec4(vec3(vViewUv.x, 0.0, vViewUv.y), 1.0);
}