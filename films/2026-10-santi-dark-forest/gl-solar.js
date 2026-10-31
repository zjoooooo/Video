// The Solar System and its fall into two dimensions, in 3D, laid out as the novel tells it: the foil comes in from the
// side opposite Pluto and touches down just beyond Neptune; a disc of two-dimensional space spreads from there across
// the ecliptic. Each body sits on its (compressed) orbit at the distance from the touchdown that the disc's edge reaches
// on its cue, so Neptune falls first, the Sun at 1:57, Earth (beyond the Sun) at 2:03, and Pluto, the farthest from the
// foil, last. A falling body unrolls: its whole surface laid out as a ring in the plane, its interior layers inside it.
const SOL = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 6000);
  scene.add(GL.stars(17, 7000, 3000));
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
  const DEF = [                                          // d: distance from the touchdown; side: which way round its orbit
    { id: 'neptune', zh: '海王星', au: 30.07, R: 1.25, d: 8, side: 1, kind: 'ice', spin: 0.25 },
    { id: 'uranus', zh: '天王星', au: 19.19, R: 1.3, d: 30, side: -1, kind: 'ice', spin: 0.22 },
    { id: 'saturn', zh: '土星', au: 9.54, R: 1.9, d: 48, side: 1, kind: 'gas', spin: 0.3, ring: true },
    { id: 'jupiter', zh: '木星', au: 5.2, R: 2.2, d: 62, side: -1, kind: 'gas', spin: 0.32 },
    { id: 'mars', au: 1.52, R: 0.5, d: 74, side: 1, kind: 'rock', spin: 0.15 },
    { id: 'venus', au: 0.72, R: 0.72, d: 78, side: -1, kind: 'rock', spin: 0.02 },
    { id: 'sun', zh: '太阳', au: 0, R: 4, d: RI, kind: 'sun', spin: 0.02, sun: true },
    { id: 'mercury', au: 0.39, R: 0.38, d: 88, side: 1, kind: 'rock', spin: 0.03 },
    { id: 'earth', zh: '地球', au: 1, R: 0.75, d: 95, side: -1, kind: 'rock', spin: 0.12 },
    { id: 'pluto', zh: '冥王星', au: 39.48, R: 0.5, d: RI + ORB(39.48), kind: 'dwarf', spin: 0.05, far: true },
  ];
  const VERT = `uniform float uF, uSpread, uR, uSpin; uniform vec3 uImp;
    varying vec2 vUv; varying vec3 vN, vW; varying float vK, vTh, vLon;
    void main(){
      vec3 n = normalize(position);                                       // latitude and longitude from the uv, exact even at the poles
      float th = (1.0 - uv.y) * 3.14159265, lon = 3.14159265 - uv.x * 6.2831853;
      float rf = uR * uSpread * (0.42 + 0.58 * th / 3.14159265);         // north pole on the inner edge, south pole on the rim
      float lag = 0.2 * (1.0 - dot(n, uImp)) * 0.5;                       // the side facing the touchdown goes a little first
      float f = clamp(uF * 1.2 - lag, 0.0, 1.0);
      float a = smoothstep(0.0, 0.5, f), b = smoothstep(0.45, 1.0, f);   // first pressed flat into the plane, then unrolled
      vec3 pressed = vec3(position.x * (1.0 + 0.6 * a), position.y * (1.0 - a), position.z * (1.0 + 0.6 * a));
      vec3 unrolled = vec3(cos(lon) * rf, 0.0, sin(lon) * rf);
      vK = a; vTh = th / 3.14159265; vLon = lon; vUv = vec2(uv.x + uSpin, uv.y); vN = n;
      vec4 w = modelMatrix * vec4(mix(pressed, unrolled, b), 1.0); vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = `uniform sampler2D uMap, uText; uniform float uGain, uSun, uTime, uAlpha, uHasText;
    varying vec2 vUv; varying vec3 vN, vW; varying float vK, vTh, vLon;
    void main(){
      vec3 tex = texture2D(uMap, vUv).rgb;
      vec3 V = normalize(cameraPosition - vW);
      float lit = uSun > 0.5 ? 0.78 + 0.22 * max(0.0, dot(vN, V)) : 0.04 + 0.96 * max(0.0, dot(vN, normalize(-vW)));
      vec3 c = tex * uGain * mix(lit, 0.78, vK);
      vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + abs(V.y) * 1.7 + length(vW.xz) * 0.015 - uTime * 0.04));
      c = mix(c, c * 0.9 + film * 0.22, 0.3 * vK);                      // flat, it takes a thin-film sheen that turns with the view
      if (uHasText > 0.5) {                                              // Pluto: where the tablets stand, their words, kept in the image
        vec2 q = vec2((vLon + 1.25) / 2.5, (vTh - 0.34) / 0.2);
        if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) { vec4 w = texture2D(uText, vec2(1.0 - q.x, 1.0 - q.y)); c = mix(c, w.rgb, w.a * (0.25 + 0.75 * vK)); }
      }
      gl_FragColor = vec4(c, uAlpha);
    }`;
  const INNER = `uniform vec3 uC0, uC1, uC2, uC3, uE; uniform float uA;
    varying vec2 vP;
    void main(){
      float r = length(vP);
      vec3 c = r < uE.x ? mix(uC0 * 1.15, uC0, r / uE.x) : r < uE.y ? mix(uC1 * 1.1, uC1, (r - uE.x) / (uE.y - uE.x)) : r < uE.z ? mix(uC2, uC3, (r - uE.y) / (uE.z - uE.y)) : uC3;
      float lines = 0.8 + 0.2 * cos(r * 460.0) * cos(atan(vP.y, vP.x) * 48.0 + r * 40.0);   // engraved, as fine as the eye can take
      float bound = exp(-pow((r - uE.x) * 120.0, 2.0)) + exp(-pow((r - uE.y) * 120.0, 2.0)) + exp(-pow((r - uE.z) * 120.0, 2.0));
      gl_FragColor = vec4(c * lines + bound * 0.45, uA);
    }`;
  const flatVert = 'varying vec2 vP; varying vec3 vW; void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const toPlane = m => { m.rotation.x = -Math.PI / 2; return m; };
  const WORDS = GL.canvasTex(4096, 320, (g, w, h) => HUMANITY.forEach(([s, font], i) => carve(g, s, font, (i + 0.5) * w / HUMANITY.length, h / 2, s.length > 6 ? 82 : 150)));
  const alpha = Math.atan2(IMP.z, IMP.x);
  const bodies = DEF.map((d, i) => {
    const r = ORB(d.au), th = d.far ? PHI + Math.PI : d.sun ? 0 : alpha + d.side * Math.acos(clamp((r * r + RI * RI - d.d * d.d) / (2 * r * RI), -1, 1));
    const pos = new THREE.Vector3(r * Math.cos(th), 0, r * Math.sin(th)), hit = hitOf(d.d);
    const spread = d.sun ? 14 : d.id === 'earth' ? 14 : d.far ? 18 : 10;
    const uni = { uMap: { value: GL.tex(GE + `images/solar-system/${d.id}.jpg`) }, uF: { value: 0 }, uSpread: { value: spread }, uR: { value: d.R },
      uSpin: { value: 0 }, uImp: { value: IMP.clone().sub(pos).normalize() }, uGain: { value: d.sun ? 1.45 : 1.05 }, uSun: { value: d.sun ? 1 : 0 }, uTime: { value: 0 }, uAlpha: { value: 1 },
      uText: { value: d.far ? WORDS : null }, uHasText: { value: d.far ? 1 : 0 } };
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.R, 256, 128), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG, transparent: true }));
    mesh.position.copy(pos).setY(0.004 * i); mesh.renderOrder = 10 + i;      // later falls lie on top of earlier ones
    const L = LAYERS[d.kind];
    const inner = toPlane(new THREE.Mesh(new THREE.CircleGeometry(1, 160), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uC0: { value: L[0] }, uC1: { value: L[1] }, uC2: { value: L[2] }, uC3: { value: L[3] }, uE: { value: new THREE.Vector3(...L[4]) }, uA: { value: 0 } },
      vertexShader: flatVert, fragmentShader: INNER })));
    inner.position.copy(pos).setY(0.004 * i - 0.001); inner.scale.setScalar(d.R * spread * 0.42); inner.renderOrder = 10 + i;
    scene.add(mesh, inner);
    const b = { ...d, pos, hit, spread, mesh, inner, uni, flash: GL.glowSprite(d.sun ? 0xfff2d0 : 0xcfe6ff, 1, 0) };
    b.flash.position.copy(pos); scene.add(b.flash);
    if (d.sun) b.glows = [[0xfffdf6, 2.1, 0.3], [0xfff3da, 3.4, 0.26], [0xffcf78, 5, 0.2], [0xff9b3f, 6.8, 0.09]].map(([c, s, o]) => { const g = GL.glowSprite(c, d.R * s, o); g.userData.o = o; scene.add(g); return g; });
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
  const orbits = bodies.filter(b => !b.sun).map(b => {   // orbit lines: faint blue, turning gold once the plane has taken them
    const r = ORB(b.au), pts = [];
    for (let i = 0; i <= 256; i++) pts.push(r * Math.cos(i / 256 * TAU), 0, r * Math.sin(i / 256 * TAU));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const line = new THREE.Line(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uImp: { value: IMP }, uRho: { value: 0 }, uA: { value: 1 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 uImp; uniform float uRho, uA; varying vec3 vW; void main(){ float inside = smoothstep(0.5, -0.5, distance(vW.xz, uImp.xz) - uRho); gl_FragColor = vec4(mix(vec3(0.33, 0.42, 0.6) * 0.5, vec3(1.0, 0.82, 0.55) * 0.75, inside), uA); }' }));
    scene.add(line); return line;
  });
  const region = toPlane(new THREE.Mesh(new THREE.CircleGeometry(1, 360), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uRho: { value: 1 }, uTime: { value: 0 }, uA: { value: 1 } },
    vertexShader: flatVert,
    fragmentShader: `uniform float uRho, uTime, uA; varying vec2 vP; varying vec3 vW;
      void main(){
        float r = length(vP), d = (1.0 - r) * uRho;                       // distance in from the edge, in scene units
        float rim = exp(-d * d / 0.18);
        vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + r * 2.5 - uTime * 0.11));
        float ripple = 0.5 + 0.5 * cos(d * 2.4 - uTime * 5.0);
        float graze = 1.0 - abs(normalize(cameraPosition - vW).y);         // edge-on, the sheet reads as a bright line
        vec3 c = film * (0.03 + 0.03 * ripple + rim * 0.75) + vec3(1.0) * rim * 0.55;
        gl_FragColor = vec4(c * (1.0 + 6.0 * pow(graze, 8.0)) * uA, 1.0);
      }` })));
  region.position.copy(IMP).setY(-0.01); region.renderOrder = 5; scene.add(region);
  const flashTouch = GL.glowSprite(0xffffff, 1, 0); flashTouch.position.copy(IMP); scene.add(flashTouch);
  const N = BY.neptune.pos, E = BY.earth.pos, Pl = BY.pluto.pos, ctr = IMP.clone().multiplyScalar(0.45), azP = Math.atan2(Pl.z, Pl.x);
  const frame = [160, 165].map(r => { const m = toPlane(new THREE.Mesh(new THREE.RingGeometry(r, r + 0.6, 512), new THREE.MeshBasicMaterial({ color: 0xffd696, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }))); m.position.y = 0.1; scene.add(m); return m; });
  const azIN = Math.atan2(N.z - IMP.z, N.x - IMP.x) + Math.PI / 2;
  const CAM = [                                          // target xyz, distance, azimuth, elevation; tiny gaps are cuts
    [SC.fall, [ctr.x, 0, ctr.z, 205, PHI + 1.05, 0.38, 32]],
    [HN0 - 0.01, [ctr.x, 0, ctr.z, 188, PHI + 1.12, 0.36, 32]],
    [HN0, [N.x, 0, N.z, 30, azIN, 0.035, 9.5]],                        // telephoto from outside the disc: Neptune big, the plane a line
    [CUE.planets[0] + 1.8, [N.x, 0, N.z, 31, azIN + 0.03, 0.04, 10]],
    [HN1 - 2.2, [N.x, 0, N.z, 78, azIN + 0.06, 0.035, 22]],            // pulling back as its image spreads along the line
    [HN1, [N.x, 0, N.z, 40, azIN + 0.3, 0.8, 34]],                      // and up: the line opens into its image
    [HN1 + 0.01, [ctr.x * 0.6, 0, ctr.z * 0.6, 190, PHI + 1.3, 0.46, 32]],
    [CUE.planets[3] + 3, [ctr.x * 0.3, 0, ctr.z * 0.3, 175, PHI + 1.55, 0.5, 32]],
    [CUE.sun - 1.2, [0, 0, 0, 165, PHI + 1.7, 0.52, 32]],
    [CUE.sun + 3, [0, 0, 0, 128, PHI + 1.82, 0.64, 32]],
    [CUE.earth - 0.6, [0, 0, 0, 120, PHI + 1.9, 0.66, 32]],
    [CUE.earth + 2.5, [E.x, 0, E.z, 58, PHI + 2.05, 0.78, 32]],
    [SC.escape, [E.x, 0, E.z, 26, PHI + 2.2, 1.0, 32]],
    [BACK0 - 0.01, [Pl.x * 0.25, 0, Pl.z * 0.25, 330, azP, 0.4, 32]],      // the look-back (the escape itself is on Pluto: gl-pluto.js)
    [BACK0, [Pl.x * 0.25, 0, Pl.z * 0.25, 330, azP, 0.4, 32]],
    [PLUTO_HIT - 0.3, [Pl.x, 0, Pl.z, 9, azP + 0.25, 0.42, 30]],
    [PLUTO_HIT + 4.5, [Pl.x, 0, Pl.z, 24, azP + 0.4, 1.25, 34]],          // over Pluto's image, close enough to read
    [SC.end - 2.5, [Pl.x, 0, Pl.z, 22, azP + 0.45, 1.28, 34]],
    [SC.end + 1.8, [Math.cos(azP) * 70, 0, Math.sin(azP) * 70, 470, azP + 0.2, 1.18, 32]],   // the whole painting, high in the frame, in its gold frame
    [DURATION, [Math.cos(azP) * 70, 0, Math.sin(azP) * 70, 500, azP + 0.22, 1.2, 32]],
  ];
  function setTime(t) {                                  // the whole system at time t
    const rho = rhoAt(t);
    const hero = t >= HN0 && t < HN1;                  // the Neptune shot: Neptune alone
    for (const b of bodies) {
      for (const o of [b.mesh, b.inner, b.ring, ...(b.glows || [])]) if (o) o.visible = !hero || b.id === 'neptune';
      const f = clamp((t - b.hit) / (b.sun ? 4 : 3.5));
      b.uni.uF.value = f; b.uni.uTime.value = t; if (b.sun) b.uni.uGain.value = 1.45 + 0.7 * window01(t, b.hit, b.hit + 5, 0.4, 2.5);   // the Sun burns brightest as it falls b.uni.uSpin.value = Math.min(t, b.hit) * b.spin * 0.02;
      b.inner.material.uniforms.uA.value = ease(clamp((f - 0.25) / 0.6));
      const p = t - b.hit;                              // the edge reaching it: a cold flash
      b.flash.material.opacity = p > 0 && p < 3 ? 0.8 * Math.exp(-p / 0.5) : 0; b.flash.scale.setScalar(b.R * (b.sun ? 30 : 16));
      if (b.glows) b.glows.forEach(g => (g.material.opacity = g.userData.o * (1 - 0.7 * ease(f))));
      if (b.ring) { const k = ease(f); b.ring.rotation.set(-Math.PI / 2 + 0.47 * (1 - k), 0, 0.2 * (1 - k)); b.ring.scale.setScalar(1 + 3.2 * k); b.ring.position.y = 0.04 * k; }
    }
    for (const o of orbits) o.material.uniforms.uRho.value = rho;
    region.scale.setScalar(Math.max(0.001, rho)); region.material.uniforms.uRho.value = Math.max(0.001, rho);
    region.material.uniforms.uTime.value = t; region.visible = t >= SC.fall;
    for (const f of frame) f.material.opacity = 0.75 * ease(ramp(t, SC.end - 3.5, SC.end + 0.5));
    const q = t - SC.fall; flashTouch.material.opacity = q >= 0 ? Math.exp(-q / 0.4) : 0; flashTouch.scale.setScalar(70);
  }
  function draw(t, view) {                               // view: [tx, ty, tz, d, az, el], or the scripted camera
    setTime(t);
    const v = view || keyed(t, CAM, easeIO);
    cam.fov = v[6] ?? 32; orbitCam(cam, [v[0], v[1], v[2]], v[3], v[4], v[5]);
    const peak = window01(t, CUE.sun - 0.2, CUE.sun + 4, 0.2, 1.5);
    return GL.draw(scene, cam, { strength: 0.7 + 0.5 * peak, radius: 0.55, threshold: 0.8 });
  }
  function labels(t) {                                   // each name, quietly, as it goes flat (Neptune's is spoken in its own shot)
    const out = [];
    for (const b of bodies) {
      if (!b.zh || b.id === 'neptune' || b.far) continue;
      const a = window01(t, b.hit + 0.3, b.hit + 3.4, 0.5, 0.8); if (a <= 0) continue;
      const [x, y, front] = GL.screen(cam, b.pos.clone().add(new THREE.Vector3(0, b.R * 1.6 + 0.5, 0)));
      if (front) out.push([b.zh, x, y - 26, a]);
    }
    return out;
  }
  const screenOf = (id, up = 1.6) => GL.screen(cam, BY[id].pos.clone().add(new THREE.Vector3(0, BY[id].R * up + 0.4, 0)));
  return { draw, labels, screenOf, setTime, cam, scene, bodies: BY, IMP, rhoAt, HN0, HN1, PLUTO_HIT, ORB };
})();
