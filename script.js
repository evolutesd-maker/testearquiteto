(() => {
  const root = document.documentElement;
  const stage = document.getElementById('stage');
  const plan = document.getElementById('plan');
  const panels = [...document.querySelectorAll('.panel')];
  const progress = document.getElementById('progress');
  const hudRoom = document.getElementById('hudRoom');
  const scaleBar = document.getElementById('scaleBar');
  const scaleLbl = document.getElementById('scaleLbl');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- cotas (dimensões) ---------- */
  const cotas = document.getElementById('cotas');
  const tick = (x, y) => `M${x - 7} ${y + 7}L${x + 7} ${y - 7}`;
  function cota(x1, y1, x2, y2, label) {
    const horiz = y1 === y2;
    const path = document.createElementNS(NS, 'path');
    let d = `M${x1} ${y1}L${x2} ${y2}${tick(x1, y1)}${tick(x2, y2)}`;
    path.setAttribute('d', d);
    cotas.appendChild(path);
    const t = document.createElementNS(NS, 'text');
    t.textContent = label;
    if (horiz) { t.setAttribute('x', (x1 + x2) / 2); t.setAttribute('y', y1 - 9); }
    else {
      const cx = x1 - 9, cy = (y1 + y2) / 2;
      t.setAttribute('x', cx); t.setAttribute('y', cy);
      t.setAttribute('transform', `rotate(-90 ${cx} ${cy})`);
    }
    cotas.appendChild(t);
  }
  cota(100, 34, 1500, 34, '14,00 m');
  cota(100, 70, 640, 70, '5,40');
  cota(640, 70, 980, 70, '3,40');
  cota(980, 70, 1500, 70, '5,20');
  cota(34, 100, 34, 900, '8,00 m');
  cota(70, 100, 70, 520, '4,20');
  cota(70, 520, 70, 900, '3,80');

  /* ---------- camadas que se acumulam por etapa ---------- */
  const layers = [...document.querySelectorAll('[data-show]')];
  const rooms = [...document.querySelectorAll('.room')];
  let curS = -1;
  function setStage(s) {
    if (s === curS) return;
    curS = s;
    stage.dataset.s = s;
    layers.forEach(el => el.classList.toggle('on', s >= +el.dataset.show));
    const hot = (panels[s].dataset.rooms || '').split(',').filter(Boolean);
    rooms.forEach(r => r.classList.toggle('hot', hot.includes(r.dataset.room)));
    hudRoom.textContent = panels[s].dataset.hud || '';
  }

  /* ---------- câmera ---------- */
  let W = innerWidth, H = innerHeight;
  let targets = [], centers = [];

  function region(pos) {
    const narrow = W < 760 || H > W * 1.1;
    if (narrow) return { cx: W * .5, cy: H * .29, w: W * .94, h: H * .5 };
    if (pos === 'r') return { cx: W * .29, cy: H * .52, w: W * .5, h: H * .74 };
    if (pos === 'l') return { cx: W * .71, cy: H * .52, w: W * .5, h: H * .74 };
    return { cx: W * .5, cy: H * .36, w: W * .92, h: H * .54 };
  }

  function measure() {
    W = innerWidth; H = innerHeight;
    targets = panels.map(p => {
      const [x, y, w, h] = p.dataset.box.split(',').map(Number);
      const r = region(p.dataset.pos);
      const ppu = Math.min(r.w / w, r.h / h);
      // ponto do mundo no centro da tela
      return {
        lp: Math.log(ppu),
        wx: x + w / 2 - (r.cx - W / 2) / ppu,
        wy: y + h / 2 - (r.cy - H / 2) / ppu
      };
    });
    centers = panels.map(p => p.offsetTop + p.offsetHeight / 2);
  }

  const smooth = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function scrollTarget() {
    const y = scrollY + H / 2;
    const n = panels.length;
    let i = 0;
    while (i < n - 1 && y > centers[i + 1]) i++;
    let u = 0;
    if (i < n - 1) u = clamp((y - centers[i]) / (centers[i + 1] - centers[i]), 0, 1);
    const k = smooth(clamp((u - .3) / .45, 0, 1));
    const a = targets[i], b = targets[Math.min(i + 1, n - 1)];
    return {
      lp: a.lp + (b.lp - a.lp) * k,
      wx: a.wx + (b.wx - a.wx) * k,
      wy: a.wy + (b.wy - a.wy) * k,
      s: k > .5 ? Math.min(i + 1, n - 1) : i
    };
  }

  let cur = null;
  function frame() {
    const t = scrollTarget();
    if (!cur) cur = { ...t };
    const e = reduced ? 1 : .13;
    cur.lp += (t.lp - cur.lp) * e;
    cur.wx += (t.wx - cur.wx) * e;
    cur.wy += (t.wy - cur.wy) * e;
    const ppu = Math.exp(cur.lp);
    const vw = W / ppu, vh = H / ppu;
    plan.setAttribute('viewBox', `${(cur.wx - vw / 2).toFixed(2)} ${(cur.wy - vh / 2).toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
    setStage(t.s);

    // escala gráfica: 100 unidades = 1 m
    const pxPerM = ppu * 100;
    let m = 1;
    for (const c of [.5, 1, 2, 5, 10, 20]) { m = c; if (pxPerM * c >= 60) break; }
    scaleBar.style.width = (pxPerM * m).toFixed(0) + 'px';
    scaleLbl.textContent = (m < 1 ? '0,5' : m) + ' m';

    const max = document.documentElement.scrollHeight - H;
    progress.style.transform = `scaleX(${max > 0 ? clamp(scrollY / max, 0, 1) : 0})`;
    requestAnimationFrame(frame);
  }

  /* ---------- abertura ---------- */
  function start() {
    measure();
    const t = scrollTarget();
    cur = { ...t };
    requestAnimationFrame(frame);
  }

  const intro = document.getElementById('intro');
  function openSite() {
    root.classList.remove('lock');
    document.body.classList.add('ready');
    root.classList.add('ready');
    intro.remove();
  }

  addEventListener('resize', measure);
  addEventListener('load', measure);
  document.fonts && document.fonts.ready.then(measure);
  start();

  if (reduced) { openSite(); }
  else {
    root.classList.add('lock');
    scrollTo(0, 0);
    requestAnimationFrame(() => intro.classList.add('play'));
    setTimeout(() => { intro.classList.add('out'); root.classList.add('ready'); }, 2900);
    setTimeout(openSite, 3900);
  }
})();
