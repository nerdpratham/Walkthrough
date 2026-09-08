'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * TourEnterTransition — a colourful wavy sheet that plays when the user starts
 * the tour. It sweeps up to fully cover the screen (onCover fires here, so the
 * parent can swap the start screen for the tour behind the opaque sheet), then
 * sweeps off the top to reveal the tour (onComplete fires at the end).
 *
 * Pure WebGL fragment shader on a transparent canvas — no Three.js. Purely a
 * visual layer: it owns no tour state and just calls back at the two moments.
 */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_resolution;
uniform float u_time;
uniform float u_progress; // 0..1 timeline
uniform float u_amp;      // wave amplitude (0 for reduced motion)
uniform float u_opacity;  // overall sheet opacity
uniform vec3  u_accent;   // page accent colour; the ramp is built from it

// Colour ramp built entirely from the page accent: deep navy tint -> accent ->
// light tint. Keeps the sheet on-brand (shades of the start screen) not rainbow.
vec3 themeRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 a = u_accent;
  vec3 deep  = a * 0.10;               // near-black tint of the accent
  vec3 dark  = a * 0.42;               // deep indigo
  vec3 light = mix(a, vec3(1.0), 0.62); // pale highlight tint
  vec3 col = deep;
  col = mix(col, dark,  smoothstep(0.0,  0.40, t));
  col = mix(col, a,     smoothstep(0.40, 0.72, t));
  col = mix(col, light, smoothstep(0.72, 1.0,  t));
  return col;
}

