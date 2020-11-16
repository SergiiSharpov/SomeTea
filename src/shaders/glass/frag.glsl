varying vec3 vPosition;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

varying vec3 vViewPosition;
varying vec4 vViewUv;

uniform sampler2D envMap;

#include <uv_pars_fragment>
#include <normalmap_pars_fragment>


// Indices of refraction
const float Air = 1.0;
const float Glass = 1.51714;

// Air to glass ratio of the indices of refraction (Eta)
const float Eta = Air / Glass;
 
// see http://en.wikipedia.org/wiki/Refractive_index Reflectivity
const float R0 = ((Air - Glass) * (Air - Glass)) / ((Air + Glass) * (Air + Glass));

const float RefractionScale = 256.0;//8
const float FresnelScale = 1.0;

void main() {
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>

	vec3 dirLight = vec3(0.808049, 0.685002, 0.42915);
	vec3 viewDirection = normalize(vPosition - cameraPosition);

	vec3 screenViewDirection = normalize(vViewPosition);
	vec3 screenNormal = (viewMatrix * vec4(normal, 0.0)).xyz;

	vec3 v_refraction = refract(screenViewDirection, screenNormal, Eta);
	vec3 v_reflection = reflect(screenViewDirection, screenNormal);
	
	float v_fresnel = clamp(1.0 - dot(-viewDirection, normal), 0., 1.);
	// see http://en.wikipedia.org/wiki/Schlick%27s_approximation
	float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, 8.0))) * FresnelScale;

	vec3 color = vec3(1., 1., 1.);
	float roughness = 0.5;

	float uvScalePower = 1.0 - v_fresnel;
	float sidePower = screenNormal.g;
	float refractionPower = dot(screenViewDirection, v_refraction);
	float reflectionPower = dot(screenViewDirection, v_reflection);

	vec2 refractUV = sin(vec2(v_refraction.x, v_refraction.y));
	vec2 reflectUV = sin(vec2(v_reflection.x, v_reflection.y));
	vec4 refractColor = texture2D(envMap, vViewUv.xy + refractUV * (RefractionScale / 1024.0) * uvScalePower);
	vec4 reflectColor = texture2D(envMap, vViewUv.xy + reflectUV * (RefractionScale / 1024.0) * uvScalePower);

	float frontLight = clamp(dot(dirLight, normal), 0., 1.) * v_fresnel_ratio;
	float backLight = clamp(dot(-dirLight, normal), 0., 1.) * v_fresnel_ratio;

	vec4 resultColor = mix(refractColor * refractionPower, reflectColor * reflectionPower, v_fresnel) + v_fresnel_ratio + frontLight + backLight;

	gl_FragColor = vec4(resultColor.rgb, v_fresnel);
}