#!/usr/bin/env node
// Bakes the painted Milky Way disc once, to out/santi-galaxy/milkyway.jpg (gl-galaxy.js maps it onto the disc).
// The shader is Galaxy Explorer's (index.html, buildPaintedGalaxy: brush strands smeared along the spiral flow, dark
// lanes on each arm's inner edge, pink star-forming specks, a cream-gold core); the app bakes it on the GPU at load,
// but the film renders in software GL, where this takes a minute, so it is done here, once.
//
//   node films/2026-10-santi-dark-forest/bake-galaxy.mjs [--force]
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'out/santi-galaxy/milkyway.jpg', N = 4096, TILES = 16;
if (fs.existsSync(OUT) && !process.argv.includes('--force')) process.exit(0);
fs.mkdirSync('out/santi-galaxy', { recursive: true });

const FRAG = `#version 300 es
precision highp float;
uniform float uR, uArms, uTight, uSpan; uniform vec2 uSize; out vec4 o;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 5; k++){ v += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }
vec2 flowDir(vec2 p){ float r = max(length(p), 2.0); vec2 er = p / r; vec2 et = vec2(-er.y, er.x); float c = uTight * 6.28318 / uR;
  vec2 d = normalize(er + et * r * c); float sw = (fbm(p * 0.012 + 3.0) - 0.5) * 1.1;
  float cs = cos(sw), sn = sin(sw); return vec2(d.x * cs - d.y * sn, d.x * sn + d.y * cs); }
float lic(vec2 p, float freq, float len){ float s = 0.0, w = 0.0; vec2 q = p; vec2 o = vec2(13.1, 7.7);
  for (int i = 0; i < 14; i++){ float t = float(i) / 14.0; float wt = 1.0 - t; s += noise(q * freq + o) * wt; w += wt; q += flowDir(q) * (len / 14.0); }
  q = p; for (int i = 0; i < 14; i++){ q -= flowDir(q) * (len / 14.0); float t = float(i + 1) / 14.0; float wt = 1.0 - t; s += noise(q * freq + o) * wt; w += wt; }
  return s / w; }
void main(){
  vec2 vP = (gl_FragCoord.xy / uSize - 0.5) * uSpan;
  const float uBright = 1.0, uInter = 0.32, uLane = 0.95, uHii = 1.0;
  float r = length(vP), nr = r / uR, ang = atan(vP.y, vP.x);
  float edgeN = fbm(vP * 0.008 + 21.0);
  float env = smoothstep(1.12, 0.62, nr + (edgeN - 0.5) * 0.22);
  if (env <= 0.0 && nr > 0.3) { o = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec2 wp = vP * 0.011; float w1 = fbm(wp), w2 = fbm(wp + 4.3);
  float theta = ang + (w1 - 0.5) * 0.55 - nr * uTight * 6.28318;
  float armId = mod(floor(theta * uArms / 6.28318 + 0.5), uArms); float major = 1.0 - step(0.5, mod(armId, 2.0));
  float arm = pow(max(0.0, cos(uArms * theta) * 0.5 + 0.5), 2.2) * mix(0.62, 1.0, major);
  float lane = pow(max(0.0, cos(uArms * (theta - 0.12 + (w2 - 0.5) * 0.16)) * 0.5 + 0.5), 7.0) * mix(0.7, 1.0, major);
  float fine = lic(vP, 1.25, 7.0), coarse = lic(vP, 0.22, 34.0), hair = lic(vP, 2.6, 4.5);
  float strands = clamp((fine - 0.5) * 3.4 + 0.5, 0.0, 1.0) * 0.5 + clamp((coarse - 0.5) * 2.6 + 0.5, 0.0, 1.0) * 0.45 + clamp((hair - 0.5) * 3.0 + 0.5, 0.0, 1.0) * 0.35;
  float dens = env * (uInter + (1.0 - uInter) * arm) * (0.12 + 1.15 * strands * strands);
  dens *= 0.55 + 0.6 * fbm(vP * 0.03 + vec2(w1, w2) * 3.0);
  float absorb = lane * smoothstep(0.07, 0.24, nr) * smoothstep(1.0, 0.7, nr) * (0.45 + 0.75 * clamp((coarse - 0.35) * 2.5, 0.0, 1.0)) * (0.55 + 0.75 * fbm(vP * 0.045 + 9.0));
  dens *= 1.0 - uLane * clamp(absorb * 1.5, 0.0, 1.0);
  float patchy = fbm(vP * 0.006 + 40.0);
  vec3 col = mix(vec3(1.0, 0.74, 0.66), vec3(0.60, 0.60, 1.0), smoothstep(0.1, 0.4, nr));
  col = mix(col, vec3(0.26, 0.44, 1.0), smoothstep(0.32, 0.85, nr + (patchy - 0.5) * 0.5));
  col = mix(col, vec3(0.72, 0.44, 0.98), smoothstep(0.58, 0.78, patchy) * 0.4 * smoothstep(0.15, 0.4, nr));
  col = mix(col * vec3(0.92, 0.72, 1.05), col * vec3(0.95, 1.0, 1.06) + 0.05, arm);
  col += (coarse - 0.5) * vec3(0.10, 0.04, 0.14);
  float kn = smoothstep(0.62, 0.8, noise(vP * 0.55 + 31.0) * 0.55 + noise(vP * 1.6 + 5.0) * 0.45) * (0.35 + 0.65 * arm) * smoothstep(0.16, 0.34, nr) * env * (0.4 + 0.8 * smoothstep(0.4, 0.7, fbm(vP * 0.02 + 70.0)));
  col = mix(col, vec3(1.0, 0.26, 0.42), clamp(kn * 1.8, 0.0, 1.0) * uHii);
  dens += kn * uHii * (1.0 - uLane * clamp(absorb, 0.0, 1.0));
  float core = exp(-pow(nr / 0.19, 1.4));
  col = mix(col, vec3(1.0, 0.80, 0.52), clamp(core * 1.3, 0.0, 1.0));
  float inten = dens * uBright * 0.62 + core * (0.25 + 0.75 * strands) * uBright * 0.85;
  o = vec4(col * inten, 1.0);
}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const t0 = Date.now();
const url = await page.evaluate(async ([FRAG, N, TILES]) => {
  const c = Object.assign(document.createElement('canvas'), { width: N, height: N });
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){ vec2 v = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 4.0 - 1.0; gl_Position = vec4(v, 0.0, 1.0); }'));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(p); gl.useProgram(p);
  const R = 360;                                       // DUST.radius; the disc spans 2.5 R, as in the app
  for (const [k, v] of [['uR', R], ['uArms', 4], ['uTight', 0.85], ['uSpan', R * 2.5]]) gl.uniform1f(gl.getUniformLocation(p, k), v);
  gl.uniform2f(gl.getUniformLocation(p, 'uSize'), N, N);
  gl.viewport(0, 0, N, N); gl.enable(gl.SCISSOR_TEST);
  const n = N / TILES;                                 // a tile at a time: one long draw stalls software GL
  for (let i = 0; i < TILES * TILES; i++) { gl.scissor((i % TILES) * n, Math.floor(i / TILES) * n, n, n); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.finish(); }
  return c.toDataURL('image/jpeg', 0.93);
}, [FRAG, N, TILES]);
fs.writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64'));
console.log(`${OUT}: ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await browser.close();
