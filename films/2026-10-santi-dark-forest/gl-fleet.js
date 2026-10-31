// The Doomsday Battle in 3D. Everything the art director passed in 2D is kept: each ship's place, the droplet's tracks,
// each ship's death time (SHIPS[i].tk, the first blast along the track to reach it) and the camera (camAt). Film
// coordinates (z away from the camera) map to three.js with z negated.
const FLEET = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(2 * Math.atan(H / 2 / F) * 180 / Math.PI, W / H, 2, 90000);
  const sky = MILKY.sky(1.1, [0, 0.57, -0.82], 0.6, 0.15); scene.add(GL.stars(31, 10000, 45000), sky);
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4); key.position.set(-1, 0.9, 0.5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 1.4); rim.position.set(1, 0.25, -1); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x6a7ea6, 0x14100c, 0.75));
  const sunStar = GL.glowSprite(0xfff4dc, 2600, 1); sunStar.position.copy(key.position).normalize().multiplyScalar(40000); scene.add(sunStar);   // the Sun, from out here a hard bright star
  const N = SHIPS.length, BIG = 1.6;                    // ships drawn 1.6x: a packed, imposing formation
  const hulls = new THREE.InstancedMesh(SHIP.hull, SHIP.material(), N);
  const lamps = new THREE.InstancedMesh(SHIP.lights, new THREE.MeshBasicMaterial({ vertexColors: true }), N);
  const burnt = SHIP.material(0x1d1b19, 0.85); burnt.envMapIntensity = 0.25; burnt.side = THREE.DoubleSide;   // the hull in three, burnt near-black, open at the tears
  burnt.onBeforeCompile = sh => {                       // its torn rims glow, and cool
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aEdge; attribute float aHeat; varying float vGlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aEdge * aEdge * aHeat;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGlow;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.36, 0.07) * vGlow * 4.0;');
  };
  const heat = SHIP.pieces.map(pc => { const a = new THREE.InstancedBufferAttribute(new Float32Array(N), 1); pc.geo.setAttribute('aHeat', a); return a; });
  const shards = SHIP.pieces.map(pc => new THREE.InstancedMesh(pc.geo, burnt, N));
  const engines = spriteCloud(N * 3, 70), fire = spriteCloud(N * 3, 40), sparks = spriteCloud(N * 3, 24), dropFx = spriteCloud(96, 300);
  for (const m of [hulls, lamps, ...shards]) { m.frustumCulled = false; scene.add(m); }
  scene.add(engines.pts, fire.pts, sparks.pts, dropFx.pts);
  const R = 3, L = 9, prof = [];                       // the droplet: a round head, a long fine tail, perfectly smooth
  for (let i = 0; i <= 160; i++) { const a = i / 160, y = lerp(-L, R, a), r = y >= 0 ? Math.sqrt(Math.max(0, R * R - y * y)) : R * Math.pow(1 - (y / L) * (y / L), 1.1); prof.push(new THREE.Vector2(Math.max(r, 0.0001), y)); }   // head and tail meet with the same slope: no lip
  const cube = new THREE.WebGLCubeRenderTarget(512, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(2, 90000, cube);
  const droplet = new THREE.Mesh(new THREE.LatheGeometry(prof, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, envMap: cube.texture }));   // a pure mirror: no point-light dots
  scene.add(droplet);
  const v3 = (x, y, z) => new THREE.Vector3(x, y, -z), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(), m4 = new THREE.Matrix4(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const T0 = TRACK[0][0], DC = v3(T0[0] - 60, 45, T0[2] + 150);   // where the droplet waits, beyond the fleet's far edge, for the close-up
  function shipPos(s, t) {
    let X = s.x, Y = s.y, Z = s.z;
    if (s.run) { const u = Math.max(0, t - CUE.kills[1]); X += Math.sign(s.x || 1) * 70 * u * u; Z += 160 * u * u; Y += 14 * u * u; }   // away from the camera
    return v3(X, Y, Z);
  }
  function setShips(t) {
    engines.reset(); fire.reset(); sparks.reset();
    SHIPS.forEach((s, i) => {
      const p = shipPos(s, t), dt = t - s.tk, sz = s.sz * BIG;
      const on = ease(ramp(t, SC.fleet + s.row * 0.022, SC.fleet + s.row * 0.022 + 0.35));
      if (dt < 0) {                                      // alive: hull, lit windows, three blue drives
        q.setFromEuler(e.set(0, -s.hd * 0.5, 0)); one.setScalar(sz); m4.compose(p, q, one);
        hulls.setMatrixAt(i, m4); lamps.setMatrixAt(i, on > 0.02 ? m4 : ZERO);
        for (const [rx, ry, rz] of SHIP.rear) { const w = new THREE.Vector3(rx, ry, rz).multiplyScalar(sz).applyQuaternion(q).add(p); engines.add(w.x, w.y, w.z, 5 * sz, 0.62, 0.86, 1, 0.8 * on * (0.85 + 0.15 * Math.sin(t * 2 + s.dir * 5))); }
        for (const sh of shards) sh.setMatrixAt(i, ZERO);
        for (const a of heat) a.array[i] = 0;
      } else {                                           // dead: a white core, a fireball, three burnt chunks tumbling apart, sparks
        hulls.setMatrixAt(i, ZERO); lamps.setMatrixAt(i, ZERO);
        const cap = s.flag ? 3 : 1;
        fire.add(p.x, p.y, p.z, 12 * cap * sz, 1, 1, 1, 1.2 * Math.exp(-dt / 0.035));   // each death its own small point: a front, not a cloud
        fire.add(p.x, p.y, p.z, (14 + 10 * s.fr) * cap * sz * (0.5 + 0.5 * ease(clamp(dt / 0.12))), 1, 0.62, 0.28, 0.8 * Math.exp(-dt / 0.45));
        fire.add(p.x, p.y, p.z, 10 * sz, 1, 0.42, 0.15, (0.2 * Math.exp(-dt / 1.2) + 0.03 * Math.exp(-dt / 10)) * (0.5 + s.jit * 3.3));
        const open = 1 - Math.exp(-dt / 1.4);
        const gone = s.fr < 0.42 && !s.flag;              // some are simply gone: the field has gaps
        SHIP.pieces.forEach((pc, k) => {                 // fore, middle and aft of the hull, flung apart and tumbling
          if (gone) { shards[k].setMatrixAt(i, ZERO); return; }
          const fling = (k - 1) * 14 * sz * (open * 1.6 + 0.08 * dt) * (s.flag ? 1.6 : 1), up = (s.deb[k][2] / 30 + 0.3 * (k - 1)) * 12 * sz * (open + 0.05 * dt);
          q.setFromEuler(e.set((k - 1 + s.deb[k][0] - 3) * 0.3 * dt * (0.5 + s.fr), -s.hd * 0.5 + (k - 1) * 0.35 * dt, (s.deb[k][0] - 3) * 0.12 * dt));
          const c = pc.centre.clone().multiplyScalar(sz).applyQuaternion(q).add(p).add(new THREE.Vector3(s.deb[k][2] * 0.05 * dt, up, fling));
          one.setScalar(sz); m4.compose(c, q, one); shards[k].setMatrixAt(i, m4);
          heat[k].array[i] = Math.exp(-dt / 1.3) + (s.flag ? 0.35 * Math.exp(-dt / 6) : 0.08 * Math.exp(-dt / 7));   // the torn rim, cooling
        });
        for (const [d, v, vy] of s.deb) {
          const k = 1 - Math.exp(-dt / 1.5) + dt * 0.02, w = v3(s.x + Math.cos(d) * v * 1.5 * k, s.y + vy * k, s.z + Math.sin(d) * v * 1.5 * k);
          sparks.add(w.x, w.y, w.z, 5, 1, 0.48, 0.18, 0.22 * Math.exp(-dt / 2) + 0.05 * Math.exp(-dt / 12));   // a few embers, not a haze
        }
      }
    });
    for (const m of [hulls, lamps, ...shards]) m.instanceMatrix.needsUpdate = true;
    for (const a of heat) a.needsUpdate = true;
  }
  function setDroplet(t) {
    dropFx.reset();
    const close = t >= SC.drop && t < CUE.kills[0];
    let P, Pb;
    if (close) { P = DC.clone().add(new THREE.Vector3(0, 1.5 * Math.sin(t * 0.9), 0)); Pb = P.clone().add(new THREE.Vector3(0.12, 0.05, -1)); }   // hovering, nose to the fleet
    else if (t >= CUE.kills[0]) { const a = dropletAt(t), b = dropletAt(t - 0.01); P = v3(a[0], a[1], a[2]); Pb = v3(b[0], b[1], b[2]); }
    droplet.visible = !!P; if (!P) return;
    const dir = P.clone().sub(Pb); if (dir.lengthSq() < 1e-9) dir.set(0, 0, 1); dir.normalize();
    droplet.position.copy(P); droplet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);   // head first
    droplet.scale.setScalar(close ? 1 : 1.6);
    if (close) {                                         // it wakes: a glint runs down its length just before it strikes
      const w = ramp(t, CUE.kills[0] - 0.45, CUE.kills[0]);
      if (w > 0) { const g = P.clone().addScaledVector(dir, lerp(-L, R, w)).add(new THREE.Vector3(0, R * 0.7, 0)); dropFx.add(g.x, g.y, g.z, 18, 1, 1, 1, w); }
      return;
    }
    for (let j = 80; j >= 1; j--) {                      // a fine bright needle: its straight path through them
      const a = dropletAt(t - j * 0.008); if (!a) continue; const w = v3(a[0], a[1], a[2]);
      dropFx.add(w.x, w.y, w.z, 9 * (1 - j / 81) + 4, 0.8, 0.92, 1, 0.75 * (1 - j / 81));
    }
    dropFx.add(P.x, P.y, P.z, 26, 1, 1, 1, 1); dropFx.add(P.x, P.y, P.z, 70, 0.67, 0.84, 1, 0.5);   // and the droplet a white pin at its head
  }
  function setCam(t) {
    if (t >= SC.drop && t < CUE.kills[0]) {              // the close-up: in beside the droplet, the fleet's lights behind it
      const u = easeIO(ramp(t, SC.drop, SC.drop + 3.8)), D = lerp(110, 15, u), az = lerp(1.45, 1.15, u), el = lerp(0.12, 0.02, u);   // three-quarter: the tail shows
      cam.position.copy(DC).add(new THREE.Vector3(Math.sin(az) * Math.cos(el) * D, Math.sin(el) * D, Math.cos(az) * Math.cos(el) * D));   // between it and the fleet: its face mirrors the fleet behind us
      cam.up.set(0, 1, 0); cam.lookAt(DC.clone().add(new THREE.Vector3(-1.5, 0, -2))); cam.clearViewOffset(); cam.updateProjectionMatrix();
      return;
    }
    const c = camAt(t), crane = easeIO(ramp(t, SC.ember + 3.4, SC.ember + 7.0));
    const p = c.pitch - 0.85 * crane, y = c.yaw || 0;    // the crane: tilting up and away off the wreck field
    const f = new THREE.Vector3(Math.sin(y) * Math.cos(p), -Math.sin(p), -Math.cos(y) * Math.cos(p));
    const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), up0 = new THREE.Vector3().crossVectors(right, f);
    cam.position.set(c.x, c.y, -c.z); cam.up.copy(up0.multiplyScalar(Math.cos(c.roll)).addScaledVector(right, -Math.sin(c.roll)));
    cam.lookAt(cam.position.clone().add(f));
    cam.setViewOffset(W, H, 0, H / 2 - c.cy, W, H);       // the film's horizon sat at cy, not mid-frame
    cam.updateProjectionMatrix();
  }
  function draw(t) {
    setShips(t); setDroplet(t); setCam(t);
    for (const c of [engines, fire, sparks, dropFx]) c.commit(cam);
    return GL.draw(scene, cam, { strength: 0.9, radius: 0.45, threshold: 0.62 });
  }
  function bake() {                                       // the droplet's reflections: the fleet as seen from where it waits, once
    const dome = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,   // a faint studio of space: its shape reads
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec3 vD; void main(){ float u = vD.y * 0.5 + 0.5; gl_FragColor = vec4(mix(vec3(0.0), vec3(0.16, 0.19, 0.26), smoothstep(0.45, 1.0, u)) + vec3(0.05, 0.06, 0.08) * exp(-pow((vD.y - 0.05) / 0.12, 2.0)) + vec3(1.0, 0.98, 0.95) * 1.4 * exp(-pow((vD.y - 0.62) / 0.05, 2.0)) * smoothstep(-0.2, 0.5, vD.x), 1.0); }' }));   // and a long soft strip light overhead
    setShips(SC.drop + 2); droplet.visible = sky.visible = false; scene.add(dome);   // from a little above the slab: the fleet's lights a broad band round it
    cubeCam.position.set(DC.x, 22, DC.z); cubeCam.update(GL.renderer, scene); scene.remove(dome); droplet.visible = sky.visible = true;
  }
  return { draw, bake, scene, cam };
})();
