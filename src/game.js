// ════════════════════════════════════════════════════════════════
//  JEU : boucle, rendu, interface
// ════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const cv = $('c'), cx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, SC = 1, OX = 0, OY = 0;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  SC = Math.min(H / VH, W / VW); OX = (W - VW * SC) / 2; OY = (H - VH * SC) / 2;
  $('rot').classList.toggle('off', !(Game.state === 'play' && H > W * 1.1));
}

// ── ÉTAT ─────────────────────────────────────────────────────────
const Game = {
  state: 'menu', mode: '', L: null, P: null, t: 0, acc: 0, last: 0,
  lvl: 0, deaths: 0, attempt: 1, practice: false, cp: null, cps: [],
  rec: [], cur: null, parts: [], trail: [], shake: 0, spin: 0, sx: 1, sy: 1,
  dieT: 0, dieType: '', usedDj: false, rt: 0, seed: 0, day: '', worldVis: 0, msg: null,
};
const Inp = { down: false, queued: false };

// ── OUTILS ───────────────────────────────────────────────────────
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function curSkin() { return skinById(Save.d.skin); }
function W0() { return WORLDS[Game.L ? Game.L.w : 0] || WORLDS[0]; }
const D = () => Save.d;

// ── SILHOUETTES DE DÉCOR (parallaxe) ─────────────────────────────
const SILC = {};
function silPath(w, layer) {
  const k = w + ':' + layer; if (SILC[k]) return SILC[k];
  const type = WORLDS[w].sil, r = rngOf(hashStr(k)), per = 1600, p = new Path2D();
  const amp = layer ? 1 : .6, base = G;
  const wave = (fs) => { p.moveTo(0, base); for (let x = 0; x <= per; x += 20) { let h = 0; for (const [a, f, ph] of fs) h += a * Math.sin(x / per * TAU * f + ph); p.lineTo(x, base - (60 + h) * amp - (layer ? 0 : 50)); } p.lineTo(per, base); p.closePath(); };
  const ph = () => r() * 6.28;
  switch (type) {
    case 'hills': wave([[40, 2, ph()], [20, 5, ph()], [8, 11, ph()]]); break;
    case 'waves': wave([[25, 4, ph()], [15, 9, ph()], [6, 17, ph()]]); break;
    case 'dunes': wave([[50, 1, ph()], [25, 3, ph()]]); break;
    case 'peaks': { p.moveTo(0, base); let x = 0; while (x < per) { const w2 = 80 + r() * 160, h = (90 + r() * 140) * amp; p.lineTo(x + w2 / 2, base - h - (layer ? 0 : 40)); x += w2; p.lineTo(Math.min(per, x), base - 30 * amp); } p.lineTo(per, base); p.closePath(); break; }
    case 'teeth': case 'flames': { p.moveTo(0, base); let x = 0; while (x < per) { const w2 = type === 'teeth' ? 50 : 26 + r() * 30, h = (type === 'teeth' ? 70 : 40 + r() * 110) * amp + (layer ? 0 : 40); p.lineTo(x + w2 / 2, base - h); x += w2; p.lineTo(Math.min(per, x), base - (type === 'teeth' ? 30 : 20) * amp); } p.lineTo(per, base); p.closePath(); break; }
    case 'towers': case 'factory': { let x = 0; while (x < per) { const w2 = 40 + r() * 90, h = (60 + r() * 170) * amp + (layer ? 0 : 50); p.rect(x, base - h, w2, h); if (type === 'factory' && r() < .5) p.rect(x + w2 * .3, base - h - 50, 14, 50); if (type === 'towers' && r() < .6) p.rect(x + w2 / 2 - 2, base - h - 40, 4, 40); x += w2 + 10 + r() * 50; } break; }
    case 'cubes': for (let i = 0; i < 14; i++) { const s = (16 + r() * 50) * amp; p.rect(r() * per, 40 + r() * 230, s, s); } break;
    case 'bolts': for (let i = 0; i < 7; i++) { const x = r() * per, y = 30 + r() * 80, s = (.6 + r() * .8) * amp; p.moveTo(x, y); p.lineTo(x - 30 * s, y + 90 * s); p.lineTo(x - 6 * s, y + 90 * s); p.lineTo(x - 26 * s, y + 180 * s); p.lineTo(x + 30 * s, y + 70 * s); p.lineTo(x + 6 * s, y + 70 * s); p.closePath(); } break;
  }
  return SILC[k] = p;
}

// ── RENDU ────────────────────────────────────────────────────────
function lowerObs(L, x) { let lo = 0, hi = L.obs.length; while (lo < hi) { const m = lo + hi >> 1; if (L.obs[m].x0 < x) lo = m + 1; else hi = m; } return lo; }

function drawBg(w, camX, tm) {
  const Wd = WORLDS[w];
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, Wd.c1); g.addColorStop(1, Wd.c2);
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);
}

function worldTf(shx = 0, shy = 0) { cx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * (OX + shx * SC), DPR * (OY + shy * SC)); }

