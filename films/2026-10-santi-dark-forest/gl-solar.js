// The Solar System and its fall into two dimensions, in 3D, laid out as the novel tells it: the foil comes in from the
// side opposite Pluto and touches down just beyond Neptune; a disc of two-dimensional space spreads from there across
// the ecliptic. Each body sits on its (compressed) orbit at the distance from the touchdown that the disc's edge reaches
// on its cue, so Neptune falls first, the Sun at 1:57, Earth (beyond the Sun) at 2:03, and Pluto, the farthest from the
// foil, last. A falling body stays rigid and sinks through the plane; what has passed through lies in it, unrolled into a
// ring (south pole innermost), a dark ground in the body's own colours engraved with lines as fine as the eye can take.
const SOL = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 6000);
  scene.add(GL.stars(17, 7000, 3000), MILKY.sky(0.6, [0.775, -0.371, 0.509], 0.5, 1.9, 4000));
  const keyed = (t, keys, shape = x => x) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
      const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = shape((t - t0) / (t1 - t0));
      return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
    }
    return keys.at(-1)[1];
  };
  const ORB = au => (au ? 12 * Math.pow(au, 0.55) : 0);   // compressed orbits: Earth at 12, Neptune at 78, Pluto at 91
  const RI = 84, PHI = Math.PI * 0.85;                    // the touchdown, just beyond Neptune
  const IMP = new THREE.Vector3(RI * Math.cos(PHI), 0, RI * Math.sin(PHI));
  const PLUTO_HIT = CUE.pluto ?? SC.escape + 17;
  const RHO = [[SC.fall, 0], [CUE.planets[0], 8], [CUE.planets[1], 30], [CUE.planets[2], 48], [CUE.planets[3], 62],
               [CUE.sun, RI], [CUE.earth, 95], [PLUTO_HIT, RI + ORB(39.48)], [DURATION + 5, 270]];
  const rhoAt = t => keyed(t, RHO);
  const hitOf = d => { for (let i = 1; i < RHO.length; i++) if (d <= RHO[i][1]) return lerp(RHO[i - 1][0], RHO[i][0], (d - RHO[i - 1][1]) / (RHO[i][1] - RHO[i - 1][1])); return Infinity; };
  const HN0 = SC.fall + 2.8, HN1 = CUE.planets[1] - 1.7;   // the Neptune shot, edge-on
  const C = h => new THREE.Color(h);
  const LAYERS = {                                       // interior, centre out: core, middle, outer, crust; edges as fractions of the inner disc
    rock: [C('#fff0b8'), C('#ffad48'), C('#b23a24'), C('#6e4a34'), [0.26, 0.5, 0.94]],
    gas: [C('#e8dcc0'), C('#7c8aa6'), C('#c7a06e'), C('#e2c99a'), [0.18, 0.55, 0.96]],
    ice: [C('#c8b8a0'), C('#2a8fae'), C('#5aa6e6'), C('#9fd0f0'), [0.22, 0.6, 0.96]],
    sun: [C('#ffffff'), C('#ffe39a'), C('#ff9a3a'), C('#ffcf70'), [0.25, 0.7, 0.97]],
    dwarf: [C('#8f7c6a'), C('#bccbd8'), C('#d8b89a'), C('#c9a88a'), [0.4, 0.8, 0.96]],
  };
  const DEF = [                                          // d: distance from the touchdown; side: which way round its orbit; atmo: its rim of air
    { id: 'neptune', zh: '海王星', au: 30.07, R: 1.25, d: 8, side: 1, kind: 'ice', spin: 0.25, atmo: 0x4f7cff, contrast: 2.6 },
    { id: 'uranus', zh: '天王星', au: 19.19, R: 1.3, d: 30, side: -1, kind: 'ice', spin: 0.22, atmo: 0x8fe0f0, contrast: 1.7 },
    { id: 'saturn', zh: '土星', au: 9.54, R: 1.9, d: 48, side: 1, kind: 'gas', spin: 0.3, ring: true, atmo: 0x6a5a3a },
    { id: 'jupiter', zh: '木星', au: 5.2, R: 2.2, d: 62, side: -1, kind: 'gas', spin: 0.32, atmo: 0x6a5038 },
    { id: 'mars', au: 1.52, R: 0.5, d: 74, side: 1, kind: 'rock', spin: 0.15, atmo: 0x5a2a1a },
    { id: 'venus', au: 0.72, R: 0.72, d: 78, side: -1, kind: 'rock', spin: 0.02, atmo: 0x8a7a50 },
    { id: 'sun', zh: '太阳', au: 0, R: 4, d: RI, kind: 'sun', spin: 0.02, sun: true, atmo: 0x000000 },
    { id: 'mercury', au: 0.39, R: 0.38, d: 88, side: 1, kind: 'rock', spin: 0.03, atmo: 0x000000 },
    { id: 'earth', zh: '地球', au: 1, R: 0.75, d: 95, side: -1, kind: 'rock', spin: 0.12, atmo: 0x5f9cff },
    { id: 'pluto', zh: '冥王星', au: 39.48, R: 0.5, d: RI + ORB(39.48), kind: 'dwarf', spin: 0.05, far: true, atmo: 0x3a4250, fill: 0.85 },
  ];
  const sinkOf = f => 1 - 2.2 * f;                       // the centre's height above the plane, in radii, as it falls
  const VERT = `uniform float uF, uSpread, uR, uSpin;
    varying vec2 vUv; varying vec3 vN, vW; varying float vK, vTh, vLon, vRn;
    void main(){
      vec3 n = normalize(position);
      float th = (1.0 - uv.y) * 3.14159265, lon = 3.14159265 - uv.x * 6.2831853;   // latitude and longitude from the uv, exact at the poles
      float rn = clamp(0.42 + 0.58 * (1.0 - th / 3.14159265), 0.4245, 0.9955);   // the south pole goes in first, innermost; the north pole last, at the rim
                                                                                 // (each pole row sits on its neighbour's circle: clean edges, no teeth)
      float c = uR * (1.0 - 2.2 * uF);                                           // the centre, sinking through the plane
      float inP = 1.0 - step(-0.001 * uR, c + position.y);                       // passed through: in the plane, unrolled
      vec3 p = mix(vec3(position.x, c + position.y, position.z), vec3(cos(lon), 0.0, sin(lon)) * rn * uR * uSpread, inP);
      vK = inP; vTh = th / 3.14159265; vLon = lon; vRn = rn; vUv = vec2(uv.x + uSpin, uv.y); vN = n;
      vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FINE = `float fine(float v){ float w = fwidth(v); float d = abs(fract(v - 0.5) - 0.5) / max(w, 1e-5); return (1.0 - min(d, 1.0)) * (1.0 - smoothstep(0.08, 0.3, w)); }`;   // a 1 px line, gone before lines come closer than ~3 px
  const FRAG = `uniform sampler2D uMap, uText; uniform float uGain, uSun, uTime, uAlpha, uHasText, uContrast, uFill; uniform vec3 uAtmo, uLdir;
    varying vec2 vUv; varying vec3 vN, vW; varying float vK, vTh, vLon, vRn;
    ${FINE}
    void main(){
      if (vK > 0.01 && vK < 0.99) discard;                                     // the waterline: the sphere above, its image below, nothing between
      vec3 tex = texture2D(uMap, vUv).rgb, V = normalize(cameraPosition - vW), mid = textureLod(uMap, vec2(0.5), 12.0).rgb;
      tex = clamp(mid + (tex - mid) * uContrast, 0.0, 1.0);                 // Neptune's faint bands, brought out
      tex = mix(tex, mid, smoothstep(0.035, 0.0, min(vTh, 1.0 - vTh)));    // no pinch at the poles
      vec3 c; float a = uAlpha;
      if (vK < 0.5) {                                                          // still round: lit by the Sun, a rim of air
        float nv = max(0.0, dot(vN, V));
        float lit = uSun > 0.5 ? 0.78 + 0.22 * nv : uFill > 0.5 ? 0.03 + 1.1 * max(0.0, dot(vN, uLdir)) : 0.06 + 0.94 * max(0.0, dot(vN, normalize(-vW)));   // Pluto: one distant light, a terminator
        c = tex * uGain * lit + uAtmo * pow(1.0 - nv, 2.2) * 1.6;
        if (uSun > 0.5) c = 1.0 - exp(-c * 1.3);
      } else {                                                                 // in the painting
        float r = vRn, an = vLon;
        float L = fine(r * 70.0 + 0.5 * sin(an * 18.0 + r * 25.0)) * 0.7 + fine(r * 150.0 - 0.4 * sin(an * 30.0 - r * 40.0)) * 0.45 + fine(r * 600.0 + 0.2 * sin(an * 90.0)) * 0.25;   // guilloche: two crossing wave families, and finer under them
        vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + r * 3.0 + abs(V.y) * 0.8 - uTime * 0.03));
        c = tex * uGain * (0.3 + 1.0 * L) + film * L * 0.1;
        float aa = fwidth(r);
        a *= smoothstep(0.9955, 0.9955 - 1.5 * aa, r);                         // an anti-aliased rim
        c += vec3(1.0, 0.95, 0.86) * 0.35 * (1.0 - min(abs(r - 0.9955 + 2.0 * aa) / aa, 1.0));   // a 1 px line at the rim, faint
        a *= smoothstep(0.4245, 0.4245 + 1.5 * aa, r);                         // and a clean inner edge
        c = 1.0 - exp(-c * 1.2);                                               // highlights roll off: the painting never burns white
      }
      if (uHasText > 0.5) {                                                    // Pluto: the tablets' words, kept in its image, in light
        vec2 q = vec2((vLon + 2.2) / 4.4, (vRn - 0.6) / 0.27);
        if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) { float w = texture2D(uText, vec2(1.0 - q.x, 1.0 - q.y)).a; c = mix(c, vec3(1.0, 0.9, 0.72), w * vK); }   // only once it lies in the plane
      }
      gl_FragColor = vec4(c, a);
    }`;
  const INNER = `uniform vec3 uC0, uC1, uC2, uC3, uE; uniform float uA;
    varying vec2 vP;
    ${FINE}
    void main(){
      float r = length(vP);
      vec3 c = r < uE.x ? mix(uC0 * 1.15, uC0, r / uE.x) : r < uE.y ? mix(uC1 * 1.1, uC1, (r - uE.x) / (uE.y - uE.x)) : r < uE.z ? mix(uC2, uC3, (r - uE.y) / (uE.z - uE.y)) : uC3;
      float L = (fine(r * 90.0 + 0.4 * sin(atan(vP.y, vP.x) * 12.0 + r * 20.0)) * 0.55 + fine(r * 360.0) * 0.3) * smoothstep(0.06, 0.2, r);   // no starburst at the centre
      float bound = (1.0 - min(abs(r - uE.x) / fwidth(r), 1.0)) + (1.0 - min(abs(r - uE.y) / fwidth(r), 1.0)) + (1.0 - min(abs(r - uE.z) / fwidth(r), 1.0));
      vec3 o = 1.0 - exp(-(c * (0.22 + 1.1 * L) + bound * 0.5) * 1.2);
      gl_FragColor = vec4(o, uA * smoothstep(1.0, 1.0 - 2.0 * fwidth(r), r));
    }`;
  const flatVert = 'varying vec2 vP; varying vec3 vW; void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const toPlane = m => { m.rotation.x = -Math.PI / 2; return m; };
  const additive = (color, opacity = 0) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const WORDS = GL.canvasTex(8192, 640, (g, w, h) => HUMANITY.forEach(([s, font], i) => {   // one slot per word, each word fitted to its slot
    const slot = w / HUMANITY.length; g.font = `100px ${font}`; const size = Math.min(260, 100 * slot * 0.78 / g.measureText(s).width);
    carve(g, s, font, (i + 0.5) * slot, h / 2, size);
  }));
  const alpha = Math.atan2(IMP.z, IMP.x);
  const bodies = DEF.map((d, i) => {
    const r = ORB(d.au), th = d.far ? PHI + Math.PI : d.sun ? 0 : alpha + d.side * Math.acos(clamp((r * r + RI * RI - d.d * d.d) / (2 * r * RI), -1, 1));
    const pos = new THREE.Vector3(r * Math.cos(th), 0, r * Math.sin(th)), hit = hitOf(d.d);
    const spread = d.sun ? 14 : d.id === 'earth' ? 14 : d.far ? 18 : 10;
    const uni = { uMap: { value: GL.tex(GE + `images/solar-system/${d.id}.jpg`) }, uF: { value: 0 }, uSpread: { value: spread }, uR: { value: d.R },
      uSpin: { value: 0 }, uGain: { value: d.sun ? 1.6 : 1.05 }, uSun: { value: d.sun ? 1 : 0 }, uTime: { value: 0 }, uAlpha: { value: 1 }, uAtmo: { value: new THREE.Color(d.atmo) }, uContrast: { value: d.contrast ?? 1 }, uFill: { value: d.fill ? 1 : 0 }, uLdir: { value: new THREE.Vector3(0, 1, 0) },
      uText: { value: d.far ? WORDS : null }, uHasText: { value: d.far ? 1 : 0 } };
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.R, 256, 128), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, transparent: true, side: THREE.DoubleSide, extensions: { derivatives: true } }));   // double-sided: unrolled south pole in, the triangles face down
    mesh.position.copy(pos).setY(0.004 * i); mesh.renderOrder = 10 + i;      // later falls lie on top of earlier ones
    mesh.frustumCulled = false;                          // unrolled, it reaches far past the sphere's bounds
    const L = LAYERS[d.kind];
    const inner = toPlane(new THREE.Mesh(new THREE.CircleGeometry(1, 160), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, extensions: { derivatives: true },
      uniforms: { uC0: { value: L[0] }, uC1: { value: L[1] }, uC2: { value: L[2] }, uC3: { value: L[3] }, uE: { value: new THREE.Vector3(...L[4]) }, uA: { value: 0 } },
      vertexShader: flatVert, fragmentShader: INNER })));
    inner.position.copy(pos).setY(0.004 * i - 0.001); inner.scale.setScalar(d.R * spread * 0.42); inner.renderOrder = 10 + i;
    const ripple = toPlane(new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 256), additive(d.sun ? 0xffe2b0 : 0xcfe6ff)));   // the edge reaching it: a ring running out across the plane
    ripple.position.copy(pos).setY(0.02);
    scene.add(mesh, inner, ripple);
    const b = { ...d, pos, hit, spread, mesh, inner, uni, ripple, cy: d.R };
    if (d.sun) {
      b.glows = [[0xfffdf6, 2.1, 0.3], [0xfff3da, 3.4, 0.22], [0xffcf78, 5, 0.16], [0xff9b3f, 6.8, 0.07]].map(([c, s, o]) => { const g = GL.glowSprite(c, d.R * s, o); g.userData.o = o; scene.add(g); return g; });
      b.corona = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 1 }, uT: { value: 0 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float uA, uT; varying vec2 vP;
          void main(){                                   // streamers: fine rays of different lengths, slowly turning
            float r = length(vP) * 2.0, a = atan(vP.y, vP.x);
            float rays = 0.45 + 0.35 * sin(a * 13.0 + 1.7 * sin(a * 5.0 + uT * 0.05)) + 0.2 * sin(a * 37.0 - uT * 0.03);
            float k = smoothstep(0.13, 0.16, r) * exp(-(r - 0.15) / (0.05 + 0.1 * rays * rays));
            gl_FragColor = vec4(vec3(1.0, 0.86, 0.62) * k * 0.7 * uA, 1.0);
          }` }));
      b.corona.scale.setScalar(d.R * 14); scene.add(b.corona);
    }
    if (d.ring) {                                        // Saturn's rings: the Cassini scan, tilted; they lie down and spread as it falls
      const ringTex = GL.tex(GE + 'images/solar-system/saturn-rings.png');
      b.ring = new THREE.Mesh(new THREE.RingGeometry(d.R * 1.2, d.R * 2.4, 192, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uMap: { value: ringTex }, uA: { value: 0.92 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform sampler2D uMap; uniform float uA; varying vec2 vUv; void main(){ vec4 c = texture2D(uMap, vUv); gl_FragColor = vec4(c.rgb * 1.1, c.a * uA); }' }));
      b.ring.position.copy(pos); scene.add(b.ring);
    }
    return b;
  });
  const BY = Object.fromEntries(bodies.map(b => [b.id, b]));
  const PLANE = `uniform vec3 uImp; uniform float uRho;`;      // shared by the belts and the orbits: inside the 2D region or not
  function belt(n, a0, a1, thick, seed, rgb) {          // the asteroid belt and the Kuiper belt: dust that falls flat with the rest
    const r = rng(seed), pos = new Float32Array(n * 3), sz = new Float32Array(n);
    for (let i = 0; i < n; i++) { const rr = lerp(ORB(a0), ORB(a1), Math.pow(r(), 0.8)), a = r() * TAU; pos.set([rr * Math.cos(a), (r() + r() + r() - 1.5) * thick, rr * Math.sin(a)], i * 3); sz[i] = 0.4 + r() * r() * 1.6; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    const p = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uImp: { value: IMP }, uRho: { value: 0 }, uA: { value: 1 }, uCol: { value: new THREE.Color(...rgb) } },
      vertexShader: `${PLANE} uniform float uA; attribute float aSize; varying float vIn;
        void main(){ vec3 p = position; vIn = step(distance(p.xz, uImp.xz), uRho); p.y *= 1.0 - vIn;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(aSize * 260.0 / -mv.z, 0.8, 3.0); }`,
      fragmentShader: 'uniform vec3 uCol; uniform float uA; varying float vIn; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; if (d > 1.0) discard; gl_FragColor = vec4(mix(uCol, vec3(1.0, 0.82, 0.5) * 0.7, vIn) * (1.0 - d * d) * uA, 1.0); }' }));
    p.frustumCulled = false; scene.add(p); return p;
  }
  const belts = [belt(2600, 2.1, 3.3, 0.35, 71, [0.42, 0.38, 0.34]), belt(5200, 30, 50, 1.6, 73, [0.3, 0.34, 0.42])];
  const orbits = bodies.filter(b => !b.sun).map(b => {   // orbit lines: faint blue, turning gold once the plane has taken them
    const r = ORB(b.au), pts = [];
    for (let i = 0; i <= 512; i++) pts.push(r * Math.cos(i / 512 * TAU), 0, r * Math.sin(i / 512 * TAU));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const line = new THREE.Line(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uImp: { value: IMP }, uRho: { value: 0 }, uA: { value: 1 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `${PLANE} uniform float uA; varying vec3 vW; void main(){ float inside = smoothstep(0.5, -0.5, distance(vW.xz, uImp.xz) - uRho); gl_FragColor = vec4(mix(vec3(0.33, 0.42, 0.6) * 0.5, vec3(1.0, 0.82, 0.55) * 0.75, inside) * uA, 1.0); }` }));
    scene.add(line); return line;
  });
  const region = toPlane(new THREE.Mesh(new THREE.CircleGeometry(1, 360), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, extensions: { derivatives: true },
    uniforms: { uRho: { value: 1 }, uTime: { value: 0 }, uA: { value: 1 } },
    vertexShader: flatVert,
    fragmentShader: `uniform float uRho, uTime, uA; varying vec2 vP; varying vec3 vW;
      void main(){
        float r = length(vP), d = (1.0 - r) * uRho;                       // distance in from the edge, in scene units
        float rw = max(0.1, 1.5 * fwidth(d)), rim = exp(-d * d / (rw * rw));   // the edge: a fine line, close or far
        vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + r * 2.5 - uTime * 0.11));
        float ripple = 0.5 + 0.5 * cos(d * 2.4 - uTime * 5.0);
        float graze = 1.0 - abs(normalize(cameraPosition - vW).y);         // edge-on, the sheet reads as a bright line
        vec3 inside = vec3(0.022, 0.024, 0.03) * (0.6 + 0.4 * ripple);     // the inside: neutral, barely there
        vec3 c = inside + film * rim * 0.3 + vec3(1.0, 0.93, 0.8) * rim * 0.7;   // the edge: white-gold, a little iridescence in it
        gl_FragColor = vec4(c * (1.0 + 6.0 * pow(graze, 8.0)) * uA, 1.0);
      }` })));
  region.position.copy(IMP).setY(-0.01); region.renderOrder = 5; scene.add(region);
  const flashTouch = GL.glowSprite(0xffffff, 1, 0); flashTouch.position.copy(IMP); scene.add(flashTouch);
  const foil = foilMesh(1.6, 1.0); scene.add(foil.group);   // the foil, gliding in from beyond the touchdown (gl-singer.js)
  const FROM = IMP.clone().add(new THREE.Vector3(Math.cos(PHI), 0.3, Math.sin(PHI)).multiplyScalar(110));
  const trail = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(6, 3)).setAttribute('color', new THREE.Float32BufferAttribute([0.9, 0.95, 1, 0, 0, 0], 3)),
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));   // a fine wake behind it
  trail.frustumCulled = false; scene.add(trail);
  const foilPos = t => { const k = ramp(t, SING.CUT, SC.fall), u = 1 - Math.pow(1 - k, 2.2); return FROM.clone().lerp(IMP, u).setY(lerp(FROM.y, 0.05, u)); };
  const N = BY.neptune.pos, E = BY.earth.pos, Pl = BY.pluto.pos, ctr = IMP.clone().multiplyScalar(0.45), azP = Math.atan2(Pl.z, Pl.x);
  const azEnd = azP + 0.2;
  const frame = new THREE.Group();                       // the end: a gold frame round the painting, square to the view
  for (const [s, w] of [[112, 1.6], [106, 0.4]]) {
    const sh = new THREE.Shape([[-s, -s], [s, -s], [s, s], [-s, s]].map(([x, y]) => new THREE.Vector2(x, y)));
    sh.holes.push(new THREE.Path([[-s + w, -s + w], [-s + w, s - w], [s - w, s - w], [s - w, -s + w]].map(([x, y]) => new THREE.Vector2(x, y))));
    frame.add(toPlane(new THREE.Mesh(new THREE.ShapeGeometry(sh), additive(0xffd696))));
  }
  frame.position.set(0, 0.1, 0); frame.rotation.y = -(azEnd + Math.PI / 2); scene.add(frame);
  const azIN = Math.atan2(N.z - IMP.z, N.x - IMP.x) + Math.PI / 2;
  const CAM = [                                          // target xyz, distance, azimuth, elevation, fov; tiny gaps are cuts
    [SING.CUT, [ctr.x, 0, ctr.z, 236, PHI + 0.95, 0.34, 32]],                 // the foil comes in
    [SC.fall, [ctr.x, 0, ctr.z, 205, PHI + 1.05, 0.38, 32]],
    [HN0 - 0.01, [ctr.x, 0, ctr.z, 188, PHI + 1.12, 0.36, 32]],
    [HN0, [N.x, 0.7, N.z, 30, azIN, 0.035, 9.5]],                      // telephoto from outside the disc: Neptune on the line, sinking through it
    [CUE.planets[0] + 1.8, [N.x, 0.6, N.z, 31, azIN + 0.03, 0.04, 10]],
    [HN1 - 2.2, [N.x, 0, N.z, 78, azIN + 0.06, 0.035, 22]],            // pulling back as its image spreads along the line
    [HN1, [N.x, 0, N.z, 40, azIN + 0.3, 0.8, 34]],                      // and up: the line opens into its image
    [HN1 + 0.01, [ctr.x * 0.6, 0, ctr.z * 0.6, 190, PHI + 1.3, 0.46, 32]],
    [CUE.planets[3] + 3, [ctr.x * 0.3, 0, ctr.z * 0.3, 175, PHI + 1.55, 0.5, 32]],
    [CUE.sun - 1.2, [0, 0, 0, 165, PHI + 1.7, 0.52, 32]],
    [CUE.sun + 3, [0, 0, 0, 128, PHI + 1.82, 0.64, 32]],
    [CUE.earth - 0.6, [0, 0, 0, 120, PHI + 1.9, 0.66, 32]],
    [CUE.earth + 2.5, [E.x, 0, E.z, 58, PHI + 2.05, 0.78, 32]],
    [CUE.earth + 7.5, [E.x, 0, E.z, 34, PHI + 2.15, 0.9, 32]],
    [CUE.earth + 7.51, [Pl.x * 0.2, 0, Pl.z * 0.2, 210, azP + 1.35, 1.1, 32]],   // the whole painting, the edge running on toward Pluto: turning, pulling back
    [SC.escape, [Pl.x * 0.3, 0, Pl.z * 0.3, 330, azP + 0.45, 0.78, 32]],
    [BACK0 - 0.01, [Pl.x * 0.25, 0, Pl.z * 0.25, 330, azP, 0.4, 32]],      // the look-back (the escape itself is on Pluto: gl-pluto.js)
    [BACK0, [Pl.x * 0.25, 0, Pl.z * 0.25, 330, azP, 0.4, 32]],
    [PLUTO_HIT - 0.3, [Pl.x, 0.5, Pl.z, 9, azP + 0.25, 0.42, 30]],         // Pluto against the painting, lit at the rim
    [PLUTO_HIT + 4.5, [Pl.x + 6.6, 0, Pl.z, 15, 0, 1.15, 34]],            // over the arc of Pluto's image where the words lie, upright
    [SC.end - 2.5, [Pl.x + 6.6, 0, Pl.z, 14, 0.02, 1.18, 34]],
    [SC.end + 1.8, [0, 0, 0, 698, azEnd, 1.52, 32]],                      // the whole painting, face-on in its gold frame, above the end card
    [DURATION, [0, 0, 0, 720, azEnd, 1.52, 32]],
  ];
  function setTime(t) {                                  // the whole system at time t
    const rho = rhoAt(t);
    const hero = t >= HN0 && t < HN1;                  // the Neptune shot: Neptune alone
    for (const b of bodies) {
      for (const o of [b.mesh, b.inner, b.ring, b.corona, ...(b.glows || [])]) if (o) o.visible = !hero || b.id === 'neptune';
      const f = clamp((t - b.hit) / (b.sun ? 4 : 3.5)), F = ease(f);
      b.uni.uF.value = F; b.uni.uTime.value = t; b.cy = b.R * sinkOf(F);
      b.uni.uSpin.value = Math.min(t, b.hit) * b.spin * 0.02;
      if (b.sun) b.uni.uGain.value = 1.6 + 0.3 * window01(t, b.hit, b.hit + 5, 0.4, 2.5);   // the Sun burns brightest as it falls
      b.inner.material.uniforms.uA.value = ease(clamp((f - 0.15) / 0.5));
      const p = t - b.hit, k = ease(clamp(p / 1.4));     // the edge reaching it: a cold ring running out over the plane
      b.ripple.visible = p > 0 && p < 3; b.ripple.scale.setScalar(b.R * (1.5 + (b.spread + 1) * k)); b.ripple.material.opacity = 0.8 * Math.exp(-p / 0.7);
      if (b.glows) b.glows.forEach(g => { g.material.opacity = g.userData.o * (1 - 0.8 * F); g.position.copy(b.pos).setY(Math.max(0, b.cy)); });
      if (b.corona) { b.corona.position.copy(b.pos).setY(Math.max(0, b.cy)); b.corona.material.uniforms.uA.value = 1 - F; b.corona.material.uniforms.uT.value = t; }
      if (b.ring) { const k2 = ease(f); b.ring.rotation.set(-Math.PI / 2 + 0.47 * (1 - k2), 0, 0.2 * (1 - k2)); b.ring.scale.setScalar(1 + 3.2 * k2); b.ring.position.y = Math.max(0.04, b.cy * (1 - k2)); }
    }
    const lines = (1 - 0.85 * ease(ramp(t, HN1 + 0.5, HN1 + 4))) * (1 - ease(ramp(t, SC.end - 3, SC.end)));   // the orbits step back after the establishing shots, and leave before the end card
    for (const o of orbits) { o.material.uniforms.uRho.value = rho; o.material.uniforms.uA.value = lines; }
    for (const p of belts) p.material.uniforms.uRho.value = rho;
    region.scale.setScalar(Math.max(0.001, rho)); region.material.uniforms.uRho.value = Math.max(0.001, rho);
    region.material.uniforms.uTime.value = t; region.visible = t >= SC.fall; region.material.uniforms.uA.value = 1 - ease(ramp(t, SC.end - 1, SC.end + 1.5));
    for (const m of frame.children) m.material.opacity = 0.8 * ease(ramp(t, SC.end - 1, SC.end + 2));
    const q = t - SC.fall; flashTouch.material.opacity = q >= 0 ? 0.9 * Math.exp(-q / 0.25) : 0; flashTouch.scale.setScalar(22);   // a hard white point, not a haze
    const k = ramp(t, SING.CUT, SC.fall);                // the foil: slowing as it comes down, tumbling, lying flat as it lands
    foil.group.visible = t >= SING.CUT && t < SC.fall + 0.12;
    foil.group.position.copy(foilPos(t));
    trail.visible = foil.group.visible; trail.geometry.attributes.position.array.set([...foilPos(t).toArray(), ...foilPos(t - 0.45).toArray()]); trail.geometry.attributes.position.needsUpdate = true;
    foil.group.rotation.set(lerp(0.6 + 2.4 * k, -Math.PI / 2, ease(ramp(t, SC.fall - 0.6, SC.fall))), 1.3 + 1.8 * k, 0.4 * (1 - k));
  }
  function draw(t) {
    setTime(t);
    const v = keyed(t, CAM, easeIO);
    cam.fov = v[6] ?? 32; orbitCam(cam, [v[0], v[1], v[2]], v[3], v[4], v[5]);
    const lift = 151 * ease(ramp(t, SC.end - 1, SC.end + 1.8));   // for the end card the painting sits in the upper part of the picture
    if (lift > 0) { cam.setViewOffset(W, H, 0, lift, W, H); cam.updateProjectionMatrix(); } else cam.clearViewOffset();
    for (const b of bodies) if (b.corona) b.corona.quaternion.copy(cam.quaternion);
    const toCam = cam.position.clone().sub(BY.pluto.pos).normalize(), right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), upv = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    BY.pluto.uni.uLdir.value.copy(toCam).multiplyScalar(0.55).addScaledVector(right, -0.8).addScaledVector(upv, 0.35).normalize();   // from upper left: about a third of it in shadow
    if (foil.group.visible) foil.update(cam, t, 1, 13);
    const peak = window01(t, CUE.sun - 0.2, CUE.sun + 4, 0.2, 1.5);
    return GL.draw(scene, cam, { strength: 0.55 + 0.35 * peak, radius: 0.55, threshold: 0.82 });
  }
  function above(b, margin = 30) {                       // a label's place: above whatever the body is now, sphere or image
    const F = b.uni.uF.value, rr = F > 0 ? b.R * (0.42 + 0.58 * F) * b.spread : b.R, y = F > 0 ? 0 : b.cy;
    let top = Infinity, sx = 0;
    for (let i = 0; i < 16; i++) { const [x, yy] = GL.screen(cam, b.pos.clone().add(new THREE.Vector3(Math.cos(i / 16 * TAU) * rr, y + (F > 0 ? 0 : b.R), Math.sin(i / 16 * TAU) * rr))); top = Math.min(top, yy); sx += x / 16; }
    const [, , front] = GL.screen(cam, b.pos);
    return [sx, top - margin, front];
  }
  function labels(t) {                                   // each name, quietly, as it goes flat (Neptune's is spoken in its own shot)
    const out = [];
    for (const b of bodies) {
      if (!b.zh || b.id === 'neptune' || b.far) continue;
      const a = window01(t, b.hit + 0.3, b.hit + 3.4, 0.5, 0.8); if (a <= 0) continue;
      const [x, y, front] = above(b);
      if (front) out.push([b.zh, x, Math.max(60, y), a]);
    }
    return out;
  }
  const screenOf = id => above(BY[id], 14);
  return { draw, labels, screenOf, setTime, cam, scene, bodies: BY, IMP, rhoAt, HN0, HN1, PLUTO_HIT, ORB };
})();
