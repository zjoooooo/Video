// The Milky Way, after Galaxy Explorer's (index.html: buildDust, buildPaintedGalaxy, centralBulge, buildBeacons): its
// painted disc (baked once by bake-galaxy.mjs), 30,000 stars clumped into knots along four arms, a hot core, and the
// Sun half-way out on a minor arm. The cold open pulls back from the Sun's neighbourhood to the whole galaxy while a
// few eyes open in it; the Singer (gl-singer.js) looks at the same galaxy from far above. One galaxy, re-parented into
// whichever scene is drawing.
const MILKY = (() => {
  const R = 360, ARMS = 4, TIGHT = 0.85, WIDTH = 46, RAND = 0.5, THICK = 24, RADPOW = 0.72, BRIGHT = 0.5, SPIN = 0.013;
  const armXZ = (rf, idx) => { const a = idx * (TAU / ARMS) + rf * TIGHT * TAU; return new THREE.Vector3(Math.cos(a) * rf * R, 0, Math.sin(a) * rf * R); };
  const SUN = armXZ(0.51, 1);                           // the Orion Spur: a minor arm, about half-way out
  const group = new THREE.Group(), r = rng(1977);
  const gauss = () => r() + r() + r() - 1.5;
  const STAR_FRAG = 'varying vec3 vColor; void main(){ float d = distance(gl_PointCoord, vec2(0.5)) * 2.0; float halo = pow(max(0.0, 1.0 - d), 2.2) * 0.65; float core = exp(-d * d * 18.0); float s = halo + core; if (s < 0.02) discard; gl_FragColor = vec4(vColor * halo + (vColor * 0.55 + vec3(0.75)) * core, 1.0); }';
  const pointsMat = (frag, fade) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: 4.0 }, uCap: { value: 34 } },
    vertexShader: 'uniform float uSize, uCap; attribute float aScale; attribute vec3 aColor; varying vec3 vColor; void main(){ vec4 vp = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * vp;' +
      ` gl_PointSize = min(uSize * aScale * (300.0 / -vp.z), uCap); vColor = aColor${fade ? ' * 0.75 * (0.3 + 0.9 * smoothstep(450.0, 150.0, -vp.z))' : ''}; }`,
    fragmentShader: frag });
  const cloud = (pos, col, scl, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); g.setAttribute('aScale', new THREE.BufferAttribute(scl, 1));
    const p = new THREE.Points(g, mat); p.frustumCulled = false; return p;
  };
  {                                                     // the dust: ~80% of stars in knots seeded on the arms, the rest a diffuse field
    const N = 30000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), scl = new Float32Array(N);
    const inside = new THREE.Color(0xffcf8a), outside = new THREE.Color(0x86acec), mix = new THREE.Color();
    const pickArm = rf => { const idx = r() < 0.7 ? Math.floor(r() * ARMS / 2) * 2 : Math.floor(r() * ARMS / 2) * 2 + 1, maj = idx % 2 === 0; return { maj, ang: idx * (TAU / ARMS) + rf * TIGHT * TAU + (r() - 0.5) * RAND * (maj ? 1 : 1.25) }; };
    const knots = Array.from({ length: N / 200 }, () => { const rf = Math.pow(r(), RADPOW), p = pickArm(rf), cR = rf * R + (r() - 0.5) * WIDTH; return { x: Math.cos(p.ang) * cR, z: Math.sin(p.ang) * cR, rf, maj: p.maj, sz: 6 + r() * r() * 36 }; });
    for (let i = 0; i < N; i++) {
      let rf, maj;
      if (r() < 0.8) {
        const k = knots[Math.floor(r() * knots.length)]; rf = k.rf; maj = k.maj;
        pos.set([k.x + gauss() * k.sz, gauss() * THICK * (1 - rf + 0.2) * 0.45, k.z + gauss() * k.sz], i * 3);
      } else {
        rf = Math.pow(r(), RADPOW); const p = pickArm(rf), oR = rf * R + (r() - 0.5) * WIDTH; maj = p.maj;
        pos.set([Math.cos(p.ang) * oR, (r() - 0.5) * THICK * (1 - rf + 0.2), Math.sin(p.ang) * oR], i * 3);
      }
      mix.copy(inside).lerp(outside, clamp((rf - 0.12) * 3)).multiplyScalar(BRIGHT * (maj ? 1 : 0.42) * (1 - 0.4 * clamp((rf - 0.78) * 4.5)));
      scl[i] = (0.3 + r() * 0.9) * (maj ? 1 : 0.82);
      const kn = r();                                   // yellow giants anywhere; red, blue-white and blue knot stars in the major arms
      if (kn < 0.003) { mix.setHex(0xffd45a).multiplyScalar(BRIGHT * 2.6); scl[i] = 1.4 + r() * 1.2; }
      else if (maj && rf > 0.28 && kn < 0.024) { const c = r(); mix.setHex(c < 0.6 ? 0xff5e30 : c < 0.8 ? 0xcfe6ff : 0x4d8cff).multiplyScalar(BRIGHT * 2.3); scl[i] = 1.2 + r() * 0.9; }
      else if (maj && rf > 0.28 && kn < 0.103) { mix.setHex(0xcfe6ff).multiplyScalar(BRIGHT * 2); scl[i] = 0.9 + r() * 0.8; }
      col.set([mix.r, mix.g, mix.b], i * 3);
    }
    group.add(cloud(pos, col, scl, pointsMat(STAR_FRAG, true)));
  }
  {                                                     // the bulge: a faint scatter; the glow sprites are the core
    const N = 2200, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), scl = new Float32Array(N);
    const c0 = new THREE.Color(0xfff2dc), c1 = new THREE.Color(0xffc266), cc = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const x = gauss(), y = gauss(), z = gauss(), d = Math.min(1, Math.hypot(x, y, z) / 2.2);
      pos.set([x * 84, y * 42, z * 84], i * 3); cc.copy(c0).lerp(c1, d).multiplyScalar(BRIGHT * (0.9 - 0.4 * d)); col.set([cc.r, cc.g, cc.b], i * 3); scl[i] = 0.3 + r() * 0.5;
    }
    group.add(cloud(pos, col, scl, pointsMat('varying vec3 vColor; void main(){ float s = pow(max(0.0, 1.0 - distance(gl_PointCoord, vec2(0.5)) * 2.0), 2.0); if (s < 0.02) discard; gl_FragColor = vec4(vColor, s); }', false)));
  }
  {                                                     // the Sun's neighbourhood: a thicker drift of stars to fly through
    const N = 2600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), scl = new Float32Array(N), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const rr = 3 + 70 * Math.pow(r(), 1.6), a = r() * TAU;
      pos.set([SUN.x + rr * Math.cos(a), gauss() * 4 * (0.4 + rr / 70), SUN.z + rr * Math.sin(a)], i * 3);
      const k = r(); c.setHex(k < 0.12 ? 0xffd9a0 : k < 0.3 ? 0xbcd4ff : 0xf2f0ea).multiplyScalar(BRIGHT * (0.12 + 1.4 * Math.pow(r(), 4))); col.set([c.r, c.g, c.b], i * 3);   // mostly faint, a few bright
      scl[i] = 0.2 + 0.7 * r() * r();
    }
    var local = cloud(pos, col, scl, pointsMat(STAR_FRAG, false)); group.add(local);
  }
  const span = R * 2.5, disc = new THREE.Mesh(new THREE.PlaneGeometry(span, span), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uMap: { value: GL.tex('../../out/santi-galaxy/milkyway.jpg') }, uGain: { value: 1 } },
    vertexShader: 'varying vec2 vUv; varying float vDepth; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D uMap; uniform float uGain; varying vec2 vUv; varying float vDepth; void main(){ float near = mix(0.15, 1.0, smoothstep(40.0, 240.0, vDepth)); gl_FragColor = vec4(texture2D(uMap, vUv).rgb * near * uGain, 1.0); }' }));
  disc.rotation.x = Math.PI / 2; disc.frustumCulled = false; group.add(disc);   // the painting fades where it is close: up close, the stars take over
  for (const [c, s, o] of [[0xfffdf6, 60, 0.2], [0xfff3da, 150, 0.08]]) group.add(GL.glowSprite(c, s, o));   // dimmer than the app's: no tone mapping here
  // The sky of the other scenes: this galaxy as seen from the Sun, rendered once into a cube (bakeSky, at READY, once
  // the painting has loaded). Seen edge-on the painting is a line, so two faint copies above and below give it body.
  const skyRT = new THREE.WebGLCubeRenderTarget(1024, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  function bakeSky() {
    const sc = new THREE.Scene(), cc = new THREE.CubeCamera(0.5, 5000, skyRT), body = [[4, 0.35], [-4, 0.35], [10, 0.18], [-10, 0.18], [18, 0.08], [-18, 0.08]].map(([y, g]) => { const m = disc.clone(); m.material = disc.material.clone(); m.material.uniforms.uGain.value = g; m.position.y = y; return m; });
    const mats = group.children.filter(o => o.isPoints).map(o => o.material);   // stars as fine points: a cube face is magnified ~2.5x on screen
    mats.forEach(m => { m.uniforms.uSize.value = 0.5; m.uniforms.uCap.value = 2.5; });
    group.rotation.y = 0; local.visible = false; group.add(...body); sc.add(group);
    cc.position.set(SUN.x, 2, SUN.z); cc.update(GL.renderer, sc);
    group.remove(...body); local.visible = true; sc.remove(group);
    mats.forEach(m => { m.uniforms.uSize.value = 4; m.uniforms.uCap.value = 34; });
  }
  function sky(gain, through, roll = 0, core = 0, radius = 20000) {   // a far sphere, the band across the view direction `through`, tilted by roll on
    const v = new THREE.Vector3(...through).normalize(), right = v.clone().cross(new THREE.Vector3(0, 1, 0)).normalize(), up = right.clone().cross(v);   // screen; the core `core` rad along it
    const n = up.multiplyScalar(Math.cos(roll)).addScaledVector(right, -Math.sin(roll)).normalize(), a = v.applyAxisAngle(n, core);
    const c0 = new THREE.Vector3(-SUN.x, 0, -SUN.z).normalize(), Y = new THREE.Vector3(0, 1, 0);   // the galactic centre as seen from the Sun
    const basis = (x, y) => new THREE.Matrix4().makeBasis(x, y, x.clone().cross(y));
    const rot = basis(c0, Y).multiply(basis(a, n).transpose());   // world direction -> cube direction
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
      uniforms: { uCube: { value: skyRT.texture }, uGain: { value: gain }, uRot: { value: new THREE.Matrix3().setFromMatrix4(rot) } },
      vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform samplerCube uCube; uniform float uGain; uniform mat3 uRot; varying vec3 vD; void main(){ vec3 d = uRot * normalize(vD); gl_FragColor = vec4((textureCube(uCube, d).rgb + 1.6 * textureCube(uCube, d, 4.0).rgb) * uGain, 1.0); }' }));   // the stars, and the band's glow
  m.frustumCulled = false; m.onBeforeRender = (r, sc, camera) => { m.position.copy(camera.position); m.updateMatrixWorld(); };   // at infinity: it goes where the camera goes
    return m;
  }
  const world = (t, v) => v.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), SPIN * t);   // where a point of the turning disc is at t (the arms trail)
  const setTime = t => { group.rotation.y = SPIN * t; return world(t, SUN); };
  return { group, R, SUN, SPIN, armXZ, world, setTime, sky, bakeSky, skyTex: skyRT.texture };
})();

