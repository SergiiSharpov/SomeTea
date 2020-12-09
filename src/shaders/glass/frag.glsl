varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;

uniform sampler2D waterMap;
uniform sampler2D envMap;

uniform sampler2D thicknessMap;

uniform sampler2D normalMap;
uniform samplerCube cubeMap;


uniform float roughness;
uniform sampler2D roughnessMap;

uniform float fresnelPower;
uniform vec3 glassColor;
uniform float reflectivity;
uniform float absorption;

uniform vec3 waterColor;

uniform float time;
uniform float speed;
uniform float uvScale;

uniform float height;
uniform vec2 heightBounds;


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





const int NUM_STEPS = 8;
const float PI	 	= 3.141592;
const float EPSILON	= 1e-3;
#define EPSILON_NRM (0.1 / resolution.x)
#define AA

// sea
const int ITER_GEOMETRY = 3;
const int ITER_FRAGMENT = 5;
const float SEA_HEIGHT = 0.06;
const float SEA_CHOPPY = 4.0;
const float SEA_SPEED = 0.8;
const float SEA_FREQ = 0.16;
const vec3 SEA_BASE = vec3(0.0,0.09,0.18);
const vec3 SEA_WATER_COLOR = vec3(0.8,0.9,0.6)*0.6;
#define SEA_TIME (1.0 + time * SEA_SPEED * speed)
const mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);


float hash( vec2 p ) {
	float h = dot(p,vec2(127.1,311.7));	
    return fract(sin(h)*43758.5453123);
}
float noise( vec2 p ) {
    vec2 i = floor( p );
    vec2 f = fract( p );	
	vec2 u = f*f*(3.0-2.0*f);
    return -1.0+2.0*mix( mix( hash( i + vec2(0.0,0.0) ), 
                     hash( i + vec2(1.0,0.0) ), u.x),
                mix( hash( i + vec2(0.0,1.0) ), 
                     hash( i + vec2(1.0,1.0) ), u.x), u.y);
}

// lighting
float diffuse(vec3 n,vec3 l,float p) {
    return pow(dot(n,l) * 0.4 + 0.6,p);
}
float specular(vec3 n,vec3 l,vec3 e,float s) {    
    float nrm = (s + 8.0) / (PI * 8.0);
    return pow(max(dot(reflect(e,n),l),0.0),s) * nrm;
}

// sea
float sea_octave(vec2 uv, float choppy) {
    uv += noise(uv);        
    vec2 wv = 1.0-abs(sin(uv));
    vec2 swv = abs(cos(uv));    
    wv = mix(wv,swv,wv);
    return pow(1.0-pow(wv.x * wv.y,0.65),choppy);
}

float map(vec3 p) {
    float freq = SEA_FREQ;
    float amp = SEA_HEIGHT;
    float choppy = SEA_CHOPPY;
    vec2 uv = p.xz; uv.x *= 0.75;
    
    float d, h = 0.0;    
    for(int i = 0; i < ITER_GEOMETRY; i++) {        
    	d = sea_octave((uv+SEA_TIME)*freq,choppy);
    	d += sea_octave((uv-SEA_TIME)*freq,choppy);
        h += d * 0.5;        
    	uv *= octave_m; freq *= 1.9; amp *= 0.22;
        choppy = mix(choppy,1.0,0.2);
    }
    return h;
}






