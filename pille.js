// Neurosalg-kapslen (Kasper 6. nov 2026): en lukket kapsel, mørkeblå bund og cremefarvet kappe med "NEUROSALG".
// Den åbner ikke, og der er intet indeni. Inspireret af makepill.com: en intro tæt på trykket, der trækker sig tilbage,
// og 1 kapsel pr. sektion, der drejer roligt og følger scroll. Ingen pris på pillen.
import * as THREE from 'three';

const R = 0.9, L = 3.0, RC = R * 1.045, OVER = 0.28, LEN = L + 2 * R;

function arcProfile(r, yStart, yEnd, tipUp, lipIn) {
  // Punkter jævnt fordelt efter buelængde, så teksturens v følger længden
  const pts = [], hemi = Math.PI * r / 2, cyl = Math.abs(yEnd - yStart), total = hemi + cyl, N = 160;
  for (let i = 0; i <= N; i++) {
    const s = i / N * total;
    if (!tipUp) {
      if (s <= hemi) { const a = s / r; pts.push(new THREE.Vector2(Math.sin(a) * r, yStart - Math.cos(a) * r)); }
      else pts.push(new THREE.Vector2(r, yStart + (s - hemi)));
    } else {
      if (s <= cyl) pts.push(new THREE.Vector2(r, yStart + s));
      else { const a = (s - cyl) / r; pts.push(new THREE.Vector2(Math.cos(a) * r, yEnd + Math.sin(a) * r)); }
    }
  }
  if (lipIn) { pts.unshift(new THREE.Vector2(r - 0.035, yStart + 0.012)); pts.unshift(new THREE.Vector2(r - 0.06, yStart + 0.03)); }
  else pts.push(new THREE.Vector2(r - 0.02, yEnd + 0.002));
  return pts;
}

