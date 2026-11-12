// ════════════════════════════════════════════════════════════════
//  JEU : boucle, rendu, interface
// ════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const cv = $('c'), cx = cv.getContext('2d', { alpha: false });
let DPRCAP = 2; // baisse automatiquement si l'appareil ne tient pas 60 images/s
let W = 0, H = 0, DPR = 1, SC = 1, OX = 0, OY = 0, VWV = VW, PXV = PX;

function resize() {
  DPR = Math.min(DPRCAP, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  const cw = Math.round(W * DPR), ch = Math.round(H * DPR);
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; } // ne réalloue que si la taille change
  view(Game.L ? Game.vsp : 6.2);
}
// En portrait, la vue s'élargit avec la vitesse pour garder le même temps de réaction
function view(sp) {
  const portrait = H > W;
  VWV = portrait ? clamp(420 + (sp - 6.2) * 45, 420, 600) : VW; PXV = portrait ? VWV * .2 : PX;
  SC = Math.min(H / VH, W / VWV); OX = (W - VWV * SC) / 2; OY = (H - VH * SC) * (portrait ? .58 : .5);
}

// ── ÉTAT ─────────────────────────────────────────────────────────
const Game = {
  state: 'menu', mode: '', L: null, P: null, t: 0, acc: 0, last: 0,
  lvl: 0, deaths: 0, attempt: 1, practice: false, cp: null, cps: [],
  rec: [], cur: null, parts: [], trail: [], shake: 0, spin: 0, sx: 1, sy: 1,
  dieT: 0, dieType: '', usedDj: false, rt: 0, seed: 0, day: '', worldVis: 0, msg: null,
  px: 0, py: 0, vsp: 6.2, hit: 0, dieAge: 0, marks: [], pops: [], bestX: 0, passedBest: false,
  coins: 0, m100: 0, ph2: false, countT: 0,
};
let PULSE = 0; // battement de la musique (1 sur le temps, retombe vers 0)
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

// Fond : le dégradé est peint une seule fois dans une image de la taille de l'écran,
// puis recopié tel quel à chaque image (bien moins coûteux qu'un dégradé plein écran recalculé)
let BGI = null, BGW = -1;
function drawBg(w, camX, tm) {
  if (BGW !== w || !BGI || BGI.width !== cv.width || BGI.height !== cv.height) {
    if (!BGI) BGI = document.createElement('canvas');
    BGI.width = cv.width; BGI.height = cv.height;
    const g = BGI.getContext('2d', { alpha: false }), gr = g.createLinearGradient(0, 0, 0, cv.height);
    gr.addColorStop(0, WORLDS[w].c1); gr.addColorStop(1, WORLDS[w].c2); g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
    BGW = w;
  }
  cx.setTransform(1, 0, 0, 1, 0, 0);
  cx.drawImage(BGI, 0, 0);
}
function drawSil(w, camX) {
  const Wd = WORLDS[w];
  for (const [layer, f, a] of [[0, .12, .07], [1, .35, .13]]) {
    const p = silPath(w, layer), off = -((camX * f) % 1600);
    cx.fillStyle = rgba(Wd.ed, a + .05 * PULSE);
    cx.save(); cx.translate(off, 0); cx.fill(p); if (off + 1600 < VWV + 2) { cx.translate(1600, 0); cx.fill(p); } cx.restore();
  }
}

function worldTf(shx = 0, shy = 0) { cx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * (OX + shx * SC), DPR * (OY + shy * SC)); }

