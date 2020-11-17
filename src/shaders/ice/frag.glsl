varying vec4 vPosition;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

varying vec3 vViewPosition;
varying vec4 vViewUv;

varying vec4 vViewTransformedUv;

uniform vec2 resolution;
uniform sampler2D envMap;

uniform vec3 iceColor;
uniform float noiseScale;

#include <uv_pars_fragment>
#include <normalmap_pars_fragment>


// Indices of refraction
const float Air = 1.0;
const float Ice = 1.3098;

// Air to glass ratio of the indices of refraction (Eta)
const float Eta = Air / Ice;

// see http://en.wikipedia.org/wiki/Refractive_index Reflectivity
const float R0 = ((Air - Ice) * (Air - Ice)) / ((Air + Ice) * (Air + Ice));


void main() {
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>

	float val = texture2D( envMap, vViewUv.xy ).x;

	float valU = texture2D( envMap, vViewUv.xy + vec2( 1.0 / resolution.x, 0.0 ) ).x;
	float valV = texture2D( envMap, vViewUv.xy + vec2( 0.0, 1.0 / resolution.y ) ).x;

	vec3 bumpNormal = normalize(vec3( val - valU, val - valV, 0.2  ));
	vec3 targetNormal = perturbNormal2Arb( -vViewPosition, vNormal, bumpNormal );

	vec3 viewDirection = normalize(vPosition.xyz - cameraPosition);

	vec3 screenNormal = (viewMatrix * vec4(targetNormal, 0.0)).xyz;

	float v_fresnel = clamp(1.0 - dot(-viewDirection, targetNormal), 0., 1.);
	// see http://en.wikipedia.org/wiki/Schlick%27s_approximation
	float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, 4.0)));

	vec3 dirLight = vec3(0.808049, 0.685002, 0.42915);
	float frontLight = clamp(dot(dirLight, targetNormal), 0., 1.);

	vec4 noiseColor = texture2D(envMap, vViewUv.xy);
	vec2 tranformedUV = vViewTransformedUv.xy + normalize(screenNormal.xy * 2.0 - 1.0) * noiseColor.r * (noiseScale / 1024.0);
	vec3 envColor = iceColor * frontLight + v_fresnel_ratio + pow(texture2D(envMap, tranformedUV).r, 2.0);

	gl_FragColor = vec4(envColor, 1.0);
	
}