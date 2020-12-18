varying vec2 vUv;

uniform float opacity;
uniform float bubblesPower;

float circle(vec2 coord, float radius) {
    return step(length(coord), radius) - (radius - length(coord));
}

float circleAlpha(vec2 coord, float radius) {
    return step(length(coord), radius);
}

void main() {
	float power = circle(vUv - 0.5, 0.5);
	float alphaPower = circleAlpha(vUv - 0.5, 0.5);

	float alpha = opacity * alphaPower * power * bubblesPower;

	if (alpha == 0.) {
		discard;
	}

	gl_FragColor = vec4(vec3(power), alpha);
}