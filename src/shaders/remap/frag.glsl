varying vec4 vViewUv;
uniform sampler2D map;


void main() {
	gl_FragColor = texture2D( map, vViewUv.xy );
}