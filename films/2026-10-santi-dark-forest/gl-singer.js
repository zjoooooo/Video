// The dual-vector foil, and the Singer's scene. The foil is a film with no thickness: its colours run through the
// rainbow with the angle it is seen at and slide slowly across it, a glint crosses it as it turns, and edge-on it is
// gone to a hairline. The Singer looks down on the galaxy from far above (its eye is drawn in 2D by film.src.html),
// notices the Sun, takes out the foil and flicks it away; the camera follows it down to the Sun (gl-solar.js has it
// arrive). foilMesh() is shared with gl-solar.js.
function foilMesh(w, h) {
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uA: { value: 1 }, uLight: { value: new THREE.Vector3() } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN, vW; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime, uA; uniform vec3 uLight; varying vec2 vUv; varying vec3 vN, vW;
      void main(){
        vec3 V = normalize(cameraPosition - vW), N = normalize(vN); if (dot(N, V) < 0.0) N = -N;
        float c = dot(N, V);                                               // 1 face-on, 0 edge-on
        vec2 q = vUv;                                                      // its thickness, in nm: a slow swell across it, flowing
        float d = 300.0 + 720.0 * (0.62 * q.x + 0.38 * q.y) + 90.0 * sin(2.5 * q.y + 1.2 * q.x + 0.5 * uTime) + 35.0 * sin(5.0 * q.x - 0.3 * uTime);
        float ct = sqrt(1.0 - (1.0 - c * c) / 2.1);                         // refracted angle inside (n = 1.45): the bands shift with the view
        vec3 film = 1.0 - cos(6.2831853 * 2.0 * 1.45 * d * ct / vec3(680.0, 550.0, 440.0));   // interference at red, green, blue
        float fres = mix(0.2, 0.75, pow(1.0 - c, 3.0));
        vec3 L = normalize(uLight - vW), Rf = reflect(-L, N);
        float spec = pow(max(dot(Rf, V), 0.0), 80.0) * 1.4 + pow(max(dot(Rf, V), 0.0), 10.0) * 0.18;
        float edge = 1.0 - smoothstep(0.0, 0.02, min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y)));
        vec3 col = pow(film * 0.5, vec3(1.5)) * fres * 1.3 + vec3(0.03, 0.035, 0.045) + vec3(1.0, 0.98, 0.95) * spec + vec3(0.8, 0.9, 1.0) * edge * 0.25;
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
    mat.uniforms.uLight.value.copy(camera.position).add(new THREE.Vector3(-40, 60, 0).applyQuaternion(camera.quaternion));
    n.set(0, 0, 1).transformDirection(plane.matrixWorld); v.copy(camera.position).sub(group.getWorldPosition(new THREE.Vector3()));
    const dist = v.length(), c = Math.abs(n.dot(v.normalize()));
    edgeLine.material.opacity = a * (0.08 + 0.85 * Math.pow(1 - c, 6));   // edge-on, the hairline is all there is
    const px = H / (2 * Math.tan(camera.fov * Math.PI / 360)) / dist * Math.max(w, h) * group.scale.x;   // its size on screen
    const far = 1 - ramp(px, 8, 40);
    glint.material.color.setRGB(...[0, 0.33, 0.67].map(o => 0.6 + 0.4 * Math.cos(TAU * (o + t * 0.25))));
    glint.material.opacity = a * (0.25 + 0.75 * far); glint.scale.setScalar(glintPx * dist / (H / (2 * Math.tan(camera.fov * Math.PI / 360))) * (1 + 1.5 * far) / group.scale.x);
  }
  return { group, plane, update };
}

const SING = (() => {
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, W / H, 0.05, 200000);
  scene.add(GL.stars(31, 6000, 60000));
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
    if (close) {                                         // the close-up: the foil big, turning to edge-on, the galaxy behind it
      const u = t - CL0, th = CLT + u * CLW;
      const view = p.clone().sub(sun).normalize();      // looking past it toward the Sun
      cam.clearViewOffset(); cam.fov = 30;
      cam.position.copy(p).addScaledVector(view, 5.6).add(new THREE.Vector3(0, 0.9, 0)); cam.up.set(0, 1, 0); cam.lookAt(p);
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
    const out = GL.draw(scene, cam, { strength: 0.32, radius: 0.5, threshold: 0.75 });
    foilAt = GL.screen(cam, p);
    return [out, fade];
  }
  return { draw, sunPx, foilPx: () => foilAt, scene, cam, T0, CUT };
})();
