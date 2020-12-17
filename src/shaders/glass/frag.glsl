varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;

uniform sampler2D waterMap;
uniform sampler2D envMap;

uniform sampler2D thicknessMap;

uniform sampler2D normalMap;
uniform samplerCube cubeMap;

uniform sampler2D waterDepthMap;
uniform sampler2D innerDepthMap;

uniform sampler2D causticMap;

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

uniform mat4 cameraProjectionInverse;
uniform mat4 cameraViewInverse;

uniform mat4 cameraProjection;
uniform mat4 cameraView;


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


/** Simple 3d noise */

float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 perm(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}

float noise(vec3 p){
    vec3 a = floor(p);
    vec3 d = p - a;
    d = d * d * (3.0 - 2.0 * d);

    vec4 b = a.xxyy + vec4(0.0, 1.0, 0.0, 1.0);
    vec4 k1 = perm(b.xyxy);
    vec4 k2 = perm(k1.xyxy + b.zzww);

    vec4 c = k2 + a.zzzz;
    vec4 k3 = perm(c);
    vec4 k4 = perm(c + 1.0);

    vec4 o1 = fract(k3 * (1.0 / 41.0));
    vec4 o2 = fract(k4 * (1.0 / 41.0));

    vec4 o3 = o2 * d.z + o1 * (1.0 - d.z);
    vec2 o4 = o3.yw * d.x + o3.xz * (1.0 - d.x);

    return o4.y * d.y + o4.x * (1.0 - d.y);
}


/**
 * Draw a circle at vec2 `pos` with radius `rad` and
 * color `color`.
 */
float circle(vec2 uv, vec2 pos, float rad) {
	float d = length(pos - uv) - rad;
	float t = clamp(d, 0.0, 1.0);
	return 1.0 - t;
}


void main() {
	float thickness = texture2D(thicknessMap, vec2(vUv.x, 1.0 - vUv.y)).r;

	float rougnessMultiplyer = texture2D(roughnessMap, vUv).r;
	float mipMapLevel = float( roughness * 8.0 * rougnessMultiplyer );

	float roughnessInverse = 1.0 - (roughness * rougnessMultiplyer);

	vec3 normal = normalize( vNormal );
	vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	normal = perturbNormal2Arb( -vViewPosition, normal, normalize(mapN) );


	vec3 dirLight = vec3(0.808049, 0.685002, 0.42915);
	vec3 viewDirection = normalize(vPosition - cameraPosition);

	float face = float( gl_FrontFacing ) * 2.0 - 1.0;
	vec3 targetNormal = normal * face;
	

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

	vec4 innerRefColor0 = texture2D(envMap, vViewUv.xy, mipMapLevel);
	vec4 innerRefColor1 = texture2D(waterMap, vViewUv.xy, mipMapLevel);

  /** Inner color calculation */
	float waterDepth = texture2D(waterDepthMap, vViewUv.xy).r;
	float innerDepth = texture2D(innerDepthMap, vViewUv.xy).r;

	vec4 realCoord = cameraProjectionInverse * vec4(vec3(vViewUv.x, vViewUv.y, innerDepth) * 2.0 - 1.0, 1.0);
	realCoord = cameraViewInverse * (realCoord / realCoord.w);

	
  float waveY = mix(heightBounds.x, heightBounds.y, height);
	float h = map(vec3(realCoord.x, waveY, realCoord.z) * uvScale);

	waveY -= h * 0.005;

	vec4 waterColorMult = vec4(1.0);
	float isUnderwater = 0.0;
	if (realCoord.y <= waveY) {
		waterColorMult = vec4(waterColor, 1.0);
		isUnderwater = 1.0;
	}

		/** Caustic color */

		vec4 screenPosition = cameraProjection * cameraView * vec4(realCoord.xyz, 1.0);
		screenPosition = screenPosition * 0.5 + 0.5;
		float caustic = texture2D(causticMap, screenPosition.xy).r;

		/** Caustic color end*/

	vec4 innerCol = mix(innerRefColor0 * waterColorMult + caustic * isUnderwater * 0.5, innerRefColor1, step(waterDepth, innerDepth));

	/** Inner color calculation end */

	vec4 refColor = mix(refractColor0, reflectColor0, v_fresnel_ratio);
	
	vec4 refColorResult = mix(innerCol, refColor, (1.0 - innerCol.a + thickness));
	refColorResult = mix(refColorResult, refColor, v_fresnel);
	refColorResult = mix(refColor, refColorResult, roughnessInverse);
	
	vec4 baseColor = vec4(glassColor, 1.0) * (1.0 - reflectivity);
	float fresnelResult = v_fresnel_ratio * fresnelPower;

	float resultAlpha = max(max(innerRefColor0.a, innerRefColor1.a), v_fresnel + roughness * rougnessMultiplyer + thickness);

	vec3 col = baseColor.rgb + mix(refColor.rgb, innerRefColor1.rgb, innerRefColor1.a) + fresnelResult;


	
	vec3 outputColor = baseColor.rgb + refColorResult.rgb + fresnelResult;
	
	gl_FragColor = vec4(outputColor.rgb, resultAlpha + innerCol.a);
}