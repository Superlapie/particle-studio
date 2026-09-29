(() => {
  const backgroundVertex = `#version 300 es
  precision highp float;
  out vec2 vUv;
  void main() {
    vec2 p = gl_VertexID == 0 ? vec2(-1.0, -1.0) : (gl_VertexID == 1 ? vec2(3.0, -1.0) : vec2(-1.0, 3.0));
    vUv = p * 0.5 + 0.5;
    gl_Position = vec4(p, 0.0, 1.0);
  }`;

  const backgroundFragment = `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uBackground;
  uniform float uGlow;
  uniform float uGrain;
  uniform float uStars;
  float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
    float d = length(p);
    float aura = exp(-d * d * 3.7) * 0.55 + exp(-d * 2.4) * 0.12;
    float cloud = sin(p.x * 4.1 + sin(p.y * 3.4 + uTime * 0.075)) *
                  cos(p.y * 5.2 - p.x * 1.7 - uTime * 0.05);
    float nebula = smoothstep(0.18, 0.95, cloud * 0.5 + 0.5) * exp(-d * 1.1);
    vec3 base = uBackground * (0.62 + 0.38 * uv.y);
    vec3 color = base + vec3(0.10, 0.16, 0.29) * aura * uGlow;
    color += vec3(0.025, 0.035, 0.095) * nebula * uGlow;
    vec2 cell = floor(uv * uResolution / 2.0);
    float star = step(0.9987, hash21(cell));
    float pulse = 0.45 + 0.55 * sin(uTime * 1.4 + hash21(cell + 4.0) * 6.2831);
    color += vec3(0.38, 0.55, 0.9) * star * pulse * uStars * 0.46;
    float noise = hash21(floor(gl_FragCoord.xy) + floor(uTime * 13.0)) - 0.5;
    color += noise * uGrain * 0.055;
    outColor = vec4(color, 1.0);
  }`;

  const simulationVertex = `#version 300 es
  precision highp float;
  uniform sampler2D uTargetA;
  uniform sampler2D uTargetB;
  uniform int uSimSize;
  uniform float uBlend;
  uniform float uTime;
  uniform float uDt;
  uniform float uSpring;
  uniform float uDamping;
  uniform float uCurl;
  uniform float uAgitation;
  uniform float uMotion;
  uniform float uPointerOn;
  uniform vec2 uPointer;
  uniform float uRepel;
  layout(location = 0) in vec4 aPosition;
  layout(location = 1) in vec4 aVelocity;
  out vec4 vNextPosition;
  out vec4 vNextVelocity;
  vec3 curlField(vec3 p, float t) {
    vec3 q = p * 2.2 + vec3(t, -t * 0.7, t * 0.45);
    float sx = sin(q.x), cx = cos(q.x);
    float sy = sin(q.y), cy = cos(q.y);
    float sz = sin(q.z), cz = cos(q.z);
    return vec3(sx * (cy - cz), sy * (cz - cx), sz * (cx - cy)) * 0.46;
  }
  void main() {
    int index = gl_VertexID;
    ivec2 ij = ivec2(index % uSimSize, index / uSimSize);
    vec3 p = aPosition.xyz;
    float seed = aPosition.w;
    vec3 v = aVelocity.xyz;
    vec3 target = mix(texelFetch(uTargetA, ij, 0).xyz, texelFetch(uTargetB, ij, 0).xyz, uBlend);
    vec3 acc = (target - p) * uSpring * (0.55 + seed * 0.9);
    acc += curlField(p * 0.9, uTime * 0.72 + seed * 2.0) * (uCurl + uAgitation * 1.1) * (0.6 + seed * 0.8);
    acc += vec3(sin(uTime + seed * 31.0), cos(uTime * 0.8 + seed * 19.0), sin(uTime * 0.7 + seed * 27.0)) * uMotion * 0.025;
    vec2 delta = p.xy - uPointer;
    float distanceSq = dot(delta, delta);
    if (uPointerOn > 0.5) acc.xy += normalize(delta + vec2(0.0001)) * uRepel * 8.0 * exp(-distanceSq * 2.2);
    v = (v + acc * uDt) * exp(-uDamping * uDt);
    float speed = length(v);
    if (speed > 10.0) v *= 10.0 / speed;
    p += v * uDt;
    vNextPosition = vec4(p, seed);
    vNextVelocity = vec4(v, 0.0);
    gl_Position = vec4(p, 1.0);
  }`;

  const particleVertex = `#version 300 es
  precision highp float;
  precision highp int;
  uniform sampler2D uColorA;
  uniform sampler2D uColorB;
  uniform int uSimSize;
  uniform float uBlend;
  uniform float uTime;
  uniform float uAspect;
  uniform float uSize;
  uniform float uImageMix;
  uniform vec3 uPaletteA;
  uniform vec3 uPaletteB;
  uniform vec3 uPaletteC;
  uniform float uResolutionY;
  uniform float uCssHeight;
  uniform float uTwinkle;
  layout(location = 0) in vec4 aPosition;
  layout(location = 1) in vec4 aVelocity;
  out vec3 vColor;
  out float vAlpha;
  out float vSeed;
  void main() {
    int index = gl_VertexID;
    ivec2 ij = ivec2(index % uSimSize, index / uSimSize);
    vec4 targetA = texelFetch(uColorA, ij, 0);
    vec4 targetB = texelFetch(uColorB, ij, 0);
    vec3 p = aPosition.xyz;
    float seed = aPosition.w;
    vec3 palette = mix(uPaletteA, uPaletteB, smoothstep(0.12, 0.88, seed));
    palette = mix(palette, uPaletteC, smoothstep(0.91, 0.99, seed) * 0.72);
    vec3 imageColor = mix(targetA.rgb, targetB.rgb, uBlend);
    vColor = mix(palette, imageColor, uImageMix);
    float twinkle = 1.0 - uTwinkle * 0.20 + uTwinkle * 0.38 * (0.5 + 0.5 * sin(uTime * 2.3 + seed * 91.0));
    vAlpha = mix(targetA.a, targetB.a, uBlend) * twinkle;
    vSeed = seed;
    gl_Position = vec4(p.x / uAspect, p.y, 0.0, 1.0);
    gl_PointSize = max(1.0, uSize * (0.64 + seed * 0.72) * uResolutionY / max(uCssHeight, 1.0));
  }`;

  const simulationFragment = `#version 300 es
  precision highp float;
  out vec4 outColor;
  void main() { outColor = vec4(0.0); }`;

  const particleFragment = `#version 300 es
  precision highp float;
  in vec3 vColor;
  in float vAlpha;
  in float vSeed;
  uniform float uIntensity;
  uniform float uGlow;
  out vec4 outColor;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q) * 2.0;
    if (r > 1.0) discard;
    float core = exp(-r * r * 3.5);
    float rim = 1.0 - smoothstep(0.62, 1.0, r);
    float alpha = core * rim * vAlpha * uIntensity;
    float halo = exp(-r * r * 1.4) * uGlow;
    vec3 color = vColor * (0.72 + halo * 0.8) + vec3(0.35, 0.58, 0.9) * halo * 0.12;
    outColor = vec4(color * alpha, alpha);
  }`;

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Unknown shader error';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function makeProgram(gl, vertex, fragment) {
    const program = gl.createProgram();
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertex);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unable to link shader';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  function makeSimulationProgram(gl, vertex) {
    const program = gl.createProgram();
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertex);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, simulationFragment);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.transformFeedbackVaryings(program, ['vNextPosition', 'vNextVelocity'], gl.SEPARATE_ATTRIBS);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unable to link particle simulation';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  function mulberry32(seed) {
    return function () {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(hex) {
    const clean = String(hex || '#ffffff').replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, 'f').slice(0, 6);
    const n = parseInt(full, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function samplePixels(ctx, width, height, threshold = 12) {
    const { data } = ctx.getImageData(0, 0, width, height);
    const picks = [];
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        if (data[i + 3] <= threshold) continue;
        picks.push([x, y, data[i] / 255, data[i + 1] / 255, data[i + 2] / 255, data[i + 3] / 255]);
      }
    }
    return picks;
  }

  function targetFromCandidates(candidates, count, aspect, opts = {}) {
    const random = mulberry32(opts.seed ?? 74291);
    const positions = new Float32Array(count * 4);
    const colors = new Float32Array(count * 4);
    const spanX = Math.min(2.6, aspect * (opts.widthRatio || 1.55));
    const spanY = opts.heightRatio || 1.26;
    const fallbackColor = hexToRgb(opts.color || '#82dfff');
    for (let i = 0; i < count; i++) {
      const item = candidates[Math.floor(random() * candidates.length)] || [0, 0, 0.5, 0.5, 0.5, 1];
      const px = item[0] / opts.width - 0.5;
      const py = item[1] / opts.height - 0.5;
      const offset = i * 4;
      positions[offset] = px * spanX;
      positions[offset + 1] = -py * spanY;
      positions[offset + 2] = (random() - 0.5) * (opts.depth || 0.025);
      positions[offset + 3] = (item[5] ?? 1) * (0.86 + random() * 0.28);
      colors[offset] = item[2] ?? fallbackColor[0];
      colors[offset + 1] = item[3] ?? fallbackColor[1];
      colors[offset + 2] = item[4] ?? fallbackColor[2];
      colors[offset + 3] = positions[offset + 3];
    }
    return { positions, colors, kind: opts.kind || 'shape' };
  }

  function buildTextTarget(text, count, aspect, options = {}) {
    const width = 1200;
    const height = 520;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const families = { serif: 'Georgia, Times New Roman, serif', sans: 'Arial, Helvetica, sans-serif', mono: 'Courier New, monospace' };
    const family = families[options.font || 'serif'] || families.serif;
    const lines = String(text || 'PARTICLE').split('\n').slice(0, 3);
    let fontSize = lines.length > 1 ? 178 : 202;
    ctx.font = `${options.italic ? 'italic ' : ''}700 ${fontSize}px ${family}`;
    const longest = Math.max(...lines.map((line) => ctx.measureText(line).width));
    if (longest > 1050) {
      fontSize = fontSize * 1050 / longest;
      ctx.font = `${options.italic ? 'italic ' : ''}700 ${fontSize}px ${family}`;
    }
    const lineHeight = fontSize * 1.08;
    const startY = height / 2 - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, i) => ctx.fillText(line, width / 2, startY + i * lineHeight));
    const candidates = samplePixels(ctx, width, height, 128);
    return targetFromCandidates(candidates, count, aspect, {
      width, height, depth: 0.035, seed: 7813, widthRatio: 1.7, heightRatio: 1.2,
      color: options.color, kind: 'text',
    });
  }

  function buildImageTarget(image, count, aspect) {
    const width = 240;
    const height = 240;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const ratio = Math.min(0.88 * width / image.naturalWidth, 0.88 * height / image.naturalHeight);
    const drawW = image.naturalWidth * ratio;
    const drawH = image.naturalHeight * ratio;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
    const candidates = samplePixels(ctx, width, height, 24);
    if (!candidates.length) return buildPresetTarget('orb', count, aspect);
    return targetFromCandidates(candidates, count, aspect, {
      width, height, depth: 0.018, seed: 15329, widthRatio: 1.62, heightRatio: 1.35, kind: 'image',
    });
  }

  function buildPresetTarget(name, count, aspect, options = {}) {
    const random = mulberry32(options.seed ?? 32871);
    const positions = new Float32Array(count * 4);
    const colors = new Float32Array(count * 4);
    const palette = hexToRgb(options.color || '#82dfff');
    for (let i = 0; i < count; i++) {
      const u = random();
      const v = random();
      const a = u * Math.PI * 2;
      let x = 0, y = 0, z = 0;
      if (name === 'orb') {
        const latitude = Math.acos(2 * v - 1);
        const radius = 0.36 + Math.pow(random(), 0.5) * 0.42;
        x = Math.sin(latitude) * Math.cos(a) * radius;
        y = Math.cos(latitude) * radius;
        z = Math.sin(latitude) * Math.sin(a) * radius;
      } else if (name === 'galaxy') {
        const arm = Math.floor(random() * 3);
        const radius = 0.08 + Math.pow(u, 0.78) * Math.min(1.3, aspect * 0.72);
        const angle = a + arm * Math.PI * 2 / 3 + radius * 2.7;
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius * 0.72;
        z = (random() - 0.5) * (0.12 + radius * 0.16);
      } else if (name === 'heart') {
        const t = a;
        const scale = 0.036;
        x = 16 * Math.pow(Math.sin(t), 3) * scale;
        y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
        const fill = Math.sqrt(random());
        x *= fill;
        y *= fill;
        z = (random() - 0.5) * 0.08;
      } else if (name === 'orbit') {
        const radius = 0.24 + (i % 5) * 0.095 + random() * 0.08;
        const tilt = (i % 5) * 0.31;
        x = Math.cos(a) * radius;
        y = Math.sin(a) * radius * Math.cos(tilt);
        z = Math.sin(a) * radius * Math.sin(tilt);
      } else if (name === 'wave') {
        x = (u - 0.5) * Math.min(2.4, aspect * 1.55);
        y = Math.sin(x * 5.2 + a * 0.2) * 0.28 + (random() - 0.5) * 0.16;
        z = (random() - 0.5) * 0.05;
      } else if (name === 'star') {
        const outer = 0.72;
        const inner = 0.32;
        const spoke = Math.floor(random() * 10);
        const angle = a * 0.08 + spoke * Math.PI / 5;
        const r = Math.sqrt(random()) * (spoke % 2 ? inner : outer);
        x = Math.cos(angle) * r;
        y = Math.sin(angle) * r;
        z = (random() - 0.5) * 0.04;
      } else {
        x = (random() - 0.5) * aspect * 1.8;
        y = (random() - 0.5) * 1.5;
        z = (random() - 0.5) * 0.75;
      }
      const k = i * 4;
      positions[k] = x;
      positions[k + 1] = y;
      positions[k + 2] = z;
      positions[k + 3] = name === 'orb' && i % 19 === 0 ? 1.35 : 0.9 + random() * 0.18;
      const colorPhase = random();
      colors[k] = palette[0] * (0.78 + colorPhase * 0.18);
      colors[k + 1] = palette[1] * (0.78 + colorPhase * 0.18);
      colors[k + 2] = palette[2] * (0.78 + colorPhase * 0.18);
      colors[k + 3] = positions[k + 3];
    }
    return { positions, colors, kind: name };
  }

  function create(canvas, config = {}) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('This browser does not support WebGL 2.');
    const bgProgram = makeProgram(gl, backgroundVertex, backgroundFragment);
    const simulationProgram = makeSimulationProgram(gl, simulationVertex);
    const particleProgram = makeProgram(gl, particleVertex, particleFragment);
    const edge = config.edge || 160;
    const count = edge * edge;
    const aspect = Math.max(0.5, (canvas.clientWidth || 960) / Math.max(1, canvas.clientHeight || 600));
    const defaultTarget = config.target || buildTextTarget('MAKE\nMATTER.', count, aspect, { font: 'serif', italic: true });
    let targetA = { positions: new Float32Array(defaultTarget.positions), colors: new Float32Array(defaultTarget.colors) };
    let targetB = { positions: new Float32Array(targetA.positions), colors: new Float32Array(targetA.colors) };
    let targetTexA, targetTexB, colorTexA, colorTexB;

    function makeDataTexture(data) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, edge, edge, 0, gl.RGBA, gl.FLOAT, data);
      return texture;
    }
    targetTexA = makeDataTexture(targetA.positions);
    targetTexB = makeDataTexture(targetB.positions);
    colorTexA = makeDataTexture(targetA.colors);
    colorTexB = makeDataTexture(targetB.colors);
    const bgVao = gl.createVertexArray();
    const simVao = [gl.createVertexArray(), gl.createVertexArray()];
    const simBuffers = [];
    const initialPositions = new Float32Array(count * 4);
    const initialVelocity = new Float32Array(count * 4);
    const seedRandom = mulberry32(11231);
    for (let i = 0; i < count; i++) {
      const k = i * 4;
      initialPositions[k] = targetA.positions[k];
      initialPositions[k + 1] = targetA.positions[k + 1];
      initialPositions[k + 2] = targetA.positions[k + 2];
      initialPositions[k + 3] = seedRandom();
    }
    for (let i = 0; i < 2; i++) {
      const positions = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      gl.bufferData(gl.ARRAY_BUFFER, initialPositions, gl.DYNAMIC_COPY);
      const velocities = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, velocities);
      gl.bufferData(gl.ARRAY_BUFFER, initialVelocity, gl.DYNAMIC_COPY);
      simBuffers.push({ positions, velocities });
      gl.bindVertexArray(simVao[i]);
      gl.bindBuffer(gl.ARRAY_BUFFER, positions);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, velocities);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
    const transformFeedback = gl.createTransformFeedback();
    const bgUniforms = {};
    const simulationUniforms = {};
    const pointUniforms = {};
    gl.useProgram(bgProgram);
    ['uResolution', 'uTime', 'uBackground', 'uGlow', 'uGrain', 'uStars'].forEach((key) => bgUniforms[key] = gl.getUniformLocation(bgProgram, key));
    gl.useProgram(simulationProgram);
    ['uTargetA', 'uTargetB', 'uSimSize', 'uBlend', 'uTime', 'uDt', 'uSpring', 'uDamping', 'uCurl', 'uAgitation', 'uMotion', 'uPointerOn', 'uPointer', 'uRepel'].forEach((key) => simulationUniforms[key] = gl.getUniformLocation(simulationProgram, key));
    gl.useProgram(particleProgram);
    ['uColorA', 'uColorB', 'uSimSize', 'uBlend', 'uTime', 'uAspect', 'uSize', 'uImageMix', 'uPaletteA', 'uPaletteB', 'uPaletteC', 'uResolutionY', 'uCssHeight', 'uTwinkle', 'uIntensity', 'uGlow'].forEach((key) => pointUniforms[key] = gl.getUniformLocation(particleProgram, key));
    const parameters = {
      size: config.size ?? 3.2,
      motion: config.motion ?? 0.7,
      turbulence: config.turbulence ?? 0.65,
      repel: config.repel ?? 0.34,
      imageMix: config.imageMix ?? 0,
      palette: config.palette || ['#74dfff', '#9168ff', '#ffd1a8'],
      background: config.background || '#080a12',
      glow: config.glow ?? 0.78,
      intensity: config.intensity ?? 0.82,
      grain: config.grain ?? 0.48,
      stars: config.stars ?? 0.7,
      twinkle: config.twinkle ?? 0.45,
      spring: config.spring ?? 9,
      damping: config.damping ?? 4.2,
    };
    let simIndex = 0;
    let agitation = 0;
    let pointer = [0, 0];
    let pointerOn = 0;
    let raf = 0;
    let disposed = false;
    let startedAt = performance.now();
    let lastFrame = startedAt;
    let sampleSum = 0;
    let sampleCount = 0;
    let scale = 0.88;
    let lastScaleChange = 0;
    let metricsTime = startedAt;
    let transitionStart = 0;
    let transitionDuration = 0;
    let blend = 1;
    let transitionActive = false;
    let visible = true;
    let aspectNow = aspect;
    const hex = (value) => hexToRgb(value);

    function setCanvasSize(force = false) {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      aspectNow = width / height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const maxScale = Math.min(1, Math.sqrt(1600000 / (width * height * dpr * dpr)));
      scale = Math.min(scale, maxScale);
      const nextScale = Math.min(scale, maxScale);
      const pixelWidth = Math.max(1, Math.round(width * dpr * nextScale));
      const pixelHeight = Math.max(1, Math.round(height * dpr * nextScale));
      if (force || canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        gl.viewport(0, 0, pixelWidth, pixelHeight);
      }
    }

    function uploadTexture(texture, data) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, edge, edge, gl.RGBA, gl.FLOAT, data);
    }

    function setTarget(target, duration = 1.15) {
      if (!target?.positions || target.positions.length !== count * 4) return false;
      if (transitionActive && blend < 1) {
        for (let i = 0; i < targetA.positions.length; i++) {
          targetA.positions[i] += (targetB.positions[i] - targetA.positions[i]) * blend;
          targetA.colors[i] += (targetB.colors[i] - targetA.colors[i]) * blend;
        }
      } else {
        targetA.positions.set(targetB.positions);
        targetA.colors.set(targetB.colors);
      }
      targetB = { positions: new Float32Array(target.positions), colors: new Float32Array(target.colors) };
      parameters.spring = target.kind === 'text' || target.kind === 'image' ? 9 : target.kind === 'orb' ? 5 : 7;
      parameters.damping = target.kind === 'text' || target.kind === 'image' ? 4.2 : 3.2;
      agitation = 1;
      uploadTexture(targetTexA, targetA.positions);
      uploadTexture(colorTexA, targetA.colors);
      uploadTexture(targetTexB, targetB.positions);
      uploadTexture(colorTexB, targetB.colors);
      transitionStart = performance.now();
      transitionDuration = Math.max(80, duration * 1000);
      blend = 0;
      transitionActive = true;
      return true;
    }

    function setParams(next) {
      Object.assign(parameters, next);
    }

    function setPointer(x, y, active) {
      pointer = [x, y];
      pointerOn = active ? 1 : 0;
    }

    function uniform1f(location, value) { if (location) gl.uniform1f(location, value); }
    function uniform1i(location, value) { if (location) gl.uniform1i(location, value); }
    function uniform2f(location, x, y) { if (location) gl.uniform2f(location, x, y); }
    function uniform3fv(location, value) { if (location) gl.uniform3fv(location, value); }

    function render(now) {
      if (disposed || !visible) return;
      const elapsed = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now;
      if (transitionActive) {
        const raw = Math.min(1, (now - transitionStart) / transitionDuration);
        blend = raw * raw * (3 - 2 * raw);
        if (raw >= 1) {
          blend = 1;
          transitionActive = false;
          targetA.positions.set(targetB.positions);
          targetA.colors.set(targetB.colors);
          uploadTexture(targetTexA, targetA.positions);
          uploadTexture(colorTexA, targetA.colors);
        }
      }
      const rect = canvas.getBoundingClientRect();
      const cssWidth = Math.max(1, rect.width);
      const cssHeight = Math.max(1, rect.height);
      const frameMs = elapsed * 1000;
      if (now - lastScaleChange > 850 && now - startedAt > 900 && sampleCount >= 22) {
        const average = sampleSum / sampleCount;
        if (average > 19 && scale > 0.46) {
          scale = Math.max(0.46, scale - 0.055);
          lastScaleChange = now;
          sampleSum = 0; sampleCount = 0;
          setCanvasSize(true);
        } else if (average < 14.5 && scale < 1) {
          scale = Math.min(1, scale + 0.025);
          lastScaleChange = now;
          sampleSum = 0; sampleCount = 0;
          setCanvasSize(true);
        }
      }
      if (now - lastScaleChange > 400) { sampleSum += Math.min(80, frameMs); sampleCount++; }

      const width = canvas.width;
      const height = canvas.height;
      const simTime = (now - startedAt) / 1000;
      agitation *= Math.exp(-elapsed * 1.6);
      gl.useProgram(simulationProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, targetTexA);
      uniform1i(simulationUniforms.uTargetA, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, targetTexB);
      uniform1i(simulationUniforms.uTargetB, 1);
      uniform1i(simulationUniforms.uSimSize, edge);
      uniform1f(simulationUniforms.uBlend, blend);
      uniform1f(simulationUniforms.uTime, simTime);
      uniform1f(simulationUniforms.uDt, Math.min(1 / 30, elapsed));
      uniform1f(simulationUniforms.uSpring, parameters.spring);
      uniform1f(simulationUniforms.uDamping, parameters.damping);
      uniform1f(simulationUniforms.uCurl, parameters.turbulence * 0.34);
      uniform1f(simulationUniforms.uAgitation, agitation);
      uniform1f(simulationUniforms.uMotion, parameters.motion);
      uniform1f(simulationUniforms.uPointerOn, pointerOn);
      uniform2f(simulationUniforms.uPointer, pointer[0], pointer[1]);
      uniform1f(simulationUniforms.uRepel, parameters.repel);
      gl.bindVertexArray(simVao[simIndex]);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, simBuffers[1 - simIndex].positions);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, simBuffers[1 - simIndex].velocities);
      gl.enable(gl.RASTERIZER_DISCARD);
      gl.beginTransformFeedback(gl.POINTS);
      gl.drawArrays(gl.POINTS, 0, count);
      gl.endTransformFeedback();
      gl.disable(gl.RASTERIZER_DISCARD);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      simIndex = 1 - simIndex;
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(bgProgram);
      gl.bindVertexArray(bgVao);
      uniform2f(bgUniforms.uResolution, width, height);
      uniform1f(bgUniforms.uTime, (now - startedAt) / 1000);
      uniform3fv(bgUniforms.uBackground, hex(parameters.background));
      uniform1f(bgUniforms.uGlow, parameters.glow);
      uniform1f(bgUniforms.uGrain, parameters.grain);
      uniform1f(bgUniforms.uStars, parameters.stars);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      gl.useProgram(particleProgram);
      gl.bindVertexArray(simVao[simIndex]);
      const textures = [colorTexA, colorTexB];
      const names = ['uColorA', 'uColorB'];
      textures.forEach((texture, index) => {
        gl.activeTexture(gl.TEXTURE0 + index);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        uniform1i(pointUniforms[names[index]], index);
      });
      uniform1i(pointUniforms.uSimSize, edge);
      uniform1f(pointUniforms.uBlend, blend);
      uniform1f(pointUniforms.uTime, simTime);
      uniform1f(pointUniforms.uAspect, aspectNow);
      uniform1f(pointUniforms.uSize, parameters.size);
      uniform1f(pointUniforms.uImageMix, parameters.imageMix);
      uniform3fv(pointUniforms.uPaletteA, hex(parameters.palette[0]));
      uniform3fv(pointUniforms.uPaletteB, hex(parameters.palette[1]));
      uniform3fv(pointUniforms.uPaletteC, hex(parameters.palette[2]));
      uniform1f(pointUniforms.uResolutionY, height);
      uniform1f(pointUniforms.uCssHeight, cssHeight);
      uniform1f(pointUniforms.uTwinkle, parameters.twinkle);
      uniform1f(pointUniforms.uIntensity, parameters.intensity * Math.sqrt(16384 / count));
      uniform1f(pointUniforms.uGlow, parameters.glow);
      gl.drawArrays(gl.POINTS, 0, count);

      if (now - metricsTime > 650) {
        config.onMetrics?.({ fps: Math.round(1000 / Math.max(1, sampleSum / Math.max(1, sampleCount))), scale, count, frameMs });
        metricsTime = now;
      }
      raf = requestAnimationFrame(render);
    }

    const resizeObserver = new ResizeObserver(() => setCanvasSize(true));
    resizeObserver.observe(canvas);
    setCanvasSize(true);
    const onVisibility = () => {
      visible = document.visibilityState === 'visible';
      if (visible) {
        lastFrame = performance.now();
        raf = requestAnimationFrame(render);
      } else cancelAnimationFrame(raf);
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(render);
    return {
      count,
      setTarget,
      setParams,
      setPointer,
      getQuality: () => ({ scale, count }),
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        [targetTexA, targetTexB, colorTexA, colorTexB].forEach((t) => gl.deleteTexture(t));
        [bgVao, ...simVao].forEach((v) => gl.deleteVertexArray(v));
        simBuffers.forEach((buffers) => { gl.deleteBuffer(buffers.positions); gl.deleteBuffer(buffers.velocities); });
        gl.deleteTransformFeedback(transformFeedback);
        [bgProgram, simulationProgram, particleProgram].forEach((p) => gl.deleteProgram(p));
      },
    };
  }

  window.ParticleEngine = {
    create,
    buildTextTarget,
    buildImageTarget,
    buildPresetTarget,
    hexToRgb,
  };
})();
