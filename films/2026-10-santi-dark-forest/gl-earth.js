// "人类倾尽两个世纪，造出两千余艘恒星级战舰": the fleet leaving Earth. On the 0:11 hit the warships light their drives
// in Earth orbit and stream up past us into deep space; Earth fills the lower frame, day side and the city lights of its
// night side, under a rim of atmosphere. The cut to the assembled formation comes on "它们列成方阵".
const LEAVE = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, W / H, 5, 200000);
  scene.add(GL.stars(41, 9000, 60000), MILKY.sky(0.9, [0.2, 0.32, -0.93], -0.7, 0.4));
  const SUN = new THREE.Vector3(-1, 0.32, 0.45).normalize();
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2); key.position.copy(SUN); scene.add(key);
  scene.add(new THREE.HemisphereLight(0x4a6a9a, 0x080a10, 0.55));
  const R = 2600, C = new THREE.Vector3(-1700, -3300, -8200);
  const day = GL.tex(GE + 'images/solar-system/earth.jpg'), night = GL.tex(GE + 'images/solar-system/earth-night.jpg'), clouds = GL.tex(GE + 'images/solar-system/earth-clouds.png');
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 256, 128), new THREE.ShaderMaterial({
    uniforms: { uDay: { value: day }, uNight: { value: night }, uClouds: { value: clouds }, uSun: { value: SUN }, uSpin: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN, vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D uDay, uNight, uClouds; uniform vec3 uSun; uniform float uSpin; varying vec2 vUv; varying vec3 vN, vW;
      void main(){
        vec2 uv = vec2(vUv.x + uSpin, vUv.y);
        float l = dot(vN, uSun), d = smoothstep(-0.08, 0.22, l);          // day, through a soft terminator
        float cl = texture2D(uClouds, uv + vec2(0.002, 0.0)).a;
        vec3 c = texture2D(uDay, uv).rgb * (0.08 + 1.05 * max(l, 0.0));
        c = mix(c, vec3(1.0) * (0.05 + 1.1 * max(l, 0.0)), cl * 0.85);
        vec3 city = texture2D(uNight, uv).rgb * vec3(1.0, 0.82, 0.55) * 1.6 * (1.0 - cl * 0.7);
        vec3 V = normalize(cameraPosition - vW); float rim = pow(1.0 - max(dot(vN, V), 0.0), 3.0);
        gl_FragColor = vec4(mix(city, c, d) + vec3(0.35, 0.6, 1.0) * rim * (0.15 + 0.85 * d) * 0.7, 1.0);
      }` }));
  earth.position.copy(C); earth.rotation.set(0.35, -1.9, 0.1); scene.add(earth);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 192, 96), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uSun: { value: SUN } },
    vertexShader: 'varying float vRim, vDay; uniform vec3 uSun; void main(){ vec3 n = normalize(normalMatrix * normal); vRim = pow(1.0 - abs(n.z), 2.6); vDay = dot(normalize(mat3(modelMatrix) * normal), uSun); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying float vRim, vDay; void main(){ gl_FragColor = vec4(vec3(0.45, 0.72, 1.0), vRim * 1.1 * (0.06 + 0.94 * smoothstep(-0.3, 0.3, vDay))); }' }));
  atmo.position.copy(C); scene.add(atmo);
  const n = 141, r = rng(303), ships = [];               // the departing ships: columns rising out of orbit, staggered; the last passes close
  const DIR = new THREE.Vector3(0.5, 0.16, 0.85).normalize();   // out past us and to the right, under the title
  for (let i = 0; i < n; i++) {
    const col = i % 7, row = Math.floor(i / 7);
    ships.push({ base: new THREE.Vector3(-900 + col * 240 + (r() - 0.5) * 90, -620 + (r() - 0.5) * 120 - col * 22, -1500 - row * 230 + (r() - 0.5) * 90),   // a broad river of ships, its nearest close by
                 delay: row * 0.08 + r() * 0.15, acc: 70 + 40 * r(), sz: 1.4 + 0.8 * r() });
  }
  ships[n - 1] = { base: new THREE.Vector3(-150, -95, -420), delay: 0.5, acc: 34, sz: 1.5 };   // right past the camera
  const hulls = new THREE.InstancedMesh(SHIP.hull, SHIP.material(), n);
  const lamps = new THREE.InstancedMesh(SHIP.lights, new THREE.MeshBasicMaterial({ vertexColors: true }), n);
  const drives = spriteCloud(n * 20, 90);
  for (const m of [hulls, lamps]) { m.frustumCulled = false; scene.add(m); }
  scene.add(drives.pts);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), DIR), m4 = new THREE.Matrix4();
  function draw(t) {
    const u = t - SC.fleet;
    earth.material.uniforms.uSpin.value = t * 0.002;
    drives.reset();
    ships.forEach((s, i) => {
      const a = Math.max(0, u - s.delay), lit = ease(clamp(a / 0.25));   // each lights its drives in turn on the hit, then climbs harder and harder
      const at = b => s.base.clone().addScaledVector(DIR, 0.5 * s.acc * b * b + 40 * b), p = at(a);
      m4.compose(p, q, new THREE.Vector3(s.sz, s.sz, s.sz)); hulls.setMatrixAt(i, m4); lamps.setMatrixAt(i, m4);
      for (const [rx, ry, rz] of SHIP.rear) {
        const w = new THREE.Vector3(rx, ry, rz).multiplyScalar(s.sz).applyQuaternion(q).add(p);
        drives.add(w.x, w.y, w.z, 3.2 * s.sz * (1 + 0.6 * lit), 0.6, 0.85, 1, 0.95 * lit);
        for (let k = 1; k <= 4; k++) {                   // and a short streak of exhaust behind it
          const b = Math.max(0, a - k * 0.05), d = at(a).sub(at(b)); if (a <= 0) break;
          drives.add(w.x - d.x, w.y - d.y, w.z - d.z, 2.6 * s.sz, 0.5, 0.75, 1, 0.5 * lit * (1 - k / 5));
        }
        if (a > 0 && a < 0.6) drives.add(w.x, w.y, w.z, 12 * s.sz, 1, 1, 1, 0.7 * Math.exp(-a / 0.1));   // ignition flash
      }
    });
    hulls.instanceMatrix.needsUpdate = lamps.instanceMatrix.needsUpdate = true;
    const k = easeIO(ramp(t, SC.fleet, SC.fleet + 7.2));   // a slow drift, turning a little to follow them out
    cam.position.set(lerp(-160, 60, k), lerp(-60, 40, k), lerp(0, -120, k));   // Earth low in frame, the title in open space above
    cam.up.set(0, 1, 0); cam.lookAt(lerp(-600, -200, k), lerp(-420, -150, k), -6400);
    cam.updateProjectionMatrix();
    drives.commit(cam);
    return GL.draw(scene, cam, { strength: 0.85, radius: 0.5, threshold: 0.7 });
  }
  return { draw, scene, cam };
})();
