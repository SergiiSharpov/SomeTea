varying vec4 worldPosition;
varying float depth;


void main() {
  gl_FragColor = vec4(vec3(worldPosition.x, worldPosition.y, worldPosition.z), 1.0);
}