function drawWorld(L, camX, t, tm, opts = {}) {
  const Wd = WORLDS[L.w] || WORLDS[0], top = -OY / SC - 20, bot = (H - OY) / SC + 20;
  // étoiles + décors
  cx.fillStyle = 'rgba(255,255,255,.5)';
  for (let i = 0; i < 46; i++) { const x = ((i * 173.3 - camX * .04) % VW + VW) % VW, y = top + ((i * 97.7) % (G - top - 60)); cx.fillRect(x, y, i % 5 ? 1.2 : 2, i % 5 ? 1.2 : 2); }
  for (const [layer, f, a] of [[0, .12, .07], [1, .35, .13]]) {
    const p = silPath(L.w, layer), off = -((camX * f) % 1600);
    cx.fillStyle = rgba(Wd.ed, a);
    cx.save(); cx.translate(off, 0); cx.fill(p); cx.translate(1600, 0); cx.fill(p); cx.restore();
  }
  // grille de vitesse
  cx.strokeStyle = rgba(Wd.ed, .07); cx.lineWidth = 1;
  for (let x = -((camX * .6) % 80); x < VW; x += 80) { cx.beginPath(); cx.moveTo(x, top); cx.lineTo(x, G); cx.stroke(); }

  cx.save(); cx.translate(-camX, 0);
  const x0 = camX - 60, x1 = camX + VW + 60;
  // sol
  let sx = x0;
  const drawSeg = (a, b) => {
    if (b <= a) return;
    cx.fillStyle = Wd.gr; cx.fillRect(a, G, b - a, bot - G);
    cx.fillStyle = Wd.ed; cx.fillRect(a, G, b - a, 3);
    cx.fillStyle = rgba(Wd.ed, .12);
    for (let gx = Math.ceil(a / 64) * 64; gx < b; gx += 64) cx.fillRect(gx, G + 3, 1, bot - G);
  };
  for (const gp of L.gaps) {
    if (gp.x + gp.w < x0) continue; if (gp.x > x1) break;
    drawSeg(sx, gp.x); sx = gp.x + gp.w;
    cx.fillStyle = rgba(Wd.ob, .18); cx.fillRect(gp.x, G + 2, gp.w, bot - G);
  }
  drawSeg(sx, x1);

  // ligne d'arrivée
  if (isFinite(L.len) && L.len < x1 + 40) {
    const fx = L.len;
    cx.strokeStyle = `hsl(${tm * 120 % 360},100%,60%)`; cx.lineWidth = 3; cx.setLineDash([12, 7]);
    cx.beginPath(); cx.moveTo(fx, top); cx.lineTo(fx, G); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle = '#ddd'; cx.fillRect(fx - 2, G - 130, 4, 130);
    cx.fillStyle = Wd.ac; cx.beginPath(); cx.moveTo(fx + 2, G - 130); cx.lineTo(fx + 40, G - 116); cx.lineTo(fx + 2, G - 102); cx.fill();
  }

  // obstacles
  for (let k = lowerObs(L, x0 - 1400); k < L.obs.length; k++) {
    const o = L.obs[k]; if (o.x0 > x1) break; if (o.x1 < x0) continue;
    drawObs(o, t, Wd, top, tm, opts.P);
  }
  // checkpoints (entraînement)
  if (opts.cps) for (const c of opts.cps) {
    cx.fillStyle = '#39ff9a'; cx.save(); cx.translate(c.P.x, G - 46); cx.rotate(Math.PI / 4); cx.fillRect(-7, -7, 14, 14); cx.restore();
  }
  cx.restore();
}

function drawObs(o, t, Wd, top, tm, P) {
  switch (o.t) {
    case 'spk': {
      const n = Math.max(1, Math.round(o.w / 22)), sw = o.w / n;
      for (let i = 0; i < n; i++) {
        const bx = o.x + i * sw;
        cx.fillStyle = Wd.ob; cx.beginPath(); cx.moveTo(bx, G); cx.lineTo(bx + sw / 2, G - SPK_H); cx.lineTo(bx + sw, G); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,.28)'; cx.beginPath(); cx.moveTo(bx + sw / 2, G - SPK_H); cx.lineTo(bx + sw * .62, G); cx.lineTo(bx + sw / 2, G); cx.fill();
      }
      break;
    }
    case 'saw': case 'msaw': {
      const y = o.t === 'msaw' ? msawY(o, t) : o.y;
      if (o.t === 'msaw') { cx.strokeStyle = 'rgba(255,255,255,.12)'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(o.x, o.y); cx.lineTo(o.x, o.y - o.amp); cx.stroke(); }
      cx.save(); cx.translate(o.x, y); cx.rotate(t * (o.sp || .08) * 3);
      cx.fillStyle = '#b8b8c4';
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; cx.beginPath(); cx.moveTo(Math.cos(a) * o.r * .66, Math.sin(a) * o.r * .66); cx.lineTo(Math.cos(a + .26) * o.r, Math.sin(a + .26) * o.r); cx.lineTo(Math.cos(a + .52) * o.r * .66, Math.sin(a + .52) * o.r * .66); cx.fill(); }
      cx.fillStyle = '#d8d8e0'; cx.beginPath(); cx.arc(0, 0, o.r * .58, 0, TAU); cx.fill();
      cx.fillStyle = Wd.ob; cx.beginPath(); cx.arc(0, 0, o.r * .2, 0, TAU); cx.fill();
      cx.restore();
      cx.strokeStyle = rgba(Wd.ob, .35); cx.lineWidth = 4; cx.beginPath(); cx.arc(o.x, y, o.r + 6, 0, TAU); cx.stroke();
      break;
    }
    case 'wal': {
      const bandB = o.gs + o.gh;
      cx.fillStyle = rgba(Wd.ed, .9);
      cx.fillRect(o.x, top, WALL_W, o.gs - top);
      if (bandB < G) cx.fillRect(o.x, bandB, WALL_W, G - bandB);
      cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(o.x + 6, top, 3, o.gs - top); if (bandB < G) cx.fillRect(o.x + 6, bandB, 3, G - bandB);
      cx.strokeStyle = '#39ff9a'; cx.lineWidth = 2; cx.setLineDash([6, 5]);
      cx.strokeRect(o.x - 4, o.gs, WALL_W + 8, o.gh); cx.setLineDash([]);
      const gg = cx.createLinearGradient(o.x - 120, 0, o.x, 0); gg.addColorStop(0, 'rgba(57,255,154,0)'); gg.addColorStop(1, 'rgba(57,255,154,.14)'); cx.fillStyle = gg; cx.fillRect(o.x - 120, o.gs, 120, o.gh);
      break;
    }
    case 'ceil': {
      const yb = G - o.cl;
      cx.fillStyle = rgba(Wd.ed, .85); cx.fillRect(o.x, top, o.w, yb - top);
      cx.fillStyle = Wd.ob;
      for (let x = o.x; x < o.x + o.w - 1; x += 18) { cx.beginPath(); cx.moveTo(x, yb); cx.lineTo(x + 9, yb + 10); cx.lineTo(x + 18, yb); cx.fill(); }
      break;
    }
    case 'plt': case 'mpl': {
      const y = o.t === 'mpl' ? mplY(o, t) : o.y;
      if (o.t === 'mpl') { cx.strokeStyle = 'rgba(255,255,255,.1)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(o.x + o.w / 2, o.mi); cx.lineTo(o.x + o.w / 2, o.ma + o.h); cx.stroke(); }
      const g = cx.createLinearGradient(0, y, 0, y + o.h); g.addColorStop(0, Wd.ac); g.addColorStop(1, rgba(Wd.ed, .9));
      cx.fillStyle = g; cx.beginPath(); cx.roundRect ? cx.roundRect(o.x, y, o.w, o.h, 5) : cx.rect(o.x, y, o.w, o.h); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.35)'; cx.fillRect(o.x + 5, y + 2, o.w - 10, 2);
      break;
    }
    case 'pad': {
      const p = .5 + .5 * Math.sin(tm * 10);
      cx.fillStyle = '#ffd84a'; cx.beginPath(); cx.moveTo(o.x, G); cx.lineTo(o.x + 6, G - 10); cx.lineTo(o.x + o.w - 6, G - 10); cx.lineTo(o.x + o.w, G); cx.fill();
      cx.fillStyle = `rgba(255,216,74,${.25 + .3 * p})`;
      for (let i = 0; i < 3; i++) { const y = G - 22 - i * 14 - p * 6; cx.beginPath(); cx.moveTo(o.x + 8, y + 8); cx.lineTo(o.x + o.w / 2, y); cx.lineTo(o.x + o.w - 8, y + 8); cx.lineTo(o.x + o.w - 8, y + 12); cx.lineTo(o.x + o.w / 2, y + 4); cx.lineTo(o.x + 8, y + 12); cx.fill(); }
      break;
    }
    case 'orb': {
      const used = P && P.orbs.includes('|' + o.x + ';'), p = .5 + .5 * Math.sin(tm * 6);
      cx.globalAlpha = used ? .25 : 1;
      cx.strokeStyle = '#ff7ae6'; cx.lineWidth = 3; cx.beginPath(); cx.arc(o.x, o.y, ORB_R + p * 3, 0, TAU); cx.stroke();
      cx.fillStyle = 'rgba(255,122,230,.35)'; cx.beginPath(); cx.arc(o.x, o.y, ORB_R * .7, 0, TAU); cx.fill();
      cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(o.x, o.y, 3, 0, TAU); cx.fill();
      cx.globalAlpha = 1;
      break;
    }
    case 'sign': {
      cx.font = '900 13px "Arial Black",Arial'; const tw = cx.measureText(o.txt).width + 20;
      cx.fillStyle = '#555'; cx.fillRect(o.x - 2, G - 60, 4, 60);
      cx.fillStyle = 'rgba(0,0,0,.65)'; cx.strokeStyle = Wd.ac; cx.lineWidth = 2;
      cx.beginPath(); cx.roundRect ? cx.roundRect(o.x - 10, G - 92, tw, 30, 6) : cx.rect(o.x - 10, G - 92, tw, 30); cx.fill(); cx.stroke();
      cx.fillStyle = '#fff'; cx.textAlign = 'left'; cx.textBaseline = 'middle'; cx.fillText(o.txt, o.x, G - 77);
      break;
    }
  }
}

