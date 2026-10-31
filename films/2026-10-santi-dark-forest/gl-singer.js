// The dual-vector foil, and the Singer's scene. The foil is a film with no thickness: its colours run through the
// rainbow with the angle it is seen at and slide slowly across it, a glint crosses it as it turns, and edge-on it is
// gone to a hairline. The Singer looks down on the galaxy from far above (its eye is drawn in 2D by film.src.html),
// notices the Sun, takes out the foil and flicks it away; the camera follows it down to the Sun (gl-solar.js has it
// arrive). foilMesh() is shared with gl-solar.js.
function foilMesh(w, h) {
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: 1 }, uRun: { value: CL0 + 0.7 }, uLight: { value: new THREE.Vector3() } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN, vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime, uA, uRun; uniform vec3 uLight; varying vec2 vUv; varying vec3 vN, vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ return noise(p) * 0.6 + noise(p * 2.1 + 4.3) * 0.28 + noise(p * 4.3 + 9.1) * 0.12; }
      vec3 filmColour(float d){                          // reflectance of a soap film d nm thick, at eight wavelengths, to RGB: magenta, gold, cyan, green, paling with order
        const float L[8] = float[8](400.0, 440.0, 480.0, 520.0, 560.0, 600.0, 640.0, 680.0);
        const vec3 C[8] = vec3[8](vec3(0.10, 0.0, 0.35), vec3(0.05, 0.02, 0.85), vec3(0.0, 0.25, 0.75), vec3(0.0, 0.85, 0.2), vec3(0.45, 0.9, 0.0), vec3(0.95, 0.55, 0.0), vec3(0.85, 0.15, 0.0), vec3(0.35, 0.03, 0.0));
        vec3 c = vec3(0.0);
        for (int i = 0; i < 8; i++) c += C[i] * (0.5 - 0.5 * cos(6.2831853 * 2.0 * 1.33 * d / L[i]));
        return c / vec3(2.75, 2.75, 2.15);
      }
      void main(){
        vec3 V = normalize(cameraPosition - vW), N = normalize(vN); if (dot(N, V) < 0.0) N = -N;
        float c = dot(N, V), ct = sqrt(1.0 - (1.0 - c * c) / 1.77);         // the refracted angle inside: the colours shift as it turns
        vec2 q = vUv;
        float d = 180.0 + 900.0 * fbm(q * vec2(2.2, 1.6) + vec2(0.07, 0.04) * uTime) + 140.0 * q.x;   // its thickness: a smooth field drifting, so the fringes curve like oil on water
        vec3 film = filmColour(d * ct);
        vec3 L = normalize(uLight - vW), Rf = reflect(-L, N);
        float hot = pow(max(dot(Rf, V), 0.0), 16.0);                       // a near light's highlight, sweeping as it turns
        float run = exp(-pow((dot(q, vec2(0.86, 0.5)) - fract((uTime - uRun) / 3.0) * 2.4 + 0.3) / 0.18, 2.0));   // and a gleam running over it
        float fres = pow(1.0 - c, 5.0), spec = pow(max(dot(Rf, V), 0.0), 240.0);
        float edge = 1.0 - smoothstep(0.0, 0.012, min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y)));
        float lightOn = 0.03 + 2.4 * hot + 1.5 * run + 0.9 * fres;            // dark glass, the colour only where light rakes across it,
        vec3 col = vec3(0.004, 0.005, 0.008) + film * 0.85 * (1.0 - exp(-lightOn * 1.3)) + vec3(1.0, 0.97, 0.92) * spec * 0.35 + vec3(0.85, 0.92, 1.0) * edge * 0.8 * (hot + run);   // tone-mapped through the film's colour: the bands run through the brightest part
        gl_FragColor = vec4(col * uA, 1.0);
      }` });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const edgeLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => new THREE.Vector3(x * w / 2, y * h / 2, 0))),
    new THREE.LineBasicMaterial({ color: 0xeef6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const glint = GL.glowSprite(0xffffff, 1, 0);           // seen from far, it is a point of changing colour
  const group = new THREE.Group(); group.add(plane, edgeLine, glint);
  const n = new THREE.Vector3(), v = new THREE.Vector3();
  function update(camera, t, a = 1, glintPx = 9) {       // per frame, after the group is placed
    group.updateMatrixWorld(true);
    mat.uniforms.uTime.value = t; mat.uniforms.uA.value = a;
    const here = group.getWorldPosition(new THREE.Vector3()), toCam = camera.position.clone().sub(here), k = toCam.length();
    mat.uniforms.uLight.value.copy(here).addScaledVector(toCam, 0.45).add(new THREE.Vector3(-0.25 * k, 0.35 * k, 0).applyQuaternion(camera.quaternion));   // a light near the lens: its highlight is a spot
    n.set(0, 0, 1).transformDirection(plane.matrixWorld); v.copy(camera.position).sub(group.getWorldPosition(new THREE.Vector3()));
    const dist = v.length(), c = Math.abs(n.dot(v.normalize()));
    edgeLine.material.opacity = a * 0.9 * Math.pow(1 - c, 8);             // edge-on, the hairline is all there is; otherwise its edges glint only where raked (in the shader)
    const px = H / (2 * Math.tan(camera.fov * Math.PI / 360)) / dist * Math.max(w, h) * group.scale.x;   // its size on screen
    const far = 1 - ramp(px, 8, 40);
    glint.material.color.setRGB(...[0, 0.33, 0.67].map(o => 0.6 + 0.4 * Math.cos(TAU * (o + t * 0.25))));
    glint.material.opacity = a * (0.25 + 0.75 * far); glint.scale.setScalar(glintPx * dist / (H / (2 * Math.tan(camera.fov * Math.PI / 360))) * (1 + 1.5 * far) / group.scale.x);
  }
  return { group, plane, update };
}

const SING = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 200000);
  const stars = GL.stars(31, 6000, 60000); scene.add(stars);
  const foil = foilMesh(1.6, 1.0); scene.add(foil.group);
  const sunStar = GL.glowSprite(0xfff1d6, 1, 1), sunCore = GL.glowSprite(0xffffff, 1, 1); scene.add(sunStar, sunCore);
  const T0 = SC.ember + 7.0, CUT = SC.fall - 1.4;        // from the wreck field craning away, to the Solar System
  const DF = 40;                                         // how far in front of the Singer's eye the foil waits
  function wide(t) {                                     // far above the galaxy, the Sun on its near-left side, drifting
    const k = ramp(t, T0, CUE.flick), s = MILKY.world(t, MILKY.SUN);
    return { tgt: new THREE.Vector3(), d: lerp(1750, 1500, easeIO(k)), az: Math.atan2(s.z, s.x) - 1.2 + 0.12 * k, el: lerp(1.0, 1.08, k), off: 280 };
  }
  function place(t) {                                    // the camera at t: the wide, then the dive after the flick to the Sun
    const sun = MILKY.setTime(t), w = wide(Math.min(t, CUE.flick + 0.6)), k = easeIO(ramp(t, CUE.flick + 0.6, CUT));
    const tgt = w.tgt.clone().lerp(sun, ease(ramp(t, CUE.flick + 0.6, CUT - 1.5)));
    const d = w.d * Math.pow(7 / w.d, k), off = w.off * (1 - ease(ramp(t, CUE.flick + 0.6, CUE.flick + 4)));
    orbitCam(cam, [tgt.x, tgt.y, tgt.z], d, w.az + 0.5 * k, lerp(w.el, 0.42, k));
    cam.near = Math.max(0.02, d * 0.002); cam.far = 200000;
    cam.setViewOffset(W, H, -off, 0, W, H); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    return sun;
  }
  const sunPx = t => GL.screen(cam, place(t));          // the Sun on screen at t (sets the camera)
  function ray(px, d) {                                  // the point d in front of the camera, seen at screen pixel px
    const p = new THREE.Vector3(px[0] / W * 2 - 1, 1 - px[1] / H * 2, 0.5).unproject(cam);
    return cam.position.clone().add(p.sub(cam.position).normalize().multiplyScalar(d));
  }
  function foilPose(t, anchor) {                         // where the foil is, and its turn: waiting on the arc, then flicked to the Sun
    const tw = Math.min(t, CUE.flick); place(tw);
    const P0 = ray(anchor(tw), DF), rot = tw * 0.6 + Math.max(0, t - CUE.flick) * 2.2;
    if (t <= CUE.flick) return { p: P0, rot };
    const P1 = place(CUT), u = 0.6 * (1 - Math.pow(2, -10 * ramp(t, CUE.flick, CUE.flick + 0.35))) + 0.4 * easeIO(ramp(t, CUE.flick + 0.35, CUT));
    return { p: P0.lerp(P1, u), rot };
  }
  const CLW = 0.95, CLT = 1.5 * Math.PI - 4.0 * CLW;    // the close-up (CL0 to CL1, film.src.html) ends edge-on
  let foilAt = null;
  function draw(t, anchor) {                             // anchor(t): the screen point on the Singer's arc where the foil waits
    scene.add(MILKY.group);
    const { p, rot } = foilPose(t, anchor), close = t >= CL0 && t < CL1;
    const sun = place(t);
    foil.group.position.copy(p); foil.group.visible = t >= (subAt('二向箔')?.t0 ?? 0) && t < CUT;
    foil.group.scale.setScalar(lerp(1, 0.03, ease(ramp(t, CUE.flick, CUE.flick + 0.8))));   // thrown, it is a speck: its glint leads the way down
    if (close) {                                         // the close-up: the foil small in frame, turning to edge-on, the galaxy far behind it
      const u = t - CL0, th = CLT + u * CLW;
      const view = p.clone().sub(sun).normalize();      // looking past it toward the Sun
      cam.clearViewOffset(); cam.fov = 30;
      cam.position.copy(p).addScaledVector(view, 9.5).add(new THREE.Vector3(0, 1.2, 0)); cam.up.set(0, 1, 0); cam.lookAt(p.clone().add(new THREE.Vector3(0.9, -0.35, 0)));
      cam.near = 0.05; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      foil.group.quaternion.copy(cam.quaternion); foil.group.rotateZ(-0.12 + 0.03 * Math.sin(u * 0.5)); foil.group.rotateY(th);
    } else {
      foil.group.quaternion.setFromEuler(new THREE.Euler(0.5 + 0.25 * Math.sin(rot * 0.7), rot, 0.3));
    }
    const a = ease(ramp(t, subAt('二向箔')?.t0 ?? 0, (subAt('二向箔')?.t0 ?? 0) + 0.8));
    foil.update(cam, t, a, close ? 0 : 9);
    const ds = cam.position.distanceTo(sun), pxu = H / (2 * Math.tan(cam.fov * Math.PI / 360));
    const seen = ease(ramp(t, glanceHits - 0.3, glanceHits + 0.3));   // the Sun: one star among many, a little brighter once noticed
    sunStar.position.copy(sun); sunCore.position.copy(sun);
    sunStar.scale.setScalar(ds / pxu * lerp(22, 60, seen) * (1 + 3 * ease(ramp(t, CUT - 2.5, CUT)))); sunStar.material.opacity = 0.35 + 0.4 * seen;
    sunCore.scale.setScalar(ds / pxu * 7 * (1 + 2 * ease(ramp(t, CUT - 2.5, CUT)))); sunCore.material.opacity = 0.7 + 0.3 * seen;
    const fade = ease(ramp(t, T0, T0 + 1.6));
    foilAt = GL.screen(cam, p);
    if (close) {                                         // its own picture: the galaxy out of focus, then the foil alone over it
      const g = ctx; foil.group.visible = false;
      const bg = GL.draw(scene, cam, { strength: 0.3, radius: 0.6, threshold: 0.7 });
      g.save(); g.filter = 'blur(18px) brightness(0.8)'; g.drawImage(bg, 0, 0); g.restore();
      foil.group.visible = true; scene.remove(MILKY.group); for (const o of [stars, sunStar, sunCore]) o.visible = false;
      const fg = GL.draw(scene, cam, { strength: 0.45, radius: 0.4, threshold: 0.6 });
      for (const o of [stars, sunStar, sunCore]) o.visible = true;
      g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(fg, 0, 0); g.restore();
      return [null, 1];
    }
    return [GL.draw(scene, cam, { strength: 0.32, radius: 0.5, threshold: 0.75 }), fade];
  }
  return { draw, sunPx, foilPx: () => foilAt, scene, cam, T0, CUT };
})();
