varying vec3 vPosition;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

varying vec3 vViewPosition;
varying vec4 vViewUv;

uniform sampler2D envMap;
uniform samplerCube cubeMap;

uniform float roughness;
uniform float fresnelPower;
uniform vec3 glassColor;
uniform float reflectivity;
uniform float absorption;
uniform float normalPower;
uniform float refractionRatio;


#include <uv_pars_fragment>
#include <normalmap_pars_fragment>

vec4 envMapTexelToLinear( vec4 value ) { return LinearToLinear(value); }
#include <cube_uv_reflection_fragment>


// Indices of refraction
const float Air = 1.0;
const float Glass = 1.51714;

// Air to glass ratio of the indices of refraction (Eta)
const float Eta = Air / Glass;
const float EtaDelta = 1.0 - Eta;
 
// see http://en.wikipedia.org/wiki/Refractive_index Reflectivity
const float R0 = ((Air - Glass) * (Air - Glass)) / ((Air + Glass) * (Air + Glass));

const float RefractionScale = 32.0;

void main() {
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>

	vec3 dirLight = vec3(0.808049, 0.685002, 0.42915);
	vec3 viewDirection = normalize(vPosition - cameraPosition);

	vec3 screenViewDirection = normalize(vViewPosition);
	vec3 screenNormal = (viewMatrix * vec4(normal, 0.0)).xyz;

	vec3 targetNormal = mix(vNormal, normal, normalPower);

	float face = float( gl_FrontFacing  ) * 2.0 - 1.0;

	vec3 v_refraction = refract(viewDirection, targetNormal * face, Eta + EtaDelta * refractionRatio);
	vec3 v_reflection = reflect(viewDirection, targetNormal * face);

	vec4 refractColor0 = textureCube( cubeMap, v_refraction * vec3(-1.0, 1.0, 1.0), float( roughness * 6.0 ));
	vec4 reflectColor0 = textureCube( cubeMap, v_reflection * vec3(-1.0, 1.0, 1.0), float( roughness * 6.0 ));
	
	float v_fresnel = clamp(1.0 - dot(-viewDirection, targetNormal), 0., 1.);
	// see http://en.wikipedia.org/wiki/Schlick%27s_approximation
	float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, 8.0)));

	float uvScalePower = 1.0 - v_fresnel;
	float refractionPower = dot(viewDirection, v_refraction);
	float reflectionPower = dot(viewDirection, v_reflection);

	float frontLight = pow(clamp(dot(dirLight, targetNormal), 0., 1.) * 0.8, 4.0);

	float roughnessInverse = (1.0 - roughness);
	float alpha = 1.0 - absorption;

	vec4 innerRefColor = texture2D(envMap, vViewUv.xy);
	innerRefColor.a = clamp((innerRefColor.a - absorption) * roughnessInverse, 0.0, 1.0);

	vec4 refColor = mix(refractColor0, reflectColor0, v_fresnel_ratio);

	vec4 totalRefColor = mix(refColor, innerRefColor, innerRefColor.a);
	
	vec4 baseColor = vec4(glassColor, 1.0) * (1.0 - reflectivity);
	float fresnelResult = v_fresnel_ratio * fresnelPower;
	
	vec4 resultColor = baseColor + totalRefColor + fresnelResult + frontLight;

	gl_FragColor = vec4(resultColor.rgb, 1.0);
}