function printTexture(base, word, ink, o) {
  // Teksten løber langs kapslen. u er omkredsen, v er længden, så bogstavernes højde presses sammen med arc/circ.
  // Ruheden får et fint korn, så lakken ikke ser computerglat ud tæt på
  const W = 2048, H = 2048, squash = o.arc / o.circ;
  const make = (fill) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0, 0, W, H); return [c, g]; };
  const [cv, g] = make(base), [rc, r] = make(o.baseRough);
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 18000; i++) { const v = 70 + rnd() * 40 | 0; r.fillStyle = `rgba(${v},${v},${v},.16)`; r.fillRect(rnd() * W, rnd() * H, 2, 2); }
  if (word) for (const [ctx, color] of [[g, ink], [r, o.inkRough]]) {
    ctx.save();
    ctx.translate(W * o.u, H * (1 - o.v));   // CanvasTexture vendes lodret
    ctx.rotate(-Math.PI / 2); ctx.scale(1, squash);
    ctx.fillStyle = color; ctx.font = `600 ${o.size}px "Inter Tight", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = o.track + 'px';
    ctx.fillText(word, 0, 0); ctx.restore();
  }
  const t = (c, srgb) => { const x = new THREE.CanvasTexture(c); if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 8; return x; };
  return { map: t(cv, true), roughnessMap: t(rc) };
}

function studio(renderer) {
  // Mørkt studie med 3 softboxe: dybe farver og lange, rene refleksioner i lakken
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#34322e') }, mid: { value: new THREE.Color('#171614') }, bot: { value: new THREE.Color('#070707') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, bot, smoothstep(0.0, -0.6, h)); gl_FragColor = vec4(c, 1.0); }'
  })));
  const box = (w, h, x, y, z, i, col = '#ffffff') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  box(14, 2.4, -4, 9, 6, 10); box(4, 9, 10, 2, 4, 3.2, '#fff1dc'); box(12, 1.6, 2, -2, -10, 5, '#e6eeff'); box(6, 6, -9, -1, 2, 1.6);
  return new THREE.PMREMGenerator(renderer).fromScene(env, 0.02).texture;
}

// En kapsel i et lærred med gennemsigtig baggrund. Placeres i skærm-pixels med pose({x, y, len, tilt, spin})
export async function kapsel(canvas, { shadow = true, dark = false } = {}) {
  await document.fonts.load('600 120px "Inter Tight"');
  const small = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(small ? 1.5 : 2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0xd9cdb6, 2.1));
  const key = new THREE.DirectionalLight(0xfff6e8, 1.5); key.position.set(-3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, dark ? 0.9 : 0.25); rim.position.set(4, -1, -4); scene.add(rim);
  const D = 11, camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, D);

  const bodyPts = arcProfile(R, -L / 2, OVER * 0.6, false, false), capPts = arcProfile(RC, -OVER * 0.4, L / 2, true, true);
  const arcB = Math.PI * R / 2 + (L / 2 + OVER * 0.6), arcC = Math.PI * RC / 2 + (L / 2 + OVER * 0.4);
  const vC = ((L / 2 + OVER * 0.4) / 2 + 0.02) / arcC;
  const navy = printTexture('#0A1731', '', '', { arc: arcB, circ: 2 * Math.PI * R, baseRough: '#383838' });
  const cream = printTexture('#F4ECDD', 'NEUROSALG', '#0F1B2D', { arc: arcC, circ: 2 * Math.PI * RC, u: 0.5, v: vC, size: 122, track: 22, baseRough: '#6e6e6e', inkRough: '#505050' });
  const lacquer = (tex, o) => new THREE.MeshPhysicalMaterial({ map: tex.map, roughnessMap: tex.roughnessMap, roughness: 1, metalness: 0,
    clearcoat: 1, clearcoatRoughness: o.cc, sheen: o.sheen || 0, sheenColor: new THREE.Color('#fff1d6'), sheenRoughness: 0.6 });
  const body = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 160), lacquer(navy, { cc: 0.035 }));
  const cap = new THREE.Mesh(new THREE.LatheGeometry(capPts, 160), lacquer(cream, { cc: 0.08, sheen: 0.4 }));
  const pill = new THREE.Group(); pill.add(body, cap); scene.add(pill);

  // Blød skygge under kapslen, der følger den
  let floor;
  if (shadow) {
    const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sg = sc.getContext('2d');
    const grd = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, dark ? 'rgba(0,0,0,0.55)' : 'rgba(15,27,45,0.36)'); grd.addColorStop(0.45, dark ? 'rgba(0,0,0,0.22)' : 'rgba(15,27,45,0.13)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = grd; sg.fillRect(0, 0, 256, 256);
    floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
  }

  let cw = 1, ch = 1, Hh = 1;
  const resize = () => {
    cw = canvas.clientWidth || 1; ch = canvas.clientHeight || 1;
    renderer.setSize(cw, ch, false); camera.aspect = cw / ch; camera.updateProjectionMatrix();
    Hh = 2 * D * Math.tan(camera.fov * Math.PI / 360);
  };
  resize();

  // x, y: midten i pixels i lærredet. len: kapslens længde i pixels. tilt: 0 = lodret, -PI/2 = vandret. spin: drejning om længdeaksen (0 = navnet mod os)
  function pose({ x, y, len, tilt = -0.95, spin = 0, lean = 0.18, shade = 1 }) {
    const k = Hh / ch, s = (len * k) / LEN;
    pill.position.set((x - cw / 2) * k, (ch / 2 - y) * k, 0);
    pill.scale.setScalar(s);
    pill.rotation.set(lean, 0, 0); pill.rotateZ(tilt); pill.rotateY(Math.PI + spin);
    if (floor) {
      const drop = s * (1.2 + 1.6 * Math.abs(Math.cos(tilt)));
      floor.position.set(pill.position.x, pill.position.y - drop - s * 0.9, 0);
      const w = s * 5.2 * (0.55 + 0.45 * Math.abs(Math.sin(tilt)));
      floor.scale.set(w, w * 0.34, 1); floor.material.opacity = shade;
    }
    renderer.render(scene, camera);
  }
  return { pose, resize, size: () => [cw, ch] };
}

// ---------- historien på Neurosalg-siden ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const mix = (a, b, t) => a + (b - a) * t;

// <div data-kapsel="top|liggende|bund"><canvas></canvas><div class="spot"></div></div>
// .spot er det sted i layoutet, hvor kapslen skal ligge. Lærredet dækker hele sektionen, så kapslen kan bevæge sig frit
export function start() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  document.querySelectorAll('[data-kapsel]').forEach(async (stage) => {
    const cv = stage.querySelector('canvas'), spot = stage.querySelector('.spot');
    const kind = stage.dataset.kapsel;
    let k;
    try { k = await kapsel(cv, { dark: stage.dataset.dark === '1' }); }
    catch (e) { stage.classList.add('fallback'); root.classList.remove('intro'); return; }
    stage.classList.add('live');
    let visible = true, introStart = null;
    const t0 = performance.now();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '120px' }).observe(stage);
    addEventListener('resize', () => k.resize());
    if (kind === 'top') {
      if (still || scrollY > 40) root.classList.remove('intro'); else introStart = performance.now();
      addEventListener('scroll', () => { if (introStart) introStart = -1e9; }, { passive: true, once: true });   // scroller man, springes introen over
    }

    const frame = () => {
      if (visible) {
        const t = still ? 0.6 : (performance.now() - t0) / 1000;
        const c = cv.getBoundingClientRect(), r = spot.getBoundingClientRect();
        const cx = r.left - c.left + r.width / 2, cy = r.top - c.top + r.height / 2;
        const vh = innerHeight, float = still ? 0 : Math.sin(t * 0.9) * 6;
        const sp = clamp((vh - c.top) / (vh + c.height));   // 0 når sektionen kommer ind nederst, 1 når den forlader toppen

        if (kind === 'top') {
          // Intro: helt tæt på trykket, kameraet trækker sig tilbage, og kapslen glider på plads
          let p = 1;
          if (introStart != null) {
            p = clamp((performance.now() - introStart) / 3200);
            if (p > 0.7) root.classList.remove('intro');
            if (p >= 1) introStart = null;
          }
          const q = ease(p), scrolled = clamp(scrollY / Math.max(1, c.height));
          const [w, h] = k.size();
          k.pose({
            x: mix(w / 2, cx, q), y: mix(h * 0.5, cy + float - scrolled * 60, q),
            len: mix(Math.max(w, h) * 3.2, r.width * 0.92, q),
            tilt: mix(-1.42, -0.95 + scrolled * 0.45, q),
            spin: mix(-0.05, -0.5, q) + (still ? 0 : t * 0.22 * q) + scrolled * 1.4,
            lean: mix(0, 0.18, q), shade: q,
          });
        } else if (kind === 'liggende') {
          // Ligger ned og drejer, mens man scroller, så navnet kommer frem
          k.pose({ x: cx, y: cy + float, len: r.width * 0.86, tilt: -Math.PI / 2 + 0.1, spin: -1.6 + sp * 3.0, lean: 0.12, shade: 0.8 });
        } else {
          // Bunden: lander vandret, mens sektionen kommer ind
          const land = ease(clamp(sp * 2.2));
          k.pose({ x: cx, y: cy + float, len: r.width * 0.6, tilt: mix(-1.05, -Math.PI / 2 - 0.08, land), spin: -0.4 + (still ? 0 : t * 0.25), lean: 0.1, shade: 0.9 });
        }
      }
      if (!still || introStart != null) requestAnimationFrame(frame);
    };
    frame();
    if (still) addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
  });
}
