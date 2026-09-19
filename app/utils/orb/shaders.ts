/**
 * The orb, drawn rather than photographed.
 *
 * The supplied asset is a photograph of a soap bubble on solid black, made to
 * look transparent with `mix-blend-mode: lighten`. That only survives over a
 * dark backdrop, and a bitmap cannot change shape, so the brief's requirement
 * that the orb "react in real time to audio frequencies" would have come down
 * to scaling an image.
 *
 * Sampling the reference gives the model this reproduces: an interior that is
 * nearly black (011721 through 022851) and a crescent across the top carrying
 * all of the colour — ivory at the crown, pink and pale magenta beside it,
 * violet below, indigo where it meets the dark. That core is not dark pigment;
 * it is the page showing through a film too thin to reflect, so it is built
 * here out of alpha rather than paint. Which is also what keeps the orb correct
 * over the hero photography, not only over the near-black theme.
 *
 * The silhouette morphs on the same slow cadence as the marketing site's orb —
 * a drift measured in tens of seconds, never a shimmer.
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

// -- noise -------------------------------------------------------------------

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Quintic interpolation: the cubic one leaves lattice creases, which show up
  // as straight segments once the noise is used to shape an outline.
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(hash(i),                  hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * valueNoise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    amplitude *= 0.5;
  }
  return value;
}

// -- film colour -------------------------------------------------------------

// Five stops read straight off the reference, cycled the way a real film cycles
// as it thins. A cosine palette was smoother but could not reach these hues.
vec3 filmRamp(float x) {
  vec3 ivory   = vec3(0.855, 0.788, 0.760);
  vec3 pink    = vec3(0.878, 0.722, 0.815);
  vec3 magenta = vec3(0.816, 0.612, 0.902);
  vec3 violet  = vec3(0.451, 0.306, 0.749);
  vec3 indigo  = vec3(0.125, 0.192, 0.545);

  float s = fract(x) * 5.0;
  float f = smoothstep(0.0, 1.0, fract(s));
  float i = floor(s);

  if (i < 0.5) return mix(ivory,   pink,    f);
  if (i < 1.5) return mix(pink,    magenta, f);
  if (i < 2.5) return mix(magenta, violet,  f);
  if (i < 3.5) return mix(violet,  indigo,  f);
  return mix(indigo, ivory, f);
}

void main() {
  vec2 centred = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float radius = length(centred);
  float angle  = atan(centred.y, centred.x);
  float t      = uTime;

  // -- silhouette ------------------------------------------------------------
  // Two octaves of noise sampled around a circle: broad, smooth bulges that
  // drift over tens of seconds. The path closes on itself, so there is no seam.
  vec2 direction = vec2(cos(angle), sin(angle));
  float organic =
      (valueNoise(direction * 1.60 + vec2(0.0, t * 0.016)) - 0.5) * 1.00
    + (valueNoise(direction * 3.10 + vec2(2.7, t * 0.023)) - 0.5) * 0.32;

  float ripple = 0.0055 * uTreble * sin(angle * 11.0 - t * 1.1);
  float edgeRadius = 0.330 * (1.0 + 0.150 * organic * (1.0 + 0.4 * uMid) + 0.095 * uBass) + ripple;

  float feather = mix(0.010, 0.005, uLevel);
  float body    = 1.0 - smoothstep(edgeRadius - feather, edgeRadius + feather, radius);
  if (body <= 0.0015) {
    fragColor = vec4(0.0);
    return;
  }

  float normalised = clamp(radius / max(edgeRadius, 1e-4), 0.0, 1.0);

  // -- film thickness --------------------------------------------------------
  vec2 warped = centred * 2.3;
  warped += 0.70 * vec2(
    fbm(warped + vec2(0.0, t * 0.020)),
    fbm(warped + vec2(5.2, 1.3) - t * 0.017)
  );

  // Gravity drains the film downward, so it is thickest at the crown. This lays
  // the colour in sweeps rather than letting it follow the radius into a target.
  float drain = clamp(0.5 + centred.y / max(edgeRadius * 2.0, 1e-4), 0.0, 1.0);

  // -- where the film is visible at all --------------------------------------
  // One broad light above and slightly left. Everything outside its reach stays
  // near-transparent, which is what produces the dark interior.
  vec2 toward = centred / max(edgeRadius, 1e-4);
  float lit   = clamp(dot(normalize(vec2(-0.26, 0.97)), toward), -1.0, 1.0);
  float crown = smoothstep(-0.05, 1.00, lit);
  float crest = pow(crown, 1.35) * smoothstep(0.08, 0.90, normalised);

  // The ramp is driven by how far a point has fallen away from the crown, so the
  // crescent runs ivory -> pink -> magenta -> violet -> indigo on the way down,
  // exactly as it does in the reference. Noise only breaks the sweep up.
  float thickness =
      (1.0 - crown) * 0.72
    + fbm(warped * 1.25) * 0.46
    + drain * 0.10
    + pow(normalised, 3.0) * 0.10
    + uMid * 0.26
    + 0.04 * sin(t * 0.09);

  vec3 colour = filmRamp(thickness);

  // Seen most edge-on the film reflects the whole spectrum at once, which is why
  // the very top of a bubble is ivory rather than a rainbow.
  colour = mix(colour, vec3(0.93, 0.89, 0.84), pow(crown, 3.2) * 0.70);

  // The unlit majority is a cold, almost-black teal — the hue the reference
  // reads through its lower two thirds.
  colour = mix(vec3(0.012, 0.075, 0.110), colour, clamp(crest * 1.45 + 0.14, 0.0, 1.0));

  // A faint lip keeps the silhouette legible where the crown does not reach.
  float lip = smoothstep(0.955, 1.0, normalised);
  colour += vec3(0.68, 0.70, 0.62) * lip * (0.22 + 0.26 * drain + 0.20 * uTreble);

  // Ripples gathering toward the base, as in the reference.
  float arcField = normalised * 11.0 + fbm(warped * 0.7) * 4.0 - t * 0.06;
  colour += vec3(0.55, 0.62, 0.66) * smoothstep(0.94, 1.0, sin(arcField))
          * smoothstep(0.45, 0.98, normalised) * (1.0 - drain) * 0.35;

  // Two slow highlights keep the surface reading as curved glass.
  vec2 firstSpot  = vec2(-0.115, 0.140) + 0.014 * vec2(sin(t * 0.17), cos(t * 0.13));
  vec2 secondSpot = vec2(0.145, 0.055)  + 0.010 * vec2(cos(t * 0.11), sin(t * 0.19));
  float specular =
      exp(-dot(centred - firstSpot,  centred - firstSpot)  * 520.0) * 0.50
    + exp(-dot(centred - secondSpot, centred - secondSpot) * 900.0) * 0.26;
  colour += vec3(1.0) * specular * (0.30 + 0.60 * uTreble);

  // -- alpha -----------------------------------------------------------------
  // The film is only opaque where it is lit; elsewhere the page shows through.
  // This is the whole trick: the dark core is the background, not paint.
  float film  = 0.09 + 1.05 * crest + 0.08 * uLevel;
  float alpha = body * clamp(max(film, lip * 0.70), 0.0, 1.0) * uOpacity;

  fragColor = vec4(colour * alpha, alpha);
}
`