function drawWorld(L, camX, t, tm, opts = {}) {
  const Wd = WORLDS[L.w] || WORLDS[0], top = -OY / SC - 20, bot = (H - OY) / SC + 20;
  // étoiles + décors
  cx.fillStyle = 'rgba(255,255,255,.5)'; cx.beginPath();
  for (let i = 0; i < 46; i++) { const x = ((i * 173.3 - camX * .04) % VWV + VWV) % VWV, y = top + ((i * 97.7) % (G - top - 60)); cx.rect(x, y, i % 5 ? 1.2 : 2, i % 5 ? 1.2 : 2); }
  cx.fill();
  drawSil(L.w, camX);
  // lignes de vitesse
  const spd = opts.sp || 0;
  if (spd > 6.8) {
    cx.fillStyle = `rgba(255,255,255,${Math.min(.15, (spd - 6.8) * .05)})`;
    cx.beginPath();
    for (let i = 0; i < 9; i++) { const x = VWV + 60 - ((camX * 1.7 + i * 157) % (VWV + 200)), y = top + 30 + ((i * 71.3) % (G - top - 70)); cx.rect(x, y, 50 + (i % 3) * 35, 1.5); }
    cx.fill();
  }
  // grille de vitesse
  cx.strokeStyle = rgba(Wd.ed, .07); cx.lineWidth = 1; cx.beginPath();
  for (let x = -((camX * .6) % 80); x < VWV; x += 80) { cx.moveTo(x, top); cx.lineTo(x, G); }
  cx.stroke();

  cx.save(); cx.translate(-camX, 0);
  const x0 = camX - 60, x1 = camX + VWV + 60;
  // sol
  let sx = x0;
  const drawSeg = (a, b) => {
    if (b <= a) return;
    cx.fillStyle = Wd.gr; cx.fillRect(a, G, b - a, bot - G);
    if (PULSE > .02) { cx.fillStyle = rgba(Wd.ed, .2 * PULSE); cx.fillRect(a, G + 3, b - a, 14 * PULSE); }
    cx.fillStyle = Wd.ed; cx.fillRect(a, G, b - a, 3);
    cx.fillStyle = rgba(Wd.ed, .12); cx.beginPath();
    for (let gx = Math.ceil(a / 64) * 64; gx < b; gx += 64) cx.rect(gx, G + 3, 1, bot - G);
    cx.fill();
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

  // ligne du record
  if (opts.bestX > 0 && opts.bestX > x0 && opts.bestX < x1) {
    cx.strokeStyle = 'rgba(255,216,74,.55)'; cx.lineWidth = 2; cx.setLineDash([5, 8]);
    cx.beginPath(); cx.moveTo(opts.bestX, top); cx.lineTo(opts.bestX, G); cx.stroke(); cx.setLineDash([]);
    cx.fillStyle = 'rgba(255,216,74,.8)'; cx.font = '900 11px "Arial Black",Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('RECORD', opts.bestX, G - 210);
  }
  // croix aux endroits des morts précédentes
  if (opts.marks) {
    cx.strokeStyle = 'rgba(255,255,255,.4)'; cx.lineWidth = 2.5; cx.lineCap = 'round';
    for (const m of opts.marks) { if (m.x < x0 || m.x > x1) continue; cx.beginPath(); cx.moveTo(m.x - 6, m.y - 6); cx.lineTo(m.x + 6, m.y + 6); cx.moveTo(m.x + 6, m.y - 6); cx.lineTo(m.x - 6, m.y + 6); cx.stroke(); }
    cx.lineCap = 'butt';
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
      cx.fillStyle = Wd.ob; cx.beginPath();
      for (let i = 0; i < n; i++) { const bx = o.x + i * sw; cx.moveTo(bx, G); cx.lineTo(bx + sw / 2, G - SPK_H); cx.lineTo(bx + sw, G); }
      cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.28)'; cx.beginPath();
      for (let i = 0; i < n; i++) { const bx = o.x + i * sw; cx.moveTo(bx + sw / 2, G - SPK_H); cx.lineTo(bx + sw * .62, G); cx.lineTo(bx + sw / 2, G); }
      cx.fill();
      break;
    }
    case 'saw': case 'msaw': {
      const y = o.t === 'msaw' ? msawY(o, t) : o.y;
      if (o.t === 'msaw') { cx.strokeStyle = 'rgba(255,255,255,.12)'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(o.x, o.y); cx.lineTo(o.x, o.y - o.amp); cx.stroke(); }
      cx.save(); cx.translate(o.x, y); cx.rotate(t * (o.sp || .08) * 3);
      cx.fillStyle = '#b8b8c4'; cx.beginPath();
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; cx.moveTo(Math.cos(a) * o.r * .66, Math.sin(a) * o.r * .66); cx.lineTo(Math.cos(a + .26) * o.r, Math.sin(a + .26) * o.r); cx.lineTo(Math.cos(a + .52) * o.r * .66, Math.sin(a + .52) * o.r * .66); }
      cx.fill();
      cx.fillStyle = '#d8d8e0'; cx.beginPath(); cx.arc(0, 0, o.r * .58, 0, TAU); cx.fill();
      cx.fillStyle = Wd.ob; cx.beginPath(); cx.arc(0, 0, o.r * .2, 0, TAU); cx.fill();
      cx.restore();
      cx.strokeStyle = rgba(Wd.ob, .35 + .25 * PULSE); cx.lineWidth = 4 + 2 * PULSE; cx.beginPath(); cx.arc(o.x, y, o.r + 6 + 2 * PULSE, 0, TAU); cx.stroke();
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
      cx.fillStyle = 'rgba(57,255,154,.05)'; cx.fillRect(o.x - 110, o.gs, 110, o.gh); cx.fillStyle = 'rgba(57,255,154,.08)'; cx.fillRect(o.x - 50, o.gs, 50, o.gh);
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
      cx.fillStyle = '#2f8f7a'; cx.fillRect(o.x, y + 3, o.w, o.h - 3);
      cx.fillStyle = '#9fe9d0'; cx.fillRect(o.x, y, o.w, o.h - 5);
      cx.fillStyle = '#ffffff'; cx.fillRect(o.x, y, o.w, 2.5);
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
      cx.font = '900 13px "Arial Black",Arial'; const tw = cx.measureText(o.txt).width + 24, bx = o.x - 12, by = G - 96, bh = 32;
      // poteaux
      for (const px of [bx + 10, bx + tw - 16]) { cx.fillStyle = '#4a2c14'; cx.fillRect(px, by + 10, 6, G - by - 10); cx.fillStyle = 'rgba(255,255,255,.08)'; cx.fillRect(px, by + 10, 2, G - by - 10); }
      // planche
      const wg = cx.createLinearGradient(0, by, 0, by + bh); wg.addColorStop(0, '#c08a4e'); wg.addColorStop(.5, '#a06a32'); wg.addColorStop(1, '#7a4c22');
      cx.fillStyle = wg; cx.fillRect(bx, by, tw, bh);
      cx.strokeStyle = 'rgba(60,30,10,.35)'; cx.lineWidth = 1;
      for (const [yy, a] of [[by + 8, .3], [by + 17, .8], [by + 25, .5]]) { cx.beginPath(); cx.moveTo(bx + 3, yy); cx.bezierCurveTo(bx + tw * .3, yy - 2 * a, bx + tw * .6, yy + 2 * a, bx + tw - 3, yy); cx.stroke(); }
      cx.strokeStyle = '#4a2c14'; cx.lineWidth = 2; cx.strokeRect(bx + 1, by + 1, tw - 2, bh - 2);
      cx.fillStyle = '#3a220e'; for (const nx of [bx + 6, bx + tw - 6]) { cx.beginPath(); cx.arc(nx, by + 6, 1.8, 0, TAU); cx.arc(nx, by + bh - 6, 1.8, 0, TAU); cx.fill(); }
      cx.textAlign = 'left'; cx.textBaseline = 'middle';
      cx.fillStyle = 'rgba(255,230,190,.35)'; cx.fillText(o.txt, bx + 12, by + bh / 2 + 1.5);
      cx.fillStyle = '#2a1606'; cx.fillText(o.txt, bx + 12, by + bh / 2);
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
  if (OX > 0.5) { cx.fillRect(0, 0, OX, H); cx.fillRect(OX + VWV * SC, 0, W - OX - VWV * SC, H); }
}