function drawBall(x, y, sk, tm, spin, sx = 1, sy = 1, alpha = 1, r = PR) {
  cx.save(); cx.globalAlpha = alpha; cx.translate(x, y); cx.scale(sx, sy);
  drawSkin(cx, sk, r, tm, spin);
  cx.restore();
}

function drawSides() {
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  cx.fillStyle = 'rgba(0,0,0,.6)';
  if (OX > 0.5) { cx.fillRect(0, 0, OX, H); cx.fillRect(OX + VW * SC, 0, W - OX - VW * SC, H); }
}

function render(tm) {
  const st = Game.state;
  if (st === 'menu' || !Game.L) { drawMenuBg(tm); return; }
  if (st === 'done' && Game.rec.length) { renderReplay(tm); return; }
  const L = Game.L, P = Game.P, sk = curSkin();
  const camX = P.x - PX;
  let shx = 0, shy = 0;
  if (Game.shake > .1 && D().set.shake) { shx = (Math.random() - .5) * Game.shake; shy = (Math.random() - .5) * Game.shake; }
  drawBg(L.w, camX, tm);
  worldTf(shx, shy);
  drawWorld(L, camX, Game.t, tm, { cps: Game.practice ? Game.cps : null, P });
  cx.save(); cx.translate(-camX, 0);
  // traînée
  const tr = Game.trail;
  for (let i = 0; i < tr.length; i++) {
    const a = i / tr.length;
    cx.globalAlpha = a * .45; cx.fillStyle = trailColor(sk, i, tm);
    cx.beginPath(); cx.arc(tr[i][0], tr[i][1], PR * (.25 + a * .6), 0, TAU); cx.fill();
  }
  cx.globalAlpha = 1;
  if (st !== 'dying' && st !== 'over') drawBall(P.x, P.y, sk, tm, Game.spin, Game.sx, Game.sy);
  for (const p of Game.parts) { cx.globalAlpha = Math.max(0, p.a); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, TAU); cx.fill(); }
  cx.globalAlpha = 1;
  cx.restore();
  drawSides();
}

// fond animé des menus
const menuL = { w: 0 };
function drawMenuBg(tm) {
  const w = Math.floor(tm / 12) % 10, Wd = WORLDS[w];
  drawBg(w, 0, tm); worldTf();
  const camX = tm * 120;
  for (const [layer, f, a] of [[0, .12, .07], [1, .35, .13]]) {
    const p = silPath(w, layer), off = -((camX * f) % 1600);
    cx.fillStyle = rgba(Wd.ed, a); cx.save(); cx.translate(off, 0); cx.fill(p); cx.translate(1600, 0); cx.fill(p); cx.restore();
  }
  cx.fillStyle = Wd.gr; cx.fillRect(-OX / SC, G, VW + 2 * OX / SC, (H - OY) / SC - G + 10);
  cx.fillStyle = Wd.ed; cx.fillRect(-OX / SC, G, VW + 2 * OX / SC, 3);
  const bx = PX + 40, by = G - PR - Math.abs(Math.sin(tm * 3)) * 70;
  drawBall(bx, by, curSkin(), tm, tm * 6);
}

