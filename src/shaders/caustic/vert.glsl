attribute vec4 tangent;

varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;

varying vec2 vUv;

varying vec3 oldPosition;
varying vec3 newPosition;
varying float waterDepth;
varying float depth;

varying vec3 resColor;

uniform float height;
uniform vec2 heightBounds;

varying float wavePower;
varying mat4 vWPMatrix;

uniform mat4 cameraProjectionInverse;
uniform mat4 cameraViewInverse;

uniform float time;
uniform vec2 resolution;

uniform float speed;
uniform vec3 center;

uniform float uvScale;
uniform sampler2D causticDepthMap;


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

float map0(vec2 p) {
    vec2 uv = p.xy;
    uv += noise(uv + SEA_TIME);

    vec2 wv = 1.0-abs(sin(uv));
    vec2 swv = abs(cos(uv));    
    wv = mix(wv,swv,wv);

    return pow(1.0-pow(wv.x * wv.y,0.65), SEA_CHOPPY);
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

void main() {
  vUv = uv;

  float maxY = heightBounds.y * height;
  //wavePower = cos(((maxY - position.y) / (maxY - heightBounds.x)) * 3.14); 
  wavePower = ((maxY - position.y) / (maxY - heightBounds.x)); 

  vPosition = vec3( modelMatrix * vec4( position, 1.0 ));
  vNormal = normalize(modelMatrix * vec4( normal, 1.0 )).xyz;

  float h = map(position.xyz * uvScale);
  vec3 n = getNormal(position.xyz * uvScale, 1.0 / 1024.0);

  vec3 transformed = vec3(position.x, mix(heightBounds.x, heightBounds.y, height) + h * 0.005, position.z);//vec3( position.x * 0.9, position.y + 0.05, position.z * 0.9 );

  //vec4 mvPosition = vec4( transformed.x, map(vec3(transformed.x, mix(heightBounds.x, heightBounds.y,0.0), transformed.z) * uvScale), transformed.z, 1.0 );
  // vec4 mvPosition = vec4( transformed.x, map0(uv) * (heightBounds.y - heightBounds.x), transformed.z, 1.0 );
  vec4 mvPosition = vec4( transformed.xyz, 1.0 );
  mvPosition = viewMatrix * mvPosition;
  
  vec4 transformedPosition = projectionMatrix * mvPosition;
  vViewUv = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vViewUv.xyz /= vViewUv.w;
  vViewUv.xy = (vViewUv.xy + 1.0) * 0.5;
  
  vViewPosition = - mvPosition.xyz;

  vWPMatrix = projectionMatrix * viewMatrix;



  
  //vec3( cameraViewInverse * cameraProjectionInverse * texturePosition).xyz;

  // vec4 texturePosition = vec4(texture2D(causticDepthMap, uv).rgb, 1.0);

  // resColor = texturePosition.rgb;

  // // texturePosition = texturePosition * 2.0 - 1.0;

  // newPosition = vec3( cameraViewInverse * cameraProjectionInverse * texturePosition).xyz;


  // gl_Position = projectionMatrix * viewMatrix * vec4(vec3(newPosition.x, newPosition.y, newPosition.z), 1.0);
  vec2 currentPosition = uv;
  float currentDepth = transformed.y;

  vec4 environment = texture2D(causticDepthMap, currentPosition);
  environment = environment * 2.0 - 1.0;

  vec4 tmpPos = cameraProjectionInverse * environment;
  tmpPos /= tmpPos.w;
  vec3 pos = vec3(cameraViewInverse * tmpPos).xyz;

  vec3 refractedDirection = refract(vec3(0.0, -1.0, 0.0), n, eta);//vec3(0.808049, 0.685002, 0.42915)

  // This factor will scale the delta parameters so that we move from one pixel to the other in the env map
  float factor = (1.0 / 1024.0) / length(refractedDirection.xy);

  vec2 deltaDirection = refractedDirection.xy * factor;
  float deltaDepth = refractedDirection.z * factor;

  for (int i = 0; i < MAX_ITERATIONS; i++) {
    // Move the coords in the direction of the refraction
    currentPosition += deltaDirection;
    currentDepth += deltaDepth;

    // End of loop condition: The ray has hit the environment
    if (pos.b <= currentDepth) {
      break;
    }

    environment = texture2D(causticDepthMap, currentPosition);
    environment = environment * 2.0 - 1.0;

    tmpPos = cameraProjectionInverse * environment;
    tmpPos /= tmpPos.w;
    pos = vec3(cameraViewInverse * tmpPos).xyz;
  }

  resColor = environment.xyz * 0.5 + 0.5;

  oldPosition = transformed.xyz;
  newPosition = pos.xyz;

  float causticScale = (heightBounds.y - newPosition.y) / (heightBounds.y - heightBounds.x);
  //newPosition.y = oldPosition.y - 0.01;// + causticScale * 0.5;

  depth = currentDepth;
  waterDepth = transformed.y;

  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);// newPosition.x, mix(heightBounds.x, heightBounds.y, height), newPosition.z
}