// Water surface height: interfering directional wavelets (churns like liquid).
float waterH(vec2 c, float t) {
  vec2 sp = c * 6.0;
  float h  = sin(sp.x * 1.00 + t * 1.30);
  h += sin(sp.y * 0.90 - t * 1.10) * 0.9;
  h += sin((sp.x + sp.y) * 0.80 + t * 1.70) * 0.8;
  h += sin((sp.x - sp.y) * 1.20 - t * 1.50) * 0.6;
  return h;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 c = (uv - 0.5) * vec2(aspect, 1.0);

  // Sweep coordinate: 0 at top-left, 1 at bottom-right (diagonal wave axis).
  float s = (uv.x + (1.0 - uv.y)) * 0.5;

  // Timeline: wash-in (soft cover over the start screen) -> hold (fully covered,
  // static; the tour boots here so its stall is hidden) -> reveal (a single wavy
  // front sweeps diagonally across, turning the sheet transparent to uncover it).
  float coverEnd = 0.18;
  float holdEnd  = 0.40;
  float over = 1.25;
  float coverFade   = smoothstep(0.0, coverEnd, u_progress);
  float revealFront = clamp((u_progress - holdEnd) / (1.0 - holdEnd), 0.0, 1.0) * over;

  float m = clamp(u_amp / 0.045, 0.0, 1.0);          // 0 under reduced-motion

  // Early-out for pixels already fully uncovered (well behind the wavefront).
  if (s < revealFront - 0.22) { gl_FragColor = vec4(0.0); return; }

  // ---- water surface: height + normal (from finite-difference slopes) ----
  float e = 0.0035;
  float h  = waterH(c, u_time) * m;
  float hx = (waterH(c + vec2(e, 0.0), u_time) - waterH(c - vec2(e, 0.0), u_time)) * m;
  float hy = (waterH(c + vec2(0.0, e), u_time) - waterH(c - vec2(0.0, e), u_time)) * m;
  vec3 n = normalize(vec3(-hx, -hy, e * 6.0));

  // Refraction: the surface tilt bends the colour lookup so the shades wobble.
  vec2 ruv = uv + n.xy * 0.12;
  float pat = 0.46 + 0.30 * h + 0.16 * sin((ruv.x + ruv.y) * 4.0 - u_time * 0.5);
  vec3 col = themeRamp(pat);

  // Caustics: pale-accent veins where the wavy surface focuses light.
  vec3 lightShade = mix(u_accent, vec3(1.0), 0.7);
  float caustic = pow(clamp(dot(n, normalize(vec3(0.35, 0.45, 1.0))), 0.0, 1.0), 26.0);
  col += caustic * lightShade * 0.30 * m;
  col *= 0.94 + 0.08 * h;

  // ---- single diagonal wavefront, rippled by the surface ----
  float perp = uv.x - (1.0 - uv.y);   // runs along the crest
  float waveEdge = (0.5 * sin(perp * 7.0 + u_time * 1.3)) * u_amp + h * u_amp * 0.5;
  float front = revealFront + waveEdge;
  float ee = 0.06;
  float covered = smoothstep(front - ee, front + ee, s);  // 1 ahead (colour), 0 behind (revealed)
  float a = coverFade * covered;

  // Bright crest riding just ahead of the wavefront.
  float crest = 1.0 - smoothstep(0.0, 0.11, abs(s - front - 0.05));
  col += crest * covered * lightShade * 0.45 * m;

  gl_FragColor = vec4(col, a * u_opacity);
}
`;

interface TourEnterTransitionProps {
  /** Fires once the sheet fully covers the screen — swap in the tour here. */
  onCover: () => void;
  /** Fires when the sheet has swept off and the tour is revealed. */
  onComplete: () => void;
  /** Total duration in ms. */
  duration?: number;
  /** Overall sheet opacity (0..1). */
  opacity?: number;
  /** Accent colour (hex) the water shades are derived from. */
  accent?: string;
}

// Parse "#7c83fd" (or "#78f") to linear-ish [r,g,b] in 0..1. Falls back on any
// unparseable value to the app's default periwinkle accent.
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return [0.486, 0.514, 0.992];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('TourEnterTransition shader error:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function TourEnterTransition({ onCover, onComplete, duration = 1500, opacity = 1, accent = '#7c83fd' }: TourEnterTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep latest callbacks without restarting the animation effect.
  const onCoverRef = useRef(onCover);
  const onCompleteRef = useRef(onComplete);
  useLayoutEffect(() => {
    onCoverRef.current = onCover;
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
    if (!gl) {
      // No WebGL — degrade gracefully: swap immediately, finish shortly after.
      onCoverRef.current();
      const id = setTimeout(() => onCompleteRef.current(), 200);
      return () => clearTimeout(id);
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { onCoverRef.current(); onCompleteRef.current(); return; }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('TourEnterTransition link error:', gl.getProgramInfoLog(prog));
      onCoverRef.current(); onCompleteRef.current();
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uProgress = gl.getUniformLocation(prog, 'u_progress');
    const uAmp = gl.getUniformLocation(prog, 'u_amp');
    const uOpacity = gl.getUniformLocation(prog, 'u_opacity');
    const uAccent = gl.getUniformLocation(prog, 'u_accent');
    const [ar, ag, ab] = hexToRgb(accent);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // opaque sheet over content

    const resize = () => {
      const scale = 0.7; // below native — the water blur hides it

      const w = Math.max(1, Math.floor(canvas.clientWidth * scale));
      const h = Math.max(1, Math.floor(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let raf = 0;
    let covered = false;
    let done = false;
    const start = performance.now();

    const render = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed / 1000);
      gl.uniform1f(uProgress, progress);
      gl.uniform1f(uAmp, reduceMotion ? 0 : 0.045);
      gl.uniform1f(uOpacity, opacity);
      gl.uniform3f(uAccent, ar, ag, ab);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Fire once the wash-in fully covers the screen (start of the hold), so the
      // tour boots behind the static cover — well before the reveal sweep begins.
      if (!covered && progress >= 0.18) { covered = true; onCoverRef.current(); }
      if (progress >= 1) {
        if (!done) { done = true; onCompleteRef.current(); }
        return;
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [duration, opacity, accent]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 z-60 h-full w-full"
    />
  );
}
