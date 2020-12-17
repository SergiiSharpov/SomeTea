attribute vec4 tangent;

varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;
varying vec4 vViewRealUv;

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

uniform mat4 cameraProjection;
uniform mat4 cameraView;


void main() {
  vUv = uv;

  float maxY = heightBounds.y * height;
  wavePower = ((maxY - position.y) / (maxY - heightBounds.x)); 

  vPosition = vec3( modelMatrix * vec4( position, 1.0 ));
  vNormal = normalize(modelMatrix * vec4( normal, 1.0 )).xyz;

  vec3 transformed = position.xyz;

  vec4 mvPosition = vec4( transformed.xyz, 1.0 );
  mvPosition = viewMatrix * mvPosition;

  mat4 viewRotation = mat4(mat3(viewMatrix));

  vViewUv = cameraProjection * cameraView * modelMatrix * vec4( transformed.xyz, 1.0 );
  vViewUv.xyz /= vViewUv.w;
  vViewUv.xy = (vViewUv.xy + 1.0) * 0.5;

  vViewRealUv = projectionMatrix * viewMatrix * modelMatrix * vec4( transformed.xyz, 1.0 );
  vViewRealUv.xyz /= vViewRealUv.w;
  vViewRealUv.xy = (vViewRealUv.xy + 1.0) * 0.5;
  
  vViewPosition = - mvPosition.xyz;

  vWPMatrix = projectionMatrix * viewMatrix;

  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}