// ── REPLAY DES MORTS (fin de niveau) ─────────────────────────────
function renderReplay(tm) {
  const L = Game.L, sk = curSkin();
  const maxN = Math.max(...Game.rec.map(r => r.n));
  Game.rt += 1.25; if (Game.rt > maxN + 90) Game.rt = 0;
  const t = Math.min(Math.floor(Game.rt), maxN);
  const x = L.sp * t, camX = x - PX;
  drawBg(L.w, camX, tm); worldTf();
  drawWorld(L, camX, t, tm, {});
  cx.save(); cx.translate(-camX, 0);
  for (const r of Game.rec) {
    if (t <= r.n) {
      const y = r.ys[Math.max(0, t - 1)] / 4;
      if (r.win) drawBall(x, y, sk, tm, t * L.sp * .034);
      else drawBall(x, y, sk, tm, t * L.sp * .034, 1, 1, .32, PR * .9);
    } else if (!r.win && t - r.n < 25) {
      const y = r.ys[r.n - 1] / 4, xx = L.sp * r.n, a = 1 - (t - r.n) / 25;
      cx.strokeStyle = rgba(sk.c[1].length === 7 ? sk.c[1] : '#ff3333', a); cx.lineWidth = 3;
      cx.beginPath(); cx.arc(xx, y, PR + (t - r.n) * 1.5, 0, TAU); cx.stroke();
    }
  }
  cx.restore(); drawSides();
}

// ── BOUCLE ───────────────────────────────────────────────────────
const DT = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  const tm = now / 1000;
  if (!Game.last) Game.last = now;
  let el = (now - Game.last) / 1000; Game.last = now;
  if (el > .25) el = .25;
  if (Game.state === 'play') {
    D().st.playSec += el;
    Game.acc += el;
    let n = 0;
    while (Game.acc >= DT && n < 6 && Game.state === 'play') { tick(); Game.acc -= DT; n++; }
    if (n === 6) Game.acc = 0;
  } else if (Game.state === 'dying' || Game.state === 'over') {
    Game.dieT -= el;
    if (Game.state === 'dying' && Game.dieT <= 0) afterDeath();
  }
  // effets visuels (indépendants de la physique)
  for (const p of Game.parts) { p.x += p.vx * el * 60; p.y += p.vy * el * 60; p.vy += .35 * el * 60; p.a -= 1.6 * el; }
  Game.parts = Game.parts.filter(p => p.a > 0);
  Game.shake *= Math.pow(.02, el);
  Game.sx += (1 - Game.sx) * Math.min(1, el * 12); Game.sy += (1 - Game.sy) * Math.min(1, el * 12);
  render(tm);
  if (Game.state === 'play' || Game.state === 'dying') hud();
}

function tick() {
  const L = Game.L, P = Game.P;
  const press = Inp.queued, down = Inp.down || Inp.queued;
  Inp.queued = false;
  Game.t++;
  const wasG = P.onG;
  const ev = step(L, P, Game.t, press, down);
  Game.spin += L.spAt(P.x) * .034 * (P.onG ? 1 : .6);
  Game.trail.push([P.x, P.y]); if (Game.trail.length > 14) Game.trail.shift();
  if (Game.cur) { if (Game.cur.n < Game.cur.ys.length) Game.cur.ys[Game.cur.n++] = Math.round(P.y * 4); }

  if (ev === 'jump') { Snd.sfx('jump'); Game.sx = .72; Game.sy = 1.35; D().st.jumps++; }
  else if (ev === 'djump') { Snd.sfx('djump'); Game.sx = .7; Game.sy = 1.4; D().st.jumps++; D().st.djumps++; Game.usedDj = true; burst(P.x, P.y + PR, 8, curSkin().c[0], 2.5); }
  else if (ev === 'orb') { Snd.sfx('orb'); D().st.orbs++; burst(P.x, P.y, 14, '#ff7ae6', 4); }
  else if (ev === 'pad') { Snd.sfx('pad'); D().st.pads++; Game.sx = .65; Game.sy = 1.5; }
  if (!wasG && P.onG && ev === '') { Game.sx = 1.32; Game.sy = .72; Snd.sfx('land'); }

  if (ev.startsWith('die')) return die(ev.slice(4));
  if (ev === 'win') return win();

  // entraînement : checkpoint automatique
  if (Game.practice && P.onG && Game.t - (Game.cp ? Game.cp.t : 0) >= 100) {
    Game.cp = { P: clonePlayer(P), t: Game.t }; Game.cps.push(Game.cp); Snd.sfx('cp');
  }
  // endless : flux + changement de décor tous les 500 m
  if (!isFinite(L.len)) {
    L.w = Math.floor(P.x / METER / 500) % 10;
    if (L.gx < P.x + 2400) extendEndless(L, P.x + 3200);
    if (Game.t % 120 === 0) pruneEndless(L, P.x);
  }
}

function burst(x, y, n, col, s = 6) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 1 + Math.random() * s; Game.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 2 + Math.random() * 4, a: 1, c: col }); }
}

