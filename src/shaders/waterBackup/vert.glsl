attribute vec4 tangent;

varying vec3 vPosition;

varying vec3 vNormal;

varying vec3 vViewPosition;
varying vec4 vViewUv;

varying vec2 vUv;

uniform float height;
uniform vec2 heightBounds;

varying float wavePower;
varying mat4 vWPMatrix;

void main() {
  vUv = uv;

  float maxY = heightBounds.y * height;
  //wavePower = cos(((maxY - position.y) / (maxY - heightBounds.x)) * 3.14); 
  wavePower = ((maxY - position.y) / (maxY - heightBounds.x)); 

	vPosition = vec3( modelMatrix * vec4( position, 1.0 ));
  vNormal = normalize(modelMatrix * vec4( normal, 1.0 )).xyz;

  vec3 transformed = position.xyz;//vec3( position.x * 0.9, position.y + 0.05, position.z * 0.9 );

  vec4 mvPosition = vec4( transformed, 1.0 );
  mvPosition = modelViewMatrix * mvPosition;
  
  vec4 transformedPosition = projectionMatrix * mvPosition;
  vViewUv = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vViewUv.xyz /= vViewUv.w;
  vViewUv.xy = (vViewUv.xy + 1.0) * 0.5;
  
  vViewPosition = - mvPosition.xyz;

  vWPMatrix = projectionMatrix * viewMatrix;

	gl_Position = transformedPosition;
}