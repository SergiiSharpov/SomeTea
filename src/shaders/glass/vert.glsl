attribute vec4 tangent;

varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;

varying vec2 vUv;

void main() {
  vUv = uv;

  vec3 transformed = vec3( position );
  vec4 mvPosition = vec4( transformed, 1.0 );
  mvPosition = modelViewMatrix * mvPosition;

	vPosition = vec3( modelMatrix * vec4( position, 1.0 ));
  vNormal = normalize(modelMatrix * vec4( normal, 1.0 )).xyz;
  
  vec4 transformedPosition = projectionMatrix * mvPosition;
  vViewUv = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vViewUv.xyz /= vViewUv.w;
  vViewUv.xy = (vViewUv.xy + 1.0) * 0.5;
  
  vViewPosition = - mvPosition.xyz;

	gl_Position = transformedPosition;
}