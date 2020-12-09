varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;

uniform samplerCube envMap;
uniform float height;
uniform vec2 heightBounds;

uniform float opacity;
uniform float time;
uniform vec2 resolution;

uniform float uvScale;
uniform vec3 waterColor;
uniform vec3 highWaterColor;

varying float wavePower;
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



const mat2 myt = mat2(.12121212, .13131313, -.13131313, .12121212);
const vec2 mys = vec2(1e4, 1e6);

vec2 rhash(vec2 uv) {
  uv *= myt;
  uv *= mys;
  return fract(fract(uv / mys) * uv);
}

vec3 hash(vec3 p) {
  return fract(
      sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)), dot(p, vec3(57.0, 113.0, 1.0)),
               dot(p, vec3(113.0, 1.0, 57.0)))) *
      43758.5453);
}

vec3 voronoi3d(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);

  float id = 0.0;
  vec2 res = vec2(100.0);
  for (int k = -1; k <= 1; k++) {
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec3 b = vec3(float(i), float(j), float(k));
        vec3 r = vec3(b) - f + hash(p + b);
        float d = dot(r, r);

        float cond = max(sign(res.x - d), 0.0);
        float nCond = 1.0 - cond;

        float cond2 = nCond * max(sign(res.y - d), 0.0);
        float nCond2 = 1.0 - cond2;

        id = (dot(p + b, vec3(1.0, 57.0, 113.0)) * cond) + (id * nCond);
        res = vec2(d, res.x) * cond + res * nCond;

        res.y = cond2 * d + nCond2 * res.y;
      }
    }
  }

  return vec3(sqrt(res), abs(id));
}


/**
 * Based on https://www.shadertoy.com/view/Ms2SD1
 */


const int NUM_STEPS = 8;
const float PI	 	= 3.141592;
const float EPSILON	= 1e-3;
#define EPSILON_NRM (0.1 / resolution.x)
#define AA

// sea
const int ITER_GEOMETRY = 3;
const int ITER_FRAGMENT = 5;
const float SEA_HEIGHT = 0.6;
const float SEA_CHOPPY = 4.0;
const float SEA_SPEED = 0.8;
const float SEA_FREQ = 0.16;
const vec3 SEA_BASE = vec3(0.0,0.09,0.18);
const vec3 SEA_WATER_COLOR = vec3(0.8,0.9,0.6)*0.6;
#define SEA_TIME (1.0 + time * SEA_SPEED)
const mat2 octave_m = mat2(1.6,1.2,-1.2,1.6);

