// The Doomsday Battle in 3D. Everything the art director passed in 2D is kept: each ship's place, the droplet's tracks,
// each ship's death time (SHIPS[i].tk, the first blast along the track to reach it) and the camera (camAt). Film
// coordinates (z away from the camera) map to three.js with z negated.
const FLEET = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(2 * Math.atan(H / 2 / F) * 180 / Math.PI, W / H, 2, 90000);
  scene.add(GL.stars(31, 10000, 45000), GL.milkyDome(5, 0.28, 0.5));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4); key.position.set(-1, 0.9, 0.5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 0.8); rim.position.set(1, 0.25, -1); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x6a7ea6, 0x14100c, 0.75));
  const sunStar = GL.glowSprite(0xfff4dc, 2600, 1); sunStar.position.copy(key.position).normalize().multiplyScalar(40000); scene.add(sunStar);   // the Sun, from out here a hard bright star
  const N = SHIPS.length, BIG = 1.6;                    // ships drawn 1.6x: a packed, imposing formation
  const hulls = new THREE.InstancedMesh(SHIP.hull, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.42 }), N);
  const lamps = new THREE.InstancedMesh(SHIP.lights, new THREE.MeshBasicMaterial({ vertexColors: true }), N);
  const shards = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x4a3a2c, metalness: 0.35, roughness: 0.75 }), N * 3);
  const engines = spriteCloud(N * 3, 70), fire = spriteCloud(N * 3, 64), sparks = spriteCloud(N * 3, 30), dropFx = spriteCloud(48, 700);
  for (const m of [hulls, lamps, shards]) { m.frustumCulled = false; scene.add(m); }
  scene.add(engines.pts, fire.pts, sparks.pts, dropFx.pts);
  const R = 3, L = 9, prof = [];                       // the droplet: a round head, a long fine tail, perfectly smooth
  for (let i = 0; i <= 96; i++) { const a = i / 96, y = lerp(-L, R, a), r = y >= 0 ? Math.sqrt(Math.max(0, R * R - y * y)) : R * Math.pow(1 + y / L, 1.6); prof.push(new THREE.Vector2(Math.max(r, 0.0001), y)); }
  const cube = new THREE.WebGLCubeRenderTarget(512, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(2, 90000, cube);
  const droplet = new THREE.Mesh(new THREE.LatheGeometry(prof, 160), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02, envMap: cube.texture, envMapIntensity: 2.2 }));
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
        for (let k = 0; k < 3; k++) shards.setMatrixAt(i * 3 + k, ZERO);
      } else {                                           // dead: a white core, a fireball, three burnt chunks tumbling apart, sparks
        hulls.setMatrixAt(i, ZERO); lamps.setMatrixAt(i, ZERO);
        const cap = s.flag ? 3 : 1;
        fire.add(p.x, p.y, p.z, Math.min(30 * cap, 26) * sz, 1, 1, 1, 1.3 * Math.exp(-dt / 0.035));
        fire.add(p.x, p.y, p.z, (40 + 40 * s.fr) * sz * (0.5 + 0.5 * ease(clamp(dt / 0.12))), 1, 0.66, 0.3, 0.95 * Math.exp(-dt / 0.5));
        fire.add(p.x, p.y, p.z, 26 * sz, 1, 0.42, 0.15, (0.22 * Math.exp(-dt / 1.2) + 0.04 * Math.exp(-dt / 10)) * (0.5 + s.jit * 3.3));
        const open = 1 - Math.exp(-dt / 1.4);
        for (let k = 0; k < 3; k++) {                    // fore, middle and aft of the hull, flung apart and turning
          const ax = (k - 1) * 13 * sz * (open * 1.6 + 0.05 * dt) * (s.flag ? 1.6 : 1), up = (s.fr - 0.5 + 0.3 * (k - 1)) * 6 * sz * open;
          const c = new THREE.Vector3(s.deb[k][2] * 0.05 * dt, up, -ax).add(p);
          q.setFromEuler(e.set((k + 1) * 0.4 * dt * (0.5 + s.fr), (k - 1) * 0.7 + 0.3 * dt, s.deb[k][0] + 0.2 * dt));
          m4.compose(c, q, new THREE.Vector3(6 * sz, 2.2 * sz, 2.2 * sz)); shards.setMatrixAt(i * 3 + k, m4);
          sparks.add(c.x, c.y, c.z, 7 * sz, 1, 0.55, 0.2, 0.85 * Math.exp(-dt / 0.9) + (s.flag ? 0.35 * Math.exp(-dt / 5) : 0));   // their torn edges, cooling
        }
        for (const [d, v, vy] of s.deb) {
          const k = 1 - Math.exp(-dt / 1.5) + dt * 0.02, w = v3(s.x + Math.cos(d) * v * 1.5 * k, s.y + vy * k, s.z + Math.sin(d) * v * 1.5 * k);
          sparks.add(w.x, w.y, w.z, 5, 1, 0.48, 0.18, 0.55 * Math.exp(-dt / 2) + 0.14 * Math.exp(-dt / 12));
        }
      }
    });
    hulls.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = shards.instanceMatrix.needsUpdate = true;
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
    for (let j = 16; j >= 1; j--) {                      // the cyan wake
      const a = dropletAt(t - j * 0.01); if (!a) continue; const w = v3(a[0], a[1], a[2]);
      dropFx.add(w.x, w.y, w.z, 60 * (1 - j / 17), 0.75, 0.9, 1, 0.55 * (1 - j / 17));
    }
    dropFx.add(P.x, P.y, P.z, 90, 1, 1, 1, 1); dropFx.add(P.x, P.y, P.z, 220, 0.67, 0.84, 1, 0.7);
    for (const K of CUE.kills) if (t >= K && t < K + 1.5) dropFx.add(P.x, P.y, P.z, 2400, 1, 1, 1, 0.4 * Math.exp(-(t - K) / 0.3));   // the hit: bloom where it strikes
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
    setShips(SC.drop + 2); droplet.visible = false; cubeCam.position.copy(DC); cubeCam.update(GL.renderer, scene); droplet.visible = true;
  }
  return { draw, bake, scene, cam };
})();