const COLD = (() => {                                   // the cold open: out of the Sun's neighbourhood, the whole galaxy, eyes opening
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, W / H, 0.5, 200000);
  scene.add(GL.stars(23, 6000, 60000));
  function pose(t) {                                    // from among the Sun's stars, looking in at the core, out to the whole disc
    const sun = MILKY.setTime(t), k = easeIO(ramp(t, 0, SC.fleet + 0.6));
    const tgt = sun.clone().lerp(new THREE.Vector3(), 0.25 + 0.75 * ease(k));
    orbitCam(cam, [tgt.x, tgt.y, tgt.z], 55 * Math.pow(14, k), Math.atan2(sun.z, sun.x) + lerp(0.15, 0.55, k), lerp(0.08, 0.78, k));
    cam.far = 200000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
  const EYES = [[560, 600, 3.2], [1450, 520, 5.4], [1230, 800, 7.6], [600, 330, 9.0]].map(([x, y, at]) => {   // where each eye opens on screen, and when
    pose(at);                                           // the star there, in the turning disc's own frame
    const p = new THREE.Vector3(x / W * 2 - 1, 1 - y / H * 2, 0.5).unproject(cam), d = p.sub(cam.position).normalize();
    const hit = cam.position.clone().addScaledVector(d, -cam.position.y / d.y);
    return [hit.applyAxisAngle(new THREE.Vector3(0, 1, 0), -MILKY.SPIN * at).setY(2), at];
  });
  function draw(t) {
    scene.add(MILKY.group); pose(t);
    return GL.draw(scene, cam, { strength: 0.32, radius: 0.5, threshold: 0.75 });
  }
  const eyes = t => EYES.map(([p, at]) => [...GL.screen(cam, MILKY.world(t, p)), at]);   // after draw: [x, y, in front, when it opens]
  return { draw, eyes, scene, cam };
})();