function drawBolt(x, y, s, alpha, tm) {
  cx.save(); cx.translate(x, y); cx.globalAlpha = alpha;
  const g = cx.createRadialGradient(0, 0, 2, 0, 0, 22 * s); g.addColorStop(0, 'rgba(255,225,77,.45)'); g.addColorStop(1, 'rgba(255,225,77,0)');
  cx.fillStyle = g; cx.beginPath(); cx.arc(0, 0, 22 * s, 0, TAU); cx.fill();
  cx.scale(s * Math.cos(tm * 3) * .25 + s * .85, s);
  cx.fillStyle = '#ffe14d'; cx.strokeStyle = '#7a5a00'; cx.lineWidth = 1.5; cx.lineJoin = 'round';
  cx.beginPath(); cx.moveTo(4, -15); cx.lineTo(-9, 2); cx.lineTo(-1, 2); cx.lineTo(-5, 15); cx.lineTo(9, -3); cx.lineTo(1, -3); cx.closePath(); cx.fill(); cx.stroke();
  cx.restore();
}
function lvCoins(i) { return (typeof COINS !== 'undefined' && COINS[i]) || []; }
function bits(n) { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; }
function pop(x, y, txt, col, size) { Game.pops.push({ x, y, txt, col: col || '#fff', size: size || 15, a: 1.3 }); if (Game.pops.length > 12) Game.pops.shift(); }

function render(tm) {
  const st = Game.state;
  if (st === 'menu' || !Game.L) { PULSE = 0; drawMenuBg(tm); return; }
  if (st === 'done' && Game.rec.length) { renderReplay(tm); return; }
  const L = Game.L, P = Game.P, sk = curSkin();
  // interpolation entre deux pas de physique : fluide à toutes les fréquences d'écran
  const k = st === 'play' ? clamp(Game.acc / DT, 0, 1) : 1;
  const rx = lerp(Game.px, P.x, k), ry = lerp(Game.py, P.y, k), rt = Game.t - 1 + k;
  const spNow = L.spAt(P.x);
  Game.vsp += (spNow - Game.vsp) * .04; view(Game.vsp);
  const ph = (rt / 60 * L.bpm / 60) % 1;
  PULSE = st === 'play' && D().set.music ? Math.pow(1 - ph, 3) : 0;
  const camX = rx - PXV;
  let shx = 0, shy = 0;
  if (Game.shake > .1 && D().set.shake) { shx = (Math.random() - .5) * Game.shake; shy = (Math.random() - .5) * Game.shake; }
  drawBg(L.w, camX, tm);
  worldTf(shx, shy);
  drawWorld(L, camX, rt, tm, { cps: Game.practice ? Game.cps : null, P, sp: spNow, bestX: Game.bestX, marks: Game.marks });
  cx.save(); cx.translate(-camX, 0);
  // numéro de l'essai, écrit dans le décor au départ
  if (L.mode === 'story' && Game.attempt > 1 && rx - Game.spawnX < 700 && !Game.practice) {
    cx.fillStyle = 'rgba(255,255,255,.28)'; cx.font = '900 30px "Arial Black",Arial'; cx.textAlign = 'left'; cx.textBaseline = 'middle';
    cx.fillText('ESSAI ' + Game.attempt, Game.spawnX + 40, G - 180);
  }
  // éclairs à ramasser
  if (L.mode === 'story') {
    const C = lvCoins(L.i), own = (D().lv[L.i] && D().lv[L.i].co) || 0;
    for (let i = 0; i < C.length / 2; i++) {
      if (Game.coins >> i & 1) continue;
      const x = C[2 * i]; if (x < camX - 40 || x > camX + VWV + 40) continue;
      drawBolt(x, C[2 * i + 1] + Math.sin(tm * 4 + i) * 3, 1, own >> i & 1 ? .3 : 1, tm + i);
    }
  }
  // traînée
  const tr = Game.trail;
  for (let i = 0; i < tr.length; i++) {
    if (tr[i][0] > rx) continue;
    const a = i / tr.length;
    cx.globalAlpha = a * .45; cx.fillStyle = trailColor(sk, i, tm);
    cx.beginPath(); cx.arc(tr[i][0], tr[i][1], PR * (.25 + a * .6), 0, TAU); cx.fill();
  }
  cx.globalAlpha = 1;
  if (st === 'dying' || st === 'over') {
    if (Game.hit > 0) { // arrêt sur image : la balle s'écrase en blanc
      drawBall(P.x, P.y, sk, tm, Game.spin, 1.25, 1.25);
      cx.fillStyle = 'rgba(255,255,255,.85)'; cx.beginPath(); cx.arc(P.x, P.y, PR * 1.3, 0, TAU); cx.fill();
    } else if (Game.dieAge < .3) { // onde de choc
      const q = Game.dieAge / .3;
      cx.strokeStyle = `rgba(255,255,255,${.7 * (1 - q)})`; cx.lineWidth = 5 * (1 - q) + 1;
      cx.beginPath(); cx.arc(P.x, P.y, PR + q * 90, 0, TAU); cx.stroke();
    }
  } else drawBall(rx, ry, sk, tm, Game.spin, Game.sx, Game.sy);
  for (const p of Game.parts) { cx.globalAlpha = Math.max(0, Math.min(1, p.a)); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, TAU); cx.fill(); }
  cx.globalAlpha = 1;
  // textes flottants
  cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.lineJoin = 'round';
  for (const q of Game.pops) {
    cx.globalAlpha = Math.max(0, Math.min(1, q.a)); cx.font = `900 ${q.size}px "Arial Black",Arial`;
    cx.lineWidth = 4; cx.strokeStyle = 'rgba(0,0,0,.7)'; cx.strokeText(q.txt, q.x, q.y); cx.fillStyle = q.col; cx.fillText(q.txt, q.x, q.y);
  }
  cx.globalAlpha = 1;
  cx.restore();
  drawSides();
  if (st === 'count') { // reprise après pause : 3, 2, 1
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(0, 0, W, H);
    const n = Math.ceil(Game.countT / .5), f = (Game.countT / .5) % 1;
    cx.font = `900 ${Math.round(90 + 50 * f)}px "Arial Black",Arial`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = '#fff'; cx.shadowColor = '#ff3344'; cx.shadowBlur = 30; cx.fillText(String(Math.max(1, n)), W / 2, H * .42); cx.shadowBlur = 0;
  }
}

