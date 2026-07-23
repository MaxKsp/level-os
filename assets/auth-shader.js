/**
 * Fundo animado (WebGL) das telas de autenticacao do Level OS.
 * - Cor fixa na identidade aqua #31E6D4.
 * - Respeita prefers-reduced-motion (movimento mais lento) e ausencia de WebGL
 *   (CSS de fundo assume). Pausa quando a aba fica oculta (data-page-hidden).
 * - DPR limitado para custo baixo em mobile.
 */
(() => {
  const canvas = document.getElementById('auth-shader');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false });
  if (!gl) return; // sem WebGL: o gradiente do CSS assume

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

  const fs = `
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec3 uAccent;

    const float overallSpeed = 0.18;
    const float gridSmoothWidth = 0.015;
    const float scale = 5.0;
    const float minLineWidth = 0.01;
    const float maxLineWidth = 0.2;
    const float lineSpeed = 1.0 * overallSpeed;
    const float lineAmplitude = 1.0;
    const float lineFrequency = 0.2;
    const float warpSpeed = 0.2 * overallSpeed;
    const float warpFrequency = 0.5;
    const float warpAmplitude = 1.0;
    const float offsetFrequency = 0.5;
    const float offsetSpeed = 1.33 * overallSpeed;
    const float minOffsetSpread = 0.6;
    const float maxOffsetSpread = 2.0;
    const int linesPerGroup = 16;

    #define drawCircle(pos, radius, coord) smoothstep(radius + gridSmoothWidth, radius, length(coord - (pos)))
    #define drawSmoothLine(pos, halfWidth, t) smoothstep(halfWidth, 0.0, abs(pos - (t)))
    #define drawCrispLine(pos, halfWidth, t) smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - (t)))

    float random(float t){ return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0; }
    float getPlasmaY(float x, float horizontalFade, float offset){
      return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
    }

    void main(){
      vec2 fragCoord = gl_FragCoord.xy;
      vec2 uv = fragCoord.xy / iResolution.xy;
      vec2 space = (fragCoord - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;

      float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
      float verticalFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

      space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
      space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

      vec4 lines = vec4(0.0);
      vec4 lineColor = vec4(uAccent, 1.0);

      for(int l = 0; l < linesPerGroup; l++){
        float normalizedLineIndex = float(l) / float(linesPerGroup);
        float offsetTime = iTime * offsetSpeed;
        float offsetPosition = float(l) + space.x * offsetFrequency;
        float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
        float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
        float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
        float linePosition = getPlasmaY(space.x, horizontalFade, offset);
        float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);

        float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
        vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
        float circle = drawCircle(circlePosition, 0.01, space) * 4.0;

        line = line + circle;
        lines += line * lineColor * rand;
      }

      // Fundo OLED profundo, com leve tinta do accent na horizontal.
      vec4 bgColor1 = vec4(0.020, 0.030, 0.045, 1.0);
      vec4 bgColor2 = vec4(uAccent * 0.10 + vec3(0.015, 0.035, 0.050), 1.0);
      vec4 fragColor = mix(bgColor1, bgColor2, uv.x);
      fragColor *= verticalFade;
      fragColor.a = 1.0;
      fragColor += lines * 0.85;
      gl_FragColor = fragColor;
    }
  `;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  };
  const vShader = compile(gl.VERTEX_SHADER, vs);
  const fShader = compile(gl.FRAGMENT_SHADER, fs);
  if (!vShader || !fShader) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vShader);
  gl.attachShader(prog, fShader);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const loc = {
    p: gl.getAttribLocation(prog, 'p'),
    res: gl.getUniformLocation(prog, 'iResolution'),
    time: gl.getUniformLocation(prog, 'iTime'),
    accent: gl.getUniformLocation(prog, 'uAccent'),
  };

  const accent = [49 / 255, 230 / 255, 212 / 255];

  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  function resize() {
    const w = Math.floor(window.innerWidth * DPR);
    const h = Math.floor(window.innerHeight * DPR);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(loc.p);
  gl.vertexAttribPointer(loc.p, 2, gl.FLOAT, false, 0, 0);

  function draw(t) {
    gl.uniform2f(loc.res, canvas.width, canvas.height);
    gl.uniform1f(loc.time, t);
    gl.uniform3f(loc.accent, accent[0], accent[1], accent[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Fundo decorativo: anima sempre. Sob prefers-reduced-motion, roda mais
  // devagar/suave em vez de congelar (movimento minimo, sem paradas bruscas).
  const speed = reduce ? 0.35 : 1.0;
  const start = Date.now();
  let raf = 0;
  function loop() {
    if (document.documentElement.hasAttribute('data-page-hidden')) { raf = requestAnimationFrame(loop); return; }
    draw(((Date.now() - start) / 1000) * speed);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
})();