// math
mat3 fromEuler(vec3 ang) {
	vec2 a1 = vec2(sin(ang.x),cos(ang.x));
    vec2 a2 = vec2(sin(ang.y),cos(ang.y));
    vec2 a3 = vec2(sin(ang.z),cos(ang.z));
    mat3 m;
    m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
	m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
	m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
	return m;
}
float hash( vec2 p ) {
	float h = dot(p,vec2(127.1,311.7));	
    return fract(sin(h)*43758.5453123);
}
float noise( in vec2 p ) {
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

float map(vec2 p) {
    float freq = SEA_FREQ;
    float amp = SEA_HEIGHT;
    float choppy = SEA_CHOPPY;
    vec2 uv = p; uv.x *= 0.75;
    
    float d, h = 0.0;    
    for(int i = 0; i < ITER_GEOMETRY; i++) {        
    	d = sea_octave((uv+SEA_TIME)*freq,choppy);
    	d += sea_octave((uv-SEA_TIME)*freq,choppy);
        h += d * amp;        
    	uv *= octave_m; freq *= 1.9; amp *= 0.22;
        choppy = mix(choppy,1.0,0.2);
    }
    return h;
}



float map_detailed(vec2 p) {
    float freq = SEA_FREQ;
    float amp = SEA_HEIGHT;
    float choppy = SEA_CHOPPY;
    vec2 uv = p; //uv.x *= 0.75;
    
    float d, h = 0.0;    
    for(int i = 0; i < ITER_FRAGMENT; i++) {        
    	d = sea_octave((uv+SEA_TIME)*freq,choppy);
    	d += sea_octave((uv-SEA_TIME)*freq,choppy);
        h += d * amp;        
    	uv *= octave_m; freq *= 1.9; amp *= 0.22;
        choppy = mix(choppy,1.0,0.2);
    }
    return h;
}

// sky
vec3 getSkyColor(vec3 e) {
    e.y = (max(e.y,0.0)*0.8+0.2)*0.8;
    return vec3(pow(1.0-e.y,2.0), 1.0-e.y, 0.6+(1.0-e.y)*0.4) * 1.1;
}

// sea

vec3 getSeaColor(vec3 p, vec3 n, vec3 l, vec3 eye, vec3 dist) {  
    float fresnel = clamp(1.0 - dot(n,-eye), 0.0, 1.0);
    fresnel = pow(fresnel,3.0) * 0.5;
        
    //vec3 reflected = getSkyColor(reflect(eye,n));    
    vec3 color = waterColor + diffuse(n,l,80.0) * highWaterColor * 0.12; 
    
    //vec3 color = mix(refracted,reflected,fresnel);
    
    float atten = max(1.0 - dot(dist,dist) * 0.001, 0.0);
    color += highWaterColor * SEA_HEIGHT * 0.18 * atten;
    
    color += vec3(specular(n,l,eye,60.0));
    
    return color;
}


// tracing
vec3 getNormal(vec2 p, float eps) {
    vec3 n;
    n.y = map_detailed(p);    
    n.x = map_detailed(vec2(p.x+eps,p.y)) - n.y;
    n.z = map_detailed(vec2(p.x,p.y+eps)) - n.y;
    n.y = eps;
    return normalize(n);
}


//Lighting Utils
float fresnel2(float bias, float scale, float power, vec3 I, vec3 N)
{
    return bias + scale * pow(1.0 + dot(I, N), power);
}

#define rgb(r, g, b) vec3(float(r)/255., float(g)/255., float(b)/255.)


vec4 planeData(vec3 pos) {
	vec2 p = vec2(pos.x * uvScale, pos.z * uvScale);
	vec2 pU = vec2(pos.x * uvScale, pos.z * uvScale) + vec2( uvScale / resolution.x, 0.0 );
	vec2 pV = vec2(pos.x * uvScale, pos.z * uvScale) + vec2( 0.0, uvScale / resolution.x );

	float val = map_detailed(p);
	float valU = map_detailed(pU);
	float valV = map_detailed(pV);

	vec3 bumpNormal = normalize(vec3(val - valU, val - valV, 0.02));

	return vec4(bumpNormal.xyz, val);
}


void main() {
	vec3 viewDirection = normalize(vPosition - cameraPosition);
	vec3 normal = normalize(vNormal);

	vec4 plane = planeData(vPosition.xyz);
	vec3 targetNormal = perturbNormal2Arb( -vViewPosition, normal, plane.xyz );

	vec3 dirLight = vec3(0.808049, 0.685002, 0.42915);
	float frontLight = clamp(dot(dirLight, targetNormal), 0., 1.);


	float fresnel = clamp(1.0 - dot(targetNormal, -viewDirection), 0.0, 1.0);
	fresnel = pow(fresnel,3.0) * 0.5;
			
	vec3 reflected = textureCube(envMap, reflect(viewDirection, targetNormal) * vec3(-1.0, 1.0, 1.0)).rgb;   
	vec3 refracted = waterColor + diffuse(targetNormal, dirLight, 80.0) * highWaterColor * 0.12; 
	
	vec3 color = mix(refracted, reflected, fresnel);

	vec3 dist = vPosition.xyz - cameraPosition.xyz;
	
	float atten = max(1.0 - dot(dist,dist) * 0.001, 0.0);
	color += highWaterColor * abs(plane.w - SEA_HEIGHT) * 0.18 * atten;
	
	color += vec3(specular(targetNormal, dirLight, dist, 80.0));
	color = pow(color,vec3(0.65));

    float isUp = clamp(pow(wavePower, 8.0), 0.0, 1.0);
	
	
	vec3 noisePos = vPosition.xyz * 32.0;
	vec3 noiseVec = vec3(noisePos.x + sin(time), noisePos.y + cos(time), noisePos.z + sin(time) * cos(time));
	vec3 voron = voronoi3d(noiseVec);

	vec3 baseColor = color * isUp;
    vec3 rr = mix(waterColor + voron.x * 0.2, baseColor, isUp);

	gl_FragColor = vec4(rr, 0.8 + fresnel * isUp);
}