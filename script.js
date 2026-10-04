(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const panels = [...document.querySelectorAll('.panel')];
  const canvas = document.getElementById('gl');
  const tagsEl = document.getElementById('tags');
  const progress = document.getElementById('progress');
  const hudRoom = document.getElementById('hudRoom');
  const intro = document.getElementById('intro');

  let growStart = null;
  const startGrow = () => { if (growStart === null) growStart = performance.now(); };

  /* ================= abertura ================= */
  function openSite() {
    root.classList.remove('lock');
    startGrow();
    intro.remove();
  }
  if (reduced) { openSite(); growStart = -1e9; }
  else {
    root.classList.add('lock');
    scrollTo(0, 0);
    requestAnimationFrame(() => intro.classList.add('play'));
    setTimeout(() => { intro.classList.add('out'); startGrow(); }, 2900);
    setTimeout(openSite, 3900);
  }

  /* ================= 3D ================= */
  const THREE = window.THREE;
  let renderer = null;
  if (THREE) {
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (e) { renderer = null; }
  }
  if (!renderer) { root.classList.add('nogl'); return; }

  const BG = 0x071012;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(BG);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 30, 75);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 200);

  /* ---------- luz base ---------- */
  scene.add(new THREE.HemisphereLight(0x9bbcc8, 0x0d1618, 0.5));
  const moon = new THREE.DirectionalLight(0xa9c2e0, 0.75);
  moon.position.set(-6, 18, 14);
  moon.target.position.set(8, 0, 5);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 50 });
  moon.shadow.bias = -0.0004;
  scene.add(moon, moon.target);

  /* ---------- chão ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshStandardMaterial({ color: 0x010304, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.13; ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(120, 120, 0x0a1a1d, 0x061013);
  grid.position.set(8, -0.12, 5); grid.material.transparent = true; grid.material.opacity = 0.9;
  scene.add(grid);

  /* ---------- texturas de piso (desenhadas em canvas) ---------- */
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function tex(kind, rx, ry) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    if (kind === 'wood' || kind === 'wood2') {
      const base = kind === 'wood' ? [199, 154, 104] : [150, 108, 70];
      const rows = 8, h = 512 / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rnd() * 200;
        while (x < 512) {
          const w = 150 + rnd() * 160, k = 0.88 + rnd() * 0.2;
          g.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`;
          g.fillRect(x, r * h, w, h);
          g.strokeStyle = 'rgba(50,28,10,.55)'; g.lineWidth = 2; g.strokeRect(x, r * h, w, h);
          g.strokeStyle = 'rgba(60,35,15,.16)'; g.lineWidth = 1;
          for (let i = 0; i < 3; i++) { const yy = r * h + 8 + rnd() * (h - 16); g.beginPath(); g.moveTo(x + 4, yy); g.lineTo(x + w - 4, yy + (rnd() - .5) * 4); g.stroke(); }
          x += w;
        }
      }
    } else if (kind === 'stone') {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const k = 0.93 + rnd() * 0.1;
        g.fillStyle = `rgb(${196 * k | 0},${191 * k | 0},${178 * k | 0})`; g.fillRect(i * 256, j * 256, 256, 256);
      }
      g.strokeStyle = 'rgba(70,66,58,.8)'; g.lineWidth = 4;
      g.strokeRect(0, 0, 512, 512); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.moveTo(0, 256); g.lineTo(512, 256); g.stroke();
    } else if (kind === 'tile') {
      const n = 8, s = 512 / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const k = 0.94 + rnd() * 0.1;
        g.fillStyle = `rgb(${158 * k | 0},${190 * k | 0},${192 * k | 0})`; g.fillRect(i * s, j * s, s, s);
        g.strokeStyle = 'rgba(70,95,98,.85)'; g.lineWidth = 2; g.strokeRect(i * s, j * s, s, s);
      }
    } else {
      const rows = 6, h = 512 / rows;
      for (let r = 0; r < rows; r++) {
        const k = 0.9 + rnd() * 0.15;
        g.fillStyle = `rgb(${172 * k | 0},${130 * k | 0},${88 * k | 0})`; g.fillRect(0, r * h, 512, h);
        g.fillStyle = 'rgba(30,18,8,.65)'; g.fillRect(0, r * h, 512, 3);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 8;
    return t;
  }

  /* ---------- helpers de geometria (unidades em metros) ---------- */
  const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.72, metalness: 0 }, o));
  const furn = [];
  function room(show) { const g = new THREE.Group(); g.userData = { show, pop: 0 }; furn.push(g); scene.add(g); return g; }
  function bx(g, x, z, w, d, h, color, y0 = 0, o) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, o));
    m.position.set(x, y0 + h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
  }
  function cy(g, x, z, r, h, color, y0 = 0, o) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), M(color, o));
    m.position.set(x, y0 + h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
  }
  function glow(g, x, y, z, r) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe2b0 }));
    m.position.set(x, y, z); g.add(m); return m;
  }
  function plant(g, x, z, s = 1) {
    cy(g, x, z, 0.2 * s, 0.38 * s, 0xb5654a);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.36 * s, 18, 14), M(0x4f8a5b, { roughness: 0.9 }));
    m.position.set(x, 0.8 * s, z); m.scale.y = 1.2; m.castShadow = true; g.add(m);
  }
  function chair(g, x, z, dir, color = 0x6b4a32) {
    bx(g, x, z, 0.4, 0.4, 0.45, color);
    const o = { n: [0, -0.2, 0.4, 0.06], s: [0, 0.2, 0.4, 0.06], w: [-0.2, 0, 0.06, 0.4], e: [0.2, 0, 0.06, 0.4] }[dir];
    bx(g, x + o[0], z + o[1], o[2], o[3], 0.45, color, 0.45);
  }

  /* ---------- pisos ---------- */
  const floors = [];
  function floor(x1, z1, x2, z2, kind, show) {
    const w = x2 - x1, d = z2 - z1;
    const mat = M(0xffffff, { map: tex(kind, w / 2, d / 2), roughness: kind === 'tile' || kind === 'stone' ? 0.45 : 0.7 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), mat);
    m.position.set((x1 + x2) / 2, -0.07, (z1 + z2) / 2); m.receiveShadow = true;
    m.userData = { show, c: 0 }; mat.color.set(0x2a3d41);
    scene.add(m); floors.push(m);
  }
  floor(1, 1, 6.4, 5.2, 'wood', 1);
  floor(6.4, 1, 9.8, 5.2, 'wood', 2);
  floor(9.8, 1, 15, 5.2, 'stone', 2);
  floor(1, 5.2, 5.4, 9, 'wood', 3);
  floor(5.4, 5.2, 7.6, 9, 'tile', 3);
  floor(7.6, 5.2, 11.2, 9, 'wood2', 4);
  floor(11.2, 5.2, 15, 9, 'deck', 4);

  /* ---------- paredes (com aberturas) ---------- */
  const walls = [];
  const wallMat = M(0xe6e1d6, { roughness: 0.9 });
  const innerMat = M(0xf0ebe0, { roughness: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fd4dc, transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0.2, depthWrite: false });

  function wall(o) {
    const { x1, z1, x2, z2, t, h, n, kind, open = [], order = 0 } = o;
    const horiz = z1 === z2, len = horiz ? x2 - x1 : z2 - z1, start = horiz ? x1 : z1;
    const g = new THREE.Group();
    const mat = kind === 'outer' ? wallMat : innerMat;
    const seg = (a, b, y0, y1, m = mat) => {
      if (b - a < 0.001 || y1 - y0 < 0.001) return;
      const size = horiz ? [b - a, y1 - y0, t] : [t, y1 - y0, b - a];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), m);
      const c = start + (a + b) / 2;
      mesh.position.set(horiz ? c : x1, (y0 + y1) / 2, horiz ? z1 : c);
      mesh.castShadow = m === mat; mesh.receiveShadow = true;
      g.add(mesh);
    };
    let cur = 0;
    [...open].sort((p, q) => p.a - q.a).forEach(op => {
      seg(cur, op.a, 0, h);
      if (op.s > 0) seg(op.a, op.b, 0, Math.min(op.s, h));
      if (op.hd < h) seg(op.a, op.b, op.hd, h);
      if (op.glass) seg(op.a, op.b, op.s, Math.min(op.hd, h), glassMat);
      cur = op.b;
    });
    seg(cur, len, 0, h);
    scene.add(g);
    walls.push({ g, h, n, kind, entry: !!o.entry, order, cut: 1 });
  }
  const OUT = 2.4, INN = 1.3;
  wall({ kind: 'outer', x1: 1, z1: 1, x2: 15, z2: 1, t: 0.16, h: OUT, n: [0, -1], entry: true, order: 0,
    open: [{ a: 6, b: 7, s: 0, hd: 2.1 }, { a: 3.4, b: 5.2, s: 0.9, hd: 2.1, glass: 1 }, { a: 9.5, b: 13, s: 0.9, hd: 2.1, glass: 1 }] });
  wall({ kind: 'outer', x1: 15, z1: 1, x2: 15, z2: 5.2, t: 0.16, h: OUT, n: [1, 0], order: 1 });
  wall({ kind: 'outer', x1: 1, z1: 9, x2: 11.2, z2: 9, t: 0.16, h: OUT, n: [0, 1], order: 2,
    open: [{ a: 7.8, b: 9.4, s: 0.9, hd: 2.1, glass: 1 }] });
  wall({ kind: 'outer', x1: 1, z1: 1, x2: 1, z2: 9, t: 0.16, h: OUT, n: [-1, 0], order: 3,
    open: [{ a: 1, b: 3.2, s: 0.9, hd: 2.1, glass: 1 }, { a: 5.1, b: 7.2, s: 0.9, hd: 2.1, glass: 1 }] });
  // guarda-corpo da varanda
  wall({ kind: 'rail', x1: 15, z1: 5.2, x2: 15, z2: 9, t: 0.05, h: 1.0, order: 4, open: [{ a: 0.1, b: 3.7, s: 0.1, hd: 1.0, glass: 1 }] });
  wall({ kind: 'rail', x1: 11.2, z1: 9, x2: 15, z2: 9, t: 0.05, h: 1.0, order: 4, open: [{ a: 0.1, b: 3.7, s: 0.1, hd: 1.0, glass: 1 }] });
  // internas
  wall({ kind: 'inner', x1: 1, z1: 5.2, x2: 15, z2: 5.2, t: 0.09, h: INN, order: 5,
    open: [{ a: 2, b: 2.8, s: 0, hd: 9 }, { a: 7.6, b: 8.4, s: 0, hd: 9 }, { a: 11.5, b: 12.4, s: 0, hd: 9, glass: 1 }] });
  wall({ kind: 'inner', x1: 9.8, z1: 1, x2: 9.8, z2: 5.2, t: 0.09, h: INN, order: 6, open: [{ a: 1, b: 2.8, s: 0.9, hd: 9 }] });
  wall({ kind: 'inner', x1: 5.4, z1: 5.2, x2: 5.4, z2: 9, t: 0.09, h: INN, order: 7, open: [{ a: 1.8, b: 2.6, s: 0, hd: 9 }] });
  wall({ kind: 'inner', x1: 7.6, z1: 5.2, x2: 7.6, z2: 9, t: 0.09, h: INN, order: 8 });
  wall({ kind: 'inner', x1: 11.2, z1: 5.2, x2: 11.2, z2: 9, t: 0.09, h: INN, order: 9, open: [{ a: 1.8, b: 2.6, s: 0, hd: 9, glass: 1 }] });

  /* ---------- mobiliário ---------- */
  const sala = room(1);
  bx(sala, 3.05, 2.55, 2.7, 1.7, 0.02, 0xe3d6c2);
  bx(sala, 3, 1.27, 2, 0.26, 0.45, 0x5b4030); bx(sala, 3, 1.2, 1.3, 0.05, 0.75, 0x101618, 0.8);
  bx(sala, 3.05, 2.5, 1.3, 0.7, 0.38, 0x7a5a40, 0.02);
  bx(sala, 3.1, 3.88, 2.2, 0.56, 0.42, 0x3f6560); bx(sala, 3.1, 4.2, 2.2, 0.2, 0.85, 0x3f6560); bx(sala, 2.05, 3.95, 0.14, 0.7, 0.62, 0x3a5c57); bx(sala, 4.15, 3.95, 0.14, 0.7, 0.62, 0x3a5c57);
  bx(sala, 5.08, 2.4, 0.56, 0.8, 0.42, 0xc9683f); bx(sala, 5.4, 2.4, 0.16, 0.8, 0.85, 0xc9683f);
  bx(sala, 5.08, 3.4, 0.56, 0.8, 0.42, 0xc9683f); bx(sala, 5.4, 3.4, 0.16, 0.8, 0.85, 0xc9683f);
  plant(sala, 5.9, 1.5, 1.1);
  cy(sala, 1.5, 4.6, 0.03, 1.5, 0x222a2c); glow(sala, 1.5, 1.6, 4.6, 0.14);

  const jantar = room(2);
  cy(jantar, 8.1, 3.1, 0.08, 0.7, 0x2a2a28); bx(jantar, 8.1, 3.1, 1.6, 1.1, 0.06, 0x7a5a40, 0.7);
  [7.6, 8.15, 8.7].forEach(x => { chair(jantar, x, 2.33, 'n'); chair(jantar, x, 3.87, 's'); });
  chair(jantar, 7.07, 3.1, 'w'); chair(jantar, 9.13, 3.1, 'e');
  plant(jantar, 9.4, 1.5);
  cy(jantar, 8.1, 2.3, 0.012, 1.0, 0x222a2c, 1.4); glow(jantar, 8.1, 1.75, 3.1, 0.18);

  const coz = room(2);
  bx(coz, 10.24, 1.6, 0.6, 0.8, 0.9, 0xeeeae2); bx(coz, 10.24, 4.65, 0.6, 0.7, 0.9, 0xeeeae2);
  bx(coz, 10.24, 4.05, 0.6, 0.5, 1.9, 0xcfd6d6, 0, { metalness: 0.5, roughness: 0.35 });
  bx(coz, 14.57, 3.09, 0.62, 3.82, 0.9, 0xeeeae2); bx(coz, 14.57, 3.09, 0.66, 3.86, 0.04, 0x2b3436, 0.9);
  [[14.45, 1.8], [14.7, 1.8], [14.45, 2.12], [14.7, 2.12]].forEach(p => cy(coz, p[0], p[1], 0.09, 0.02, 0x0c0f10, 0.94));
  bx(coz, 14.57, 3.37, 0.42, 0.74, 0.02, 0x8c9696, 0.94, { metalness: 0.6 });
  bx(coz, 12.75, 2.9, 2.5, 0.8, 0.9, 0x2f4a47); bx(coz, 12.75, 2.9, 2.6, 0.9, 0.04, 0xece6da, 0.9);
  [11.85, 12.45, 13.05, 13.65].forEach(x => { cy(coz, x, 3.64, 0.04, 0.55, 0x222a2c); cy(coz, x, 3.64, 0.17, 0.06, 0x6b4a32, 0.55); });
  [12.0, 12.75, 13.5].forEach(x => { cy(coz, x, 2.9, 0.008, 0.9, 0x222a2c, 1.1); glow(coz, x, 1.95, 2.9, 0.11); });

  const suite = room(3);
  bx(suite, 3.25, 8.0, 2.9, 1.9, 0.02, 0xd9cdb8);
  bx(suite, 3.25, 8.15, 1.7, 1.5, 0.35, 0x5b4030); bx(suite, 3.25, 8.1, 1.64, 1.4, 0.2, 0xf3efe6, 0.35);
  bx(suite, 3.25, 8.4, 1.66, 0.8, 0.07, 0x6f9a94, 0.55);
  bx(suite, 2.85, 8.7, 0.62, 0.36, 0.12, 0xffffff, 0.55); bx(suite, 3.65, 8.7, 0.62, 0.36, 0.12, 0xffffff, 0.55);
  bx(suite, 3.25, 8.96, 1.9, 0.08, 1.0, 0x5b4030);
  bx(suite, 2.14, 8.68, 0.36, 0.36, 0.45, 0x5b4030); bx(suite, 4.36, 8.68, 0.36, 0.36, 0.45, 0x5b4030);
  cy(suite, 2.14, 8.68, 0.03, 0.4, 0x222a2c, 0.45); glow(suite, 2.14, 0.98, 8.68, 0.1);
  bx(suite, 4.65, 5.48, 1.34, 0.4, 2.0, 0xd6c8b0);
  const bath = room(3);
  bx(bath, 6.0, 5.8, 0.96, 0.96, 0.05, 0xdfe8e8);
  bx(bath, 6.48, 5.8, 0.03, 0.96, 2.0, 0x9fd4dc, 0, { transparent: true, opacity: 0.25, roughness: 0.1 });
  bx(bath, 6.0, 6.28, 0.96, 0.03, 2.0, 0x9fd4dc, 0, { transparent: true, opacity: 0.25, roughness: 0.1 });
  bx(bath, 7.23, 6.3, 0.46, 1.4, 0.85, 0xeeeae2); bx(bath, 7.23, 6.3, 0.3, 0.5, 0.04, 0xffffff, 0.85);
  bx(bath, 7.17, 8.78, 0.45, 0.24, 0.75, 0xffffff);
  const bowl = cy(bath, 7.17, 8.4, 0.22, 0.4, 0xffffff); bowl.scale.z = 1.35;

  const esc = room(4);
  bx(esc, 9.05, 8.47, 1.9, 0.7, 0.05, 0x7a5a40, 0.72); bx(esc, 8.15, 8.47, 0.05, 0.66, 0.72, 0x3a2a1e); bx(esc, 9.95, 8.47, 0.05, 0.66, 0.72, 0x3a2a1e);
  bx(esc, 9.05, 8.5, 0.5, 0.34, 0.02, 0x2b3436, 0.77); bx(esc, 9.05, 8.35, 0.5, 0.02, 0.3, 0x101618, 0.78);
  cy(esc, 9.05, 7.68, 0.24, 0.45, 0x3f6560); bx(esc, 9.05, 7.45, 0.5, 0.06, 0.5, 0x3f6560, 0.45);
  bx(esc, 7.83, 7.3, 0.3, 2.6, 2.0, 0x6b4a32);
  [0.5, 0.95, 1.4, 1.85].forEach((y, i) => bx(esc, 7.98, 7.3 - 0.9 + i * 0.5, 0.02, 0.6, 0.3, [0xc9683f, 0x3f6560, 0xe3d6c2, 0x7a5a40][i], y - 0.3 + 0.02));
  cy(esc, 9.55, 8.4, 0.02, 0.4, 0x222a2c, 0.75); glow(esc, 9.55, 1.2, 8.4, 0.09);
  plant(esc, 10.7, 8.7); cy(esc, 10.7, 6.2, 0.24, 0.4, 0xc9683f);

  const var_ = room(4);
  [12.35, 13.25].forEach(x => { bx(var_, x, 7.9, 0.7, 1.2, 0.3, 0xd9d0c0, 0.1); bx(var_, x, 7.35, 0.7, 0.1, 0.5, 0xd9d0c0, 0.3); });
  cy(var_, 14.05, 8, 0.26, 0.45, 0x2f3d3b);
  plant(var_, 14.65, 5.7, 1.1); plant(var_, 14.65, 6.5, 1.1); plant(var_, 12.0, 5.7, 0.9);

  /* ---------- luzes quentes por cômodo ---------- */
  const lights = [];
  function lamp(roomKey, show, x, y, z, base, dist = 8) {
    const l = new THREE.PointLight(0xffb870, 0, dist, 1.6);
    l.position.set(x, y, z); scene.add(l);
    lights.push({ l, roomKey, show, base });
  }
  lamp('sala', 1, 3.2, 2.2, 3.0, 1.8);
  lamp('jantar', 2, 8.1, 1.9, 3.1, 1.7);
  lamp('cozinha', 2, 12.7, 2.0, 2.9, 1.8);
  lamp('suite', 3, 3.2, 2.0, 7.8, 1.6);
  lamp('banho', 3, 6.5, 2.0, 7.0, 1.4, 5);
  lamp('escritorio', 4, 9.3, 2.0, 8.0, 1.6);
  lamp('varanda', 4, 13.1, 2.2, 7.4, 1.3);
  lamp('entrada', 7, 7.5, 1.4, 0.2, 2.2, 6);

  /* ---------- eixos do projeto executivo ---------- */
  const axPts = [];
  [1, 6.4, 9.8, 15].forEach(x => axPts.push(x, 0.03, -0.6, x, 0.03, 9.6));
  [1, 5.2, 9].forEach(z => axPts.push(-0.6, 0.03, z, 15.6, 0.03, z));
  const axGeo = new THREE.BufferGeometry();
  axGeo.setAttribute('position', new THREE.Float32BufferAttribute(axPts, 3));
  const axes = new THREE.LineSegments(axGeo, new THREE.LineBasicMaterial({ color: 0xff8a5c, transparent: true, opacity: 0 }));
  scene.add(axes);

  /* ---------- rótulos HTML projetados na cena ---------- */
  const tagDefs = [
    { id: 'sala', name: 'Sala de estar', area: '22,7 m²', p: [2.0, 1.0, 2.2] },
    { id: 'jantar', name: 'Jantar', area: '14,3 m²', p: [8.1, 1.2, 4.5] },
    { id: 'cozinha', name: 'Cozinha', area: '21,8 m²', p: [12.7, 1.3, 4.3] },
    { id: 'suite', name: 'Suíte', area: '16,7 m²', p: [2.2, 1.3, 6.1] },
    { id: 'banho', name: 'Banho', area: '8,4 m²', p: [6.5, 1.3, 6.9] },
    { id: 'escritorio', name: 'Escritório', area: '13,7 m²', p: [9.4, 1.3, 6.2] },
    { id: 'varanda', name: 'Varanda', area: '14,4 m²', p: [13.1, 1.3, 6.5] },
    { id: 'entrada', name: 'Entrada', area: 'Alameda das Acácias, 420', p: [7.5, 2.4, 1.0], only: 7 },
    { id: 'dimx', name: '14,00 m', area: 'largura', p: [8, 0.2, 9.4], only: [5, 6] },
    { id: 'dimz', name: '8,00 m', area: 'profundidade', p: [0.2, 0.2, 5], only: [5, 6] }
  ];
  tagDefs.forEach(t => {
    const el = document.createElement('div'); el.className = 'tag';
    el.innerHTML = `<b>${t.name}</b><i>${t.area}</i>`;
    tagsEl.appendChild(el); t.el = el; t.v = new THREE.Vector3(...t.p);
  });

  /* ================= câmera guiada pelo scroll ================= */
  // tx,ty,tz: alvo · R: distância · az/el: graus · sx/sy: deslocamento da casa (fração da tela)
  const K = [
    { tx: 8, ty: 0.3, tz: 5, R: 27, az: 30, el: 36, sx: 0.21, sy: 0, flat: 0, entry: 0 },
    { tx: 3.6, ty: 0.3, tz: 3.0, R: 9.5, az: -24, el: 40, sx: -0.22, sy: 0, flat: 0, entry: 0 },
    { tx: 10.4, ty: 0.3, tz: 3.2, R: 14.5, az: 18, el: 38, sx: 0.22, sy: 0, flat: 0, entry: 0 },
    { tx: 3.8, ty: 0.3, tz: 7.2, R: 10.5, az: -20, el: 42, sx: -0.22, sy: 0, flat: 0, entry: 0 },
    { tx: 11.6, ty: 0.3, tz: 7.2, R: 11.5, az: 24, el: 40, sx: 0.22, sy: 0, flat: 0, entry: 0 },
    { tx: 8, ty: 0, tz: 5, R: 28, az: -14, el: 56, sx: 0, sy: -0.14, flat: 0, entry: 0 },
    { tx: 8, ty: 0, tz: 5, R: 29, az: 0, el: 84, sx: 0, sy: -0.14, flat: 1, entry: 0 },
    { tx: 7.5, ty: 0.8, tz: 2.2, R: 14, az: 165, el: 20, sx: -0.2, sy: 0, flat: 0, entry: 1 }
  ];
  const KEYS = ['tx', 'ty', 'tz', 'R', 'az', 'el', 'sx', 'sy', 'flat', 'entry'];

  let W = innerWidth, H = innerHeight, narrow = false, rmul = 1;
  let targets = K, centers = [];
  function measure() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    narrow = W < 760 || H > W * 1.0;
    rmul = narrow ? Math.max(1, 1.15 / (W / H)) : 1;
    targets = K.map(k => narrow ? Object.assign({}, k, { sx: 0, sy: -0.17 }) : k);
    centers = panels.map(p => p.offsetTop + p.offsetHeight / 2);
  }

  const smooth = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function scrollTarget() {
    const y = scrollY + H / 2, n = panels.length;
    let i = 0;
    while (i < n - 1 && y > centers[i + 1]) i++;
    let u = 0;
    if (i < n - 1) u = clamp((y - centers[i]) / (centers[i + 1] - centers[i]), 0, 1);
    const k = smooth(clamp((u - 0.25) / 0.5, 0, 1));
    const a = targets[i], b = targets[Math.min(i + 1, n - 1)];
    const o = { s: k > 0.5 ? Math.min(i + 1, n - 1) : i };
    KEYS.forEach(key => { o[key] = a[key] + (b[key] - a[key]) * k; });
    return o;
  }

  let px = 0, py = 0;
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    px = e.clientX / W - 0.5; py = e.clientY / H - 0.5;
  });

  const cur = {};
  let stage = 0, last = performance.now();
  const dirV = new THREE.Vector3();
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const ROOMS = ['sala', 'jantar', 'cozinha', 'suite', 'banho', 'escritorio', 'varanda'];

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = scrollTarget();
    if (!cur.R) KEYS.forEach(k => { cur[k] = t[k]; });
    const e = reduced ? 1 : 1 - Math.exp(-dt * 4);
    KEYS.forEach(k => { cur[k] += (t[k] - cur[k]) * e; });
    stage = t.s;

    // câmera orbitando a casa
    const sec = now / 1000;
    const az = (cur.az + Math.sin(sec * 0.17) * 3 + px * 5) * Math.PI / 180;
    const el = (cur.el - py * 3) * Math.PI / 180;
    const R = cur.R * rmul;
    camera.position.set(cur.tx + R * Math.sin(az) * Math.cos(el), cur.ty + R * Math.sin(el), cur.tz + R * Math.cos(az) * Math.cos(el));
    camera.lookAt(cur.tx, cur.ty, cur.tz);
    camera.setViewOffset(W, H, -cur.sx * W, -cur.sy * H, W, H);
    camera.updateMatrixWorld();

    // paredes: crescem na abertura e abaixam do lado da câmera
    dirV.set(camera.position.x - cur.tx, 0, camera.position.z - cur.tz).normalize();
    const g = growStart === null ? 0 : (now - growStart) / 1000;
    walls.forEach(w => {
      const grow = easeOut(clamp((g - w.order * 0.12) / 1.6, 0, 1));
      let cut = 1;
      if (w.kind === 'outer') {
        const facing = w.n[0] * dirV.x + w.n[1] * dirV.z;
        cut = facing > 0.2 ? 0.3 / w.h : 1;
        if (w.entry) cut = cut + (1 - cut) * cur.entry;
      }
      const flat = 0.14 / w.h;
      const target = (cut + (flat - cut) * cur.flat) * grow;
      w.cut += (target - w.cut) * (reduced ? 1 : 1 - Math.exp(-dt * 7));
      w.g.scale.y = Math.max(0.001, w.cut);
      w.g.visible = w.cut > 0.002;
    });

    // pisos pintam, móveis sobem, luzes acendem
    const k2 = reduced ? 1 : 1 - Math.exp(-dt * 3);
    floors.forEach(f => {
      const on = stage >= f.userData.show ? 1 : 0;
      f.userData.c += (on - f.userData.c) * k2;
      f.material.color.setRGB(0.16 + 0.84 * f.userData.c, 0.24 + 0.76 * f.userData.c, 0.26 + 0.74 * f.userData.c);
    });
    furn.forEach(f => {
      const on = stage >= f.userData.show ? 1 : 0;
      f.userData.pop += (on - f.userData.pop) * k2 * 1.2;
      f.scale.y = Math.max(0.001, easeOut(clamp(f.userData.pop, 0, 1)));
      f.visible = f.userData.pop > 0.01;
    });
    const act = (panels[stage].dataset.rooms || '').split(',').filter(Boolean);
    lights.forEach(L => {
      let tgt = 0;
      if (stage >= L.show) tgt = act.length ? (act.includes(L.roomKey) ? 1.15 : 0.35) : 0.75;
      if (L.roomKey === 'entrada') tgt = stage === 7 ? 1.2 : 0;
      L.l.intensity += (tgt * L.base - L.l.intensity) * k2;
    });
    axes.material.opacity += ((stage === 6 ? 0.85 : 0) - axes.material.opacity) * k2;

    // rótulos
    tagDefs.forEach(td => {
      let on;
      if (td.only !== undefined) on = [].concat(td.only).includes(stage);
      else on = act.includes(td.id) || stage === 5 || stage === 6;
      td.el.classList.toggle('on', on);
      if (!on && td.el.style.opacity === '') { /* mantém posição até sumir */ }
      td.tmp = td.tmp || new THREE.Vector3();
      td.tmp.copy(td.v).project(camera);
      const sx = (td.tmp.x * 0.5 + 0.5) * W, sy = (-td.tmp.y * 0.5 + 0.5) * H;
      td.el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,calc(-100% - 14px))`;
      if (td.tmp.z > 1) td.el.classList.remove('on');
    });
    hudRoom.textContent = panels[stage].dataset.hud || '';

    const max = document.documentElement.scrollHeight - H;
    progress.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  addEventListener('resize', () => { measure(); });
  addEventListener('load', measure);
  document.fonts && document.fonts.ready.then(measure);
  measure();
  requestAnimationFrame(frame);
})();
