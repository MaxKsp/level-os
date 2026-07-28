import { type ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

const VERTEX_SHADER = `
  attribute vec2 p;
  void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

// Mesmo fragment shader usado na autenticação web do Level OS.
const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform vec3 uAccent;

  const float overallSpeed = 0.18;
  const float gridSmoothWidth = 0.015;
  const float scale = 5.0;
  const float minLineWidth = 0.01;
  const float maxLineWidth = 0.2;
  const float lineSpeed = overallSpeed;
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

  float random(float t) {
    return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
  }

  float getPlasmaY(float x, float horizontalFade, float offset) {
    return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
  }

  void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = fragCoord / iResolution;
    vec2 space = (fragCoord - iResolution / 2.0) / iResolution.x * 2.0 * scale;
    float horizontalFade = 1.0 - (cos(uv.x * 6.28) * 0.5 + 0.5);
    float verticalFade = 1.0 - (cos(uv.y * 6.28) * 0.5 + 0.5);

    space.y += random(space.x * warpFrequency + iTime * warpSpeed)
      * warpAmplitude * (0.5 + horizontalFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0)
      * warpAmplitude * horizontalFade;

    vec4 lines = vec4(0.0);
    vec4 lineColor = vec4(uAccent, 1.0);
    for (int l = 0; l < linesPerGroup; l++) {
      float normalizedLineIndex = float(l) / float(linesPerGroup);
      float offsetTime = iTime * offsetSpeed;
      float offsetPosition = float(l) + space.x * offsetFrequency;
      float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
      float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
      float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex))
        * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
      float linePosition = getPlasmaY(space.x, horizontalFade, offset);
      float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0
        + drawCrispLine(linePosition, halfWidth * 0.15, space.y);
      float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
      vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
      line += drawCircle(circlePosition, 0.01, space) * 4.0;
      lines += line * lineColor * rand;
    }

    vec4 bgColor1 = vec4(0.020, 0.030, 0.045, 1.0);
    vec4 bgColor2 = vec4(uAccent * 0.10 + vec3(0.015, 0.035, 0.050), 1.0);
    vec4 fragColor = mix(bgColor1, bgColor2, uv.x);
    fragColor *= verticalFade;
    fragColor.a = 1.0;
    fragColor += lines * 0.85;
    gl_FragColor = fragColor;
  }
`;

function compileShader(
  gl: ExpoWebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LevelBackground() {
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => () => cleanupRef.current?.(), []);

  const createContext = useCallback((gl: ExpoWebGLRenderingContext) => {
    cleanupRef.current?.();

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    if (!vertex || !fragment || !program || !buffer) return;

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.useProgram(program);

    const position = gl.getAttribLocation(program, 'p');
    const resolution = gl.getUniformLocation(program, 'iResolution');
    const time = gl.getUniformLocation(program, 'iTime');
    const accent = gl.getUniformLocation(program, 'uAccent');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    let active = AppState.currentState === 'active';
    let disposed = false;
    let frameId = 0;
    let elapsed = 0;
    let previous: number | null = null;
    let previousDraw = 0;

    const draw = (now: number) => {
      if (disposed) return;
      // `requestAnimationFrame` entrega um DOMHighResTimeStamp relativo ao
      // processo. Misturá-lo com Date.now() (epoch) produz um primeiro delta
      // negativo gigantesco e faz o float do shader perder toda a precisão,
      // deixando o fundo aparentemente estático.
      const delta = previous === null
        ? 0
        : Math.max(0, Math.min((now - previous) / 1000, 0.08));
      previous = now;
      elapsed += delta * (reducedMotionRef.current ? 0.35 : 1);

      // 30 FPS mantém o shader idêntico sem desperdiçar bateria.
      if (active && now - previousDraw >= 1000 / 30) {
        previousDraw = now;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform2f(resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.uniform1f(time, elapsed);
        gl.uniform3f(accent, 49 / 255, 230 / 255, 212 / 255);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.flush();
        gl.endFrameEXP();
      }
      frameId = requestAnimationFrame(draw);
    };

    const appState = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      previous = null;
    });
    frameId = requestAnimationFrame(draw);

    cleanupRef.current = () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frameId);
      appState.remove();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.root}>
      <LinearGradient
        colors={['#05080B', '#06110F', '#071713']}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <GLView
        enableExperimentalWorkletSupport={false}
        msaaSamples={0}
        onContextCreate={createContext}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05080B',
    overflow: 'hidden',
  },
});
