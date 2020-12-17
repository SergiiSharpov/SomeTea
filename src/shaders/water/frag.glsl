varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;
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


const float eta = 0.7504;

// TODO Make this a uniform
// This is the maximum iterations when looking for the ray intersection with the environment,
// if after this number of attempts we did not find the intersection, the result will be wrong.
const int MAX_ITERATIONS = 50;

vec3 getNormal(vec3 p, float eps) {
    vec3 n;
    n.y = map(p);    
    n.x = map(vec3(p.x+eps,p.y,p.z)) - n.y;
    n.z = map(vec3(p.x,p.y,p.z+eps)) - n.y;
    n.y = eps;
    return normalize(n);
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
  float h = map(vPosition.xyz * uvScale);
  float waveY = mix(heightBounds.x, heightBounds.y, height) - h * 0.005;
  if (vPosition.y > waveY) {
    discard;
  }
  
  
  float caustic = texture2D(causticMap, vViewUv.xy).r;

  vec3 viewDirection = normalize(vPosition - cameraPosition);
  vec3 targetNormal = -vNormal;

  vec3 v_refraction = refract(viewDirection, targetNormal, Eta);
  vec3 v_reflection = reflect(viewDirection, targetNormal);

  vec4 refractColor0 = textureCube( envMap, v_refraction * vec3(-1.0, 1.0, 1.0));
  vec4 reflectColor0 = textureCube( envMap, v_reflection * vec3(-1.0, 1.0, 1.0));

  float v_fresnel = clamp(1.0 - dot(-viewDirection, targetNormal), 0., 1.);
	// see http://en.wikipedia.org/wiki/Schlick%27s_approximation
	float v_fresnel_ratio = (R0 + ((1.0 - R0) * pow(v_fresnel, 8.0)));

  vec4 refColor = mix(refractColor0, reflectColor0, v_fresnel_ratio);
  vec3 resColor = refColor.rgb * waterColor + caustic;

  gl_FragColor = vec4(resColor, 1.0);
}