// ── HUD ──────────────────────────────────────────────────────────
let hudCache = {};
function setTxt(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function hud() {
  const L = Game.L, P = Game.P;
  if (L.mode === 'story') {
    const pct = clamp(P.x / L.len, 0, 1), best = (D().lv[L.i] && D().lv[L.i].pct) || 0;
    setTxt('hName', L.boss ? L.name : `NIVEAU ${L.name}`);
    setTxt('hSub', Game.practice ? 'ENTRAÎNEMENT' : `ESSAI ${Game.attempt}`);
    setTxt('hPct', Math.floor(pct * 100) + ' %');
    $('progF').style.width = (pct * 100) + '%'; $('progB').style.left = (best * 100) + '%';
    setTxt('hDeaths', String(Game.deaths));
  } else {
    const m = Math.floor(P.x / METER), best = L.mode === 'daily' ? ((D().st.daily[Game.day] || {}).best || 0) : D().st.endBest;
    setTxt('hName', m + ' m');
    setTxt('hSub', 'RECORD ' + best + ' m');
    setTxt('hPct', 'x' + (L.spAt(P.x) / 4).toFixed(2));
    $('progF').style.width = (best ? Math.min(100, m / best * 100) : 0) + '%'; $('progB').style.left = '100%';
    setTxt('hDeaths', String(L.mode === 'daily' ? ((D().st.daily[Game.day] || {}).tries || 0) : D().st.endRuns));
  }
}

// ── DÉROULÉ D'UNE PARTIE ─────────────────────────────────────────
function startStory(i, practice) {
  Game.mode = 'story'; Game.lvl = i; Game.L = genStory(i); Game.deaths = 0; Game.attempt = 1;
  Game.practice = !!practice; Game.rec = []; Game.cps = []; Game.cp = null;
  timeFlags(); begin();
}
function startEndless(daily) {
  Game.mode = daily ? 'daily' : 'endless'; Game.day = today();
  Game.seed = daily ? hashStr('DAILY' + Game.day) : (Math.random() * 4294967296) >>> 0;
  Game.L = newEndless(Game.seed, daily); Game.practice = false; Game.rec = []; Game.cps = [];
  timeFlags(); begin();
}
function begin(fromCp) {
  const L = Game.L;
  if (fromCp && Game.cp) { Game.P = clonePlayer(Game.cp.P); Game.t = Game.cp.t; }
  else { Game.P = newPlayer(); Game.t = 0; }
  L.ci = 0; L.gi = 0;
  Game.trail = []; Game.usedDj = false; Game.acc = 0; Game.sx = Game.sy = 1;
  Inp.queued = false;
  if (L.mode === 'story' && !Game.practice) {
    const n = Math.ceil(L.len / L.sp) + 4;
    Game.cur = { ys: new Int16Array(n), n: 0, win: false };
  } else Game.cur = null;
  showScr(null); $('hud').classList.remove('off'); hudCache = {};
  Game.state = 'play'; resize();
  Snd.start(L.mode === 'story' ? hashStr('M' + L.i) : Game.seed, L.bpm, L.mode === 'story' ? L.w : 6, L.boss, Game.t / 60);
}
function restart(byKey) {
  if (!Game.L) return;
  if (byKey) D().st.restarts++;
  if (Game.state === 'done') return startStory(Game.lvl, false);
  if (Game.mode === 'story') { if (Game.state === 'play' && Game.P.x > 30) { Game.deaths++; Game.attempt++; } Game.cp = null; Game.cps = []; begin(); }
  else startEndless(Game.mode === 'daily');
}

function die(type) {
  const P = Game.P, L = Game.L, s = D().st;
  Game.state = 'dying'; Snd.stop(); Snd.sfx('die');
  s.deaths++; s.dt[type] = (s.dt[type] || 0) + 1;
  if (Game.t < 60 && !Game.cp) s.fastDeaths++;
  burst(P.x, P.y, 26, curSkin().c[1].length === 7 ? curSkin().c[1] : '#ff3333', 7);
  burst(P.x, P.y, 10, '#ffffff', 4);
  Game.shake = 14;
  if (D().set.flash) { const f = $('flash'); f.style.opacity = '1'; setTimeout(() => f.style.opacity = '0', 90); }
  if (L.mode === 'story') {
    Game.deaths++; Game.attempt++;
    const pct = P.x / L.len;
    if (!Game.practice) {
      const l = D().lv[L.i] || (D().lv[L.i] = { done: false, best: 0, pct: 0 });
      l.pct = Math.max(l.pct || 0, pct);
      if (pct >= .99) D().fl.d99 = 1;
      if (Game.cur) { Game.rec.push(Game.cur); if (Game.rec.length > 80) Game.rec.splice(0, 1); }
    }
    Game.dieT = .42;
  } else {
    Game.dieT = .7;
    endRun();
  }
  checkAch();
}
function afterDeath() {
  if (Game.mode === 'story') begin(Game.practice);
}

function win() {
  const L = Game.L, d = D();
  Snd.stop(); Snd.sfx('win');
  Game.state = 'done'; $('hud').classList.add('off'); $('rot').classList.add('off');
  burst(Game.P.x, Game.P.y, 30, '#ffd84a', 6);
  if (Game.practice) {
    d.st.practiceDone++;
    $('dStars').innerHTML = '<i>★★★</i>';
    $('dTitle').textContent = `${L.boss ? L.name : 'NIVEAU ' + L.name} · ENTRAÎNEMENT`;
    $('dDeaths').textContent = 'RÉUSSI';
    $('dSub').textContent = 'Le mode entraînement ne compte pas. Passe en vrai pour valider le niveau.';
    $('bNext').textContent = 'EN VRAI'; $('bNext').onclick = () => startStory(L.i, false);
    $('dReplay').classList.add('off');
    Game.rec = [];
  } else {
    if (Game.cur) { Game.cur.win = true; Game.rec.push(Game.cur); }
    const l = d.lv[L.i] || (d.lv[L.i] = { done: false, best: 0, pct: 0 });
    const first = !l.done, improved = first || Game.deaths < l.best;
    l.pct = 1; if (improved) l.best = Game.deaths; l.done = true;
    if (Game.deaths >= 50) d.fl.per50 = 1;
    if (Game.deaths === 13) d.fl.ex13 = 1;
    if (!Game.usedDj && L.i >= 10) d.fl.nodj = 1;
    if (!d.set.music && !d.set.sfx) d.fl.silent = 1;
    const s = starsOf(l), sNow = Game.deaths === 0 ? 3 : Game.deaths <= 5 ? 2 : 1;
    $('dStars').innerHTML = '★'.repeat(sNow) + '<i>' + '★'.repeat(3 - sNow) + '</i>';
    $('dTitle').textContent = L.boss ? `BOSS ${L.w + 1} · ${L.name}` : `NIVEAU ${L.name} · ${WORLDS[L.w].n}`;
    $('dDeaths').textContent = Game.deaths === 0 ? 'SANS MORT' : `${Game.deaths} MORT${Game.deaths > 1 ? 'S' : ''}`;
    $('dSub').textContent = first ? 'Niveau validé' : improved ? 'Nouveau record' : `Record : ${l.best} mort${l.best > 1 ? 's' : ''}`;
    const nxt = L.i < 99;
    $('bNext').textContent = nxt ? 'SUIVANT' : 'CHAPITRES'; $('bNext').onclick = () => nxt ? startStory(L.i + 1) : openScr('story');
    $('dReplay').classList.toggle('off', Game.rec.length < 2);
    if (improved) submitStory();
  }
  Game.rt = 0;
  Save.save();
  setTimeout(() => { if (Game.state === 'done') showScr('s-done'); }, 450);
  checkAch();
}

function endRun() {
  const L = Game.L, m = Math.floor(Game.P.x / METER), s = D().st;
  s.endRuns += L.mode === 'endless' ? 1 : 0;
  s.endDist += m;
  let rec = false, best;
  if (L.mode === 'endless') {
    rec = m > s.endBest; if (rec) s.endBest = m; best = s.endBest;
  } else {
    const dd = s.daily[Game.day] || (s.daily[Game.day] = { best: 0, tries: 0 });
    dd.tries++; rec = m > dd.best; if (rec) dd.best = m; best = dd.best;
    if (!s.dailyDays.includes(Game.day)) s.dailyDays.push(Game.day);
    s.dailyBestEver = Math.max(s.dailyBestEver, m);
    for (const k of Object.keys(s.daily)) if (k < Game.day && Object.keys(s.daily).length > 40) delete s.daily[k];
  }
  if (m < 10) s.fastDeaths++;
  Save.save();
  $('oTitle').textContent = L.mode === 'daily' ? `DÉFI DU ${Game.day.split('-').reverse().join('/')}` : 'ENDLESS';
  $('oDist').textContent = m + ' m';
  $('oSub').textContent = rec ? 'NOUVEAU RECORD !' : `Record : ${best} m`;
  $('oRank').textContent = '';
  Game.lastRun = { m, rec };
  setTimeout(() => { if (Game.state === 'dying') { Game.state = 'over'; $('hud').classList.add('off'); $('rot').classList.add('off'); showScr('s-over'); } }, 650);
  if (rec) {
    const mode = L.mode, day = mode === 'daily' ? Game.day : 'all';
    const tries = mode === 'daily' ? s.daily[Game.day].tries : s.endRuns;
    LB.submit(mode, day, best, tries).then(ok => ok && LB.rank(mode, day, best)).then(rk => {
      if (!rk) return;
      $('oRank').textContent = `Classement mondial : ${rk}e`;
      if (mode === 'endless') { if (rk <= 100) D().fl.top100 = 1; if (rk <= 10) D().fl.top10 = 1; checkAch(); Save.save(); }
    });
  }
}

function submitStory() {
  let lv = 0, de = 0; for (let i = 0; i < 100; i++) { const l = D().lv[i]; if (l && l.done) { lv++; de += l.best; } }
  LB.submit('story', 'all', lv * 100000 - de, de, lv);
}

function pause() {
  if (Game.state !== 'play') return;
  Game.state = 'pause'; Snd.stop(); D().st.pauses++;
  $('bPractice').style.display = Game.mode === 'story' ? '' : 'none';
  $('bPractice').textContent = Game.practice ? 'QUITTER L’ENTRAÎNEMENT' : 'MODE ENTRAÎNEMENT';
  refreshToggles(); showScr('s-pause'); checkAch();
}
function resume() {
  if (Game.state !== 'pause') return;
  showScr(null); Game.state = 'play'; Game.acc = 0; Game.last = 0;
  Snd.start(Game.mode === 'story' ? hashStr('M' + Game.L.i) : Game.seed, Game.L.bpm, Game.mode === 'story' ? Game.L.w : 6, Game.L.boss, Game.t / 60);
}
function quitToMenu() { Snd.stop(); Game.state = 'menu'; Game.L = null; $('hud').classList.add('off'); $('rot').classList.add('off'); Save.save(); openScr('home'); }

function timeFlags() {
  const h = new Date().getHours();
  if (h < 4) D().fl.night = 1;
  if (h >= 5 && h < 7) D().fl.dawn = 1;
  const td = today(); if (!D().st.days.includes(td)) D().st.days.push(td);
}

// ── EXPLOITS ─────────────────────────────────────────────────────
function checkAch() {
  const d = D(); let got = [], again = true;
  while (again) {
    again = false;
    for (const a of ACH) if (!d.ach[a.id]) { let ok = false; try { ok = a.ok(d); } catch (e) { } if (ok) { d.ach[a.id] = Date.now(); got.push(a); again = true; } }
  }
  if (got.length) { Save.save(); got.forEach(toast); }
}
function skinCanvas(sk, px, locked) {
  const c = document.createElement('canvas'); c.width = c.height = px * 2;
  const g = c.getContext('2d'); g.translate(px, px); g.scale(px / 40, px / 40);
  drawSkin(g, sk, 22, 0.6, 0.4);
  return c;
}
const toastQ = []; let toastLive = 0;
function toast(a) { toastQ.push(a); pumpToast(); }
function pumpToast() {
  if (toastLive >= 2 || !toastQ.length) return;
  const a = toastQ.shift(); toastLive++;
  setTimeout(() => { toastLive--; pumpToast(); }, 2900);
  Snd.sfx('ach');
  const el = document.createElement('div'); el.className = 'toast';
  el.appendChild(skinCanvas(a.sk, 44));
  const tx = document.createElement('div');
  tx.innerHTML = `<div class="k">EXPLOIT · SKIN DÉBLOQUÉ</div><div class="t"></div><div class="d"></div>`;
  tx.querySelector('.t').textContent = a.n; tx.querySelector('.d').textContent = a.d;
  el.appendChild(tx); $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 2500); setTimeout(() => el.remove(), 2900);
}