// fond animé des menus
const menuL = { w: 0 };
function drawMenuBg(tm) {
  const w = Math.floor(tm / 12) % 10, Wd = WORLDS[w];
  drawBg(w, 0, tm); worldTf();
  const camX = tm * 120;
  drawSil(w, camX);
  cx.fillStyle = Wd.gr; cx.fillRect(-OX / SC, G, VWV + 2 * OX / SC, (H - OY) / SC - G + 10);
  cx.fillStyle = Wd.ed; cx.fillRect(-OX / SC, G, VWV + 2 * OX / SC, 3);
  const bx = PXV + 40, by = G - PR - Math.abs(Math.sin(tm * 3)) * 70;
  drawBall(bx, by, curSkin(), tm, tm * 6);
}

// ── REPLAY DES MORTS (fin de niveau) ─────────────────────────────
function renderReplay(tm) {
  const L = Game.L, sk = curSkin();
  const maxN = Math.max(...Game.rec.map(r => r.n));
  Game.rt += 1.25; if (Game.rt > maxN + 90) Game.rt = 0;
  const t = Math.min(Math.floor(Game.rt), maxN);
  const x = L.sp * t, camX = x - PXV;
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
// Les horloges des navigateurs (Safari surtout) sont arrondies : sans lissage, la durée mesurée de chaque image
// varie de ±1 ms et le défilement tremble. On cale donc la durée sur la cadence réelle de l'écran.
const FT = { buf: [], period: 1 / 60, drift: 0, k: 0 };
function smoothDt(el) {
  const b = FT.buf; b.push(el); if (b.length > 40) b.shift();
  if (++FT.k % 10 === 0 && b.length >= 20) {
    let p = b.slice().sort((x, y) => x - y)[b.length >> 1];
    for (const c of [1 / 120, 1 / 90, 1 / 60, 1 / 30]) if (Math.abs(p - c) < .0015) p = c;
    FT.period = p;
  }
  const n = Math.round(el / FT.period);
  if (n < 1 || n > 4 || Math.abs(el - n * FT.period) > .004) return el;
  const sn = n * FT.period; FT.drift += el - sn;
  const c = FT.drift * .05; FT.drift -= c; // rattrape en douceur l'écart avec le temps réel
  return sn + c;
}
// Si l'appareil ne tient pas la cadence, on réduit la résolution de rendu par paliers (jamais en mode 30 images/s imposé)
const PF = { n: 0, sum: 0, at30: 0 };
function perfWatch(raw) {
  PF.n++; PF.sum += raw; if (Math.abs(raw - 1 / 30) < .003) PF.at30++;
  if (PF.n < 150) return;
  const avg = PF.sum / PF.n, capped30 = PF.at30 > PF.n * .8;
  PF.n = 0; PF.sum = 0; PF.at30 = 0;
  if (avg > .0205 && !capped30 && DPRCAP > 1.25 && (window.devicePixelRatio || 1) > 1.25) { DPRCAP = DPRCAP > 1.5 ? 1.5 : 1.25; resize(); }
}
function frame(now) {
  requestAnimationFrame(frame);
  const tm = now / 1000;
  if (!Game.last) Game.last = now;
  let el = (now - Game.last) / 1000; Game.last = now;
  if (el > .25) el = .25;
  if (Game.state === 'play' && el < .2) perfWatch(el);
  el = smoothDt(el);
  if (Game.state === 'play') {
    D().st.playSec += el;
    Game.acc += el;
    let n = 0;
    while (Game.acc >= DT && n < 6 && Game.state === 'play') { tick(); Game.acc -= DT; n++; }
    if (n === 6) Game.acc = 0;
  } else if (Game.state === 'clear') {
    const fw0 = Math.floor(Game.clearT / .22);
    Game.clearT += el; Game.P.x += Game.L.sp * 60 * el; Game.px = Game.P.x; Game.py = Game.P.y;
    if (Math.floor(Game.clearT / .22) > fw0 && Game.clearT < 1.3) burst(Game.P.x + 60 + Math.random() * (VWV * .6), 90 + Math.random() * 150, 18, ['#ffd84a', '#ffffff', WORLDS[Game.L.w].ac][fw0 % 3], 5); Game.spin += Game.L.sp * .034 * 60 * el;
    if (Game.clearT > 1.7) goNext();
  } else if (Game.state === 'count') {
    Game.countT -= el;
    if (Game.countT <= 0) { Game.state = 'play'; Game.acc = 0; startMusic(); }
  } else if (Game.state === 'dying' || Game.state === 'over') {
    Game.dieT -= el;
    if (Game.hit > 0) Game.hit -= el; else Game.dieAge += el;
    if (Game.state === 'dying' && Game.dieT <= 0) afterDeath();
  }
  // effets visuels (indépendants de la physique), figés pendant l'arrêt sur image
  if (Game.hit <= 0) {
    const ps = Game.parts; let w = 0;
    for (let i = 0; i < ps.length; i++) { const p = ps[i]; p.x += p.vx * el * 60; p.y += p.vy * el * 60; p.vy += (p.g === undefined ? .35 : p.g) * el * 60; p.a -= (p.f || 1.6) * el; if (p.a > 0) ps[w++] = p; }
    ps.length = w;
    for (const q of Game.pops) { q.y -= 34 * el; q.a -= 1.1 * el; }
    Game.pops = Game.pops.filter(q => q.a > 0);
  }
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
  Game.px = P.x; Game.py = P.y;
  const ev = step(L, P, Game.t, press, down);
  Game.spin += L.spAt(P.x) * .034 * (P.onG ? 1 : .6);
  Game.trail.push([P.x, P.y]); if (Game.trail.length > 14) Game.trail.shift();
  if (Game.cur) { if (Game.cur.n < Game.cur.ys.length) Game.cur.ys[Game.cur.n++] = Math.round(P.y * 4); }

  if (ev === 'jump') { Snd.sfx('jump'); Game.sx = .72; Game.sy = 1.35; D().st.jumps++; dust(P.x, Game.py + PR, 4, 1.6); }
  else if (ev === 'djump') { Snd.sfx('djump'); Game.sx = .7; Game.sy = 1.4; D().st.jumps++; D().st.djumps++; Game.usedDj = true; burst(P.x, P.y + PR, 8, curSkin().c[0], 2.5); }
  else if (ev === 'orb') { Snd.sfx('orb'); D().st.orbs++; burst(P.x, P.y, 14, '#ff7ae6', 4); }
  else if (ev === 'pad') { Snd.sfx('pad'); D().st.pads++; Game.sx = .65; Game.sy = 1.5; }
  if (!wasG && P.onG && ev === '') { Game.sx = 1.32; Game.sy = .72; Snd.sfx('land'); dust(P.x, P.y + PR, 6, 2.4); }
  else if (P.onG && Game.t % 5 === 0) dust(P.x - 8, P.y + PR, 1, .8);

  if (ev.startsWith('die')) return die(ev.slice(4));
  if (ev === 'win') return win();

  // éclairs
  if (L.mode === 'story') {
    const C = lvCoins(L.i);
    for (let i = 0; i < C.length / 2; i++) {
      if (Game.coins >> i & 1) continue;
      const dx = P.x - C[2 * i], dy = P.y - C[2 * i + 1];
      if (dx * dx + dy * dy < 30 * 30) { Game.coins |= 1 << i; Snd.sfx('coin'); burst(C[2 * i], C[2 * i + 1], 12, '#ffe14d', 4); pop(C[2 * i], C[2 * i + 1] - 26, '⚡ ' + bits(Game.coins) + '/3', '#ffe14d', 16); }
    }
    if (L.boss && !Game.ph2 && P.x > L.len / 2) { Game.ph2 = true; banner('PHASE 2', 'ÇA ACCÉLÈRE', 1000); Game.shake = 7; Snd.sfx('pad'); }
  }
  // record battu en direct
  if (Game.bestX > 0 && !Game.passedBest && P.x > Game.bestX) {
    Game.passedBest = true; Snd.sfx('star'); pop(P.x + 30, P.y - 46, 'RECORD BATTU', '#ffd84a', 17);
  }
  // entraînement : checkpoint automatique
  if (Game.practice && P.onG && Game.t - (Game.cp ? Game.cp.t : 0) >= 100) {
    Game.cp = { P: clonePlayer(P), t: Game.t }; Game.cps.push(Game.cp); Snd.sfx('cp');
  }
  // endless : flux + changement de décor tous les 500 m
  if (!isFinite(L.len)) {
    const m100 = Math.floor(P.x / METER / 100);
    if (m100 > Game.m100) { Game.m100 = m100; Snd.sfx('cp'); pop(P.x + 40, G - 150, m100 * 100 + ' m', '#fff', 22); }
    L.w = Math.floor(P.x / METER / 500) % 10;
    if (L.gx < P.x + 2400) extendEndless(L, P.x + 3200);
    if (Game.t % 120 === 0) pruneEndless(L, P.x);
  }
}

function dust(x, y, n, s) {
  if (Game.parts.length > 140) return;
  for (let i = 0; i < n; i++) Game.parts.push({ x: x + (Math.random() - .5) * 10, y: y - 1, vx: -Math.random() * s - .4, vy: -Math.random() * s * .45, r: 1.5 + Math.random() * 2.2, a: .5, c: '#ffffff', g: .04, f: 1.5 });
}
function burst(x, y, n, col, s = 6) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 1 + Math.random() * s; Game.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 2 + Math.random() * 4, a: 1, c: col }); }
}

