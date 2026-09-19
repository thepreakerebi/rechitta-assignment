/**
 * The orb.
 *
 * Ported from "Gradient Orb" by Kaiyu Hsu (UI Capsule) — https://uicapsule.com/ui/gradient-orb
 * MIT licensed. The original ships as a React component on three.js and
 * @react-three/fiber; both are dropped here. Six hundred kilobytes of scene
 * graph to draw one fullscreen triangle is not a trade worth making, and
 * @react-three/fiber wraps its canvas in a <div>, which this project bans. The
 * GLSL is the part that matters and it ports unchanged apart from the move to
 * GLSL ES 3.00 and the palette.
 *
 * Changes from the original:
 *  - Colours retuned from blue/purple/orange to the Rechitta film palette read
 *    off the Figma orb: indigo, violet and warm ivory.
 *  - Its fixed breathing pulse and rotation are now driven by the microphone.
 *    Bass opens the core, mid thickens the noise and shifts the hue, treble
 *    spins the colour wheel, and broadband level deepens the pulse. With no
 *    audio the idle drive keeps the original's gentle breathing.
 */

export const VERTEX_SHADER = /* glsl */ `#version 300 es
in vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uLevel;
uniform float uOpacity;

out vec4 fragColor;

// -- YIQ hue rotation --------------------------------------------------------

vec3 rgb2yiq(vec3 c) {
  return vec3(
    dot(c, vec3(0.299, 0.587, 0.114)),
    dot(c, vec3(0.596, -0.274, -0.322)),
    dot(c, vec3(0.211, -0.523, 0.312))
  );
}

vec3 yiq2rgb(vec3 c) {
  return vec3(
    c.x + 0.956 * c.y + 0.621 * c.z,
    c.x - 0.272 * c.y - 0.647 * c.z,
    c.x - 1.106 * c.y + 1.703 * c.z
  );
}

vec3 adjustHue(vec3 color, float hueDeg) {
  float hueRad = radians(hueDeg);
  vec3 yiq = rgb2yiq(color);
  float cosA = cos(hueRad);
  float sinA = sin(hueRad);
  yiq.yz = vec2(yiq.y * cosA - yiq.z * sinA, yiq.y * sinA + yiq.z * cosA);
  return yiq2rgb(yiq);
}

// -- 3D simplex noise --------------------------------------------------------

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );
  return dot(vec4(31.316), n);
}

// -- orb ---------------------------------------------------------------------

vec4 extractAlpha(vec3 colorIn) {
  float a = max(max(colorIn.r, colorIn.g), colorIn.b);
  return vec4(colorIn.rgb / (a + 1e-5), a);
}

// Read off the Figma orb rather than the original's blue/purple/orange.
const vec3 baseColor0 = vec3(0.180, 0.235, 0.780);  // indigo
const vec3 baseColor1 = vec3(0.560, 0.330, 0.920);  // violet
const vec3 baseColor2 = vec3(1.000, 0.870, 0.720);  // warm ivory
const vec3 baseColor3 = vec3(0.000, 0.000, 0.000);

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}

float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv, float hue, float noiseScale, float innerRadius) {
  vec3 color0 = adjustHue(baseColor0, hue);
  vec3 color1 = adjustHue(baseColor1, hue);
  vec3 color2 = adjustHue(baseColor2, hue);
  vec3 color3 = adjustHue(baseColor3, hue);

  float len = length(uv);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;

  // The original's fixed breathing, deepened by broadband loudness.
  float pulse = sin(uTime * 1.5) * 0.02 + uLevel * 0.07;

  float n0 = snoise3(vec3(uv * noiseScale, uTime * 0.5)) * 0.5 + 0.5;

  float r0 = mix(mix(innerRadius + pulse, 1.0, 0.4), mix(innerRadius + pulse, 1.0, 0.6), n0);

  float d0 = distance(uv, (r0 * invLen) * uv);
  float v0 = light1(1.0, 10.0, d0);
  v0 *= smoothstep(r0 * 1.05, r0, len);

  float wheel = uTime * (2.0 + 2.5 * uTreble);
  float cl = cos(atan(uv.y, uv.x) + wheel) * 0.5 + 0.5;

  float a = uTime * -1.0;
  vec2 pos = vec2(cos(a), sin(a)) * r0;
  float d = distance(uv, pos);
  float v1 = light2(1.5 + uTreble, 5.0, d);
  v1 *= light1(1.0, 50.0, d0);

  float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
  float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

  vec3 col = mix(color1, color2, cl);
  col = mix(col, color0, n0);
  col = mix(color3, col, v0);
  col = (col + v1) * v2 * v3;
  col = clamp(col, 0.0, 1.0);

  return extractAlpha(col);
}

void main() {
  vec2 center = uResolution.xy * 0.5;
  float size = min(uResolution.x, uResolution.y);
  vec2 uv = (gl_FragCoord.xy - center) / size * 2.0;

  // Bass opens the core, mid thickens the noise and nudges the hue, treble
  // spins the colour wheel inside draw().
  float hue         = uMid * 16.0;
  float noiseScale  = 0.65 + uMid * 0.55;
  float innerRadius = 0.10 + uBass * 0.16;

  float rot = uTime * (0.3 + uLevel * 0.35);
  float s = sin(rot);
  float c = cos(rot);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  vec4 col = draw(uv, hue, noiseScale, innerRadius);

  float alpha = col.a * uOpacity;
  fragColor = vec4(col.rgb * alpha, alpha);
}
`
