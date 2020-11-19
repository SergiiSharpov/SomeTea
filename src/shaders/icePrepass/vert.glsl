varying vec3 vPosition;

void main() {
  vec3 transformed = vec3( position );

  vec4 mvPosition = vec4( transformed, 1.0 );
  mvPosition = modelViewMatrix * mvPosition;

	vPosition = vec3( modelMatrix *  vec4( transformed, 1.0 ));

	gl_Position = projectionMatrix * mvPosition;
}