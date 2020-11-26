varying vec4 vViewUv;

void main() {
  mat4 modelViewProjection = projectionMatrix * modelViewMatrix;
  
  vec4 transformedPosition = modelViewProjection * vec4( position, 1.0 );

  vViewUv = transformedPosition;
  vViewUv.xyz /= vViewUv.w;
  vViewUv.xyz = (vViewUv.xyz + 1.0) * 0.5;

	gl_Position = modelViewProjection * vec4( position, 1.0 );
}