// ── HUD ──────────────────────────────────────────────────────────
let hudCache = {};
function setTxt(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setBar(v, mark) {
  const q = Math.round(v * 300) / 300, mq = Math.round(mark * 300) / 300;
  if (hudCache.bar !== q) { hudCache.bar = q; $('progF').style.transform = `scaleX(${q})`; }
  if (hudCache.mark !== mq) { hudCache.mark = mq; $('progB').style.left = (mq * 100) + '%'; }
}
function hud() {
  const L = Game.L, P = Game.P;
  if (L.mode === 'story') {
    const pct = clamp(P.x / L.len, 0, 1), best = (D().lv[L.i] && D().lv[L.i].pct) || 0;
    setTxt('hName', L.boss ? L.name : `NIVEAU ${L.name}`);
    setTxt('hSub', (Game.practice ? 'ENTRAÎNEMENT' : `ESSAI ${Game.attempt}`) + (lvCoins(L.i).length ? ` · ⚡ ${bits(Game.coins)}/3` : ''));
    setTxt('hPct', Math.floor(pct * 100) + ' %');
    setBar(pct, best);
    setTxt('hDeaths', String(Game.deaths));
  } else {
    const m = Math.floor(P.x / METER), best = L.mode === 'daily' ? ((D().st.daily[Game.day] || {}).best || 0) : D().st.endBest;
    setTxt('hName', m + ' m');
    setTxt('hSub', 'RECORD ' + best + ' m');
    setTxt('hPct', 'x' + (L.spAt(P.x) / 6.5).toFixed(2));
    setBar(best ? Math.min(1, m / best) : 0, 1);
    setTxt('hDeaths', String(L.mode === 'daily' ? ((D().st.daily[Game.day] || {}).tries || 0) : D().st.endRuns));
  }
}

// ── DÉROULÉ D'UNE PARTIE ─────────────────────────────────────────
function startStory(i, practice) {
  Game.mode = 'story'; Game.lvl = i; Game.L = genStory(i); Game.deaths = 0; Game.attempt = 1;
  Game.practice = !!practice; Game.rec = []; Game.cps = []; Game.cp = null; Game.introShown = false; Game.marks = []; Game.coins = 0;
  timeFlags(); begin();
}
function startEndless(daily, retry) {
  Game.mode = daily ? 'daily' : 'endless'; Game.day = today();
  Game.seed = daily ? hashStr('DAILY' + Game.day) : (Math.random() * 4294967296) >>> 0;
  Game.L = newEndless(Game.seed, daily); Game.practice = false; Game.rec = []; Game.cps = []; Game.attempt = 1; Game.introShown = !!retry;
  if (!(daily && retry)) Game.marks = [];
  timeFlags(); begin();
}
function begin(fromCp) {
  const L = Game.L;
  if (fromCp && Game.cp) { Game.P = clonePlayer(Game.cp.P); Game.t = Game.cp.t; }
  else {
    Game.P = newPlayer(); Game.t = 0; Game.coins = 0;
    if (L.mode === 'story' && Game.attempt > 1) {
      let fx = L.len; for (const o of L.obs) if (o.t !== 'sign') { fx = o.x0; break; }
      if (L.gaps.length) fx = Math.min(fx, L.gaps[0].x);
      const t0 = Math.max(0, Math.floor(fx / L.sp) - 62);
      for (let k = 0; k < t0; k++) Game.P.x += L.sp; // même arrondi que la simulation
      Game.t = t0;
    }
  }
  Game.spawnX = Game.P.x; Game.t0 = Game.t;
  L.ci = 0; L.gi = 0;
  Game.trail = []; Game.usedDj = false; Game.acc = 0; Game.sx = Game.sy = 1;
  Game.px = Game.P.x; Game.py = Game.P.y; Game.vsp = L.spAt(Game.P.x); Game.hit = 0; Game.pops = []; Game.m100 = 0;
  Game.ph2 = L.boss && Game.P.x > L.len / 2; Game.passedBest = false;
  if (Game.practice) Game.bestX = 0;
  else if (L.mode === 'story') { const l = D().lv[L.i]; Game.bestX = l && l.pct > 0 && l.pct < 1 ? l.pct * L.len : 0; }
  else Game.bestX = (L.mode === 'daily' ? ((D().st.daily[Game.day] || {}).best || 0) : D().st.endBest) * METER;
  Inp.queued = false;
  if (L.mode === 'story' && !Game.practice) {
    const n = Math.ceil(L.len / L.sp) + 4;
    Game.cur = { ys: new Int16Array(n), n: 0, win: false };
  } else Game.cur = null;
  showScr(null); $('hud').classList.remove('off'); hudCache = {};
  Game.state = 'play'; resize();
  if (Game.wantPause) { Game.wantPause = false; pause(); return; }
  startMusic();
  if (!fromCp && Game.attempt === 1 && !Game.introShown) {
    Game.introShown = true;
    if (L.mode === 'story') banner(levelLabel(L), Game.practice ? 'ENTRAÎNEMENT' : `CHAPITRE ${L.w + 1} · ${WORLDS[L.w].n}`, 1400);
    else banner(L.mode === 'daily' ? 'DÉFI DU JOUR' : 'ENDLESS', 'TAPE POUR SAUTER', 1100);
  }
}
function startMusic() {
  const L = Game.L;
  Snd.start(L.mode === 'story' ? hashStr('M' + L.i) : hashStr('ENDLESS'), L.bpm, L.mode === 'story' ? L.w : 6, L.boss, Game.t / 60);
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
  if (Game.t - Game.t0 < 90 && !Game.cp) s.fastDeaths++;
  burst(P.x, P.y, 26, curSkin().c[1].length === 7 ? curSkin().c[1] : '#ff3333', 7);
  burst(P.x, P.y, 10, '#ffffff', 4);
  Game.shake = 14; Game.hit = .06; Game.dieAge = 0; Game.px = P.x; Game.py = P.y;
  Game.marks.push({ x: P.x, y: clamp(P.y, 40, G - 10) }); if (Game.marks.length > 40) Game.marks.shift();
  if (D().set.shake && navigator.vibrate) { try { navigator.vibrate(30); } catch (e) { } }
  if (D().set.flash) { const f = $('flash'); f.style.opacity = '1'; setTimeout(() => f.style.opacity = '0', 90); }
  let newBest = false;
  if (L.mode === 'story') {
    Game.deaths++; Game.attempt++;
    const pct = P.x / L.len;
    if (!Game.practice) {
      const l = D().lv[L.i] || (D().lv[L.i] = { done: false, best: 0, pct: 0 });
      newBest = !l.done && (l.pct || 0) > .02 && pct > (l.pct || 0) + .004;
      if (newBest) pop(P.x, clamp(P.y, 90, G - 40) - 46, `NOUVEAU RECORD ${Math.floor(pct * 100)} %`, '#ffd84a', 18);
      l.pct = Math.max(l.pct || 0, pct);
      if (pct >= .99) D().fl.d99 = 1;
      if (Game.cur) { Game.rec.push(Game.cur); if (Game.rec.length > 80) Game.rec.splice(0, 1); }
    }
    Game.dieT = newBest ? .8 : .44;
    if (Game.deaths === 15 && !Game.practice) toastMsg('Bloqué ? Mode entraînement dans le menu pause');
    Save.save();
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
  Game.state = 'clear'; Game.clearT = 0; $('hud').classList.add('off');
  burst(Game.P.x, Game.P.y, 30, '#ffd84a', 6);
  let line2;
  if (Game.practice) {
    d.st.practiceDone++;
    line2 = 'ENTRAÎNEMENT RÉUSSI · MAINTENANT EN VRAI';
    Game.next = () => startStory(L.i, false);
  } else {
    const l = d.lv[L.i] || (d.lv[L.i] = { done: false, best: 0, pct: 0 });
    const first = !l.done, improved = first || Game.deaths < l.best;
    l.pct = 1; if (improved) l.best = Game.deaths; l.done = true;
    if (Game.deaths >= 50) d.fl.per50 = 1;
    if (Game.deaths === 13) d.fl.ex13 = 1;
    if (!Game.usedDj && L.i >= 10) d.fl.nodj = 1;
    if (!d.set.music && !d.set.sfx) d.fl.silent = 1;
    const sNow = Game.deaths === 0 ? 3 : Game.deaths <= 5 ? 2 : 1;
    l.co = (l.co || 0) | Game.coins;
    line2 = '★'.repeat(sNow) + '☆'.repeat(3 - sNow) + '  ' + (Game.deaths === 0 ? 'SANS MORT' : `${Game.deaths} MORT${Game.deaths > 1 ? 'S' : ''}`) + (!first && improved ? ' · RECORD' : '') + (lvCoins(L.i).length ? `  ⚡ ${bits(l.co)}/3` : '');
    if (improved) submitStory();
    Game.next = L.i < 99 ? () => startStory(L.i + 1) : () => { quitToMenu(); openScr('story'); banner('FÉLICITATIONS', 'LES 100 NIVEAUX SONT TERMINÉS', 3000); };
  }
  banner(levelLabel(L) + ' ✓', line2, 1500);
  if (!Game.practice && L.i < 99) { const np = storyParams(L.i + 1); Snd.prepare(hashStr('M' + np.i), np.bpm, np.w, np.boss); }
  Save.save();
  checkAch();
}
function levelLabel(L) { return L.boss ? `BOSS · ${L.name}` : `NIVEAU ${L.name}`; }
let bannerTimer = 0;
function banner(t, s, ms) {
  const b = $('banner'); b.querySelector('.t').textContent = t; b.querySelector('.s').textContent = s || '';
  b.classList.remove('off', 'out'); void b.offsetWidth; b.classList.add('in');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.add('out'), ms);
}
function goNext() { if (Game.state === 'clear' && Game.next) { const f = Game.next; Game.next = null; f(); } }

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
  Game.lastRun = { m, rec };
  setTimeout(() => {
    if (Game.state !== 'dying') return;
    startEndless(L.mode === 'daily', true);
    banner(m + ' m', rec ? 'NOUVEAU RECORD !' : `RECORD ${best} m`, 1300);
  }, 550);
  if (rec) {
    const mode = L.mode, day = mode === 'daily' ? Game.day : 'all';
    const tries = mode === 'daily' ? s.daily[Game.day].tries : s.endRuns;
    LB.submit(mode, day, best, tries).then(ok => ok && LB.rank(mode, day, best)).then(rk => {
      if (!rk) return;
      toastMsg(`Classement mondial : ${rk}e`);
      if (mode === 'endless') { if (rk <= 100) D().fl.top100 = 1; if (rk <= 10) D().fl.top10 = 1; checkAch(); Save.save(); }
    });
  }
}

