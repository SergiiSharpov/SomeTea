varying vec4 vPosition;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

varying vec3 vViewPosition;
varying vec4 vViewUv;

varying vec4 vViewTransformedUv;

uniform float depthScale;

#include <uv_pars_vertex>

void main() {
  #include <uv_vertex>

  #include <begin_vertex>
  #include <project_vertex>

	vPosition = modelMatrix * vec4( position, 1.0 );
  vNormal = normalize( vec3(modelMatrix * vec4(normal, 0.0)) );

  mat4 modelViewProjection = projectionMatrix * modelViewMatrix;
  
  vec4 transformedPosition = modelViewProjection * vec4( position, 1.0 );

  vViewUv = transformedPosition;
  vViewUv.xyz /= vViewUv.w;
  vViewUv.xyz = (vViewUv.xyz + 1.0) * 0.5;

  vViewTransformedUv = modelViewProjection * vec4( position + vNormal * depthScale, 1.0 );
  vViewTransformedUv.xyz /= vViewTransformedUv.w;
  vViewTransformedUv.xyz = (vViewTransformedUv.xyz + 1.0) * 0.5;

  
  vViewPosition = - mvPosition.xyz;

	gl_Position = transformedPosition;
}