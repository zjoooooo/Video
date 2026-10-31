// Shared pieces for the ships: a stellar-class warship built from parts and merged into one geometry (plus a second
// geometry for its lights), and a cloud of additive point-sprites for engines, fireballs and embers.
function mergeParts(parts) {                          // [geometry, matrix, colour] -> one non-indexed geometry with vertex colours
  const pos = [], nor = [], col = [];
  for (const [g, m, c] of parts) {
    const geo = g.index ? g.toNonIndexed() : g.clone(); geo.applyMatrix4(m); geo.computeVertexNormals();
    const p = geo.attributes.position.array, n = geo.attributes.normal.array, cc = new THREE.Color(c);
    for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); col.push(cc.r, cc.g, cc.b); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
const SHIP = (() => {                                  // nose to -z, engines to +z, about 36 units long
  const r = rng(808), HULL = '#b9a47c', DARK = '#57524b', PLATE = '#8c8578';
  const along = g => g.rotateX(Math.PI / 2);           // cylinders lie along z, their top radius at +z (the stern)
  const parts = [
    [along(new THREE.CylinderGeometry(2.6, 2.2, 22, 8)), M4(0, 0, 0), HULL],
    [along(new THREE.CylinderGeometry(2.2, 0.25, 9, 8)), M4(0, 0, -15.5), HULL],
    [new THREE.BoxGeometry(6.6, 5, 6), M4(0, 0, 13.5), PLATE],
    [new THREE.BoxGeometry(0.8, 2.2, 18), M4(0, 2.5, -1), DARK],
    [new THREE.BoxGeometry(1.2, 1.4, 14), M4(0, -2.6, -0.5), DARK],
    [new THREE.BoxGeometry(5, 0.25, 9), M4(4.4, 0, 4, 0, 0, -0.12), PLATE],
    [new THREE.BoxGeometry(5, 0.25, 9), M4(-4.4, 0, 4, 0, 0, 0.12), PLATE],
    ...[[-1.8, -0.8], [1.8, -0.8], [0, 1.6]].map(([x, y]) => [along(new THREE.CylinderGeometry(1.35, 1.1, 2.6, 16)), M4(x, y, 17.6), DARK]),
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
  return { hull: mergeParts(parts), lights: mergeParts(lights), rear: [[-1.8, -0.8, 19.5], [1.8, -0.8, 19.5], [0, 1.6, 19.5]] };
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