function submitStory() {
  let lv = 0, de = 0; for (let i = 0; i < 100; i++) { const l = D().lv[i]; if (l && l.done) { lv++; de += l.best; } }
  LB.submit('story', 'all', lv * 100000 - de, de, lv);
}

function pause() {
  if (Game.state === 'dying') { Game.wantPause = true; return; } // demandé pendant la mort : pause dès le nouvel essai
  if (Game.state !== 'play' && Game.state !== 'count') return;
  Game.state = 'pause'; Snd.stop(); D().st.pauses++;
  $('bPractice').style.display = Game.mode === 'story' ? '' : 'none';
  $('bPractice').textContent = Game.practice ? 'QUITTER L’ENTRAÎNEMENT' : 'MODE ENTRAÎNEMENT';
  refreshToggles(); showScr('s-pause'); checkAch();
}
function resume() {
  if (Game.state !== 'pause') return;
  showScr(null); Game.state = 'count'; Game.countT = 1.5; Game.acc = 0; Game.last = 0; Snd.sfx('click');
}
function quitToMenu() { Snd.stop(); Game.state = 'menu'; Game.L = null; Game.wantPause = false; view(6.2); $('hud').classList.add('off');  Save.save(); openScr('home'); }

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
  const el = document.createElement('div'); el.className = 'toast' + (['play', 'dying', 'count', 'clear'].includes(Game.state) ? ' mini' : '');
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
  if (name === 'cont') { const i = nextLevel(); if (i < 0) { buildStory(); showScr('s-story'); } else startStory(i); }
  else if (name === 'story') { buildStory(); showScr('s-story'); }
  else if (name === 'endless') startEndless(false);
  else if (name === 'daily') startEndless(true);
  else if (name === 'coll') { buildColl(); showScr('s-coll'); }
  else if (name === 'lb') { showScr('s-lb'); loadLb(lbMode); }
  else if (name === 'set') { buildSet(); showScr('s-set'); }
  else { buildHome(); showScr('s-home'); }
}