void main() {
	float h = map(vPosition.xyz * uvScale);
  float waveY = mix(heightBounds.x, heightBounds.y, height) - h * 0.005;

	float thickness = texture2D(thicknessMap, vec2(vUv.x, 1.0 - vUv.y)).r;

	float rougnessMultiplyer = texture2D(roughnessMap, vUv).r;
	float mipMapLevel = float( roughness * 8.0 * rougnessMultiplyer );

	float roughnessInverse = 1.0 - (roughness * rougnessMultiplyer);
	float alpha = 1.0 - absorption;

	vec3 normal = normalize( vNormal );
	//normal = normal * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
	
	vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	normal = perturbNormal2Arb( -vViewPosition, normal, mapN );


	vec3 dirLight = vec3(0.808049, 0.685002, 0.42915);
	vec3 viewDirection = normalize(vPosition - cameraPosition);

	vec3 screenViewDirection = normalize(vViewPosition);
	vec3 screenNormal = (viewMatrix * vec4(normal, 0.0)).xyz;

	float face = float( gl_FrontFacing ) * 2.0 - 1.0;
	
	vec3 targetNormal = normal * face;

	float isBackFace = step(0.0, dot(viewDirection, targetNormal));
	

	vec3 v_refraction = refract(viewDirection, targetNormal, Eta + thickness * 0.1);// + EtaDelta * sin(roughness * 3.14 * 0.5 * rougnessMultiplyer)
	vec3 v_reflection = reflect(viewDirection, targetNormal);

	vec4 refractColor0 = textureCube( cubeMap, v_refraction * vec3(-1.0, 1.0, 1.0), mipMapLevel);
	vec4 reflectColor0 = textureCube( cubeMap, v_reflection * vec3(-1.0, 1.0, 1.0), mipMapLevel);
	
	float v_fresnel = clamp(1.0 - dot(-viewDirection, targetNormal), 0., 1.);
	// see http://en.wikipedia.org/wiki/Schlick%27s_approximation
	float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, 8.0)));

	float uvScalePower = 1.0 - v_fresnel;
	float refractionPower = dot(viewDirection, v_refraction);
	float reflectionPower = dot(viewDirection, v_reflection);

	float frontLight = pow(clamp(dot(dirLight, targetNormal), 0., 1.) * 0.8, 4.0);

	float innerWaterAlpha = texture2D(waterMap, vViewUv.xy).a;

	vec4 innerRefColor0 = texture2D(envMap, vViewUv.xy);
	vec4 innerRefColor1 = texture2D(waterMap, vViewUv.xy);

	vec4 innerRefColor = mix(innerRefColor0, innerRefColor1, innerWaterAlpha);
	//vec4 innerRefColor = texture2D(envMap, vViewUv.xy, mipMapLevel);
	innerRefColor.a = clamp((innerRefColor.a - absorption) * roughnessInverse, 0.0, 1.0);

	vec4 refColor = mix(refractColor0, reflectColor0, v_fresnel_ratio);

	vec4 totalRefColor = mix(refColor, innerRefColor1, clamp((innerRefColor.a - absorption) * roughnessInverse, 0.0, 1.0));// innerRefColor.a
	
	vec4 baseColor = vec4(glassColor, 1.0) * (1.0 - reflectivity);
	float fresnelResult = v_fresnel_ratio * fresnelPower;
	
	vec4 resultColor = baseColor + totalRefColor + fresnelResult + frontLight;

	float vertexDist = length(vPosition.xyz);
	float normalDist = step(0.5, length(vPosition.xyz + vNormal.xyz) - vertexDist);
	vec3 faceColor = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.0, 0.0), face);

	float resultAlpha = max(max(innerRefColor0.a, innerRefColor1.a), v_fresnel + roughness * rougnessMultiplyer + thickness);

	vec3 col = baseColor.rgb + mix(refColor.rgb, innerRefColor1.rgb, innerRefColor1.a) + fresnelResult;


	float isInner = innerRefColor0.a * innerRefColor1.a;
	if (vPosition.y > waveY) {
    isInner = 0.0;
  }
	vec3 innerPart = mix(innerRefColor1.rgb, innerRefColor0.rgb, isInner) * waterColor;
	innerPart = mix(innerRefColor0.rgb, innerPart, isInner);
	//innerPart = mix(col, innerPart, isInner);

	vec3 outputColor = baseColor.rgb + refColor.rgb + fresnelResult;//innerPart;//vec3(innerRefColor1.a);

	//gl_FragColor = vec4(vec3(refractColor0.rgb), roughness * rougnessMultiplyer + 1.0);
	//gl_FragColor = vec4(vec3(texture2D(envMap, vViewUv.xy).rgb), resultAlpha);

	// gl_FragColor = vec4(col, v_fresnel + roughness * rougnessMultiplyer + thickness);
	// gl_FragColor = vec4(col, v_fresnel + roughness * rougnessMultiplyer + thickness);
	//gl_FragColor = vec4(col, v_fresnel + roughness * rougnessMultiplyer + thickness);
	//gl_FragColor = vec4(mix(col, innerPart, isInner), v_fresnel + roughness * rougnessMultiplyer + thickness + isInner);
	gl_FragColor = vec4(outputColor, v_fresnel + roughness * rougnessMultiplyer + thickness);
	//gl_FragColor = vec4(vec3(innerRefColor0.a * innerRefColor1.a), 1.0);

	//gl_FragColor = vec4(vec3(baseColor + totalRefColor + fresnelResult + frontLight), v_fresnel + roughness * rougnessMultiplyer + innerRefColor1.a + thickness);//vec4(resultColor.rgb, 1.0);
	//gl_FragColor = vec4(vec3( baseColor + fresnelResult + frontLight), v_fresnel + roughness * rougnessMultiplyer);//vec4(resultColor.rgb, 1.0);
	// gl_FragColor = vec4(vec3(baseColor.rgb), v_fresnel);
}