// ── ÉCRANS ───────────────────────────────────────────────────────
function showScr(id) { document.querySelectorAll('.scr').forEach(s => s.classList.add('off')); if (id) $(id).classList.remove('off'); }
function openScr(name) {
  Snd.sfx('click');
  if (name === 'story') { buildStory(); showScr('s-story'); }
  else if (name === 'endless') startEndless(false);
  else if (name === 'daily') startEndless(true);
  else if (name === 'coll') { buildColl(); showScr('s-coll'); }
  else if (name === 'lb') { showScr('s-lb'); loadLb(lbMode); }
  else if (name === 'set') { buildSet(); showScr('s-set'); }
  else { buildHome(); showScr('s-home'); }
}

function buildHome() {
  const d = D();
  $('hello').textContent = `SALUT ${d.name}`;
  let lv = 0; for (let i = 0; i < 100; i++) if (d.lv[i] && d.lv[i].done) lv++;
  $('mStory').textContent = `${lv}/100 niveaux · ${starCount(d)}/300 étoiles`;
  $('mEnd').textContent = d.st.endBest ? `record ${d.st.endBest} m` : 'course infinie';
  const dd = d.st.daily[today()];
  $('mDaily').textContent = dd ? `aujourd’hui : ${dd.best} m · ${dd.tries} essai${dd.tries > 1 ? 's' : ''}` : 'même parcours pour tous, chaque jour';
  $('mColl').textContent = `${Object.keys(d.ach).length}/100`;
  const c = $('homeSkin'), g = c.getContext('2d');
  homeSkinTick = () => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 120, 120); g.translate(60, 60); drawSkin(g, curSkin(), 28, performance.now() / 1000, performance.now() / 300); };
}
let homeSkinTick = null;
setInterval(() => { if (!$('s-home').classList.contains('off') && homeSkinTick) homeSkinTick(); }, 33);