function nextLevel() { for (let i = 0; i < 100; i++) if (!(D().lv[i] && D().lv[i].done)) return i; return -1; }
function buildHome() {
  const d = D();
  const ni = nextLevel(), np = ni >= 0 ? storyParams(ni) : null, nl = ni >= 0 ? d.lv[ni] : null;
  if (np) Snd.prepare(hashStr('M' + np.i), np.bpm, np.w, np.boss); // boucle musicale du prochain niveau prête avant de jouer
  $('bCont').firstChild.textContent = ni === 0 && !nl ? 'JOUER' : ni < 0 ? 'HISTOIRE TERMINÉE' : 'CONTINUER';
  $('mCont').textContent = ni < 0 ? 'rejouer pour les étoiles et les éclairs' : (np.boss ? `BOSS · ${np.name}` : `NIVEAU ${np.name}`) + (nl && nl.pct ? ` · record ${Math.floor(nl.pct * 100)} %` : '');
  $('hello').textContent = `SALUT ${d.name}`;
  let lv = 0; for (let i = 0; i < 100; i++) if (d.lv[i] && d.lv[i].done) lv++;
  $('mStory').textContent = `${lv}/100 · ★ ${starCount(d)}/300 · ⚡ ${boltCount(d)}/300`;
  $('mEnd').textContent = d.st.endBest ? `record ${d.st.endBest} m` : 'course infinie';
  const dd = d.st.daily[today()];
  $('mDaily').textContent = dd ? `aujourd’hui : ${dd.best} m · ${dd.tries} essai${dd.tries > 1 ? 's' : ''}` : 'même parcours pour tous, chaque jour';
  $('mColl').textContent = `${Object.keys(d.ach).length}/${ACH.length}`;
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
    c.innerHTML = `<b>${boss ? 'BOSS' : k + 1}</b><span class="st">${'★'.repeat(s)}<i>${'★'.repeat(3 - s)}</i></span><span class="dd">${l && l.done ? (l.best === 0 ? 'sans mort' : l.best + ' morts') : un ? (l && l.pct ? Math.floor(l.pct * 100) + ' %' : 'nouveau') : 'verrouillé'}</span>${un && lvCoins(i).length ? `<span class="co">⚡ ${bits((l && l.co) || 0)}/3</span>` : ''}`;
    if (un) c.onclick = () => { Snd.unlock(); startStory(i); };
    g.appendChild(c);
  }
  $('chHint').textContent = `★ fini · ★★ 5 morts max · ★★★ sans mort · ⚡ 3 éclairs par niveau, gardés si tu finis`;
}

