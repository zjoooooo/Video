// The film's 3D layer: one WebGL renderer with bloom. Scenes render into it and the 2D canvas draws the result under
// its overlays (subtitles, cards, grain). Same contract as the 2D film: every frame is set up from t alone.
// three.js and the planet textures come from Justin's Galaxy Explorer next door (MIT; texture credits are in its
// THIRD-PARTY-NOTICES: Solar System Scope CC BY 4.0, NASA).
const GE = '../../../galaxy-explorer/';
const GL = (() => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  const composer = new THREE.EffectComposer(renderer);
  const pass = new THREE.RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.6, 0.5, 0.7);
  composer.addPass(pass); composer.addPass(bloom);
  const loader = new THREE.TextureLoader(), waits = [];
  function tex(path) {                                 // a texture that READY waits for
    let done; waits.push(new Promise(r => (done = r)));
    const t = loader.load(path, () => done(), undefined, () => { console.error('texture failed: ' + path); done(); });
    t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  }
  function canvasTex(w, h, paint) {                   // a texture painted once, at load, by a 2D canvas
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
    paint(c.getContext('2d'), w, h);
    return new THREE.CanvasTexture(c);
  }
  const glowTex = canvasTex(64, 64, (g, w) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.28, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
  function glowSprite(color, size, opacity = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(size, size, 1); return s;
  }
  function stars(seed, n, radius) {                    // a seeded sky: points on a far sphere, a few bright, tinted
    const r = rng(seed), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u), b = 0.35 + 0.65 * Math.pow(r(), 3);
      pos.set([radius * s * Math.cos(a), radius * u, radius * s * Math.sin(a)], i * 3);
      const tint = r(); col.set([b * (tint < 0.2 ? 1 : 0.85), b * 0.9, b * (tint > 0.8 ? 1 : 0.8)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  }
  function milkyDome(seed, tilt, gain = 1) {           // a far sky with the Milky Way's band across it, faint, computed per pixel
    const r = rng(seed), w = 2048, h = 1024, nx = Math.sin(tilt), ny = Math.cos(tilt);   // the band's plane normal, in (x, y) of the dome
    const blobs = Array.from({ length: 90 }, () => [r() * TAU, (r() - 0.5) * 0.5, 0.05 + 0.18 * r(), r()]);
    const tex = canvasTex(w, h, (g) => {
      const d = g.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const lon = i / w * TAU, lat = (0.5 - j / h) * Math.PI, X = Math.cos(lat) * Math.cos(lon), Y = Math.sin(lat), Z = Math.cos(lat) * Math.sin(lon);
        const off = X * nx + Y * ny, along = Math.atan2(Z, X * ny - Y * nx);   // distance from the band, and position along it
        let b = Math.exp(-off * off / 0.018) * (0.55 + 0.45 * Math.sin(along * 3 + 1.3)) + 0.35 * Math.exp(-off * off / 0.12);
        for (const [a0, o0, s0, k] of blobs) { const da = Math.atan2(Math.sin(along - a0), Math.cos(along - a0)), dd = (da * da + (off - o0) * (off - o0)) / (s0 * s0); if (dd < 9) b *= k < 0.4 ? 1 - 0.55 * Math.exp(-dd) : 1 + 0.5 * Math.exp(-dd); }   // dust lanes and star clouds
        const n = r() * 0.12, v = Math.max(0, b * gain * 46 + n * 6), p = (j * w + i) * 4;
        d.data[p] = v * 1.05; d.data[p + 1] = v * 0.98; d.data[p + 2] = v * 1.12 + 4; d.data[p + 3] = 255;
      }
      g.putImageData(d, 0, 0);
    });
    return new THREE.Mesh(new THREE.SphereGeometry(80000, 96, 48), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false }));
  }
  function draw(scene, camera, { strength = 0.6, radius = 0.5, threshold = 0.7 } = {}) {
    pass.scene = scene; pass.camera = camera; bloom.strength = strength; bloom.radius = radius; bloom.threshold = threshold;
    composer.render();
    return renderer.domElement;
  }
  function screen(camera, v) {                         // a world point on the 1920x1080 frame, and whether it is in front
    const p = v.clone().project(camera);
    return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z < 1];
  }
  return { renderer, tex, canvasTex, glowTex, glowSprite, stars, milkyDome, draw, screen, ready: () => Promise.all(waits) };
})();
// a camera placed by orbit around a target: distance, azimuth (around +y), elevation above the plane
function orbitCam(cam, [tx, ty, tz], d, az, el, roll = 0) {
  cam.position.set(tx + d * Math.cos(el) * Math.cos(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.sin(az));
  cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(tx, ty, tz);
  cam.near = Math.max(0.02, d * 0.004); cam.far = 6000; cam.updateProjectionMatrix();
}