let storyCh = 0;
function lvUnlocked(i) { return i === 0 || !!(D().lv[i - 1] && D().lv[i - 1].done); }
function buildStory(ch) {
  const d = D();
  if (ch === undefined) { let i = 0; while (i < 99 && d.lv[i] && d.lv[i].done) i++; storyCh = Math.floor(i / 10); } else storyCh = ch;
  $('stStars').textContent = `★ ${starCount(d)}/300`;
  const tabs = $('chTabs'); tabs.innerHTML = '';
  for (let w = 0; w < 10; w++) {
    const b = document.createElement('button'); b.textContent = w + 1;
    if (w === storyCh) b.className = 'on'; else if (!lvUnlocked(w * 10)) b.className = 'lk';
    b.onclick = () => { if (lvUnlocked(w * 10)) { Snd.sfx('click'); buildStory(w); } };
    tabs.appendChild(b);
  }
  $('chName').textContent = `CHAPITRE ${storyCh + 1} · ${WORLDS[storyCh].n}`;
  const g = $('lvGrid'); g.innerHTML = '';
  let nextSet = false;
  for (let k = 0; k < 10; k++) {
    const i = storyCh * 10 + k, l = d.lv[i], un = lvUnlocked(i), s = starsOf(l), boss = k === 9;
    const c = document.createElement('div');
    c.className = 'lc' + (l && l.done ? ' done' : '') + (boss ? ' boss' : '') + (un ? '' : ' lck');
    if (un && !(l && l.done) && !nextSet) { c.className += ' nx'; nextSet = true; }
    c.innerHTML = `<b>${boss ? 'BOSS' : k + 1}</b><span class="st">${'★'.repeat(s)}<i>${'★'.repeat(3 - s)}</i></span><span class="dd">${l && l.done ? (l.best === 0 ? 'sans mort' : l.best + ' morts') : un ? (l && l.pct ? Math.floor(l.pct * 100) + ' %' : 'nouveau') : 'verrouillé'}</span>`;
    if (un) c.onclick = () => { Snd.unlock(); startStory(i); };
    g.appendChild(c);
  }
  $('chHint').textContent = storyCh === 9 ? 'Le dernier chapitre.' : `1 étoile : fini · 2 : 5 morts max · 3 : sans mort`;
}

let collF = 'all';
function buildColl() {
  const d = D(), grid = $('collGrid'); grid.innerHTML = '';
  $('collCount').textContent = `${Object.keys(d.ach).length}/100`;
  const items = [{ a: null, sk: BASE_SKIN }].concat(ACH.map(a => ({ a, sk: a.sk })));
  for (const { a, sk } of items) {
    const got = !a || !!d.ach[a.id];
    if (collF === 'got' && !got) continue; if (collF === 'todo' && got) continue;
    const c = document.createElement('div'); c.className = 'cc' + (got ? '' : ' lck') + (d.skin === sk.id ? ' on' : '');
    c.appendChild(skinCanvas(sk, 52));
    const tx = document.createElement('div');
    const pr = a && a.pr && !got ? a.pr(d) : null;
    const hidden = a && a.secret && !got;
    tx.innerHTML = `<div class="t"></div><div class="d"></div>${pr ? `<div class="pb"><i style="width:${Math.round(pr[0] / pr[1] * 100)}%"></i></div>` : ''}`;
    tx.querySelector('.t').textContent = hidden ? '???' : sk.n;
    tx.querySelector('.d').textContent = !a ? 'Skin de départ' : hidden ? 'Exploit secret' : a.d + (pr ? ` (${pr[0]}/${pr[1]})` : '');
    c.appendChild(tx);
    if (got) c.onclick = () => { if (d.skin !== sk.id) { d.skin = sk.id; d.st.skinChanges++; Save.save(); Snd.sfx('star'); checkAch(); buildColl(); } };
    grid.appendChild(c);
  }
}

