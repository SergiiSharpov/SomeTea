//#extension GL_EXT_shader_texture_lod : enable

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


varying vec2 vUv;

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
const float Ice = 1.3098;

// Air to glass ratio of the indices of refraction (Eta)
const float Eta = Air / Ice;
const float EtaDelta = 1.0 - Eta;

// see http://en.wikipedia.org/wiki/Refractive_index Reflectivity
const float R0 = ((Air - Ice) * (Air - Ice)) / ((Air + Ice) * (Air + Ice));


void main() {
	vec3 normal = normalize( vNormal );
	normal = normal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );

	float inverseRoughness = 1.0 - roughness;

	float val = texture2D( noiseMap, vViewUv.xy, roughness * float (6.0) ).x;

	float valU = texture2D( noiseMap, vViewUv.xy + vec2( 1.0 / resolution.x, 0.0 ), roughness * float (6.0) ).x;
	float valV = texture2D( noiseMap, vViewUv.xy + vec2( 0.0, 1.0 / resolution.y ), roughness * float (6.0) ).x;

	vec3 bumpNormal = normalize(vec3(val - valU, val - valV, 0.02));
	vec3 targetNormal = perturbNormal2Arb( -vViewPosition, normal, bumpNormal );
	targetNormal = mix(normal, targetNormal, bumpScale);
	
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

	gl_FragColor = vec4(envColor, 1.0);
	
}