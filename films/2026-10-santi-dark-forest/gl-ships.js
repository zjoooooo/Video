// Shared pieces for the ships: a stellar-class warship built from parts and merged into one geometry (plus a second
// geometry for its lights, and its hull broken in three for the wrecks), plated in a painted panel texture; and a
// cloud of additive point-sprites for engines, fireballs and embers.
function mergeParts(parts) {                          // [geometry, matrix, colour] -> one non-indexed geometry: normals, uvs, vertex colours
  const pos = [], nor = [], uv = [], col = [];
  for (const [g, m, c] of parts) {
    const geo = g.clone().applyMatrix4(m), flat = geo.index ? geo.toNonIndexed() : geo;   // a cylinder's normals stay smooth, a box's flat
    const p = flat.attributes.position.array, n = flat.attributes.normal.array, t = flat.attributes.uv.array, cc = new THREE.Color(c);
    for (let i = 0, j = 0; i < p.length; i += 3, j += 2) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); uv.push(t[j], t[j + 1]); col.push(cc.r, cc.g, cc.b); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
const SHIP = (() => {                                  // nose to -z, engines to +z, about 36 units long
  const r = rng(808), HULL = '#b9a47c', DARK = '#57524b', PLATE = '#8c8578';
  const along = g => g.rotateX(Math.PI / 2);           // cylinders lie along z, their top radius at +z (the stern)
  const wing = s => {                                  // a swept wing, bevelled, lying in the x-z plane
    const sh = new THREE.Shape([[0, -4.2], [4.4 * s, -1.2], [4.6 * s, 3.6], [0, 4.6]].map(([x, z]) => new THREE.Vector2(x, z)));
    return new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2, curveSegments: 1 }).rotateX(Math.PI / 2).translate(0, 0.18, 0);
  };
  const parts = [
    [along(new THREE.CylinderGeometry(2.6, 2.2, 22, 28)), M4(0, 0, 0), HULL],
    [along(new THREE.CylinderGeometry(2.2, 0.25, 9, 28)), M4(0, 0, -15.5), HULL],
    [new THREE.BoxGeometry(6.6, 5, 6), M4(0, 0, 13.5), PLATE],
    [new THREE.BoxGeometry(0.8, 2.2, 18), M4(0, 2.5, -1), DARK],
    [new THREE.BoxGeometry(1.2, 1.4, 14), M4(0, -2.6, -0.5), DARK],
    [wing(1), M4(2.1, 0, 4, 0, 0, -0.12), PLATE],
    [wing(-1), M4(-2.1, 0, 4, 0, 0, 0.12), PLATE],
    ...[[-1.8, -0.8], [1.8, -0.8], [0, 1.6]].map(([x, y]) => [along(new THREE.CylinderGeometry(1.35, 1.1, 2.6, 20)), M4(x, y, 17.6), DARK]),
  ];
  for (let i = 0; i < 14; i++) {                       // surface detail: plates and blocks along the hull
    const z = -9 + r() * 18, a = (r() - 0.5) * 2.2;
    parts.push([new THREE.BoxGeometry(0.5 + r() * 1.4, 0.3 + r() * 0.6, 0.8 + r() * 3), M4(Math.sin(a) * 2.45, Math.cos(a) * 2.45, z, 0, 0, -a), r() < 0.5 ? DARK : PLATE]);
  }
  const lights = [                                     // rows of windows down both sides, the three drive mouths, a nav light
    [new THREE.BoxGeometry(0.22, 0.22, 15), M4(2.5, 0.5, -1.5), '#ffe6b0'], [new THREE.BoxGeometry(0.22, 0.22, 15), M4(-2.5, 0.5, -1.5), '#ffe6b0'],
    [new THREE.BoxGeometry(0.18, 0.18, 9), M4(2.45, -0.6, 2), '#ffd28a'], [new THREE.BoxGeometry(0.18, 0.18, 9), M4(-2.45, -0.6, 2), '#ffd28a'],
    ...[[-1.8, -0.8], [1.8, -0.8], [0, 1.6]].map(([x, y]) => [new THREE.CircleGeometry(0.95, 20), M4(x, y, 18.95), '#bfe6ff']),
    [new THREE.SphereGeometry(0.35, 8, 6), M4(0, 0, -20.2), '#ff9a7a'],
  ];
  const pieces = [[-99, -7], [-7, 7], [7, 99]].map(([z0, z1]) => {   // the wreck: fore, middle and aft, each centred on itself
    const g = mergeParts(parts.filter(([, m]) => { const z = new THREE.Vector3().setFromMatrixPosition(m).z; return z >= z0 && z < z1; }));
    g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()); g.translate(-c.x, -c.y, -c.z);
    return { geo: g, centre: c, ends: [z0 > -99 ? z0 : null, z1 < 99 ? z1 : null].filter(v => v !== null) };   // where it broke
  });
  const plating = GL.canvasTex(512, 512, (g, w, h) => {   // panels in slightly different greys, dark seams, a few hatches and vents
    const q = rng(909); g.fillStyle = '#c4c4c4'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w;) { const pw = 32 * (1 + Math.floor(q() * 3)), v = 170 + 50 * q(); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, pw, 32); x += pw; }
    g.strokeStyle = 'rgba(40,40,40,0.9)'; g.lineWidth = 1.5;
    for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = 0; i < 120; i++) { const x = Math.floor(q() * 16) * 32, y = Math.floor(q() * 16) * 32; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(30,30,30,${0.3 + 0.4 * q()})`; g.fillRect(q() * w, q() * h, 4 + 14 * q(), 3 + 8 * q()); }
  });
  plating.wrapS = plating.wrapT = THREE.RepeatWrapping;
  const material = (tint = 0xffffff, rough = 0.38) => new THREE.MeshStandardMaterial({ vertexColors: true, color: tint, map: plating, bumpMap: plating, bumpScale: 0.5,
    metalness: 0.72, roughness: rough, envMap: MILKY.skyTex, envMapIntensity: 0.9 });
  return { hull: mergeParts(parts), lights: mergeParts(lights), pieces, material, rear: [[-1.8, -0.8, 19.5], [1.8, -0.8, 19.5], [0, 1.6, 19.5]] };
})();
function spriteCloud(n, cap = 512) {                   // additive point-sprites: position, size (world units), colour and alpha per point
  const pos = new Float32Array(n * 3), size = new Float32Array(n), col = new Float32Array(n * 4);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 4));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uMap: { value: GL.glowTex }, uScale: { value: 1 }, uCap: { value: cap } },
    vertexShader: 'attribute float aSize; attribute vec4 aCol; varying vec4 vCol; uniform float uScale, uCap; void main(){ vCol = aCol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = min(uCap, aSize * uScale / max(1.0, -mv.z)); gl_Position = projectionMatrix * mv; if (aCol.a < 0.002) gl_PointSize = 0.0; }',
    fragmentShader: 'uniform sampler2D uMap; varying vec4 vCol; void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vCol.rgb * t.rgb, t.a * vCol.a); }' });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false;
  let i = 0;
  return { pts, mat,
    reset() { i = 0; col.fill(0); },
    add(x, y, z, s, r, gg, b, a) { if (i >= n || a < 0.002) return; pos.set([x, y, z], i * 3); size[i] = s; col.set([r, gg, b, a], i * 4); i++; },
    commit(camera) { mat.uniforms.uScale.value = H / (2 * Math.tan(camera.fov * Math.PI / 360)); for (const k of ['position', 'aSize', 'aCol']) g.attributes[k].needsUpdate = true; g.setDrawRange(0, i); } };
}
