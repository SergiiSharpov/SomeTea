varying vec4 worldPosition;
varying float depth;


void main() {
  // Compute world position
  worldPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.);

  worldPosition.xyz = ((worldPosition.xyz / worldPosition.w) + 1.0) * 0.5;

  // Project vertex in the screen coordinates
  vec4 projectedPosition = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.);

  // Store vertex depth
  depth = projectedPosition.z;

  gl_Position = projectedPosition;
}