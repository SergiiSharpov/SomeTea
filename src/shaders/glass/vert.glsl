varying vec3 vPosition;

varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

varying vec3 vViewPosition;
varying vec4 vViewUv;

#include <uv_pars_vertex>

void main() {
  #include <uv_vertex>

  #include <begin_vertex>
  #include <project_vertex>

	vPosition = vec3( modelMatrix * vec4( position, 1.0 ));
  vNormal = normalize( vec3(modelMatrix * vec4(normal, 0.0)) );
  
  vec4 transformedPosition = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vViewUv = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vViewUv.xyz /= vViewUv.w;
  vViewUv.xy = (vViewUv.xy + 1.0) * 0.5;
  
  vViewPosition = - mvPosition.xyz;

	gl_Position = transformedPosition;
}