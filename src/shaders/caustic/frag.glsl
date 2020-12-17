varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;

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

const float causticsFactor = 0.99;
const float causticScale = 0.1;

// main
void main() {
  float causticsIntensity = 0.;

  float oldArea = length(dFdx(oldPosition)) * length(dFdy(oldPosition));
  float newArea = length(dFdx(vec3(newPosition.x, depth, newPosition.z))) * length(dFdy(vec3(newPosition.x, depth, newPosition.z)));

  float ratio;

  // Prevent dividing by zero (debug NVidia drivers)
  if (newArea == 0.) {
    // Arbitrary large value
    ratio = 2.0e+20;
  } else {
    ratio = oldArea / newArea;
  }

  causticsIntensity = causticsFactor * ratio;

  gl_FragColor = vec4(vec3(1.0 - causticsIntensity), 1.0);//depth
}