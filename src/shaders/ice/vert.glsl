varying vec4 vPosition;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

varying vec2 vUv;

varying vec3 vViewPosition;
varying vec4 vViewUv;

uniform float depthScale;

uniform mat4 cameraProjection;
uniform mat4 cameraView;

void main() {
  vUv = uv;

  vec3 transformed = vec3( position );
  vec4 mvPosition = vec4( transformed, 1.0 );
  mvPosition = modelViewMatrix * mvPosition;

	vPosition = modelMatrix * vec4( position, 1.0 );
  vNormal = normalize( vec3(modelMatrix * vec4(normal, 0.0)) );

  mat4 modelViewProjection = projectionMatrix * modelViewMatrix;
  
  vec4 transformedPosition = modelViewProjection * vec4( position, 1.0 );

  vViewUv = transformedPosition;
  vViewUv.xyz /= vViewUv.w;
  vViewUv.xyz = (vViewUv.xyz + 1.0) * 0.5;

  
  vViewPosition = - mvPosition.xyz;

	gl_Position = projectionMatrix * mvPosition;
}