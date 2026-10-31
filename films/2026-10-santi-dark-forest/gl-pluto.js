// The escape, on Pluto, as the novel has it: the Earth civilization museum's stone tablets, carved with the word for
// humanity in the scripts of the Earth; the Halo lifting off past them; and low in the sky the flattened Solar System,
// a band of light seen edge-on with the Sun's image burning on it, brighter as it closes in. At LS the Halo jumps.
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
  scene.add(GL.stars(23, 9000, 12000), MILKY.sky(1.2, [0.05, 0.42, -0.9], -0.35, -0.5));
  const ice = GL.canvasTex(1024, 1024, (g, w, h) => {   // frost: speckle and soft blotches, tiled across the ground
    const r = rng(61), d = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = 150 + 60 * r() * r(); d.data.set([v, v * 0.95, v * 0.9, 255], i * 4); }
    g.putImageData(d, 0, 0);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,80,72' : '230,225,220'},${0.05 + 0.08 * r()})`; g.beginPath(); g.arc(r() * w, r() * h, 8 + 60 * r(), 0, TAU); g.fill(); }
  });
  ice.wrapS = ice.wrapT = THREE.RepeatWrapping; ice.repeat.set(90, 45);
  const GR = 900;                                        // Pluto's surface: a big sphere, its horizon curving away
  const ground = new THREE.Mesh(new THREE.SphereGeometry(GR, 360, 180), new THREE.MeshStandardMaterial({ color: 0xc9bdb0, roughness: 0.95, map: ice, bumpMap: ice, bumpScale: 0.8 }));
  ground.position.set(0, -GR, 0); scene.add(ground);
  const warm = new THREE.DirectionalLight(0xffe2b8, 0.9); warm.position.set(-2, 0.35, -6); scene.add(warm);   // the 2D Sun on the horizon: a rim on every stone
  const rake = new THREE.DirectionalLight(0xdfe8ff, 1.05); rake.position.set(-7, 3, 6); scene.add(rake);       // a low raking light from our side: the carvings catch shadow
  scene.add(new THREE.HemisphereLight(0x405070, 0x1a1410, 0.4));
  const stone = GL.canvasTex(256, 256, (g, w, h) => { const r = rng(7), d = g.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = 110 + 50 * r(); d.data.set([v, v * 0.96, v * 0.92, 255], i * 4); } g.putImageData(d, 0, 0); });
  const tabletFace = (words, seed) => GL.canvasTex(512, 1024, (g, w, h) => {
    const r = rng(seed), d = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = 128 + 46 * r() * r(); d.data.set([v, v * 0.96, v * 0.91, 255], i * 4); }
    g.putImageData(d, 0, 0);
    words.forEach(([s, font], i) => carve(g, s, font, w / 2, 170 + i * (h - 300) / Math.max(1, words.length - 1), s.length > 6 ? 54 : 110));
    g.globalAlpha = 0.5;                               // beneath, rows of small writing, too fine to read from here
    for (let y = h - 120; y < h - 30; y += 22) carve(g, HUMANITY.map(x => x[0]).join(' ').slice(0, 40), '"Times New Roman"', w / 2, y, 16);
    g.globalAlpha = 1;
  });
  const sets = [[0, 2, 4], [1, 3, 5], [6, 7, 8], [9, 10, 2], [4, 0, 1]];
  const tablets = sets.map((ix, i) => {
    const face = tabletFace(ix.map(k => HUMANITY[k]), 100 + i);
    const side = new THREE.MeshStandardMaterial({ color: 0x8c8278, roughness: 0.9, map: stone });
    const front = new THREE.MeshStandardMaterial({ roughness: 0.85, map: face, bumpMap: face, bumpScale: 0.12 });
    const h = 5.2 + 1.4 * Math.sin(i * 2.1), m = new THREE.Mesh(new THREE.BoxGeometry(2.6, h, 0.5), [side, side, side, side, front, side]);
    m.position.set(-7.5 + i * 3.6 + Math.sin(i * 1.7) * 0.6, h / 2 - 0.2, -4 - 1.6 * Math.cos(i * 1.3)); m.rotation.set(0, 0.35 - i * 0.16, 0.02 * Math.sin(i * 3));
    scene.add(m); return m;
  });
  const band = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uNear: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT, uNear; varying vec2 vUv;
      void main(){                                      // the flattened Solar System, edge-on: a thin line of colour, the Sun's image a lens of fire on it
        float y = (vUv.y - 0.5) * 2.0, x = vUv.x - 0.5;
        float core = exp(-y * y / (0.002 + 0.02 * uNear));
        vec3 film = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + x * 9.0 - uT * 0.08));
        float sun = exp(-pow((x + 0.06) / 0.05, 2.0)) * exp(-y * y / (0.01 + 0.05 * uNear));
        vec3 c = film * core * (0.6 + 0.9 * uNear) + vec3(1.0, 0.82, 0.5) * sun * 2.2 + vec3(1.0) * core * 0.4;
        gl_FragColor = vec4(c * smoothstep(0.5, 0.35, abs(x)), 1.0);
      }` }));
  band.position.set(-400, 260, -6000); band.scale.set(26000, 900, 1); band.rotation.z = 0.035; scene.add(band);
  const halo = new THREE.Group();                        // the Halo: a slim hull through a glowing ring
  const metal = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 0.85, roughness: 0.25 });
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.3, 4.4, 48), metal); hull.position.y = 2.2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.07, 24, 120), new THREE.MeshStandardMaterial({ color: 0x9fe6ff, emissive: 0x6fd8ff, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.3 }));
  ring.position.y = 1.7; ring.rotation.x = Math.PI / 2;
  const fins = [0, 1, 2].map(i => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.7), metal); f.position.set(0.32 * Math.cos(i * TAU / 3), 0.5, 0.32 * Math.sin(i * TAU / 3)); f.rotation.y = -i * TAU / 3; return f; });
  const drive = GL.glowSprite(0x9fe6ff, 3, 0); drive.position.y = -0.1;
  halo.add(hull, ring, ...fins, drive); halo.position.set(6.5, 0, -7.5); scene.add(halo);
  const jump = GL.glowSprite(0xffffff, 1, 0); scene.add(jump);
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(trail);
  function draw(t) {
    const lift = t - (SC.escape + 1.6), up = lift > 0 ? 0.6 * lift * lift * lift : 0;   // it lifts off, then climbs harder and harder
    halo.position.y = Math.min(up, 60); halo.position.x = 6.5 + 0.08 * up; halo.visible = t < LS;
    halo.children[1].material.emissiveIntensity = 1.6 + 2.5 * ease(ramp(t, LS - 1.2, LS));
    drive.material.opacity = lift > 0 ? 0.6 + 0.4 * ease(ramp(t, LS - 1.2, LS)) : 0; drive.scale.setScalar(3 + 4 * ramp(t, LS - 1.2, LS));
    const j = t - LS;                                    // the jump: a flash where it was, and a line of light up into the sky
    jump.position.copy(halo.position).setY(Math.min(up, 60) + 2); jump.scale.setScalar(80); jump.material.opacity = j >= 0 ? Math.exp(-j / 0.25) : 0;
    trail.visible = j >= 0; trail.material.opacity = j >= 0 ? Math.exp(-j / 2.2) * 0.9 : 0;
    trail.scale.set(1, 3000, 1); trail.position.set(halo.position.x + 40, Math.min(up, 60) + 1500, halo.position.z - 300); trail.rotation.z = -0.03;
    const near = ease(ramp(t, SC.escape, BACK0 + 1));    // the plane coming on: its line thickens and brightens
    band.material.uniforms.uT.value = t; band.material.uniforms.uNear.value = near;
    const k = easeIO(ramp(t, SC.escape, BACK0));         // low before the tablets, pushing slowly in; the ship climbs out of frame
    const look = new THREE.Vector3(lerp(1.5, 0.4, k), lerp(4.2, 3.4, k) + Math.min(2.5, up * 0.05), -12);
    rake.intensity = 1.05 + 3.5 * (j >= 0 ? Math.exp(-j / 0.35) : 0);   // the jump lights every stone
    cam.position.set(lerp(-1.2, 0.4, k), lerp(1.6, 1.9, k), lerp(11, 7.5, k)); cam.up.set(0, 1, 0); cam.lookAt(look);
    cam.updateProjectionMatrix();
    return GL.draw(scene, cam, { strength: 0.85, radius: 0.5, threshold: 0.72 });
  }
  return { draw, scene, cam };
})();
