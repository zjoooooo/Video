// The escape, on Pluto, as the novel has it: the Earth civilization museum's stone tablets, cut from Pluto's dark ice
// and carved with the word for humanity in the scripts of the Earth, frost lying in the letters; the Halo standing in
// front of them, lifting off; and low on the horizon the flattened Solar System, a band of light seen edge-on with the
// Sun's image burning on it, swelling as it closes in. At LS the Halo jumps: it stretches into a streak and is gone.
const HUMANITY = [                                     // the word for a person, or for humanity, in the scripts of the Earth
  ['𒇽', '"Noto Sans Cuneiform"'], ['𓀀𓁐', '"Noto Sans Egyptian Hieroglyphs"'], ['人类', '"Songti SC"'], ['ἄνθρωπος', '"Times New Roman"'],
  ['HVMANITAS', '"Times New Roman"'], ['الإنسانية', '"Geeza Pro"'], ['אנושות', '"Times New Roman"'], ['मानवता', '"Kohinoor Devanagari"'],
  ['ЧЕЛОВЕЧЕСТВО', '"Times New Roman"'], ['人類', '"Hiragino Mincho ProN"'], ['HUMANITY', '"Times New Roman"'],
];
function carve(g, s, font, x, y, size, align = 'center') {   // letters cut into stone: a dark cut and a lit lower lip
  g.font = `${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(245,238,228,0.8)'; g.fillText(s, x + size * 0.035, y + size * 0.045);
  g.fillStyle = 'rgba(22,17,14,0.96)'; g.fillText(s, x, y);
}
const PLU = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 30000);
  const stars = GL.stars(23, 9000, 12000); stars.material.fog = false;
  scene.add(stars, MILKY.sky(1.2, [0.05, 0.42, -0.9], -0.35, -0.5));
  scene.fog = new THREE.Fog(0x040508, 22, 75);          // the ground goes dark toward the horizon
  const noise = (w, h, seed, base, spread, blots) => GL.canvasTex(w, h, (g) => {   // mottled ice: speckle, then soft blotches light and dark
    const r = rng(seed), d = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = base + spread * r() * r(); d.data.set([v * 0.94, v * 0.97, v, 255], i * 4); }
    g.putImageData(d, 0, 0);
    for (let i = 0; i < blots; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '20,22,28' : '200,206,216'},${0.04 + 0.07 * r()})`; g.beginPath(); g.arc(r() * w, r() * h, 6 + w * 0.06 * r(), 0, TAU); g.fill(); }
  });
  const ice = GL.canvasTex(1024, 1024, (g, w) => {      // regolith: soft patches of frost and grit at three scales, tiling seamlessly
    const r = rng(61); g.fillStyle = '#6c7179'; g.fillRect(0, 0, w, w);
    for (const [n, s0, s1, a] of [[40, 120, 300, 0.12], [320, 20, 80, 0.12], [2600, 3, 12, 0.14]]) for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * w, sz = s0 + (s1 - s0) * r(), light = r() < 0.5;
      for (const ox of [-w, 0, w]) for (const oy of [-w, 0, w]) {
        if (x + ox + sz < 0 || x + ox - sz > w || y + oy + sz < 0 || y + oy - sz > w) continue;
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, sz);
        gr.addColorStop(0, light ? `rgba(214,220,232,${a})` : `rgba(12,13,17,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(x + ox - sz, y + oy - sz, 2 * sz, 2 * sz);
      }
    }
  });
  ice.wrapS = ice.wrapT = THREE.RepeatWrapping; ice.repeat.set(90, 45); ice.anisotropy = 8;
  const GR = 900;                                        // Pluto's surface: a big sphere, its horizon curving away
  const ground = new THREE.Mesh(new THREE.SphereGeometry(GR, 360, 180), new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.92, map: ice, bumpMap: ice, bumpScale: 0.9 }));
  ground.position.set(0, -GR, 0); ground.rotation.x = Math.PI / 2; scene.add(ground);   // its uv pole off on the horizon, not underfoot
  const warm = new THREE.DirectionalLight(0xffe2b8, 1.1); warm.position.set(-2, 0.35, -6); scene.add(warm);   // the 2D Sun on the horizon: a rim on every stone
  const rake = new THREE.DirectionalLight(0xffe9cc, 1.6); rake.position.set(-9, 1.1, 2.2); scene.add(rake);    // low and from the side: it grazes the faces, every cut casts a shadow
  scene.add(new THREE.HemisphereLight(0x3a4a66, 0x0c0b0a, 0.35));
  const side = new THREE.MeshStandardMaterial({ color: 0x5c5f66, roughness: 0.88, map: noise(256, 256, 7, 70, 60, 60), bumpMap: noise(256, 256, 8, 90, 80, 80), bumpScale: 1.2 });
  const tabletFace = (words, seed, w, h) => {            // dark stone, the letters cut deep and frost lying in them
    const draw = frost => GL.canvasTex(512, 1024, (g, cw, ch) => {
      const r = rng(seed), d = g.createImageData(cw, ch);
      for (let i = 0; i < cw * ch; i++) { const v = frost ? 150 + 40 * r() : 52 + 34 * r() * r(); d.data.set([v * 0.93, v * 0.96, v, 255], i * 4); }
      g.putImageData(d, 0, 0);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.6 ? '10,10,14' : '120,126,138'},${0.05 + 0.08 * r()})`; g.beginPath(); g.arc(r() * cw, r() * ch, 4 + 40 * r(), 0, TAU); g.fill(); }
      words.forEach(([s, font], i) => {
        const y = 240 + i * (ch - 480) / Math.max(1, words.length - 1);   // inset from the bevels
        g.font = `100px ${font}`; const size = Math.min(150, 100 * cw * 0.78 / g.measureText(s).width);
        g.font = `${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = frost ? 'rgba(18,18,22,1)' : 'rgba(214,222,234,0.92)'; g.fillText(s, cw / 2, y);   // frost in the cuts; in the bump map, the cuts are low
      });
    });
    const map = draw(false), bump = draw(true);
    for (const t of [map, bump]) { t.repeat.set(1 / w, 1 / h); t.offset.set(0.5, 0.5); }   // the extruded face's uv is the shape's own x, y
    return new THREE.MeshStandardMaterial({ roughness: 0.82, map, bumpMap: bump, bumpScale: 2.2 });
  };
  const sets = [[0, 2, 4], [1, 3, 5], [6, 7, 8], [9, 10, 2], [4, 0, 1]];
  const tablets = sets.map((ix, i) => {
    const w = 2.6, h = 5.2 + 1.4 * Math.sin(i * 2.1), sh = new THREE.Shape([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 4, curveSegments: 1 }).translate(0, 0, -0.21);
    const m = new THREE.Mesh(geo, [tabletFace(ix.map(k => HUMANITY[k]), 100 + i, w, h), side]);
    m.position.set(-7.5 + i * 3.6 + Math.sin(i * 1.7) * 0.6, h / 2 - 0.25, -4 - 1.6 * Math.cos(i * 1.3)); m.rotation.set(0, 0.35 - i * 0.16, 0.02 * Math.sin(i * 3));
    scene.add(m); return m;
  });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uNear: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uNear; varying vec2 vUv;
      void main(){                                      // the flattened Solar System, edge-on: a line of light, the Sun's image a lens of fire on it
        float y = (vUv.y - 0.5) * 2.0, x = vUv.x - 0.5;
        float core = exp(-y * y / (0.002 + 0.06 * uNear * uNear));
        vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + x * 9.0 - uT * 0.08));
        float sun = exp(-pow((x + 0.06) / (0.05 + 0.05 * uNear), 2.0)) * exp(-y * y / (0.01 + 0.08 * uNear));
        float wave = 0.75 + 0.25 * sin(x * 160.0 - uT * 9.0);   // its edge, rippling as it comes
        vec3 c = mix(vec3(1.0, 0.93, 0.8), film, 0.35) * core * (0.6 + 2.2 * uNear) * wave + vec3(1.0, 0.82, 0.5) * sun * (2.2 + 2.0 * uNear);
        gl_FragColor = vec4(c * smoothstep(0.5, 0.35, abs(x)), 1.0);
      }` }));
  band.position.set(-400, 260, -6000); band.scale.set(26000, 900, 1); band.rotation.z = 0.035; scene.add(band);
  const metal = new THREE.MeshStandardMaterial({ color: 0xd8dee6, metalness: 0.9, roughness: 0.22, envMap: MILKY.skyTex, envMapIntensity: 1.4 });
  const halo = new THREE.Group(), ship = new THREE.Group();   // the Halo: a slim spindle through a glowing ring, on three legs
  const prof = [];
  for (let i = 0; i <= 80; i++) { const u = i / 80; prof.push(new THREE.Vector2(0.015 + 0.26 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.65), lerp(-1, 1.1, u))); }
  const hull = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), metal);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x9fe6ff, emissive: 0x6fd8ff, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.04, 24, 160), ringMat); ring.position.y = -0.3; ring.rotation.x = Math.PI / 2;
  const parts = [0, 1, 2].flatMap(i => {
    const a = i * TAU / 3, strut = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.025, 0.06), metal); strut.position.set(0.44 * Math.cos(a), -0.3, 0.44 * Math.sin(a)); strut.rotation.y = -a;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 0.9, 10), metal); leg.position.set(0.32 * Math.cos(a), -1.05, 0.32 * Math.sin(a)); leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    return [strut, leg];
  });
  const drive = GL.glowSprite(0x9fe6ff, 1.2, 0); drive.position.y = -1.05;
  ship.add(hull, ring, ...parts); halo.add(ship, drive);
  halo.position.set(2.3, 1.42, 1.2); halo.rotation.z = -0.04; scene.add(halo);   // in the foreground, standing on its legs
  const jump = GL.glowSprite(0xffffff, 1, 0); scene.add(jump);
  const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xcff0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(streak);
  const LIFT = SC.escape + 1.6;
  const climb = t => { const l = Math.max(0, Math.min(t, LS) - LIFT); return 0.08 * Math.pow(l, 2.5); };   // it lifts off, still in frame when it jumps
  function draw(t) {
    const up = climb(t), j = t - LS;
    halo.position.y = 1.42 + up; halo.position.x = 2.3 + 0.05 * up;
    const s = j > 0 ? 1 + 140 * ease(clamp(j / 0.16)) : 1;   // the jump: it stretches into a streak and is out of frame
    ship.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s)); ship.position.y = j > 0 ? 0.9 * (s - 1) : 0; ship.visible = j < 0.22;
    ringMat.emissiveIntensity = 1.6 + 3 * ease(ramp(t, LS - 1.2, LS));
    drive.material.opacity = t > LIFT && j < 0 ? 0.6 + 0.4 * ease(ramp(t, LS - 1.2, LS)) : 0; drive.scale.setScalar(1.2 + 2.5 * ramp(t, LS - 1.2, LS));
    jump.position.copy(halo.position); jump.scale.setScalar(7); jump.material.opacity = j >= 0 ? Math.exp(-j / 0.12) : 0;
    streak.visible = j >= 0; streak.material.opacity = j >= 0 ? 0.9 * Math.exp(-j / 0.7) : 0;     // the line it left, fading
    streak.scale.set(1, 400, 1); streak.position.set(halo.position.x, halo.position.y + 200, halo.position.z); streak.rotation.z = -0.04;
    const near = ease(ramp(t, SC.escape, BACK0));        // the plane coming on: its line swells and brightens
    band.material.uniforms.uT.value = t; band.material.uniforms.uNear.value = near;
    rake.intensity = 1.6 + 1.2 * (j >= 0 ? Math.exp(-j / 0.25) : 0);   // the jump lights the stones, briefly
    const k = easeIO(ramp(t, SC.escape, BACK0));         // low among the tablets, pushing in; looking up a little after the ship
    cam.position.set(lerp(-1.4, -0.4, k), lerp(1.5, 1.7, k), lerp(11, 9.2, k)); cam.up.set(0, 1, 0);
    cam.lookAt(lerp(1.0, 0.9, k), lerp(3.0, 3.2, k) + up * 0.3, -12);
    cam.updateProjectionMatrix();
    return GL.draw(scene, cam, { strength: 0.8, radius: 0.5, threshold: 0.75 });
  }
  return { draw, scene, cam };
})();