let lbMode = 'endless';
async function loadLb(mode) {
  lbMode = mode;
  document.querySelectorAll('#lbTabs button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
  const list = $('lbList'), info = $('lbInfo'); list.innerHTML = '';
  const day = mode === 'daily' ? today() : 'all', d = D();
  const fmt = r => mode === 'story' ? [`${r.extra} niv.`, `${r.deaths} morts`] : [`${r.score} m`, mode === 'daily' ? `${r.deaths} essais` : `${r.deaths} parties`];
  const mine = () => {
    if (mode === 'story') { let lv = 0, de = 0; for (let i = 0; i < 100; i++) { const l = d.lv[i]; if (l && l.done) { lv++; de += l.best; } } return { name: d.name, score: lv * 100000 - de, deaths: de, extra: lv, player_id: d.pid }; }
    if (mode === 'daily') { const x = d.st.daily[today()] || { best: 0, tries: 0 }; return { name: d.name, score: x.best, deaths: x.tries, player_id: d.pid }; }
    return { name: d.name, score: d.st.endBest, deaths: d.st.endRuns, player_id: d.pid };
  };
  const row = (r, rk) => {
    const e = document.createElement('div'); e.className = 'lr' + (r.player_id === d.pid ? ' me' : '');
    const [a, b] = fmt(r);
    e.innerHTML = `<span class="rk">${rk}</span><span class="nm"></span><span class="sc">${a}</span><span class="de">${b}</span>`;
    e.querySelector('.nm').textContent = r.name; list.appendChild(e);
  };
  info.textContent = mode === 'story' ? 'Rang : niveaux terminés, puis le moins de morts (meilleur essai par niveau).' : mode === 'daily' ? `Défi du ${today().split('-').reverse().join('/')} : même parcours pour tout le monde.` : 'Plus longue distance en une course.';
  if (!LB.online()) { info.textContent += ' Classement mondial pas encore activé : tes scores seulement.'; row(mine(), '—'); return; }
  info.textContent += ' Chargement…';
  const rows = await LB.top(mode, day, 50);
  if (lbMode !== mode) return;
  info.textContent = info.textContent.replace(' Chargement…', '');
  if (!rows) { info.textContent += ' Connexion impossible.'; row(mine(), '—'); return; }
  rows.forEach((r, i) => row(r, i + 1));
  if (!rows.some(r => r.player_id === d.pid)) { const me = mine(); if (me.score > 0) { const rk = await LB.rank(mode, day, me.score); row(me, rk || '—'); } }
  if (!rows.length) info.textContent += ' Personne encore : à toi de jouer.';
}

function refreshToggles() {
  const s = D().set;
  document.querySelectorAll('.tog,.tog2').forEach(b => { const k = b.dataset.s; b.classList.toggle('on', !!s[k]); b.textContent = (b.classList.contains('tog2') ? (k === 'music' ? 'MUSIQUE ' : 'SONS ') : '') + (s[k] ? 'ON' : 'OFF'); });
}
function buildSet() { $('setName').value = D().name; $('setVol').value = D().set.vol; refreshToggles(); }
function applySettings() { const s = D().set; Snd.S.music = s.music; Snd.S.sfx = s.sfx; Snd.setVol(s.vol); }

// ── PARTAGE ──────────────────────────────────────────────────────
async function share(text) {
  const url = location.href.split('#')[0].split('?')[0];
  D().st.shares++; Save.save(); checkAch();
  try { if (navigator.share) { await navigator.share({ title: 'BoltBall', text, url }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(text + ' ' + url); toastMsg('Copié dans le presse-papier'); } catch (e) { }
}
function toastMsg(m) { const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = '<div class="t"></div>'; el.querySelector('.t').textContent = m; $('toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 1800); setTimeout(() => el.remove(), 2200); }

// ── ENTRÉES ──────────────────────────────────────────────────────
function pressStart() { if (Game.state === 'play') { Inp.queued = true; Inp.down = true; } }
function pressEnd() { Inp.down = false; }
cv.addEventListener('pointerdown', e => { Snd.unlock(); pressStart(); });
addEventListener('pointerup', pressEnd); addEventListener('pointercancel', pressEnd); addEventListener('blur', pressEnd);
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW', 'KeyZ'];
addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') { if (e.key === 'Enter' && document.activeElement.id === 'inp') $('bName').click(); return; }
  if (JUMP_KEYS.includes(e.code)) {
    e.preventDefault(); if (e.repeat) return; Snd.unlock();
    if (Game.state === 'play') pressStart();
    else if (Game.state === 'over') restart();
    else if (Game.state === 'done' && !$('s-done').classList.contains('off')) $('bNext').click();
  } else if (e.code === 'KeyR' && !e.repeat) { if (['play', 'dying', 'over', 'done', 'pause'].includes(Game.state)) restart(true); }
  else if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { if (Game.state === 'play') pause(); else if (Game.state === 'pause') resume(); }
});
addEventListener('keyup', e => { if (JUMP_KEYS.includes(e.code)) pressEnd(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); Snd.stop(); } });
addEventListener('resize', resize);

// boutons
$('pbtn').addEventListener('pointerdown', e => { e.stopPropagation(); pause(); });
$('bName').onclick = () => {
  const v = $('inp').value.trim().toUpperCase().replace(/[^A-Z0-9ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ _-]/g, '');
  if (!v) { $('inp').placeholder = 'PSEUDO REQUIS'; return; }
  D().name = v; Save.save(); Snd.unlock(); openScr('home');
};
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { Snd.unlock(); openScr(b.dataset.go); });
$('bResume').onclick = resume;
$('bRestart').onclick = () => { showScr(null); Game.state = 'play'; restart(); };
$('bPractice').onclick = () => startStory(Game.lvl, !Game.practice);
$('bQuit').onclick = quitToMenu;
$('bRetry').onclick = () => startStory(Game.lvl, false);
$('bMenu1').onclick = () => { quitToMenu(); openScr('story'); };
$('bMenu2').onclick = quitToMenu;
$('bAgain').onclick = () => startEndless(Game.mode === 'daily');
$('s-over').addEventListener('pointerdown', e => { if (e.target === $('s-over')) startEndless(Game.mode === 'daily'); });
$('bShare1').onclick = () => { const L = Game.L; share(`⚡ BoltBall : ${L.boss ? 'boss ' + L.name : 'niveau ' + L.name} terminé ${Game.deaths === 0 ? 'sans mourir' : 'en ' + Game.deaths + ' mort' + (Game.deaths > 1 ? 's' : '')}. Tu fais mieux ?`); };
$('bShare2').onclick = () => share(`⚡ BoltBall : ${Game.lastRun ? Game.lastRun.m : 0} m ${Game.mode === 'daily' ? 'au défi du jour' : 'en Endless'}. Bats-moi !`);
document.querySelectorAll('#collTabs button').forEach(b => b.onclick = () => { collF = b.dataset.f; document.querySelectorAll('#collTabs button').forEach(x => x.classList.toggle('on', x === b)); buildColl(); });
document.querySelectorAll('#lbTabs button').forEach(b => b.onclick = () => loadLb(b.dataset.m));
document.querySelectorAll('.tog,.tog2').forEach(b => b.onclick = () => { const s = D().set, k = b.dataset.s; s[k] = !s[k]; Save.save(); applySettings(); refreshToggles(); });
$('setVol').oninput = e => { D().set.vol = +e.target.value; applySettings(); Save.save(); };
$('setName').onchange = e => { const v = e.target.value.trim().toUpperCase(); if (v) { D().name = v; Save.save(); } };
let resetArm = 0;
$('bReset').onclick = () => {
  if (Date.now() - resetArm > 3000) { resetArm = Date.now(); $('bReset').textContent = 'SÛR ? TAPE ENCORE'; setTimeout(() => $('bReset').textContent = 'EFFACER MA PROGRESSION', 3000); return; }
  Save.reset(); applySettings(); toastMsg('Progression effacée'); openScr('home');
};
let logoTaps = 0;
$('logo').onclick = () => { if (++logoTaps === 10) { D().fl.logo = 1; Save.save(); checkAch(); } };

// ── DÉMARRAGE ────────────────────────────────────────────────────
Save.load(); applySettings(); timeFlags(); Save.save();
resize();
if (D().name) openScr('home'); else { showScr('s-name'); }
checkAch();
requestAnimationFrame(frame);
setInterval(() => { if (Game.state === 'play') Save.save(); }, 15000);
