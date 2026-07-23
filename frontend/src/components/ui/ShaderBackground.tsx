import { useEffect, useRef, useState, type CSSProperties } from "react"
import { cn } from "../../lib/cn"

interface ShaderBackgroundProps {
  className?: string
  /** Opacidade do canvas no app. O login usa uma presença visual mais forte. */
  opacity?: number
}

const AQUA: readonly [number, number, number] = [49 / 255, 230 / 255, 212 / 255]
const LIGHT_AQUA: readonly [number, number, number] = [8 / 255, 124 / 255, 114 / 255]

const VERTEX_SHADER = `
  attribute vec2 p;
  void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAGMENT_SHADER = `
  precision highp float;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform float uLightMode;
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

    space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;

    vec4 lines = vec4(0.0);
    vec4 lineColor = vec4(uAccent, 1.0);
    for (int l = 0; l < linesPerGroup; l++) {
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
      line += drawCircle(circlePosition, 0.01, space) * 4.0;
      lines += line * lineColor * rand;
    }

    float lineStrength = mix(0.14, 0.32, uLightMode);
    float alpha = clamp(lines.a * lineStrength * mix(verticalFade, 1.0, uLightMode * 0.35), 0.0, mix(0.20, 0.38, uLightMode));
    gl_FragColor = vec4(uAccent * alpha, alpha);
  }
`

export function ShaderBackground({ className, opacity = 0.28 }: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    })
    if (!gl) { setFallback(true); return }

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex)
      if (fragment) gl.deleteShader(fragment)
      if (program) gl.deleteProgram(program)
      setFallback(true)
      return
    }

    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.deleteProgram(program)
      setFallback(true)
      return
    }

    const buffer = gl.createBuffer()
    if (!buffer) {
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.deleteProgram(program)
      setFallback(true)
      return
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.useProgram(program)
    gl.clearColor(0, 0, 0, 0)
    const position = gl.getAttribLocation(program, "p")
    const resolution = gl.getUniformLocation(program, "iResolution")
    const time = gl.getUniformLocation(program, "iTime")
    const accent = gl.getUniformLocation(program, "uAccent")
    const lightMode = gl.getUniformLocation(program, "uLightMode")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const compactScreen = window.matchMedia("(max-width: 640px)")
    const lowPowerMobile = compactScreen.matches && (navigator.hardwareConcurrency || 4) <= 4
    const dpr = Math.min(window.devicePixelRatio || 1, lowPowerMobile ? 1 : 1.5)
    let reduce = reducedMotion.matches
    let pageVisible = !document.hidden
    let canvasVisible = true
    let raf = 0
    let elapsed = 0
    let previous = performance.now()

    const resize = () => {
      const width = Math.max(1, Math.floor(window.innerWidth * dpr))
      const height = Math.max(1, Math.floor(window.innerHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    const draw = () => {
      resize()
      gl.uniform2f(resolution, canvas.width, canvas.height)
      gl.uniform1f(time, elapsed)
      const isLight = document.documentElement.dataset.theme === "light"
      const color = isLight ? LIGHT_AQUA : AQUA
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform3f(accent, color[0], color[1], color[2])
      gl.uniform1f(lightMode, isLight ? 1 : 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const frame = (now: number) => {
      if (!pageVisible || !canvasVisible || lowPowerMobile) { stop(); return }
      const delta = Math.min((now - previous) / 1000, 0.08)
      previous = now
      elapsed += delta * (reduce ? 0.28 : 1)
      draw()
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (raf || !pageVisible || !canvasVisible || lowPowerMobile) return
      previous = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      pageVisible = !document.hidden
      if (pageVisible) { draw(); start() } else stop()
    }
    const onMotionChange = () => { reduce = reducedMotion.matches }
    const onResize = () => { draw() }
    const onContextLost = (event: Event) => { event.preventDefault(); stop(); setFallback(true) }

    const intersection = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      canvasVisible = entry?.isIntersecting ?? true
      if (canvasVisible) { draw(); start() } else stop()
    })
    intersection?.observe(canvas)

    const themeObserver = new MutationObserver(() => draw())
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("resize", onResize, { passive: true })
    canvas.addEventListener("webglcontextlost", onContextLost)
    reducedMotion.addEventListener("change", onMotionChange)

    draw()
    start()

    return () => {
      stop()
      intersection?.disconnect()
      themeObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("resize", onResize)
      canvas.removeEventListener("webglcontextlost", onContextLost)
      reducedMotion.removeEventListener("change", onMotionChange)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("level-shader-background", fallback && "level-shader-background--fallback", className)}
      style={{ "--level-shader-opacity": Math.min(0.3, Math.max(0.18, opacity)) } as CSSProperties}
    />
  )
}
