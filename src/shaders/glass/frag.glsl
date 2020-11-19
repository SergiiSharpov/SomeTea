varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;

uniform sampler2D envMap;
uniform sampler2D normalMap;

uniform samplerCube cubeMap;

uniform float roughness;
uniform float fresnelPower;
uniform vec3 glassColor;
uniform float reflectivity;
uniform float absorption;


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
const float Glass = 1.51714;

// Air to glass ratio of the indices of refraction (Eta)
const float Eta = Air / Glass;
const float EtaDelta = 1.0 - Eta;
 
// see http://en.wikipedia.org/wiki/Refractive_index Reflectivity
const float R0 = ((Air - Glass) * (Air - Glass)) / ((Air + Glass) * (Air + Glass));

const float RefractionScale = 32.0;

void main() {
	float roughnessInverse = (1.0 - roughness);
	float alpha = 1.0 - absorption;

	float mipMapLevel = float( roughness * 8.0 );

	vec3 normal = normalize( vNormal );
	normal = normal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
	
	vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	normal = perturbNormal2Arb( -vViewPosition, normal, mapN );


	vec3 dirLight = vec3(0.808049, 0.685002, 0.42915);
	vec3 viewDirection = normalize(vPosition - cameraPosition);

	vec3 screenViewDirection = normalize(vViewPosition);
	vec3 screenNormal = (viewMatrix * vec4(normal, 0.0)).xyz;

	vec3 targetNormal = normal;

	float face = float( gl_FrontFacing  ) * 2.0 - 1.0;

	vec3 v_refraction = refract(viewDirection, targetNormal * face, Eta + EtaDelta * sin(roughness * 3.14 * 0.5));
	vec3 v_reflection = reflect(viewDirection, targetNormal * face);

	vec4 refractColor0 = textureCube( cubeMap, v_refraction * vec3(-1.0, 1.0, 1.0), mipMapLevel);
	vec4 reflectColor0 = textureCube( cubeMap, v_reflection * vec3(-1.0, 1.0, 1.0), mipMapLevel);
	
	float v_fresnel = clamp(1.0 - dot(-viewDirection, targetNormal), 0., 1.);
	// see http://en.wikipedia.org/wiki/Schlick%27s_approximation
	float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, 8.0)));

	float uvScalePower = 1.0 - v_fresnel;
	float refractionPower = dot(viewDirection, v_refraction);
	float reflectionPower = dot(viewDirection, v_reflection);

	float frontLight = pow(clamp(dot(dirLight, targetNormal), 0., 1.) * 0.8, 4.0);

	

	vec4 innerRefColor = texture2D(envMap, vViewUv.xy, mipMapLevel);
	innerRefColor.a = clamp((innerRefColor.a - absorption) * roughnessInverse, 0.0, 1.0);

	vec4 refColor = mix(refractColor0, reflectColor0, v_fresnel_ratio);

	vec4 totalRefColor = mix(refColor, innerRefColor, innerRefColor.a);
	
	vec4 baseColor = vec4(glassColor, 1.0) * (1.0 - reflectivity);
	float fresnelResult = v_fresnel_ratio * fresnelPower;
	
	vec4 resultColor = baseColor + totalRefColor + fresnelResult + frontLight;

	gl_FragColor = vec4(resultColor.rgb, 1.0);
}