let collF = 'all';
function buildColl() {
  const d = D(), grid = $('collGrid'); grid.innerHTML = '';
  $('collCount').textContent = `${Object.keys(d.ach).length}/${ACH.length}`;
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
function applySettings() { const s = D().set; Snd.S.music = s.music; Snd.S.sfx = s.sfx; Snd.setVol(s.vol); if (!s.music) Snd.stop(); }

// ── PARTAGE ──────────────────────────────────────────────────────
async function share(text) {
  const url = location.href.split('#')[0].split('?')[0];
  D().st.shares++; Save.save(); checkAch();
  try { if (navigator.share) { await navigator.share({ title: 'BoltBall', text, url }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(text + ' ' + url); toastMsg('Copié dans le presse-papier'); } catch (e) { }
}
function toastMsg(m) { const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = '<div class="t"></div>'; el.querySelector('.t').textContent = m; $('toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 1800); setTimeout(() => el.remove(), 2200); }

// ── ENTRÉES ──────────────────────────────────────────────────────
Inp.ptr = 0; Inp.key = false;
function updDown() { Inp.down = Inp.ptr > 0 || Inp.key; }
function pressStart() { if (Game.state === 'play') Inp.queued = true; }
function ptrEnd() { Inp.ptr = Math.max(0, Inp.ptr - 1); updDown(); }
cv.addEventListener('pointerdown', e => { Snd.unlock(); Inp.ptr++; updDown(); if (Game.state === 'clear' && Game.clearT > .45) goNext(); else pressStart(); });
addEventListener('pointerup', ptrEnd); addEventListener('pointercancel', ptrEnd); addEventListener('blur', () => { Inp.ptr = 0; Inp.key = false; updDown(); });
const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW', 'KeyZ'];
addEventListener('keydown', e => {
  if (document.activeElement && document.activeElement.tagName === 'INPUT') { if (e.key === 'Enter' && document.activeElement.id === 'inp') $('bName').click(); return; }
  if (JUMP_KEYS.includes(e.code)) {
    e.preventDefault(); if (e.repeat) return; Snd.unlock();
    Inp.key = true; updDown();
    if (Game.state === 'play') pressStart();
    else if (Game.state === 'over') restart();
    else if (Game.state === 'clear' && Game.clearT > .45) goNext();
  } else if (e.code === 'KeyR' && !e.repeat) { if (['play', 'dying', 'over', 'pause'].includes(Game.state)) restart(true); }
  else if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { if (['play', 'count', 'dying'].includes(Game.state)) pause(); else if (Game.state === 'pause') resume(); }
});
addEventListener('keyup', e => { if (JUMP_KEYS.includes(e.code)) { Inp.key = false; updDown(); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); Snd.stop(); Save.save(); } });
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
$('bShare3').onclick = () => Game.mode === 'story' ? share(`⚡ BoltBall : je suis au ${levelLabel(Game.L).toLowerCase()}. Tu fais mieux ?`) : share(`⚡ BoltBall : record ${Game.mode === 'daily' ? ((D().st.daily[Game.day] || {}).best || 0) + ' m au défi du jour' : D().st.endBest + ' m en Endless'}. Bats-moi !`);
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
addEventListener('pagehide', () => Save.save());
