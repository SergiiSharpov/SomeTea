varying vec4 vPosition;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

varying vec3 vViewPosition;
varying vec4 vViewUv;

uniform vec2 resolution;
uniform sampler2D noiseMap;
uniform samplerCube envMap;

uniform vec3 iceColor;
uniform float bumpScale;
uniform float fresnelPower;
uniform float roughness;
uniform float reflectivity;

#include <uv_pars_fragment>
#include <normalmap_pars_fragment>


// Indices of refraction
const float Air = 1.0;
const float Ice = 1.3098;

// Air to glass ratio of the indices of refraction (Eta)
const float Eta = Air / Ice;
const float EtaDelta = 1.0 - Eta;

// see http://en.wikipedia.org/wiki/Refractive_index Reflectivity
const float R0 = ((Air - Ice) * (Air - Ice)) / ((Air + Ice) * (Air + Ice));


void main() {
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>

	float inverseRoughness = 1.0 - roughness;

	float val = texture2D( noiseMap, vViewUv.xy ).x;

	float valU = texture2D( noiseMap, vViewUv.xy + vec2( 1.0 / resolution.x, 0.0 ) ).x;
	float valV = texture2D( noiseMap, vViewUv.xy + vec2( 0.0, 1.0 / resolution.y ) ).x;

	vec3 bumpNormal = normalize(vec3(val - valU, val - valV, 0.02));
	vec3 targetNormal = perturbNormal2Arb( -vViewPosition, vNormal, bumpNormal );
	targetNormal = mix(vNormal, targetNormal, bumpScale * inverseRoughness);
	
	vec3 screenNormal = (viewMatrix * vec4(targetNormal, 0.0)).xyz;

	vec3 viewDirection = normalize(vPosition.xyz - cameraPosition);
	
	float face = float( gl_FrontFacing  ) * 2.0 - 1.0;

	vec3 v_refraction = refract(viewDirection, targetNormal * face, 0.95);
	vec3 v_reflection = reflect(viewDirection, targetNormal * face);

	vec4 refractColor0 = textureCube( envMap, v_refraction * vec3(-1.0, 1.0, 1.0), float( roughness * 6.0 ));
	vec4 reflectColor0 = textureCube( envMap, v_reflection * vec3(-1.0, 1.0, 1.0), float( roughness * 6.0 ));

	float v_fresnel = clamp(1.0 - dot(-viewDirection, targetNormal), 0., 1.);
	// see http://en.wikipedia.org/wiki/Schlick%27s_approximation
	float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, 4.0)));

	vec3 dirLight = vec3(0.808049, 0.685002, 0.42915);
	float frontLight = clamp(dot(dirLight, targetNormal), 0., 1.);

	vec3 envColor = iceColor * (1.0 - reflectivity) + refractColor0.rgb + v_fresnel_ratio * fresnelPower;

	gl_FragColor = vec4(envColor.rgb, 1.0);
	
}