export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uState;
  uniform float uHover;
  uniform float uPulse;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vEyeVector;
  varying vec2 vUv;
  varying float vDisplacement;
  varying float vScanWave;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  void main() {
    vUv = uv;

    // State-driven ferrofluid harmonics
    float speed = 0.45;
    float amp = 0.11;
    float freq = 2.1;

    if (abs(uState - 1.0) < 0.5) {
      speed = 0.75;
      amp = 0.15;
      freq = 2.5;
    } else if (abs(uState - 2.0) < 0.5) {
      speed = 0.95;
      amp = 0.17;
      freq = 2.8;
    } else if (abs(uState - 3.0) < 0.5) {
      speed = 1.45;
      amp = 0.21;
      freq = 3.4;
    } else if (abs(uState - 4.0) < 0.5) {
      speed = 0.30;
      amp = 0.06;
      freq = 1.6;
    } else if (abs(uState - 5.0) < 0.5) {
      speed = 0.85 + uPulse * 0.55;
      amp = 0.14 + uPulse * 0.08;
      freq = 2.6;
    }

    float t = uTime * speed;

    // Harmonic standing wave + simplex turbulence (ferrofluid magnetic spikes)
    float n1 = snoise(position * freq + vec3(t, -t * 0.7, t * 0.5));
    float n2 = snoise(position * (freq * 2.2) - vec3(t * 1.3, t * 0.8, -t)) * 0.5;
    float ridge = abs(snoise(position * (freq * 1.5) + vec3(0.0, t * 1.1, t * 0.9)));
    ridge = pow(1.0 - ridge, 2.2) * 0.45;

    // Cursor magnetic field pull
    vec3 mouseVec = normalize(vec3(uMouse.x * 1.5, uMouse.y * 1.5, 1.1));
    float align = max(0.0, dot(normalize(position), mouseVec));
    float magneticRipple = sin(align * 12.0 - uTime * 6.0) * pow(align, 2.5) * 0.08 * uHover;
    float magneticPull = pow(align, 3.5) * 0.14 * uHover;

    float scanWave = sin(position.y * 14.0 - uTime * 5.5) * 0.5 + 0.5;
    vScanWave = scanWave;

    float displacement = (n1 * 0.6 + n2 * 0.4 + ridge) * amp + magneticPull + magneticRipple;
    vDisplacement = displacement;

    vec3 displacedPosition = position + normal * displacement;
    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);

    vWorldPosition = worldPosition.xyz;
    vPosition = displacedPosition;
    vNormal = normalize(normalMatrix * normal);
    vEyeVector = normalize(worldPosition.xyz - cameraPosition);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uState;
  uniform float uHover;
  uniform float uPulse;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying vec3 vEyeVector;
  varying vec2 vUv;
  varying float vDisplacement;
  varying float vScanWave;

  // Iridescent thin-film cosine palette
  vec3 thinFilmPalette(float t) {
    vec3 a = vec3(0.45, 0.52, 0.65);
    vec3 b = vec3(0.45, 0.45, 0.50);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec3 viewDir = normalize(-vEyeVector);
    vec3 norm = normalize(vNormal);

    // Perturb normal slightly with displacement gradient for liquid-metal feel
    vec3 perturbedNormal = normalize(norm + vec3(
      sin(vPosition.x * 10.0 + uTime * 2.0) * 0.12,
      cos(vPosition.y * 10.0 - uTime * 1.8) * 0.12,
      sin(vPosition.z * 10.0 + uTime * 1.5) * 0.12
    ));

    float ndotv = max(0.0, dot( perturbedNormal, viewDir ));
    float fresnel = pow(1.0 - ndotv, 2.8);

    // Futuristic Cyber-Optic Palette: Deep Void, Electric Ice Cyan, Holographic Violet, Liquid Titanium
    vec3 voidCore = vec3(0.02, 0.03, 0.07);
    vec3 cyberCyan = vec3(0.0, 0.94, 1.0);
    vec3 plasmaViolet = vec3(0.54, 0.36, 0.96);
    vec3 cobaltBlue = vec3(0.15, 0.39, 0.92);
    vec3 titaniumChrome = vec3(0.92, 0.96, 1.0);
    vec3 voltAccent = vec3(0.0, 1.0, 0.68);

    // Iridescent dispersion shift based on viewing angle + displacement
    float iridPhase = ndotv * 1.2 + vDisplacement * 3.8 + uTime * 0.08;
    vec3 iridescence = thinFilmPalette(iridPhase);

    // Base liquid metal shading
    vec3 baseColor = mix(voidCore, cobaltBlue * 0.45, pow(ndotv, 1.4));
    baseColor = mix(baseColor, plasmaViolet * 0.65, smoothstep(-0.08, 0.16, vDisplacement));
    baseColor += iridescence * 0.28 * (0.4 + fresnel);

    // Sharp cybernetic contour lines (topographic energy grid on the core)
    float contour = abs(fract(vDisplacement * 14.0 - uTime * 0.4) - 0.5);
    float contourLine = 1.0 - smoothstep(0.03, 0.08, contour);
    baseColor += cyberCyan * contourLine * 0.42;

    // State-specific futuristic energy modes
    if (abs(uState - 3.0) < 0.5) {
      // ANALYZING: High-frequency holographic laser scan + bright cyan plasma
      float scanLine = smoothstep(0.88, 0.99, vScanWave);
      baseColor += cyberCyan * scanLine * 0.95;
      baseColor = mix(baseColor, voltAccent * 0.7, contourLine * 0.5);
    } else if (abs(uState - 2.0) < 0.5) {
      // UPLOAD: Upward data stream rings
      float stream = smoothstep(0.80, 0.98, sin(vPosition.y * 10.0 - uTime * 4.5) * 0.5 + 0.5);
      baseColor += mix(cyberCyan, plasmaViolet, 0.5) * stream * 0.75;
    } else if (abs(uState - 4.0) < 0.5) {
      // COMPLETE: Pure crystalline chrome-cyan equilibrium
      baseColor = mix(baseColor, titaniumChrome * 0.55 + cyberCyan * 0.35, 0.4);
    } else if (abs(uState - 5.0) < 0.5) {
      // AI COACH: Neural pulse harmonics
      float neural = sin(length(vPosition.xy) * 14.0 - uTime * 5.5) * 0.5 + 0.5;
      baseColor += mix(plasmaViolet, cyberCyan, neural) * (0.35 + uPulse * 0.45);
    }

    // Dual studio specular highlights (Key light + Rim light)
    vec3 lightDir1 = normalize(vec3(uMouse.x * 2.0 + 1.2, uMouse.y * 2.0 + 1.4, 1.8));
    vec3 lightDir2 = normalize(vec3(-1.5, -1.2, 0.8));
    vec3 halfVec1 = normalize(lightDir1 + viewDir);
    vec3 halfVec2 = normalize(lightDir2 + viewDir);

    float spec1 = pow(max(0.0, dot(perturbedNormal, halfVec1)), 64.0);
    float spec2 = pow(max(0.0, dot(perturbedNormal, halfVec2)), 32.0);

    vec3 rimGlow = mix(cyberCyan, plasmaViolet, sin(uTime + vPosition.y * 2.0) * 0.5 + 0.5);
    vec3 finalColor = baseColor
      + rimGlow * fresnel * (1.15 + uHover * 0.35)
      + titaniumChrome * spec1 * 0.95
      + cyberCyan * spec2 * 0.45;

    float alpha = clamp(0.88 + fresnel * 0.12, 0.0, 1.0);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;
