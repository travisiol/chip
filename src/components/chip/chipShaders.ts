/**
 * Trace ribbons. Each vertex carries where it sits along its trace (aT, 0 at
 * the pin, 1 at the core), the power level at which its trace starts lighting
 * (aOffset) and how much power it takes to light fully (aSpan). One uniform,
 * uPower, therefore drives the whole choreography: outer circuits first, the
 * ring bus mid-way, the core leads last, packets flowing inward all along.
 * The execution bus (aKind 3) is driven by uExec instead and flows outward.
 */
export const traceVertex = /* glsl */ `
  attribute float aT;
  attribute float aOffset;
  attribute float aSpan;
  attribute float aKind;
  attribute float aRand;
  varying float vT;
  varying float vOffset;
  varying float vSpan;
  varying float vKind;
  varying float vRand;
  varying vec3 vWorld;
  void main() {
    vT = aT;
    vOffset = aOffset;
    vSpan = aSpan;
    vKind = aKind;
    vRand = aRand;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const traceFragment = /* glsl */ `
  precision highp float;
  uniform float uPower;
  uniform float uTime;
  uniform float uFlash;
  uniform float uExec;
  uniform float uPulse;
  uniform float uSpeed;
  uniform float uRegion;
  uniform vec3 uDim;
  uniform vec3 uDeep;
  uniform vec3 uEnergy;
  uniform vec3 uEnergy2;
  varying float vT;
  varying float vOffset;
  varying float vSpan;
  varying float vKind;
  varying float vRand;
  varying vec3 vWorld;

  void main() {
    // How far along t this trace is lit at the current power.
    float litEdge = (uPower - vOffset) / max(vSpan, 0.001);
    float lit = vKind > 2.5 ? uExec : 1.0 - smoothstep(litEdge - 0.02, litEdge + 0.06, vT);
    lit = clamp(lit, 0.0, 1.0);

    // Packets moving toward the core (t increasing); the execution bus flows outward the same way.
    float phase = vT * 10.0 - uTime * uSpeed * 1.8 + vRand * 6.2831;
    float flow = pow(0.5 + 0.5 * sin(phase), 14.0);

    // Brushed metal shimmer on the dark copper of an idle trace.
    float shimmer = 0.85 + 0.25 * sin(vWorld.x * 9.0 + vWorld.z * 6.0);
    vec3 idle = uDim * shimmer;

    vec3 tint = mix(uEnergy, uEnergy2, vRand * 0.45);
    vec3 glow = tint * lit * (0.8 + 0.7 * flow + 0.45 * uPulse);
    vec3 col = mix(idle, uDeep, lit * 0.5) + glow;

    // Core-map hover: 1 input bus (fee traces), 2 processing layer (ring + leads), 4 execution bus.
    float hit = 0.0;
    if (uRegion > 0.5 && uRegion < 1.5 && vKind < 0.5) hit = 1.0;
    if (uRegion > 1.5 && uRegion < 2.5 && vKind > 0.5 && vKind < 2.5) hit = 1.0;
    if (uRegion > 3.5 && uRegion < 4.5 && vKind > 2.5) hit = 1.0;
    col += mix(vec3(0.16), uEnergy2 * 0.35, lit) * hit;

    col += vec3(1.0) * uFlash * 0.95;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * The core die: a 12 × 12 grid of blocks, each with its own threshold, so the
 * die fills in a scattered order as power rises; a soft breathing pulse above
 * 90 %, a white flash at 100 %.
 */
export const coreVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const coreFragment = /* glsl */ `
  precision highp float;
  uniform float uPower;
  uniform float uTime;
  uniform float uFlash;
  uniform float uPulse;
  uniform float uExec;
  uniform vec3 uEnergy;
  uniform vec3 uEnergy2;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    float n = 16.0;
    vec2 cell = floor(vUv * n);
    vec2 f = fract(vUv * n);
    float h = hash(cell);
    // Blocks near the centre light later: the die fills from the edges in.
    float radial = length(vUv - 0.5) * 1.2;
    float threshold = mix(0.15, 0.98, h) * 0.75 + (1.0 - radial) * 0.25;
    float on = smoothstep(threshold - 0.04, threshold + 0.04, uPower);
    float gap = step(0.16, f.x) * step(0.16, f.y) * step(f.x, 0.92) * step(f.y, 0.92);
    float breathe = 0.82 + 0.18 * sin(uTime * 2.6 + h * 6.0);
    float pulse = uPulse * (0.5 + 0.5 * sin(uTime * 4.5));

    vec3 dark = vec3(0.045, 0.055, 0.058);
    vec3 line = vec3(0.09, 0.105, 0.11);
    vec3 col = mix(line, dark, gap);
    col = mix(col, mix(uEnergy, uEnergy2, h * 0.4) * breathe * (0.55 + 0.45 * uPower), on * gap);
    col += uEnergy2 * pulse * 0.35 * gap;
    col += mix(uEnergy2, vec3(1.0), 0.5) * uExec * 0.25 * gap;
    col += vec3(1.0) * uFlash;
    gl_FragColor = vec4(col, 1.0);
  }
`;
